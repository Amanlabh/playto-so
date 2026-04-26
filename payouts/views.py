import uuid
from datetime import timedelta
from django.db import transaction, IntegrityError
from django.db.models import F
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Merchant, BankAccount, Payout, LedgerEntry
from .serializers import (
    MerchantSerializer, PayoutSerializer,
    LedgerEntrySerializer, CreatePayoutSerializer, CreatePayoutFlatSerializer,
)
from .tasks import process_payout

IDEMPOTENCY_TTL = timedelta(hours=24)


@api_view(["GET"])
def merchant_list(request):
    merchants = Merchant.objects.prefetch_related("bank_accounts").all()
    return Response(MerchantSerializer(merchants, many=True).data)


@api_view(["GET"])
def merchant_detail(request, merchant_id):
    try:
        merchant = Merchant.objects.prefetch_related("bank_accounts", "payouts").get(pk=merchant_id)
    except Merchant.DoesNotExist:
        return Response({"error": "Merchant not found"}, status=404)
    return Response(MerchantSerializer(merchant).data)


@api_view(["GET"])
def merchant_ledger(request, merchant_id):
    try:
        Merchant.objects.get(pk=merchant_id)
    except Merchant.DoesNotExist:
        return Response({"error": "Merchant not found"}, status=404)

    entries = LedgerEntry.objects.filter(merchant_id=merchant_id).select_related("payout")[:50]
    return Response(LedgerEntrySerializer(entries, many=True).data)


@api_view(["GET"])
def merchant_payouts(request, merchant_id):
    try:
        Merchant.objects.get(pk=merchant_id)
    except Merchant.DoesNotExist:
        return Response({"error": "Merchant not found"}, status=404)

    payouts = Payout.objects.filter(merchant_id=merchant_id).order_by("-created_at")[:50]
    return Response(PayoutSerializer(payouts, many=True).data)


def _handle_create_payout(request, merchant_id, amount_paise, bank_account_id):
    """Core payout creation logic — shared by both endpoints."""
    idempotency_key = request.headers.get("Idempotency-Key", "").strip()
    if not idempotency_key:
        return Response({"error": "Idempotency-Key header required"}, status=400)

    try:
        uuid.UUID(idempotency_key)
    except ValueError:
        return Response({"error": "Idempotency-Key must be a valid UUID"}, status=400)

    payout = None
    try:
        with transaction.atomic():
            # Lock merchant row first — serializes all concurrent requests for this merchant
            merchant = Merchant.objects.select_for_update().get(pk=merchant_id)

            # Idempotency check inside the lock — safe from race conditions
            # Keys expire after 24h so clients can reuse keys for genuinely new requests
            cutoff = timezone.now() - IDEMPOTENCY_TTL
            existing = Payout.objects.filter(
                merchant_id=merchant_id,
                idempotency_key=idempotency_key,
                created_at__gte=cutoff,
            ).first()
            if existing:
                return Response(PayoutSerializer(existing).data, status=200)

            try:
                bank_account = BankAccount.objects.get(
                    pk=bank_account_id, merchant=merchant, is_active=True
                )
            except BankAccount.DoesNotExist:
                return Response({"error": "Bank account not found or inactive"}, status=400)

            if merchant.balance_paise < amount_paise:
                return Response(
                    {"error": "Insufficient balance", "balance_paise": merchant.balance_paise},
                    status=422,
                )

            # DB-level atomic decrement — no Python read-modify-write
            Merchant.objects.filter(pk=merchant_id).update(
                balance_paise=F("balance_paise") - amount_paise
            )

            payout = Payout.objects.create(
                merchant=merchant,
                bank_account=bank_account,
                amount_paise=amount_paise,
                state=Payout.State.PENDING,
                idempotency_key=idempotency_key,
            )

            LedgerEntry.objects.create(
                merchant=merchant,
                payout=payout,
                kind=LedgerEntry.Kind.DEBIT,
                amount_paise=amount_paise,
                description=f"Payout to {bank_account.account_number}",
            )

    except Merchant.DoesNotExist:
        return Response({"error": "Merchant not found"}, status=404)
    except IntegrityError:
        # Concurrent request with same key slipped through before lock was acquired
        existing = Payout.objects.get(merchant_id=merchant_id, idempotency_key=idempotency_key)
        return Response(PayoutSerializer(existing).data, status=200)

    try:
        process_payout.delay(str(payout.id))
    except Exception:
        pass  # Worker unavailable — payout stays pending, sweeper retries

    return Response(PayoutSerializer(payout).data, status=201)


@api_view(["POST"])
def create_payout(request, merchant_id):
    """POST /api/v1/merchants/{id}/payouts/create/"""
    serializer = CreatePayoutSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    return _handle_create_payout(
        request,
        merchant_id,
        serializer.validated_data["amount_paise"],
        serializer.validated_data["bank_account_id"],
    )


@api_view(["POST"])
def create_payout_flat(request):
    """POST /api/v1/payouts — spec-compliant endpoint.
    Body: amount_paise, bank_account_id. Merchant is derived from the bank account."""
    serializer = CreatePayoutFlatSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    bank_account_id = serializer.validated_data["bank_account_id"]
    try:
        merchant_id = BankAccount.objects.values_list("merchant_id", flat=True).get(
            pk=bank_account_id, is_active=True
        )
    except BankAccount.DoesNotExist:
        return Response({"error": "Bank account not found or inactive"}, status=400)

    return _handle_create_payout(
        request,
        merchant_id,
        serializer.validated_data["amount_paise"],
        bank_account_id,
    )


@api_view(["GET"])
def payout_detail(request, payout_id):
    try:
        payout = Payout.objects.get(pk=payout_id)
    except Payout.DoesNotExist:
        return Response({"error": "Payout not found"}, status=404)
    return Response(PayoutSerializer(payout).data)

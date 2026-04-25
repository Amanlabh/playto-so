import uuid
import threading
from django.test import TransactionTestCase
from rest_framework.test import APIClient

from .models import Merchant, BankAccount, Payout, LedgerEntry


def create_merchant(name="Test Merchant", balance=1000000):
    merchant = Merchant.objects.create(
        name=name,
        email=f"{uuid.uuid4()}@test.com",
        balance_paise=balance,
    )
    bank = BankAccount.objects.create(
        merchant=merchant,
        account_number="1234567890",
        ifsc_code="HDFC0001234",
        account_holder_name=name,
    )
    LedgerEntry.objects.create(
        merchant=merchant,
        kind=LedgerEntry.Kind.CREDIT,
        amount_paise=balance,
        description="Initial credit",
    )
    return merchant, bank


class ConcurrencyTest(TransactionTestCase):
    """Two simultaneous 60k paise requests on a 100k balance — exactly one must succeed."""

    def test_concurrent_payouts_no_overdraft(self):
        merchant, bank = create_merchant(balance=100000)
        amount = 60000

        results = []

        def make_request():
            client = APIClient()
            url = f"/api/v1/merchants/{merchant.id}/payouts/create/"
            resp = client.post(
                url,
                {"amount_paise": amount, "bank_account_id": str(bank.id)},
                format="json",
                HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
            )
            results.append(resp.status_code)

        threads = [threading.Thread(target=make_request) for _ in range(2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        success_count = results.count(201)
        reject_count = results.count(422)

        self.assertEqual(success_count, 1, f"Expected 1 success, got {success_count}. Results: {results}")
        self.assertEqual(reject_count, 1, f"Expected 1 rejection, got {reject_count}. Results: {results}")

        merchant.refresh_from_db()
        self.assertEqual(merchant.balance_paise, 40000)

        # Invariant: balance == credits - debits + refunds
        from django.db.models import Sum
        credits = LedgerEntry.objects.filter(merchant=merchant, kind=LedgerEntry.Kind.CREDIT).aggregate(t=Sum("amount_paise"))["t"] or 0
        debits = LedgerEntry.objects.filter(merchant=merchant, kind=LedgerEntry.Kind.DEBIT).aggregate(t=Sum("amount_paise"))["t"] or 0
        refunds = LedgerEntry.objects.filter(merchant=merchant, kind=LedgerEntry.Kind.REFUND).aggregate(t=Sum("amount_paise"))["t"] or 0

        self.assertEqual(merchant.balance_paise, credits - debits + refunds)


class IdempotencyTest(TransactionTestCase):
    """Same idempotency key twice — one payout created, identical response IDs."""

    def test_same_key_returns_same_payout(self):
        merchant, bank = create_merchant(balance=500000)
        key = str(uuid.uuid4())
        client = APIClient()
        url = f"/api/v1/merchants/{merchant.id}/payouts/create/"
        payload = {"amount_paise": 100000, "bank_account_id": str(bank.id)}

        resp1 = client.post(url, payload, format="json", HTTP_IDEMPOTENCY_KEY=key)
        resp2 = client.post(url, payload, format="json", HTTP_IDEMPOTENCY_KEY=key)

        self.assertEqual(resp1.status_code, 201)
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(resp1.data["id"], resp2.data["id"])

        payout_count = Payout.objects.filter(merchant=merchant, idempotency_key=key).count()
        self.assertEqual(payout_count, 1)

        debit_count = LedgerEntry.objects.filter(merchant=merchant, kind=LedgerEntry.Kind.DEBIT).count()
        self.assertEqual(debit_count, 1)


class StateMachineTest(TransactionTestCase):
    """Illegal state transitions must raise ValueError."""

    def test_completed_to_pending_blocked(self):
        merchant, bank = create_merchant()
        payout = Payout.objects.create(
            merchant=merchant, bank_account=bank,
            amount_paise=1000, state=Payout.State.COMPLETED,
            idempotency_key=str(uuid.uuid4()),
        )
        with self.assertRaises(ValueError):
            payout.transition_to(Payout.State.PENDING)

    def test_failed_to_completed_blocked(self):
        merchant, bank = create_merchant()
        payout = Payout.objects.create(
            merchant=merchant, bank_account=bank,
            amount_paise=1000, state=Payout.State.FAILED,
            idempotency_key=str(uuid.uuid4()),
        )
        with self.assertRaises(ValueError):
            payout.transition_to(Payout.State.COMPLETED)

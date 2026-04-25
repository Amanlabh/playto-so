import random
import time
import logging
from celery import shared_task
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from datetime import timedelta

from .models import Payout, Merchant, LedgerEntry

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 3
STUCK_THRESHOLD_SECONDS = 30


@shared_task(bind=True, max_retries=0)
def process_payout(self, payout_id: str):
    try:
        with transaction.atomic():
            payout = Payout.objects.select_for_update().get(pk=payout_id)

            if payout.state != Payout.State.PENDING:
                return {"status": "skipped", "reason": f"already in state {payout.state}"}

            payout.transition_to(Payout.State.PROCESSING)
            payout.attempts += 1
            payout.save(update_fields=["attempts", "updated_at"])

        # Simulate bank API call outside transaction (represents real network round-trip)
        outcome = _simulate_bank_outcome()

        with transaction.atomic():
            payout = Payout.objects.select_for_update().get(pk=payout_id)

            if payout.state != Payout.State.PROCESSING:
                return {"status": "skipped", "reason": "state changed during processing"}

            if outcome == "success":
                payout.transition_to(Payout.State.COMPLETED)
                logger.info("Payout %s completed", payout_id)
                return {"status": "completed"}

            elif outcome == "failure":
                _fail_and_refund(payout)
                logger.info("Payout %s failed, funds refunded", payout_id)
                return {"status": "failed"}

            else:
                # Hang — leave in processing; retry_stuck_payouts sweeper handles it
                logger.info("Payout %s hanging in processing", payout_id)
                return {"status": "processing"}

    except Payout.DoesNotExist:
        logger.error("Payout %s not found", payout_id)
        return {"status": "error", "reason": "not found"}
    except ValueError as e:
        logger.error("Payout %s illegal transition: %s", payout_id, e)
        return {"status": "error", "reason": str(e)}


@shared_task
def retry_stuck_payouts():
    """Sweep payouts stuck in processing and retry or fail them."""
    cutoff = timezone.now() - timedelta(seconds=STUCK_THRESHOLD_SECONDS)
    stuck_ids = list(
        Payout.objects.filter(state=Payout.State.PROCESSING, updated_at__lt=cutoff)
        .values_list("id", flat=True)
    )

    for payout_id in stuck_ids:
        with transaction.atomic():
            try:
                p = Payout.objects.select_for_update().get(pk=payout_id)
            except Payout.DoesNotExist:
                continue

            if p.state != Payout.State.PROCESSING:
                continue

            if p.attempts < MAX_ATTEMPTS:
                p.state = Payout.State.PENDING
                p.save(update_fields=["state", "updated_at"])
                delay = 2 ** p.attempts  # exponential: 2s, 4s, 8s
                process_payout.apply_async(args=[str(p.id)], countdown=delay)
                logger.info("Retrying stuck payout %s, attempt %d, delay %ds", p.id, p.attempts, delay)
            else:
                _fail_and_refund(p)
                logger.warning("Payout %s max retries exceeded, marked failed", p.id)


def _fail_and_refund(payout: Payout):
    """Mark payout failed and atomically return funds. Must be inside transaction.atomic()."""
    payout.transition_to(Payout.State.FAILED)
    if not payout.failure_reason:
        payout.failure_reason = "Bank settlement failed"
        payout.save(update_fields=["failure_reason", "updated_at"])

    # F() expression — DB-level add, no Python read-modify-write race
    Merchant.objects.filter(pk=payout.merchant_id).update(
        balance_paise=F("balance_paise") + payout.amount_paise
    )

    LedgerEntry.objects.create(
        merchant_id=payout.merchant_id,
        payout=payout,
        kind=LedgerEntry.Kind.REFUND,
        amount_paise=payout.amount_paise,
        description="Payout failed — funds returned",
    )


def _simulate_bank_outcome() -> str:
    """70% success, 20% failure, 10% hang."""
    r = random.random()
    if r < 0.70:
        return "success"
    elif r < 0.90:
        return "failure"
    else:
        time.sleep(0.1)
        return "hang"

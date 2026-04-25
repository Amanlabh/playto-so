import uuid
from django.db import models


class Merchant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    balance_paise = models.BigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class BankAccount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name="bank_accounts")
    account_number = models.CharField(max_length=20)
    ifsc_code = models.CharField(max_length=11)
    account_holder_name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.account_holder_name} - {self.account_number}"


class Payout(models.Model):
    class State(models.TextChoices):
        PENDING = "pending"
        PROCESSING = "processing"
        COMPLETED = "completed"
        FAILED = "failed"

    ALLOWED_TRANSITIONS = {
        State.PENDING: {State.PROCESSING, State.FAILED},
        State.PROCESSING: {State.COMPLETED, State.FAILED},
        State.COMPLETED: set(),
        State.FAILED: set(),
    }

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    merchant = models.ForeignKey(Merchant, on_delete=models.PROTECT, related_name="payouts")
    bank_account = models.ForeignKey(BankAccount, on_delete=models.PROTECT)
    amount_paise = models.BigIntegerField()
    state = models.CharField(max_length=20, choices=State.choices, default=State.PENDING)
    idempotency_key = models.CharField(max_length=255)
    attempts = models.IntegerField(default=0)
    failure_reason = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("merchant", "idempotency_key")
        indexes = [
            models.Index(fields=["state", "updated_at"]),
            models.Index(fields=["merchant", "created_at"]),
        ]

    def __str__(self):
        return f"Payout {self.id} - {self.state}"

    def transition_to(self, new_state):
        """Must be called inside select_for_update transaction."""
        allowed = self.ALLOWED_TRANSITIONS.get(self.state, set())
        if new_state not in allowed:
            raise ValueError(f"Illegal transition: {self.state} -> {new_state}")
        self.state = new_state
        self.save(update_fields=["state", "updated_at"])


class LedgerEntry(models.Model):
    class Kind(models.TextChoices):
        CREDIT = "credit"    # customer payment received
        DEBIT = "debit"      # funds held on payout create
        REFUND = "refund"    # funds returned on payout failure

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    merchant = models.ForeignKey(Merchant, on_delete=models.PROTECT, related_name="ledger_entries")
    payout = models.ForeignKey(Payout, null=True, blank=True, on_delete=models.SET_NULL)
    kind = models.CharField(max_length=10, choices=Kind.choices)
    amount_paise = models.BigIntegerField()
    description = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["merchant", "created_at"])]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.kind} {self.amount_paise} paise"

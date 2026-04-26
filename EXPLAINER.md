# Playto Payout Engine Explainer

## Tech Stack / Infrastructure

- Backend: Django + Django REST Framework
- Database: PostgreSQL via Neon
- Background jobs: Celery
- Broker/result backend: Redis via Upstash
- Frontend: React + TypeScript + Tailwind + Vite

Relevant source files:

- `config/settings.py`: database, Redis, DRF, CORS, static files.
- `config/celery.py`: Celery app and periodic schedules.
- `payouts/models.py`: merchant, payout, bank account, ledger models.
- `payouts/views.py`: payout creation API, locking, idempotency.
- `payouts/tasks.py`: payout processor, stuck payout retry, idempotency expiry.

PostgreSQL is the source of truth for money-moving state: merchants, bank accounts, payouts, and ledger entries. Neon gives this project real PostgreSQL semantics, especially row-level locking with `SELECT ... FOR UPDATE`, partial unique constraints, transactions, and database-level `F()` updates.

Source code from `config/settings.py`:

```python
DATABASES = {
    "default": dj_database_url.config(
        default=os.environ.get("DATABASE_URL", "postgresql://localhost/playto_dev"),
        conn_max_age=600,
    )
}
```

Redis is used only as Celery infrastructure. It queues payout processing jobs and powers the periodic Celery beat tasks. It does not store merchant balances, payout state, ledger entries, or idempotency records; those stay in PostgreSQL so financial correctness does not depend on Redis persistence. In production, `REDIS_URL` points to the Upstash Redis instance.

Source code from `config/settings.py`:

```python
CELERY_BROKER_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"
```

Celery runs three money-related async paths:

- `process_payout`: simulates bank settlement and moves payouts through the lifecycle.
- `retry_stuck_payouts`: retries payouts stuck in `processing` for more than 30 seconds.
- `expire_idempotency_keys`: clears idempotency keys after the 24-hour TTL window.

Source code from `config/celery.py`:

```python
app.conf.beat_schedule = {
    "retry-stuck-payouts": {
        "task": "payouts.tasks.retry_stuck_payouts",
        "schedule": timedelta(seconds=10),
    },
    "expire-idempotency-keys": {
        "task": "payouts.tasks.expire_idempotency_keys",
        "schedule": timedelta(hours=1),
    },
}
```

## Django Admin

Django Admin is the internal back-office/debugging surface for this project. It is not merchant-facing; merchants use the React dashboard. Admin is for an operator or developer to inspect the backend state directly.

Local admin URL:

```text
http://localhost:8000/admin/
```

Deployment admin URL:

```text
https://<backend-domain>/admin/
```

Access requires a Django superuser:

```bash
venv/bin/python manage.py createsuperuser
```

In this project, admin can be used to:

- view seeded merchants and their available balances;
- inspect linked bank accounts;
- inspect payout rows, states, attempts, failure reasons, and idempotency keys;
- inspect ledger entries for credits, debits, and refunds;
- debug stuck or failed payouts during development;
- manually verify that ledger events match the displayed merchant balance.

The admin reads and writes the same PostgreSQL tables as the API. It does not bypass the database model. For production money systems I would restrict write access heavily, but for this challenge it is useful as an internal inspection tool while testing the payout engine.

## 1. The Ledger

All money amounts are stored in paise as integers using `BigIntegerField`. There are no floats for money.

The ledger has three entry kinds:

- `credit`: simulated customer payment received.
- `debit`: funds held when a payout is requested.
- `refund`: funds returned when a payout fails.

`Merchant.balance_paise` is the materialized available balance used for fast reads and row-locked payout creation. Every balance mutation also writes a `LedgerEntry`, so the invariant can be recomputed from the ledger:

Source code pattern from `payouts/tests.py`:

```python
from django.db.models import Sum

credits = LedgerEntry.objects.filter(
    merchant=merchant,
    kind=LedgerEntry.Kind.CREDIT,
).aggregate(total=Sum("amount_paise"))["total"] or 0

debits = LedgerEntry.objects.filter(
    merchant=merchant,
    kind=LedgerEntry.Kind.DEBIT,
).aggregate(total=Sum("amount_paise"))["total"] or 0

refunds = LedgerEntry.objects.filter(
    merchant=merchant,
    kind=LedgerEntry.Kind.REFUND,
).aggregate(total=Sum("amount_paise"))["total"] or 0

assert merchant.balance_paise == credits - debits + refunds
```

I modeled payout holds as `debit` entries and failed payout reversals as `refund` entries because it keeps the ledger append-only for business events. A failed payout does not delete or rewrite the original debit; it records the compensating event.

## 2. The Lock

The concurrency guard lives in `payouts/views.py` inside `_handle_create_payout`:

Source code from `payouts/views.py`:

```python
with transaction.atomic():
    merchant = Merchant.objects.select_for_update().get(pk=merchant_id)

    existing = Payout.objects.filter(
        merchant_id=merchant_id,
        idempotency_key=idempotency_key,
        created_at__gte=cutoff,
    ).first()
    if existing:
        return Response(PayoutSerializer(existing).data, status=200)

    if merchant.balance_paise < amount_paise:
        return Response(
            {"error": "Insufficient balance", "balance_paise": merchant.balance_paise},
            status=422,
        )

    Merchant.objects.filter(pk=merchant_id).update(
        balance_paise=F("balance_paise") - amount_paise
    )
```

The database primitive is PostgreSQL row-level locking via `SELECT ... FOR UPDATE`. Two payout requests for the same merchant cannot pass the balance check at the same time. The second request waits for the first transaction to finish, then sees the updated balance.

The actual decrement uses a database-level `F()` expression, so the update is executed by PostgreSQL rather than as a Python read-modify-write cycle.

## 3. The Idempotency

The client must send `Idempotency-Key` as a UUID header. The key is stored on the `Payout` row and scoped by merchant.

The model uses a partial unique constraint:

Source code from `payouts/models.py`:

```python
models.UniqueConstraint(
    fields=["merchant", "idempotency_key"],
    condition=models.Q(idempotency_key__isnull=False),
    name="unique_active_idempotency_key",
)
```

The idempotency lookup happens inside the same transaction and after the merchant row lock is acquired:

Source code from `payouts/views.py`:

```python
existing = Payout.objects.filter(
    merchant_id=merchant_id,
    idempotency_key=idempotency_key,
    created_at__gte=cutoff,
).first()
if existing:
    return Response(PayoutSerializer(existing).data, status=200)
```

If the first request is still in flight when the second request arrives, the second waits on the merchant row lock. After the first commits, the second checks for the key and returns the already-created payout instead of creating another one.

Keys expire after 24 hours. The Celery beat task `expire_idempotency_keys` nulls old keys:

Source code from `payouts/tasks.py`:

```python
Payout.objects.filter(
    created_at__lt=cutoff,
    idempotency_key__isnull=False,
).update(idempotency_key=None)
```

Because the unique constraint only applies to non-null keys, nulling expired keys allows the same merchant to reuse a key after the TTL.

## 4. The State Machine

The state machine is centralized on the `Payout` model:

Source code from `payouts/models.py`:

```python
ALLOWED_TRANSITIONS = {
    State.PENDING: {State.PROCESSING, State.FAILED},
    State.PROCESSING: {State.COMPLETED, State.FAILED, State.PENDING},
    State.COMPLETED: set(),
    State.FAILED: set(),
}

def transition_to(self, new_state):
    allowed = self.ALLOWED_TRANSITIONS.get(self.state, set())
    if new_state not in allowed:
        raise ValueError(f"Illegal transition: {self.state} -> {new_state}")
    self.state = new_state
    self.save(update_fields=["state", "updated_at"])
```

`failed -> completed` is blocked because `FAILED` has no outgoing transitions. `completed -> pending` is also blocked because `COMPLETED` has no outgoing transitions.

`processing -> pending` is the only extra internal transition. It exists for the retry sweeper when a worker hangs. It does not create a new debit or refund; it only requeues the same held payout for another processing attempt.

Failed payouts refund atomically in `_fail_and_refund`:

Source code from `payouts/tasks.py`:

```python
payout.transition_to(Payout.State.FAILED)
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
```

That function is called from inside `transaction.atomic()`, so the state transition, balance return, and refund ledger entry commit together.

## 5. The AI Audit

I used AI tools during the build: Claude for backend and state-machine iteration, Codex for project review and TypeScript migration, and Replit for frontend UI exploration. I treated AI output as draft code, especially around transactions, locking, idempotency, and ledger math.

One subtle issue I caught was in the payout creation path. An earlier draft checked idempotency before the transaction and did a Python-level decrement:

```python
existing = Payout.objects.filter(
    merchant_id=merchant_id,
    idempotency_key=idempotency_key,
).first()
if existing:
    return Response(PayoutSerializer(existing).data, status=200)

merchant = Merchant.objects.select_for_update().get(pk=merchant_id)
merchant.balance_paise -= amount_paise
merchant.save(update_fields=["balance_paise"])
```

The problems:

- The idempotency check happened outside the lock, so same-key concurrent requests could race before the first payout was visible.
- The balance update was a Python read-modify-write operation, which is the pattern I wanted to avoid in money-moving code.

I replaced it with:

- `transaction.atomic()` around the whole critical section.
- `select_for_update()` on the merchant row before idempotency and balance checks.
- idempotency lookup inside the lock.
- `Merchant.objects.filter(...).update(balance_paise=F("balance_paise") - amount_paise)` for the decrement.

This is the version currently in `payouts/views.py`.

## Verification

The backend test suite includes:

- Concurrency: two simultaneous 60,000 paise payout requests on a 100,000 paise balance; exactly one succeeds.
- Idempotency: repeated request with the same key creates one payout and returns the same payout id.
- State machine: illegal transitions such as `failed -> completed` and `completed -> pending` raise `ValueError`.

The frontend was migrated to TypeScript and verified with:

```bash
npm run typecheck
npm run lint
npm run build
```

# Playto Payout Engine

Merchant payout system: balance ledger, concurrent payout requests, background processing with retry.

## Stack

- **Backend**: Django 5 + DRF
- **DB**: PostgreSQL (Neon)
- **Worker**: Celery + Redis
- **Frontend**: React + Tailwind (in `/frontend`)

## Local Setup

### 1. Clone and create virtualenv

```bash
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in your Neon DATABASE_URL and Redis URL
```

### 3. Run migrations and seed

```bash
python manage.py migrate
python manage.py seed
python manage.py createsuperuser  # optional, for /admin
```

### 4. Start services

```bash
# Terminal 1 — Django
python manage.py runserver

# Terminal 2 — Celery worker
celery -A config worker -l info

# Terminal 3 — Celery beat (stuck payout sweeper)
celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/merchants/` | List merchants |
| GET | `/api/v1/merchants/{id}/` | Merchant detail + balance |
| GET | `/api/v1/merchants/{id}/ledger/` | Credit/debit history |
| GET | `/api/v1/merchants/{id}/payouts/` | Payout history |
| POST | `/api/v1/merchants/{id}/payouts/create/` | Create payout |
| GET | `/api/v1/payouts/{id}/` | Payout status |

### Create Payout

```http
POST /api/v1/merchants/{merchant_id}/payouts/create/
Idempotency-Key: <uuid>
Content-Type: application/json

{
  "amount_paise": 100000,
  "bank_account_id": "<uuid>"
}
```

Returns `201` on creation, `200` on duplicate key, `422` on insufficient balance.

## Tests

```bash
python manage.py test payouts
```

Covers:
- **Concurrency**: Two simultaneous 60k paise requests on 100k balance — exactly one succeeds
- **Idempotency**: Same key twice — one payout, identical responses
- **State machine**: Illegal transitions raise errors

## Seed Data

Three merchants pre-loaded with INR credit history:
- Riya Sharma Designs — ₹45,500
- Arjun Dev Studio — ₹37,500
- Priya Content Co — ₹25,000
# playto-so

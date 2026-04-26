import os
from celery import Celery
from celery.schedules import timedelta

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("playto")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

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

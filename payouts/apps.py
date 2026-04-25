from django.apps import AppConfig


class PayoutsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "payouts"

    def ready(self):
        pass  # Periodic tasks registered via management command or Celery beat config

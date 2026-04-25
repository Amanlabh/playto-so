from django.core.management.base import BaseCommand
from django.db import transaction
from payouts.models import Merchant, BankAccount, LedgerEntry


MERCHANTS = [
    {
        "name": "Riya Sharma Designs",
        "email": "riya@example.com",
        "bank_account": {
            "account_number": "9876543210001",
            "ifsc_code": "HDFC0001234",
            "account_holder_name": "Riya Sharma",
        },
        "credits": [
            {"amount_paise": 1500000, "description": "Payment from Acme Corp (USD 180)"},
            {"amount_paise": 850000, "description": "Payment from TechStart Inc (USD 102)"},
            {"amount_paise": 2200000, "description": "Payment from GlobalBrand (USD 264)"},
        ],
    },
    {
        "name": "Arjun Dev Studio",
        "email": "arjun@example.com",
        "bank_account": {
            "account_number": "9876543210002",
            "ifsc_code": "ICIC0005678",
            "account_holder_name": "Arjun Verma",
        },
        "credits": [
            {"amount_paise": 3000000, "description": "Payment from FinanceHub (USD 360)"},
            {"amount_paise": 750000, "description": "Payment from StartupXYZ (USD 90)"},
        ],
    },
    {
        "name": "Priya Content Co",
        "email": "priya@example.com",
        "bank_account": {
            "account_number": "9876543210003",
            "ifsc_code": "SBIN0009012",
            "account_holder_name": "Priya Nair",
        },
        "credits": [
            {"amount_paise": 500000, "description": "Payment from MediaCorp (USD 60)"},
            {"amount_paise": 1200000, "description": "Payment from CreativeAgency (USD 144)"},
            {"amount_paise": 800000, "description": "Payment from WebWorks (USD 96)"},
        ],
    },
]


class Command(BaseCommand):
    help = "Seed database with merchants, bank accounts, and credit history"

    def handle(self, *args, **options):
        with transaction.atomic():
            for data in MERCHANTS:
                merchant, created = Merchant.objects.get_or_create(
                    email=data["email"],
                    defaults={"name": data["name"], "balance_paise": 0},
                )
                if not created:
                    self.stdout.write(f"  Merchant {merchant.email} already exists, skipping")
                    continue

                bank = BankAccount.objects.create(merchant=merchant, **data["bank_account"])

                total_credits = 0
                for credit in data["credits"]:
                    LedgerEntry.objects.create(
                        merchant=merchant,
                        kind=LedgerEntry.Kind.CREDIT,
                        amount_paise=credit["amount_paise"],
                        description=credit["description"],
                    )
                    total_credits += credit["amount_paise"]

                merchant.balance_paise = total_credits
                merchant.save(update_fields=["balance_paise"])

                self.stdout.write(
                    self.style.SUCCESS(
                        f"Created {merchant.name} | balance: {total_credits} paise"
                        f" (₹{total_credits/100:.2f})"
                    )
                )

        self.stdout.write(self.style.SUCCESS("Seed complete."))

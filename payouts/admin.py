from django.contrib import admin
from .models import Merchant, BankAccount, Payout, LedgerEntry


@admin.register(Merchant)
class MerchantAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "balance_paise", "created_at"]
    readonly_fields = ["id", "created_at"]


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ["account_holder_name", "merchant", "account_number", "ifsc_code", "is_active"]
    list_filter = ["is_active"]


@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = ["id", "merchant", "amount_paise", "state", "attempts", "created_at"]
    list_filter = ["state"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    list_display = ["merchant", "kind", "amount_paise", "payout_id", "created_at"]
    list_filter = ["kind"]
    readonly_fields = ["id", "created_at"]

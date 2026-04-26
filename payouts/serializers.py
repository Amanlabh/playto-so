from rest_framework import serializers
from .models import Merchant, BankAccount, Payout, LedgerEntry


class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = ["id", "account_number", "ifsc_code", "account_holder_name", "is_active"]


class LedgerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerEntry
        fields = ["id", "kind", "amount_paise", "description", "payout_id", "created_at"]


class PayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payout
        fields = [
            "id", "amount_paise", "state", "bank_account_id",
            "idempotency_key", "attempts", "failure_reason",
            "created_at", "updated_at",
        ]


class MerchantSerializer(serializers.ModelSerializer):
    bank_accounts = BankAccountSerializer(many=True, read_only=True)
    held_balance_paise = serializers.SerializerMethodField()

    class Meta:
        model = Merchant
        fields = ["id", "name", "email", "balance_paise", "held_balance_paise", "bank_accounts", "created_at"]

    def get_held_balance_paise(self, obj):
        from django.db.models import Sum
        result = obj.payouts.filter(
            state__in=["pending", "processing"]
        ).aggregate(total=Sum("amount_paise"))
        return result["total"] or 0


class CreatePayoutSerializer(serializers.Serializer):
    amount_paise = serializers.IntegerField(min_value=100)
    bank_account_id = serializers.UUIDField()

    def validate_amount_paise(self, value):
        if value <= 0:
            raise serializers.ValidationError("amount_paise must be positive")
        return value


class CreatePayoutFlatSerializer(serializers.Serializer):
    """Spec body: only amount_paise + bank_account_id. Merchant is derived
    from the bank account, since each bank account belongs to exactly one merchant."""
    amount_paise = serializers.IntegerField(min_value=100)
    bank_account_id = serializers.UUIDField()

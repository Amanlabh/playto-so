from django.urls import path
from . import views

urlpatterns = [
    path("merchants/", views.merchant_list),
    path("merchants/<uuid:merchant_id>/", views.merchant_detail),
    path("merchants/<uuid:merchant_id>/ledger/", views.merchant_ledger),
    path("merchants/<uuid:merchant_id>/payouts/", views.merchant_payouts),
    path("merchants/<uuid:merchant_id>/payouts/create/", views.create_payout),
    path("payouts/", views.create_payout_flat),
    path("payouts/<uuid:payout_id>/", views.payout_detail),
]

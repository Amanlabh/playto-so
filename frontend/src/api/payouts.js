import api from "./client";

export const getMerchants = () => api.get("/merchants/");

export const getMerchant = (id) => api.get(`/merchants/${id}/`);

export const getLedger = (merchantId) =>
  api.get(`/merchants/${merchantId}/ledger/`);

export const getPayouts = (merchantId) =>
  api.get(`/merchants/${merchantId}/payouts/`);

export const createPayout = (merchantId, data, idempotencyKey) =>
  api.post(`/merchants/${merchantId}/payouts/create/`, data, {
    headers: { "Idempotency-Key": idempotencyKey },
  });

export const getPayoutStatus = (payoutId) => api.get(`/payouts/${payoutId}/`);

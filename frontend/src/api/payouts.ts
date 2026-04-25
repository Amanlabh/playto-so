import api from "./client";
import type {
  CreatePayoutPayload,
  LedgerEntry,
  Merchant,
  Payout,
} from "../types";

export const getMerchants = () => api.get<Merchant[]>("/merchants/");

export const getMerchant = (id: string) => api.get<Merchant>(`/merchants/${id}/`);

export const getLedger = (merchantId: string) =>
  api.get<LedgerEntry[]>(`/merchants/${merchantId}/ledger/`);

export const getPayouts = (merchantId: string) =>
  api.get<Payout[]>(`/merchants/${merchantId}/payouts/`);

export const createPayout = (
  merchantId: string,
  data: CreatePayoutPayload,
  idempotencyKey: string,
) =>
  api.post<Payout>(`/merchants/${merchantId}/payouts/create/`, data, {
    headers: { "Idempotency-Key": idempotencyKey },
  });

export const getPayoutStatus = (payoutId: string) =>
  api.get<Payout>(`/payouts/${payoutId}/`);

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { getMerchant, getLedger, getPayouts } from "../api/payouts";
import { cacheGet, cacheSet } from "../lib/cache";
import type { LedgerEntry, Merchant, Payout } from "../types";

type ErrorResponse = {
  error?: string;
};

type CachedBundle = {
  merchant: Merchant;
  ledger: LedgerEntry[];
  payouts: Payout[];
};

export function useMerchant(merchantId: string | null) {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    if (!merchantId) return;
    try {
      const [mRes, lRes, pRes] = await Promise.all([
        getMerchant(merchantId),
        getLedger(merchantId),
        getPayouts(merchantId),
      ]);
      setMerchant(mRes.data);
      setLedger(lRes.data);
      setPayouts(pRes.data);
      setError(null);
      setRefreshedAt(new Date());
      cacheSet<CachedBundle>(`merchant:${merchantId}`, {
        merchant: mRes.data,
        ledger: lRes.data,
        payouts: pRes.data,
      });
    } catch (e) {
      const message = axios.isAxiosError<ErrorResponse>(e)
        ? e.response?.data?.error
        : null;
      setError(message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    if (!merchantId) return;
    const cached = cacheGet<CachedBundle>(`merchant:${merchantId}`);
    if (cached) {
      setMerchant(cached.merchant);
      setLedger(cached.ledger);
      setPayouts(cached.payouts);
      setLoading(false);
    } else {
      setLoading(true);
    }
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [merchantId, refresh]);

  return { merchant, ledger, payouts, loading, error, refresh, refreshedAt };
}

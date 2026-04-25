import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { getMerchant, getLedger, getPayouts } from "../api/payouts";
import type { LedgerEntry, Merchant, Payout } from "../types";

type ErrorResponse = {
  error?: string;
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
    setLoading(true);
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { merchant, ledger, payouts, loading, error, refresh, refreshedAt };
}

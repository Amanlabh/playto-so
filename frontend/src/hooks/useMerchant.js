import { useState, useEffect, useCallback } from "react";
import { getMerchant, getLedger, getPayouts } from "../api/payouts";

export function useMerchant(merchantId) {
  const [merchant, setMerchant] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    } catch (e) {
      setError(e.response?.data?.error || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { merchant, ledger, payouts, loading, error, refresh };
}

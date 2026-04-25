import { type FormEvent, useMemo, useState } from "react";
import axios from "axios";
import { createPayout } from "../api/payouts";
import { toRupees } from "../lib/format";
import type { Merchant } from "../types";

type ErrorResponse = {
  error?: string;
};

type PayoutFormProps = {
  merchant: Merchant;
  onSuccess: () => void | Promise<void>;
};

export default function PayoutForm({ merchant, onSuccess }: PayoutFormProps) {
  const [amountRupees, setAmountRupees] = useState("");
  const [bankAccountId, setBankAccountId] = useState(
    merchant.bank_accounts?.[0]?.id || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const available = merchant.balance_paise;

  const amountPaise = useMemo(() => {
    const n = parseFloat(amountRupees);
    if (Number.isNaN(n)) return 0;
    return Math.round(n * 100);
  }, [amountRupees]);

  const insufficient = amountPaise > 0 && amountPaise > available;
  const tooSmall = amountPaise > 0 && amountPaise < 100;

  const handleMax = () => {
    setAmountRupees((available / 100).toFixed(2));
    setError(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!amountPaise || tooSmall) {
      setError("Minimum payout is ₹1.00 (100 paise)");
      return;
    }
    if (insufficient) {
      setError("Amount exceeds available balance");
      return;
    }
    if (!bankAccountId) {
      setError("Select a bank account");
      return;
    }

    const idempotencyKey = crypto.randomUUID();
    setLoading(true);
    try {
      const res = await createPayout(
        merchant.id,
        { amount_paise: amountPaise, bank_account_id: bankAccountId },
        idempotencyKey
      );
      setAmountRupees("");
      setSuccess(`Payout queued · ${toRupees(res.data.amount_paise)}`);
      await onSuccess();
    } catch (err) {
      const message = axios.isAxiosError<ErrorResponse>(err)
        ? err.response?.data?.error
        : null;
      setError(message || "Payout request failed");
    } finally {
      setLoading(false);
    }
  };

  const banks = merchant.bank_accounts ?? [];

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Request Payout
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Funds are held immediately and released to your bank.
          </p>
        </div>
        <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          Avail. {toRupees(available)}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
            <span>Amount (₹)</span>
            <button
              type="button"
              onClick={handleMax}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Use max
            </button>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-400 dark:text-gray-500">
              ₹
            </span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amountRupees}
              onChange={(e) => {
                setAmountRupees(e.target.value);
                setError(null);
                setSuccess(null);
              }}
              placeholder="0.00"
              className={`w-full rounded-lg border bg-white px-7 py-2 text-sm tabular-nums shadow-sm focus:outline-none focus:ring-2 dark:bg-gray-950 dark:text-gray-100 ${
                insufficient || tooSmall
                  ? "border-rose-300 focus:border-rose-400 focus:ring-rose-200 dark:border-rose-800"
                  : "border-gray-300 focus:border-indigo-400 focus:ring-indigo-200 dark:border-gray-700"
              }`}
              required
            />
          </div>
          {amountPaise > 0 && (
            <p className="mt-1 text-xs text-gray-500 tabular-nums dark:text-gray-400">
              = {amountPaise.toLocaleString("en-IN")} paise
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Bank Account
          </label>
          {banks.length === 0 ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              No bank account linked
            </p>
          ) : (
            <select
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              required
            >
              {banks.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_holder_name} · {acc.account_number} · {acc.ifsc_code}
                </option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || banks.length === 0 || insufficient || tooSmall || !amountPaise}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          {loading ? "Submitting…" : "Request Payout"}
        </button>
      </form>
    </div>
  );
}

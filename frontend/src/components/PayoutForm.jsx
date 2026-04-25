import { useState } from "react";
import { createPayout } from "../api/payouts";

export default function PayoutForm({ merchant, onSuccess }) {
  const [amountRupees, setAmountRupees] = useState("");
  const [bankAccountId, setBankAccountId] = useState(
    merchant.bank_accounts?.[0]?.id || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const amountPaise = Math.round(parseFloat(amountRupees) * 100);
    if (!amountPaise || amountPaise < 100) {
      setError("Minimum payout is ₹1 (100 paise)");
      return;
    }

    const idempotencyKey = crypto.randomUUID();
    setLoading(true);
    try {
      await createPayout(
        merchant.id,
        { amount_paise: amountPaise, bank_account_id: bankAccountId },
        idempotencyKey
      );
      setAmountRupees("");
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.error || "Payout request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Request Payout</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount (₹)
          </label>
          <input
            type="number"
            min="1"
            step="0.01"
            value={amountRupees}
            onChange={(e) => setAmountRupees(e.target.value)}
            placeholder="e.g. 500.00"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bank Account
          </label>
          <select
            value={bankAccountId}
            onChange={(e) => setBankAccountId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          >
            {merchant.bank_accounts?.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.account_holder_name} — {acc.account_number} ({acc.ifsc_code})
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Submitting..." : "Request Payout"}
        </button>
      </form>
    </div>
  );
}

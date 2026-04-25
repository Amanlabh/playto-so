import { useState, useEffect } from "react";
import { getMerchants } from "../api/payouts";
import { useMerchant } from "../hooks/useMerchant";
import BalanceCard from "../components/BalanceCard";
import PayoutForm from "../components/PayoutForm";
import PayoutTable from "../components/PayoutTable";
import LedgerTable from "../components/LedgerTable";

export default function Dashboard() {
  const [merchants, setMerchants] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const { merchant, ledger, payouts, loading, error, refresh } = useMerchant(selectedId);

  useEffect(() => {
    getMerchants().then((res) => {
      setMerchants(res.data);
      if (res.data.length) setSelectedId(res.data[0].id);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">P</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">Playto Pay</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Merchant:</label>
          <select
            value={selectedId || ""}
            onChange={(e) => setSelectedId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {loading && (
          <div className="text-center text-gray-500 py-16">Loading...</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && merchant && (
          <>
            <BalanceCard merchant={merchant} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PayoutForm key={merchant.id} merchant={merchant} onSuccess={refresh} />
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Stats</h2>
                <dl className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Total Payouts</dt>
                    <dd className="font-medium">{payouts.length}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Pending</dt>
                    <dd className="font-medium text-yellow-600">
                      {payouts.filter((p) => p.state === "pending").length}
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Processing</dt>
                    <dd className="font-medium text-blue-600">
                      {payouts.filter((p) => p.state === "processing").length}
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Completed</dt>
                    <dd className="font-medium text-green-600">
                      {payouts.filter((p) => p.state === "completed").length}
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Failed</dt>
                    <dd className="font-medium text-red-600">
                      {payouts.filter((p) => p.state === "failed").length}
                    </dd>
                  </div>
                </dl>
                <p className="text-xs text-gray-400 mt-4">Auto-refreshes every 3s</p>
              </div>
            </div>

            <PayoutTable payouts={payouts} />
            <LedgerTable entries={ledger} />
          </>
        )}
      </main>
    </div>
  );
}

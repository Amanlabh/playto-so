const STATE_STYLES = {
  pending:    "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  completed:  "bg-green-100 text-green-800",
  failed:     "bg-red-100 text-red-800",
};

const toRupees = (paise) =>
  `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const formatDate = (iso) =>
  new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default function PayoutTable({ payouts }) {
  if (!payouts.length) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center text-gray-500 text-sm">
        No payouts yet
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Payout History</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-right">Amount</th>
              <th className="px-6 py-3 text-center">Status</th>
              <th className="px-6 py-3 text-left">Attempts</th>
              <th className="px-6 py-3 text-left">ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payouts.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 text-gray-600">{formatDate(p.created_at)}</td>
                <td className="px-6 py-3 text-right font-medium text-gray-900">
                  {toRupees(p.amount_paise)}
                </td>
                <td className="px-6 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATE_STYLES[p.state] || ""}`}>
                    {p.state}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-500">{p.attempts}</td>
                <td className="px-6 py-3 text-gray-400 font-mono text-xs truncate max-w-[140px]">
                  {p.id.slice(0, 8)}…
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

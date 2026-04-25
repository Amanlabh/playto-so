const KIND_STYLES = {
  credit: "bg-green-100 text-green-700",
  debit:  "bg-red-100 text-red-700",
  refund: "bg-yellow-100 text-yellow-700",
};

const toRupees = (paise) =>
  `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const formatDate = (iso) =>
  new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default function LedgerTable({ entries }) {
  if (!entries.length) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center text-gray-500 text-sm">
        No transactions yet
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Ledger</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-center">Type</th>
              <th className="px-6 py-3 text-right">Amount</th>
              <th className="px-6 py-3 text-left">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 text-gray-600">{formatDate(e.created_at)}</td>
                <td className="px-6 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${KIND_STYLES[e.kind] || ""}`}>
                    {e.kind}
                  </span>
                </td>
                <td className="px-6 py-3 text-right font-medium text-gray-900">
                  {e.kind === "credit" || e.kind === "refund" ? "+" : "−"}
                  {toRupees(e.amount_paise)}
                </td>
                <td className="px-6 py-3 text-gray-500 truncate max-w-[240px]">
                  {e.description || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

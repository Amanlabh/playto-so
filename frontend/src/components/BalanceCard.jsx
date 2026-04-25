export default function BalanceCard({ merchant }) {
  const toRupees = (paise) =>
    `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const available = merchant.balance_paise;
  const held = merchant.held_balance_paise ?? 0;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <p className="text-sm text-gray-500 mb-1">Available Balance</p>
        <p className="text-3xl font-bold text-gray-900">{toRupees(available)}</p>
        <p className="text-xs text-gray-400 mt-1">{available} paise</p>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-100">
        <p className="text-sm text-amber-600 mb-1">Held Balance</p>
        <p className="text-3xl font-bold text-amber-700">{toRupees(held)}</p>
        <p className="text-xs text-amber-400 mt-1">pending / processing</p>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <p className="text-sm text-gray-500 mb-1">Merchant</p>
        <p className="text-lg font-semibold text-gray-900">{merchant.name}</p>
        <p className="text-xs text-gray-400 mt-1">{merchant.email}</p>
      </div>
    </div>
  );
}

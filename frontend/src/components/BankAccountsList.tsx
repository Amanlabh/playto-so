import type { BankAccount } from "../types";

type BankAccountsListProps = {
  banks?: BankAccount[];
};

export default function BankAccountsList({ banks = [] }: BankAccountsListProps) {
  if (banks.length === 0) {
    return (
      <section className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
          No bank accounts
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Link a bank account to start receiving payouts.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      <header className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Bank Accounts
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {banks.length} linked account{banks.length === 1 ? "" : "s"}
        </p>
      </header>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {banks.map((b) => (
          <li key={b.id} className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  className="h-5 w-5"
                >
                  <path d="M3 10l9-6 9 6" />
                  <path d="M5 10v9h14v-9" />
                  <path d="M9 14v3M12 14v3M15 14v3" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {b.account_holder_name}
                </p>
                <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                  {b.account_number} · {b.ifsc_code}
                </p>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                b.is_active
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60"
                  : "bg-gray-50 text-gray-500 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  b.is_active ? "bg-emerald-500" : "bg-gray-400"
                }`}
              />
              {b.is_active ? "Active" : "Inactive"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

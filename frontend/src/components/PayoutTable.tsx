import { useMemo, useState } from "react";
import { toRupees, formatDate, shortId } from "../lib/format";
import StatusBadge from "./StatusBadge";
import CopyButton from "./CopyButton";
import type { BankAccount, Payout, PayoutState } from "../types";

type PayoutFilter = PayoutState | "all";

type FilterItem = {
  key: PayoutFilter;
  label: string;
};

const FILTERS: FilterItem[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "processing", label: "Processing" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
];

type PayoutCounts = Record<PayoutFilter, number>;

type PayoutTableProps = {
  payouts: Payout[];
  banks?: BankAccount[];
};

export default function PayoutTable({ payouts, banks = [] }: PayoutTableProps) {
  const [filter, setFilter] = useState<PayoutFilter>("all");

  const bankMap = useMemo(() => {
    const m: Record<string, BankAccount> = {};
    for (const b of banks) m[b.id] = b;
    return m;
  }, [banks]);

  const counts = useMemo(() => {
    const c: PayoutCounts = {
      all: payouts.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };
    for (const p of payouts) c[p.state] = (c[p.state] || 0) + 1;
    return c;
  }, [payouts]);

  const filtered = filter === "all" ? payouts : payouts.filter((p) => p.state === filter);

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      <header className="flex flex-col gap-3 border-b border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Payout History
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {filtered.length} of {payouts.length} payouts
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                filter === f.key
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {f.label}
              <span
                className={`ml-1.5 ${
                  filter === f.key
                    ? "text-gray-300 dark:text-gray-500"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {counts[f.key] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </header>

      {filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-950/60 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Created</th>
                <th className="px-6 py-3 text-right font-medium">Amount</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-left font-medium">Bank Account</th>
                <th className="px-6 py-3 text-center font-medium">Attempts</th>
                <th className="px-6 py-3 text-left font-medium">Payout ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((p) => {
                const bank = bankMap[p.bank_account_id];
                return (
                  <tr key={p.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/50">
                    <td className="whitespace-nowrap px-6 py-3 text-gray-700 dark:text-gray-300">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right font-medium text-gray-900 tabular-nums dark:text-gray-100">
                      {toRupees(p.amount_paise)}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col gap-1">
                        <StatusBadge state={p.state} />
                        {p.state === "failed" && p.failure_reason && (
                          <span className="text-xs text-rose-600 dark:text-rose-400">
                            {p.failure_reason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300">
                      {bank ? (
                        <div className="leading-tight">
                          <div className="font-mono text-xs text-gray-900 dark:text-gray-100">
                            {bank.account_number}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {bank.ifsc_code}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span
                        className={`inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md px-1.5 text-xs font-medium ${
                          p.attempts > 1
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {p.attempts}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="font-mono text-xs text-gray-500 dark:text-gray-400"
                          title={p.id}
                        >
                          {shortId(p.id)}
                        </span>
                        <CopyButton value={p.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

type EmptyStateProps = {
  filter: PayoutFilter;
};

function EmptyState({ filter }: EmptyStateProps) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-gray-400 dark:text-gray-500">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-12a.75.75 0 00-1.5 0v4c0 .2.08.39.22.53l2.5 2.5a.75.75 0 101.06-1.06L10.75 9.69V6z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-200">
        No {filter === "all" ? "" : filter} payouts
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        New payouts will appear here as soon as they are requested.
      </p>
    </div>
  );
}

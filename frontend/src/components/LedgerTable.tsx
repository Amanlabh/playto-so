import { useMemo, useState } from "react";
import { toRupees, formatDate, shortId } from "../lib/format";
import CopyButton from "./CopyButton";
import type { LedgerEntry, LedgerEntryWithBalance, LedgerKind } from "../types";

type LedgerFilter = LedgerKind | "all";

type KindStyle = {
  cls: string;
  sign: string;
  amount: string;
  label: string;
};

const KIND_STYLES = {
  credit: {
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
    sign: "+",
    amount: "text-emerald-700 dark:text-emerald-400",
    label: "Credit",
  },
  debit: {
    cls: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/60",
    sign: "−",
    amount: "text-rose-700 dark:text-rose-400",
    label: "Debit",
  },
  refund: {
    cls: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900/60",
    sign: "+",
    amount: "text-sky-700 dark:text-sky-400",
    label: "Refund",
  },
} satisfies Record<LedgerKind, KindStyle>;

const FILTERS: { key: LedgerFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "credit", label: "Credits" },
  { key: "debit", label: "Debits" },
  { key: "refund", label: "Refunds" },
];

type LedgerTableProps = {
  entries: LedgerEntry[];
  currentBalance?: number;
};

export default function LedgerTable({
  entries,
  currentBalance = 0,
}: LedgerTableProps) {
  const [filter, setFilter] = useState<LedgerFilter>("all");

  const counts = useMemo(() => {
    const c: Record<LedgerFilter, number> = {
      all: entries.length,
      credit: 0,
      debit: 0,
      refund: 0,
    };
    for (const e of entries) c[e.kind] = (c[e.kind] || 0) + 1;
    return c;
  }, [entries]);

  const totals = useMemo(() => {
    const t: Record<LedgerKind, number> = { credit: 0, debit: 0, refund: 0 };
    for (const e of entries) t[e.kind] = (t[e.kind] || 0) + e.amount_paise;
    return t;
  }, [entries]);

  const enriched = useMemo<LedgerEntryWithBalance[]>(() => {
    const oldestFirst = [...entries].reverse();
    let running = 0;
    const totalDelta = oldestFirst.reduce(
      (acc, e) => acc + (e.kind === "debit" ? -e.amount_paise : e.amount_paise),
      0
    );
    running = currentBalance - totalDelta;
    const withRunning: LedgerEntryWithBalance[] = oldestFirst.map((e) => {
      running += e.kind === "debit" ? -e.amount_paise : e.amount_paise;
      return { ...e, running_balance_paise: running };
    });
    return withRunning.reverse();
  }, [entries, currentBalance]);

  const filtered =
    filter === "all" ? enriched : enriched.filter((e) => e.kind === filter);

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      <header className="flex flex-col gap-3 border-b border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Ledger
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing {filtered.length} of {entries.length} entries
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

      {entries.length > 0 && (
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50/60 text-center text-xs dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-950/40">
          <div className="px-4 py-3">
            <div className="text-gray-500 dark:text-gray-400">Total Credits</div>
            <div className="mt-0.5 font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
              {toRupees(totals.credit)}
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-gray-500 dark:text-gray-400">Total Debits</div>
            <div className="mt-0.5 font-semibold text-rose-700 tabular-nums dark:text-rose-400">
              {toRupees(totals.debit)}
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-gray-500 dark:text-gray-400">Total Refunds</div>
            <div className="mt-0.5 font-semibold text-sky-700 tabular-nums dark:text-sky-400">
              {toRupees(totals.refund)}
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            No transactions
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Credits, debits, and refunds will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-950/60 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Date</th>
                <th className="px-6 py-3 text-left font-medium">Type</th>
                <th className="px-6 py-3 text-left font-medium">Description</th>
                <th className="px-6 py-3 text-left font-medium">Linked Payout</th>
                <th className="px-6 py-3 text-right font-medium">Amount</th>
                <th className="px-6 py-3 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((e) => {
                const k = KIND_STYLES[e.kind];
                return (
                  <tr key={e.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/50">
                    <td className="whitespace-nowrap px-6 py-3 text-gray-700 dark:text-gray-300">
                      {formatDate(e.created_at)}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${k.cls}`}
                      >
                        {k.label}
                      </span>
                    </td>
                    <td className="max-w-[280px] truncate px-6 py-3 text-gray-700 dark:text-gray-300">
                      {e.description || "—"}
                    </td>
                    <td className="px-6 py-3">
                      {e.payout_id ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-xs text-gray-500 dark:text-gray-400"
                            title={e.payout_id}
                          >
                            {shortId(e.payout_id)}
                          </span>
                          <CopyButton value={e.payout_id} />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td
                      className={`whitespace-nowrap px-6 py-3 text-right font-medium tabular-nums ${k.amount}`}
                    >
                      {k.sign}
                      {toRupees(e.amount_paise)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right text-gray-700 tabular-nums dark:text-gray-300">
                      {toRupees(e.running_balance_paise)}
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

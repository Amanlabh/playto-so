import { useMemo } from "react";
import type { Payout, PayoutState } from "../types";

type Stats = Record<PayoutState, number> & {
  total: number;
};

type StatsCardProps = {
  payouts: Payout[];
};

export default function StatsCard({ payouts }: StatsCardProps) {
  const stats = useMemo(() => {
    const s: Stats = {
      total: payouts.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };
    for (const p of payouts) s[p.state] = (s[p.state] || 0) + 1;
    return s;
  }, [payouts]);

  const successRate =
    stats.total > 0
      ? Math.round((stats.completed / stats.total) * 100)
      : null;

  const rows = [
    { label: "Total Payouts", value: stats.total, color: "text-gray-900 dark:text-gray-100" },
    { label: "Pending", value: stats.pending, color: "text-amber-700 dark:text-amber-400" },
    { label: "Processing", value: stats.processing, color: "text-sky-700 dark:text-sky-400" },
    { label: "Completed", value: stats.completed, color: "text-emerald-700 dark:text-emerald-400" },
    { label: "Failed", value: stats.failed, color: "text-rose-700 dark:text-rose-400" },
  ];

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Activity
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Lifetime payout breakdown
          </p>
        </div>
        {successRate !== null && (
          <div className="text-right">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Success rate
            </div>
            <div className="text-lg font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
              {successRate}%
            </div>
          </div>
        )}
      </div>

      <dl className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between py-2.5 text-sm"
          >
            <dt className="text-gray-600 dark:text-gray-400">{r.label}</dt>
            <dd className={`font-semibold tabular-nums ${r.color}`}>{r.value}</dd>
          </div>
        ))}
      </dl>

      {stats.total > 0 && (
        <div className="mt-4">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            {stats.completed > 0 && (
              <div
                className="bg-emerald-500"
                style={{ width: `${(stats.completed / stats.total) * 100}%` }}
              />
            )}
            {stats.processing > 0 && (
              <div
                className="bg-sky-500"
                style={{ width: `${(stats.processing / stats.total) * 100}%` }}
              />
            )}
            {stats.pending > 0 && (
              <div
                className="bg-amber-500"
                style={{ width: `${(stats.pending / stats.total) * 100}%` }}
              />
            )}
            {stats.failed > 0 && (
              <div
                className="bg-rose-500"
                style={{ width: `${(stats.failed / stats.total) * 100}%` }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

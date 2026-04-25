import type { PayoutState } from "../types";

type StatusStyle = {
  cls: string;
  dot: string;
  label: string;
};

const STYLES = {
  pending: {
    cls: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
    dot: "bg-amber-500",
    label: "Pending",
  },
  processing: {
    cls: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900/60",
    dot: "bg-sky-500 animate-pulse",
    label: "Processing",
  },
  completed: {
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
    dot: "bg-emerald-500",
    label: "Completed",
  },
  failed: {
    cls: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/60",
    dot: "bg-rose-500",
    label: "Failed",
  },
} satisfies Record<PayoutState, StatusStyle>;

type StatusBadgeProps = {
  state: PayoutState;
};

export default function StatusBadge({ state }: StatusBadgeProps) {
  const s = STYLES[state] || {
    cls: "bg-gray-50 text-gray-700 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700",
    dot: "bg-gray-400",
    label: state,
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${s.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

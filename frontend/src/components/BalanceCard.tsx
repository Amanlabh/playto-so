import { toRupees } from "../lib/format";
import type { Merchant } from "../types";

type Accent = "default" | "held" | "total";

type TileProps = {
  label: string;
  value: string;
  sub?: string;
  accent?: Accent;
};

function Tile({ label, value, sub, accent = "default" }: TileProps) {
  const accents = {
    default: {
      ring: "ring-gray-200 dark:ring-gray-800",
      bg: "bg-white dark:bg-gray-900",
      label: "text-gray-500 dark:text-gray-400",
      value: "text-gray-900 dark:text-gray-100",
      sub: "text-gray-400 dark:text-gray-500",
    },
    held: {
      ring: "ring-amber-200 dark:ring-amber-900/60",
      bg: "bg-amber-50/40 dark:bg-amber-950/30",
      label: "text-amber-700 dark:text-amber-400",
      value: "text-amber-900 dark:text-amber-200",
      sub: "text-amber-600/80 dark:text-amber-500/80",
    },
    total: {
      ring: "ring-indigo-200 dark:ring-indigo-500/40",
      bg: "bg-indigo-600 dark:bg-indigo-500",
      label: "text-indigo-200",
      value: "text-white",
      sub: "text-indigo-200/90",
    },
  } satisfies Record<Accent, Record<string, string>>;
  const t = accents[accent];
  return (
    <div className={`rounded-2xl ${t.bg} p-5 ring-1 ring-inset ${t.ring} shadow-sm`}>
      <p className={`text-xs font-medium uppercase tracking-wide ${t.label}`}>
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${t.value}`}>
        {value}
      </p>
      {sub && <p className={`mt-1 text-xs ${t.sub}`}>{sub}</p>}
    </div>
  );
}

type BalanceCardProps = {
  merchant: Merchant;
};

export default function BalanceCard({ merchant }: BalanceCardProps) {
  const available = merchant.balance_paise;
  const held = merchant.held_balance_paise ?? 0;
  const total = available + held;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Tile
        label="Available Balance"
        value={toRupees(available)}
        sub={`${available.toLocaleString("en-IN")} paise`}
      />
      <Tile
        label="Held Balance"
        value={toRupees(held)}
        sub="Reserved for pending / processing payouts"
        accent="held"
      />
      <Tile
        label="Total Balance"
        value={toRupees(total)}
        sub="Available + Held"
        accent="total"
      />
    </div>
  );
}

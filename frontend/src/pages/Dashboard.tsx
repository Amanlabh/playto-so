import { useEffect, useMemo, useState } from "react";
import { getMerchants } from "../api/payouts";
import { useMerchant } from "../hooks/useMerchant";
import { useTheme } from "../hooks/useTheme";
import { cacheGet, cacheSet } from "../lib/cache";
import BalanceCard from "../components/BalanceCard";
import PayoutForm from "../components/PayoutForm";
import PayoutTable from "../components/PayoutTable";
import LedgerTable from "../components/LedgerTable";
import BankAccountsList from "../components/BankAccountsList";
import StatsCard from "../components/StatsCard";
import Sidebar from "../components/Sidebar";
import MobileNav from "../components/MobileNav";
import ThemeToggle from "../components/ThemeToggle";
import { formatTime } from "../lib/format";
import type { Merchant, NavItem, SectionKey } from "../types";

const SECTION_TITLES: Record<SectionKey, { title: string; subtitle: string }> = {
  overview: { title: "Overview", subtitle: "Balances, payout request, and activity" },
  payouts: { title: "Payouts", subtitle: "Track every payout and its lifecycle" },
  ledger: { title: "Ledger", subtitle: "Full credit, debit, and refund history" },
  banks: { title: "Bank Accounts", subtitle: "Linked destinations for payouts" },
};

export default function Dashboard() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [section, setSection] = useState<SectionKey>("overview");
  const { theme, toggle } = useTheme();
  const { merchant, ledger, payouts, loading, error, refresh, refreshedAt } =
    useMerchant(selectedId);

  useEffect(() => {
    const cached = cacheGet<Merchant[]>("merchants");
    if (cached?.length) {
      setMerchants(cached);
      const lastSelected = cacheGet<string>("selectedMerchantId");
      const initialId =
        (lastSelected && cached.find((m) => m.id === lastSelected)?.id) ||
        cached[0].id;
      setSelectedId(initialId);
    }
    getMerchants().then((res) => {
      setMerchants(res.data);
      cacheSet("merchants", res.data);
      if (res.data.length && !selectedId) {
        const lastSelected = cacheGet<string>("selectedMerchantId");
        const initialId =
          (lastSelected && res.data.find((m) => m.id === lastSelected)?.id) ||
          res.data[0].id;
        setSelectedId(initialId);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) cacheSet("selectedMerchantId", selectedId);
  }, [selectedId]);

  const nav = useMemo<NavItem[]>(
    () => [
      { key: "overview", label: "Overview" },
      { key: "payouts", label: "Payouts", count: payouts.length },
      { key: "ledger", label: "Ledger", count: ledger.length },
      {
        key: "banks",
        label: "Bank Accounts",
        count: merchant?.bank_accounts?.length ?? 0,
      },
    ],
    [payouts.length, ledger.length, merchant]
  );

  const meta = SECTION_TITLES[section];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
      <Sidebar
        nav={nav}
        active={section}
        onChange={setSection}
        refreshedAt={refreshedAt}
      />

      <div className="lg:pl-60">
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100 sm:text-lg">
                {meta.title}
              </h1>
              <p className="hidden truncate text-xs text-gray-500 dark:text-gray-400 sm:block">
                {meta.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {refreshedAt && (
                <span className="hidden items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 md:inline-flex">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Updated {formatTime(refreshedAt)}
                </span>
              )}
              <select
                value={selectedId || ""}
                onChange={(e) => setSelectedId(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                {merchants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <ThemeToggle theme={theme} onToggle={toggle} />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:pb-8">
          {error && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </div>
          )}

          {loading && !merchant ? (
            <SkeletonDashboard />
          ) : merchant ? (
            <>
              {section !== "banks" && (
                <section className="mb-6">
                  <div className="mb-3">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {merchant.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {merchant.email}
                    </p>
                  </div>
                  <BalanceCard merchant={merchant} />
                </section>
              )}

              {section === "overview" && (
                <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                  <div className="lg:col-span-3">
                    <PayoutForm
                      key={merchant.id}
                      merchant={merchant}
                      onSuccess={refresh}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <StatsCard payouts={payouts} />
                  </div>
                </section>
              )}

              {section === "payouts" && (
                <PayoutTable payouts={payouts} banks={merchant.bank_accounts} />
              )}

              {section === "ledger" && (
                <LedgerTable
                  entries={ledger}
                  currentBalance={merchant.balance_paise}
                />
              )}

              {section === "banks" && (
                <BankAccountsList banks={merchant.bank_accounts} />
              )}
            </>
          ) : null}
        </main>
      </div>

      <MobileNav nav={nav} active={section} onChange={setSection} />
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="h-64 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 lg:col-span-3 dark:bg-gray-900 dark:ring-gray-800" />
        <div className="h-64 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 lg:col-span-2 dark:bg-gray-900 dark:ring-gray-800" />
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800" />
    </div>
  );
}

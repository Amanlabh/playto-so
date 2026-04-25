import type { ReactNode } from "react";
import type { NavItem, SectionKey } from "../types";

const ICONS = {
  overview: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  payouts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 7h13l-3-3M21 17H8l3 3" />
    </svg>
  ),
  ledger: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M4 5a2 2 0 012-2h12v18H6a2 2 0 01-2-2V5z" />
      <path d="M8 7h7M8 11h7M8 15h5" />
    </svg>
  ),
  banks: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 10l9-6 9 6" />
      <path d="M5 10v9h14v-9" />
      <path d="M9 14v3M12 14v3M15 14v3" />
    </svg>
  ),
} satisfies Record<SectionKey, ReactNode>;

type SidebarProps = {
  nav: NavItem[];
  active: SectionKey;
  onChange: (section: SectionKey) => void;
  refreshedAt: Date | null;
};

export default function Sidebar({
  nav,
  active,
  onChange,
  refreshedAt,
}: SidebarProps) {
  return (
    <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white lg:dark:border-gray-800 lg:dark:bg-gray-950">
      <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
          <span className="text-base font-bold text-white">P</span>
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Playto Pay
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Payout Console
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Workspace
        </p>
        <ul className="space-y-1">
          {nav.map((item) => {
            const isActive = item.key === active;
            return (
              <li key={item.key}>
                <button
                  onClick={() => onChange(item.key)}
                  className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900"
                  }`}
                >
                  <span
                    className={
                      isActive
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-gray-400 dark:text-gray-500"
                    }
                  >
                    {ICONS[item.key] ?? ICONS.overview}
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {typeof item.count === "number" && (
                    <span
                      className={`rounded-full px-1.5 text-xs ${
                        isActive
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-gray-200 px-5 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          {refreshedAt ? (
            <span>
              Live · {refreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          ) : (
            <span>Connecting…</span>
          )}
        </div>
      </div>
    </aside>
  );
}

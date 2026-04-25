import type { NavItem, SectionKey } from "../types";

type MobileNavProps = {
  nav: NavItem[];
  active: SectionKey;
  onChange: (section: SectionKey) => void;
};

export default function MobileNav({ nav, active, onChange }: MobileNavProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
      <ul className="grid grid-cols-4">
        {nav.map((item) => {
          const isActive = item.key === active;
          return (
            <li key={item.key}>
              <button
                onClick={() => onChange(item.key)}
                className={`flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <span className={isActive ? "" : "opacity-80"}>
                  {item.label}
                </span>
                {typeof item.count === "number" && (
                  <span className="text-[10px] opacity-70">{item.count}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

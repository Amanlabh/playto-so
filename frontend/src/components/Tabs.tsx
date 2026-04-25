type TabItem = {
  key: string;
  label: string;
  count?: number;
};

type TabsProps = {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
};

export default function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              isActive
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span>{t.label}</span>
            {typeof t.count === "number" && (
              <span
                className={`rounded-full px-1.5 text-xs ${
                  isActive ? "bg-gray-100 text-gray-600" : "bg-gray-200 text-gray-600"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

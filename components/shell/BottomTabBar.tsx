"use client";

export type BottomTab = "home" | "lessons" | "components" | "reference" | "settings" | "language";

const ITEMS: { id: BottomTab; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "⌂" },
  { id: "lessons", label: "Lessons", icon: "▤" },
  { id: "components", label: "Components", icon: "⚙" },
  { id: "reference", label: "Reference", icon: "⌨" },
  { id: "settings", label: "Settings", icon: "⚑" },
  { id: "language", label: "Language", icon: "A" },
];

export function BottomTabBar({
  active,
  onSelect,
}: {
  active: BottomTab;
  onSelect: (tab: BottomTab) => void;
}) {
  return (
    <nav className="sticky bottom-0 z-40 flex justify-between border-t border-border bg-surface px-1 py-1.5 sm:mx-auto sm:w-full sm:max-w-2xl sm:justify-center sm:gap-2">
      {ITEMS.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium sm:flex-none sm:px-4 ${
              isActive ? "bg-accent/10 text-accent" : "text-muted-ink"
            }`}
          >
            <span aria-hidden="true" className="text-base leading-none">
              {item.icon}
            </span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

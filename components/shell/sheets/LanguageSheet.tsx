"use client";

const LANGUAGES: { code: string; name: string; available: boolean }[] = [
  { code: "EN", name: "English", available: true },
  { code: "AF", name: "Afrikaans", available: false },
  { code: "ZU", name: "isiZulu", available: false },
  { code: "XH", name: "isiXhosa", available: false },
  { code: "TN", name: "Setswana", available: false },
  { code: "ST", name: "Sesotho", available: false },
];

export function LanguageSheetContent({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (code: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          disabled={!lang.available}
          onClick={() => onSelect(lang.code)}
          className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center ${
            active === lang.code ? "border-accent bg-accent/5" : "border-border"
          } ${lang.available ? "" : "opacity-40"}`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
            {lang.code}
          </span>
          <span className="text-xs text-ink">{lang.name}</span>
          {!lang.available && <span className="text-[10px] text-muted-ink">Soon</span>}
        </button>
      ))}
    </div>
  );
}

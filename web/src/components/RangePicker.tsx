export type PresetKey = "1h" | "24h" | "7d" | "30d" | "custom";

interface Props {
  preset: PresetKey;
  customStart: string;
  customEnd: string;
  onPresetChange: (preset: PresetKey) => void;
  onCustomChange: (start: string, end: string) => void;
}

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "1h", label: "1 h" },
  { key: "24h", label: "24 h" },
  { key: "7d", label: "7 j" },
  { key: "30d", label: "30 j" },
  { key: "custom", label: "Personnalisé" },
];

export function RangePicker({ preset, customStart, customEnd, onPresetChange, onCustomChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="glass-pill rounded-full p-1 flex items-center gap-1 border border-white/70">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onPresetChange(p.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
              preset === p.key
                ? "bg-white shadow-sm text-theme-textPrimary"
                : "text-theme-textSecondary hover:text-theme-textPrimary"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-theme-textSecondary">
          <input
            type="datetime-local"
            value={customStart}
            onChange={(e) => onCustomChange(e.target.value, customEnd)}
            className="rounded-xl border border-slate-200 px-2 py-1.5 bg-white"
          />
          <span>→</span>
          <input
            type="datetime-local"
            value={customEnd}
            onChange={(e) => onCustomChange(customStart, e.target.value)}
            className="rounded-xl border border-slate-200 px-2 py-1.5 bg-white"
          />
        </div>
      )}
    </div>
  );
}

export function presetToRange(preset: PresetKey, customStart: string, customEnd: string) {
  if (preset === "custom") {
    return {
      start: customStart ? new Date(customStart).toISOString() : undefined,
      end: customEnd ? new Date(customEnd).toISOString() : undefined,
      limit: 2000,
    };
  }
  const hoursByPreset: Record<Exclude<PresetKey, "custom">, number> = {
    "1h": 1,
    "24h": 24,
    "7d": 24 * 7,
    "30d": 24 * 30,
  };
  const now = new Date();
  const start = new Date(now.getTime() - hoursByPreset[preset] * 3600 * 1000);
  return { start: start.toISOString(), end: now.toISOString(), limit: 2000 };
}

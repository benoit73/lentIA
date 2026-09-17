import type { TimeRange } from "../../api";

interface Props {
  ranges: TimeRange[];
  onChange: (ranges: TimeRange[]) => void;
}

function inputClass() {
  return "rounded-xl border border-slate-200 px-2 py-1.5 bg-white text-theme-textPrimary text-sm";
}

export function ScheduleRangesEditor({ ranges, onChange }: Props) {
  function updateRange(index: number, patch: Partial<TimeRange>) {
    onChange(ranges.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRange(index: number) {
    onChange(ranges.filter((_, i) => i !== index));
  }

  function addRange() {
    onChange([...ranges, { start: "08:00", end: "10:00" }]);
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      {ranges.map((range, i) => (
        <div key={i} className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-theme-textSecondary">
            Début
            <input
              type="time"
              value={range.start}
              onChange={(e) => updateRange(i, { start: e.target.value })}
              className={inputClass()}
            />
          </label>
          <span className="pb-2 text-theme-textSecondary">→</span>
          <label className="flex flex-col gap-1 text-xs font-semibold text-theme-textSecondary">
            Fin
            <input
              type="time"
              value={range.end}
              onChange={(e) => updateRange(i, { end: e.target.value })}
              className={inputClass()}
            />
          </label>
          <button
            type="button"
            onClick={() => removeRange(i)}
            disabled={ranges.length <= 1}
            aria-label="Supprimer cette plage"
            className="mb-1.5 w-7 h-7 rounded-lg text-theme-textSecondary hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRange}
        className="self-start text-xs font-bold text-theme-accent hover:underline"
      >
        + Ajouter une plage
      </button>
    </div>
  );
}

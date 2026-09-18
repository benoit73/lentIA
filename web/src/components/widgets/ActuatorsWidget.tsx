import { Link } from "react-router-dom";
import type { ActuatorState } from "../../api";
import { ACTUATORS } from "../../config";
import { formatRelativeToNow } from "../../format";
import { ToggleSwitch } from "../ToggleSwitch";
import { ACTUATOR_ICONS } from "./icons";
import { WidgetCard } from "./WidgetCard";

interface Props {
  states: Record<string, ActuatorState>;
  pending: string | null;
  onToggle: (key: string, next: boolean) => void;
  error?: string | null;
  delayMs?: number;
  className?: string;
}

export function ActuatorsWidget({ states, pending, onToggle, error, delayMs = 0, className }: Props) {
  return (
    <WidgetCard
      title="Actionneurs"
      subtitle="Pilotage direct — les règles peuvent reprendre la main"
      pill={
        <Link
          to="/automatisation"
          className="shrink-0 rounded-full bg-white/70 px-3 py-1.5 text-xs font-bold text-theme-accent hover:bg-white whitespace-nowrap"
        >
          Automatisation →
        </Link>
      }
      delayMs={delayMs}
      className={className}
    >
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {ACTUATORS.map((actuator) => {
          const current = states[actuator.key];
          const on = current?.state ?? false;
          const Icon = ACTUATOR_ICONS[actuator.key];

          return (
            <div
              key={actuator.key}
              className={`relative rounded-2xl p-4 transition-colors duration-300 ${
                on ? "bg-white shadow-sm" : "bg-white/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="relative flex items-center justify-center">
                  {on && <span className="soft-pulse absolute w-10 h-10 rounded-full bg-amber-300/40 blur-md" />}
                  <span
                    className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                      on ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-theme-textMuted"
                    }`}
                  >
                    {Icon && <Icon />}
                  </span>
                </span>
                <ToggleSwitch
                  checked={on}
                  onChange={(next) => onToggle(actuator.key, next)}
                  disabled={pending === actuator.key}
                  label={actuator.label}
                />
              </div>

              <p className="mt-3 font-bold text-sm text-theme-textPrimary">{actuator.label}</p>
              <p className={`text-[11px] font-bold ${on ? "text-emerald-600" : "text-theme-textMuted"}`}>
                {on ? "Allumé" : "Éteint"}
              </p>
              <p className="mt-0.5 text-[11px] text-theme-textSecondary">
                {current?.updated_at ? formatRelativeToNow(current.updated_at) : "jamais commandé"}
              </p>
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
}

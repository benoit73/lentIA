import { useEffect, useMemo, useState } from "react";
import { fetchActuatorEvents, type ActuatorEvent } from "../api";
import { useAuth } from "../auth/AuthContext";
import { PresetKey, presetToRange, RangePicker } from "../components/RangePicker";
import { TopBar } from "../components/TopBar";
import { ACTUATORS } from "../config";
import { formatDateTime, formatDuration } from "../format";

export function JournalPage() {
  const { token } = useAuth();

  const [actuatorFilter, setActuatorFilter] = useState<string>("all");
  const [preset, setPreset] = useState<PresetKey>("24h");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [events, setEvents] = useState<ActuatorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => presetToRange(preset, customStart, customEnd), [preset, customStart, customEnd]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    fetchActuatorEvents(token, {
      actuator: actuatorFilter === "all" ? undefined : actuatorFilter,
      start: range.start,
      end: range.end,
      limit: 200,
    })
      .then(setEvents)
      .catch(() => setError("Impossible de charger le journal."))
      .finally(() => setLoading(false));
  }, [token, actuatorFilter, range.start, range.end]);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 pb-20">
      <TopBar />

      <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-bold text-sm text-theme-textSecondary uppercase tracking-wide">Journal des actions</h2>
        <RangePicker
          preset={preset}
          customStart={customStart}
          customEnd={customEnd}
          onPresetChange={setPreset}
          onCustomChange={(start, end) => {
            setCustomStart(start);
            setCustomEnd(end);
          }}
        />
      </div>

      <div className="mt-3 glass-pill inline-flex rounded-full p-1 items-center gap-1 border border-white/70">
        <button
          type="button"
          onClick={() => setActuatorFilter("all")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
            actuatorFilter === "all"
              ? "bg-white shadow-sm text-theme-textPrimary"
              : "text-theme-textSecondary hover:text-theme-textPrimary"
          }`}
        >
          Tous
        </button>
        {ACTUATORS.map((actuator) => (
          <button
            key={actuator.key}
            type="button"
            onClick={() => setActuatorFilter(actuator.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
              actuatorFilter === actuator.key
                ? "bg-white shadow-sm text-theme-textPrimary"
                : "text-theme-textSecondary hover:text-theme-textPrimary"
            }`}
          >
            {actuator.label}
          </button>
        ))}
      </div>

      <div className="mt-4 bg-theme-card rounded-3xl p-5 shadow-soft-card">
        {loading && <p className="text-sm text-theme-textSecondary">Chargement…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && events.length === 0 && (
          <p className="text-sm text-theme-textSecondary">Aucune action sur cette période.</p>
        )}
        {!loading && !error && events.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-theme-textSecondary border-b border-slate-200/70">
                  <th className="py-2 pr-3 font-bold">Actionneur</th>
                  <th className="py-2 pr-3 font-bold">Action</th>
                  <th className="py-2 pr-3 font-bold">Mode</th>
                  <th className="py-2 pr-3 font-bold">Par</th>
                  <th className="py-2 pr-3 font-bold">Quand</th>
                  <th className="py-2 pr-3 font-bold">Durée</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const actuator = ACTUATORS.find((a) => a.key === event.actuator);
                  return (
                    <tr key={event.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3 font-bold text-theme-textPrimary whitespace-nowrap">
                        {actuator?.label ?? event.actuator}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <span className={event.state ? "text-emerald-600 font-semibold" : "text-theme-textSecondary"}>
                          {event.state ? "Activé" : "Désactivé"}
                        </span>
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            event.source === "manual"
                              ? "bg-theme-accent/10 text-theme-accent"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {event.source === "manual" ? "Manuel" : "Auto"}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-theme-textSecondary whitespace-nowrap">
                        {event.actor_email ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-theme-textSecondary whitespace-nowrap">
                        {formatDateTime(event.created_at)}
                      </td>
                      <td className="py-2 pr-3 text-theme-textSecondary whitespace-nowrap">
                        {formatDuration(event.duration_seconds)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

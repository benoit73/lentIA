import { useEffect, useState } from "react";
import {
  ApiError,
  fetchAutomationRules,
  saveAutomationRule,
  type AutomationRule,
  type ScheduleConfig,
  type ThresholdConfig,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import { ToggleSwitch } from "../components/ToggleSwitch";
import { TopBar } from "../components/TopBar";

interface ScheduleForm {
  enabled: boolean;
  start: string;
  end: string;
}

interface ThresholdForm {
  enabled: boolean;
  sensor: string;
  comparator: "above" | "below";
  threshold: string; // texte pour l'input, converti au moment d'enregistrer
  windowMinutes: string;
}

const DEFAULT_LIGHT: ScheduleForm = { enabled: false, start: "06:00", end: "22:00" };
const DEFAULT_WATERING: ThresholdForm = {
  enabled: false,
  sensor: "soil_humidity",
  comparator: "below",
  threshold: "35",
  windowMinutes: "60",
};
const DEFAULT_VENTILATION: ThresholdForm = {
  enabled: false,
  sensor: "temperature",
  comparator: "above",
  threshold: "28",
  windowMinutes: "15",
};

function toScheduleForm(rule: AutomationRule | undefined, fallback: ScheduleForm): ScheduleForm {
  if (!rule || rule.rule_type !== "schedule") return fallback;
  const config = rule.config as ScheduleConfig;
  return { enabled: rule.enabled, start: config.start, end: config.end };
}

function toThresholdForm(rule: AutomationRule | undefined, fallback: ThresholdForm): ThresholdForm {
  if (!rule || rule.rule_type !== "threshold") return fallback;
  const config = rule.config as ThresholdConfig;
  return {
    enabled: rule.enabled,
    sensor: config.sensor,
    comparator: config.comparator,
    threshold: String(config.threshold),
    windowMinutes: String(config.window_minutes),
  };
}

function inputClass() {
  return "rounded-xl border border-slate-200 px-2 py-1.5 bg-white text-theme-textPrimary text-sm";
}

export function AutomationPage() {
  const { token, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lightForm, setLightForm] = useState<ScheduleForm>(DEFAULT_LIGHT);
  const [wateringForm, setWateringForm] = useState<ThresholdForm>(DEFAULT_WATERING);
  const [ventilationForm, setVentilationForm] = useState<ThresholdForm>(DEFAULT_VENTILATION);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) return;
    fetchAutomationRules(token)
      .then((rules) => {
        setLightForm(toScheduleForm(rules.light, DEFAULT_LIGHT));
        setWateringForm(toThresholdForm(rules.watering, DEFAULT_WATERING));
        setVentilationForm(toThresholdForm(rules.ventilation, DEFAULT_VENTILATION));
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) signOut();
      })
      .finally(() => setLoading(false));
  }, [token, signOut]);

  async function saveSchedule(actuator: string, form: ScheduleForm) {
    if (!token) return;
    setSavingKey(actuator);
    setMessages((m) => ({ ...m, [actuator]: "" }));
    try {
      await saveAutomationRule(token, actuator, {
        enabled: form.enabled,
        rule_type: "schedule",
        config: { start: form.start, end: form.end },
      });
      setMessages((m) => ({ ...m, [actuator]: "Enregistré." }));
    } catch {
      setMessages((m) => ({ ...m, [actuator]: "Échec de l'enregistrement." }));
    } finally {
      setSavingKey(null);
    }
  }

  async function saveThreshold(actuator: string, form: ThresholdForm) {
    if (!token) return;
    const threshold = Number(form.threshold);
    const windowMinutes = Number(form.windowMinutes);
    if (!Number.isFinite(threshold) || !Number.isFinite(windowMinutes) || windowMinutes <= 0) {
      setMessages((m) => ({ ...m, [actuator]: "Seuil ou fenêtre invalide." }));
      return;
    }
    setSavingKey(actuator);
    setMessages((m) => ({ ...m, [actuator]: "" }));
    try {
      await saveAutomationRule(token, actuator, {
        enabled: form.enabled,
        rule_type: "threshold",
        config: { sensor: form.sensor, comparator: form.comparator, threshold, window_minutes: windowMinutes },
      });
      setMessages((m) => ({ ...m, [actuator]: "Enregistré." }));
    } catch {
      setMessages((m) => ({ ...m, [actuator]: "Échec de l'enregistrement." }));
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 pb-20">
      <TopBar />

      <div className="mt-5">
        <h2 className="font-bold text-sm text-theme-textSecondary uppercase tracking-wide">Automatisation</h2>
        <p className="mt-1 text-xs text-theme-textSecondary max-w-2xl">
          Ces règles sont vérifiées côté serveur toutes les ~30 secondes et déclenchent les mêmes commandes MQTT
          qu'un interrupteur manuel — visibles dans le journal avec le mode « Auto ». Si tu changes un actionneur
          à la main pendant qu'une règle est active, la règle peut le reprendre au prochain contrôle : désactive-la
          si tu veux garder la main.
        </p>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-theme-textSecondary">Chargement…</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
          {/* Lumière : plage horaire */}
          <div className="bg-theme-card rounded-3xl p-5 shadow-soft-card flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-theme-textPrimary">Lumière</h3>
                <p className="text-xs text-theme-textSecondary mt-0.5">Allumer sur une plage horaire fixe</p>
              </div>
              <ToggleSwitch
                checked={lightForm.enabled}
                onChange={(next) => setLightForm((f) => ({ ...f, enabled: next }))}
                label="Automatisation lumière"
              />
            </div>

            <div className="mt-4 flex items-end gap-2">
              <label className="flex flex-col gap-1 text-xs font-semibold text-theme-textSecondary">
                Début
                <input
                  type="time"
                  value={lightForm.start}
                  onChange={(e) => setLightForm((f) => ({ ...f, start: e.target.value }))}
                  className={inputClass()}
                />
              </label>
              <span className="pb-2 text-theme-textSecondary">→</span>
              <label className="flex flex-col gap-1 text-xs font-semibold text-theme-textSecondary">
                Fin
                <input
                  type="time"
                  value={lightForm.end}
                  onChange={(e) => setLightForm((f) => ({ ...f, end: e.target.value }))}
                  className={inputClass()}
                />
              </label>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                disabled={savingKey === "light"}
                onClick={() => saveSchedule("light", lightForm)}
                className="px-4 py-2 rounded-xl bg-theme-accent text-white text-xs font-bold disabled:opacity-50"
              >
                Enregistrer
              </button>
              {messages.light && <span className="text-xs text-theme-textSecondary">{messages.light}</span>}
            </div>
          </div>

          {/* Arrosage : humidité du sol moyenne */}
          <div className="bg-theme-card rounded-3xl p-5 shadow-soft-card flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-theme-textPrimary">Arrosage</h3>
                <p className="text-xs text-theme-textSecondary mt-0.5">
                  Arroser si l'humidité du sol moyenne passe sous le seuil
                </p>
              </div>
              <ToggleSwitch
                checked={wateringForm.enabled}
                onChange={(next) => setWateringForm((f) => ({ ...f, enabled: next }))}
                label="Automatisation arrosage"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs font-semibold text-theme-textSecondary">
                Seuil (%)
                <input
                  type="number"
                  value={wateringForm.threshold}
                  onChange={(e) => setWateringForm((f) => ({ ...f, threshold: e.target.value }))}
                  className={inputClass()}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-theme-textSecondary">
                Fenêtre (min)
                <input
                  type="number"
                  value={wateringForm.windowMinutes}
                  onChange={(e) => setWateringForm((f) => ({ ...f, windowMinutes: e.target.value }))}
                  className={inputClass()}
                />
              </label>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                disabled={savingKey === "watering"}
                onClick={() => saveThreshold("watering", wateringForm)}
                className="px-4 py-2 rounded-xl bg-theme-accent text-white text-xs font-bold disabled:opacity-50"
              >
                Enregistrer
              </button>
              {messages.watering && <span className="text-xs text-theme-textSecondary">{messages.watering}</span>}
            </div>
          </div>

          {/* Ventilation : temperature ou humidite de l'air, au choix */}
          <div className="bg-theme-card rounded-3xl p-5 shadow-soft-card flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-theme-textPrimary">Ventilation</h3>
                <p className="text-xs text-theme-textSecondary mt-0.5">
                  Ventiler si la moyenne choisie dépasse le seuil
                </p>
              </div>
              <ToggleSwitch
                checked={ventilationForm.enabled}
                onChange={(next) => setVentilationForm((f) => ({ ...f, enabled: next }))}
                label="Automatisation ventilation"
              />
            </div>

            <label className="mt-4 flex flex-col gap-1 text-xs font-semibold text-theme-textSecondary">
              Capteur
              <select
                value={ventilationForm.sensor}
                onChange={(e) => setVentilationForm((f) => ({ ...f, sensor: e.target.value }))}
                className={inputClass()}
              >
                <option value="temperature">Température</option>
                <option value="air_humidity">Humidité de l'air</option>
              </select>
            </label>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs font-semibold text-theme-textSecondary">
                Seuil {ventilationForm.sensor === "temperature" ? "(°C)" : "(%)"}
                <input
                  type="number"
                  value={ventilationForm.threshold}
                  onChange={(e) => setVentilationForm((f) => ({ ...f, threshold: e.target.value }))}
                  className={inputClass()}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-theme-textSecondary">
                Fenêtre (min)
                <input
                  type="number"
                  value={ventilationForm.windowMinutes}
                  onChange={(e) => setVentilationForm((f) => ({ ...f, windowMinutes: e.target.value }))}
                  className={inputClass()}
                />
              </label>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                disabled={savingKey === "ventilation"}
                onClick={() => saveThreshold("ventilation", ventilationForm)}
                className="px-4 py-2 rounded-xl bg-theme-accent text-white text-xs font-bold disabled:opacity-50"
              >
                Enregistrer
              </button>
              {messages.ventilation && (
                <span className="text-xs text-theme-textSecondary">{messages.ventilation}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

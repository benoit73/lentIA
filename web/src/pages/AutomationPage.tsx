import { useEffect, useState } from "react";
import {
  ApiError,
  fetchAutomationRules,
  saveAutomationRule,
  type AutomationRule,
  type ScheduleConfig,
  type ThresholdConfig,
  type TimeRange,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import { FlexibleActuatorCard, type FlexibleForm } from "../components/automation/FlexibleActuatorCard";
import { ScheduleRangesEditor } from "../components/automation/ScheduleRangesEditor";
import { ToggleSwitch } from "../components/ToggleSwitch";
import { TopBar } from "../components/TopBar";

interface ScheduleOnlyForm {
  enabled: boolean;
  ranges: TimeRange[];
}

const DEFAULT_LIGHT: ScheduleOnlyForm = {
  enabled: false,
  ranges: [{ start: "06:00", end: "22:00" }],
};

const DEFAULT_WATERING: FlexibleForm = {
  enabled: false,
  ruleType: "threshold",
  ranges: [{ start: "07:00", end: "07:05" }],
  threshold: {
    sensor: "soil_humidity",
    comparator: "below",
    threshold: "35",
    actionMode: "duration",
    durationMinutes: "5",
    targetValue: "55",
  },
};

const DEFAULT_VENTILATION: FlexibleForm = {
  enabled: false,
  ruleType: "threshold",
  ranges: [{ start: "12:00", end: "14:00" }],
  threshold: {
    sensor: "temperature",
    comparator: "above",
    threshold: "28",
    actionMode: "duration",
    durationMinutes: "10",
    targetValue: "24",
  },
};

const DEFAULT_HEATING: FlexibleForm = {
  enabled: false,
  ruleType: "threshold",
  ranges: [{ start: "20:00", end: "06:00" }],
  threshold: {
    sensor: "temperature",
    comparator: "below",
    threshold: "18",
    actionMode: "duration",
    durationMinutes: "15",
    targetValue: "21",
  },
};

// Une règle en base peut venir d'un ancien schéma (avant la refonte
// plage/seuil multi-plages) : on retombe sur les valeurs par défaut plutôt
// que de planter si la forme ne correspond pas à ce qu'on attend.
function isValidRanges(ranges: unknown): ranges is TimeRange[] {
  return (
    Array.isArray(ranges) &&
    ranges.length > 0 &&
    ranges.every((r) => r && typeof r === "object" && typeof (r as TimeRange).start === "string" && typeof (r as TimeRange).end === "string")
  );
}

function isValidThresholdConfig(config: unknown): config is ThresholdConfig {
  if (!config || typeof config !== "object") return false;
  const c = config as ThresholdConfig;
  return (
    typeof c.sensor === "string" &&
    (c.comparator === "above" || c.comparator === "below") &&
    typeof c.threshold === "number" &&
    (c.action_mode === "duration" || c.action_mode === "until_target")
  );
}

function toScheduleOnlyForm(rule: AutomationRule | undefined, fallback: ScheduleOnlyForm): ScheduleOnlyForm {
  if (!rule || rule.rule_type !== "schedule") return fallback;
  const config = rule.config as ScheduleConfig;
  if (!isValidRanges(config?.ranges)) return fallback;
  return { enabled: rule.enabled, ranges: config.ranges };
}

function toFlexibleForm(rule: AutomationRule | undefined, fallback: FlexibleForm): FlexibleForm {
  if (!rule) return fallback;
  if (rule.rule_type === "schedule") {
    const config = rule.config as ScheduleConfig;
    if (!isValidRanges(config?.ranges)) return fallback;
    return { ...fallback, enabled: rule.enabled, ruleType: "schedule", ranges: config.ranges };
  }
  if (!isValidThresholdConfig(rule.config)) return fallback;
  const config = rule.config;
  return {
    ...fallback,
    enabled: rule.enabled,
    ruleType: "threshold",
    threshold: {
      sensor: config.sensor,
      comparator: config.comparator,
      threshold: String(config.threshold),
      actionMode: config.action_mode,
      durationMinutes: config.duration_minutes !== undefined ? String(config.duration_minutes) : fallback.threshold.durationMinutes,
      targetValue: config.target_value !== undefined ? String(config.target_value) : fallback.threshold.targetValue,
    },
  };
}

export function AutomationPage() {
  const { token, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lightForm, setLightForm] = useState<ScheduleOnlyForm>(DEFAULT_LIGHT);
  const [wateringForm, setWateringForm] = useState<FlexibleForm>(DEFAULT_WATERING);
  const [ventilationForm, setVentilationForm] = useState<FlexibleForm>(DEFAULT_VENTILATION);
  const [heatingForm, setHeatingForm] = useState<FlexibleForm>(DEFAULT_HEATING);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) return;
    fetchAutomationRules(token)
      .then((rules) => {
        setLightForm(toScheduleOnlyForm(rules.light, DEFAULT_LIGHT));
        setWateringForm(toFlexibleForm(rules.watering, DEFAULT_WATERING));
        setVentilationForm(toFlexibleForm(rules.ventilation, DEFAULT_VENTILATION));
        setHeatingForm(toFlexibleForm(rules.heating, DEFAULT_HEATING));
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) signOut();
      })
      .finally(() => setLoading(false));
  }, [token, signOut]);

  async function saveLight() {
    if (!token) return;
    setSavingKey("light");
    setMessages((m) => ({ ...m, light: "" }));
    try {
      await saveAutomationRule(token, "light", {
        enabled: lightForm.enabled,
        rule_type: "schedule",
        config: { ranges: lightForm.ranges },
      });
      setMessages((m) => ({ ...m, light: "Enregistré." }));
    } catch (err) {
      setMessages((m) => ({
        ...m,
        light: err instanceof ApiError ? err.message : "Échec de l'enregistrement.",
      }));
    } finally {
      setSavingKey(null);
    }
  }

  async function saveFlexible(actuator: string, form: FlexibleForm) {
    if (!token) return;

    let config: ScheduleConfig | ThresholdConfig;
    if (form.ruleType === "schedule") {
      config = { ranges: form.ranges };
    } else {
      const threshold = Number(form.threshold.threshold);
      if (!Number.isFinite(threshold)) {
        setMessages((m) => ({ ...m, [actuator]: "Seuil invalide." }));
        return;
      }
      if (form.threshold.actionMode === "duration") {
        const durationMinutes = Number(form.threshold.durationMinutes);
        if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
          setMessages((m) => ({ ...m, [actuator]: "Durée invalide." }));
          return;
        }
        config = {
          sensor: form.threshold.sensor,
          comparator: form.threshold.comparator,
          threshold,
          action_mode: "duration",
          duration_minutes: durationMinutes,
        };
      } else {
        const targetValue = Number(form.threshold.targetValue);
        if (!Number.isFinite(targetValue)) {
          setMessages((m) => ({ ...m, [actuator]: "Valeur cible invalide." }));
          return;
        }
        config = {
          sensor: form.threshold.sensor,
          comparator: form.threshold.comparator,
          threshold,
          action_mode: "until_target",
          target_value: targetValue,
        };
      }
    }

    setSavingKey(actuator);
    setMessages((m) => ({ ...m, [actuator]: "" }));
    try {
      await saveAutomationRule(token, actuator, { enabled: form.enabled, rule_type: form.ruleType, config });
      setMessages((m) => ({ ...m, [actuator]: "Enregistré." }));
    } catch (err) {
      setMessages((m) => ({
        ...m,
        [actuator]: err instanceof ApiError ? err.message : "Échec de l'enregistrement.",
      }));
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
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
          {/* Lumière : plage(s) horaire(s) uniquement */}
          <div className="bg-theme-card rounded-3xl p-5 shadow-soft-card flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-theme-textPrimary">Lumière</h3>
                <p className="text-xs text-theme-textSecondary mt-0.5">
                  Allumer sur une ou plusieurs plages horaires (non chevauchantes)
                </p>
              </div>
              <ToggleSwitch
                checked={lightForm.enabled}
                onChange={(next) => setLightForm((f) => ({ ...f, enabled: next }))}
                label="Automatisation lumière"
              />
            </div>

            <ScheduleRangesEditor ranges={lightForm.ranges} onChange={(ranges) => setLightForm((f) => ({ ...f, ranges }))} />

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                disabled={savingKey === "light"}
                onClick={saveLight}
                className="px-4 py-2 rounded-xl bg-theme-accent text-white text-xs font-bold disabled:opacity-50"
              >
                Enregistrer
              </button>
              {messages.light && <span className="text-xs text-theme-textSecondary">{messages.light}</span>}
            </div>
          </div>

          <FlexibleActuatorCard
            title="Arrosage"
            description="Seuil sur l'humidité du sol, ou plage(s) horaire(s)"
            form={wateringForm}
            onChange={setWateringForm}
            onSave={() => saveFlexible("watering", wateringForm)}
            saving={savingKey === "watering"}
            message={messages.watering}
            sensorOptions={[{ value: "soil_humidity", label: "Humidité du sol" }]}
            unit="%"
          />

          <FlexibleActuatorCard
            title="Ventilation"
            description="Seuil sur la température ou l'humidité de l'air, ou plage(s) horaire(s)"
            form={ventilationForm}
            onChange={setVentilationForm}
            onSave={() => saveFlexible("ventilation", ventilationForm)}
            saving={savingKey === "ventilation"}
            message={messages.ventilation}
            sensorOptions={[
              { value: "temperature", label: "Température" },
              { value: "air_humidity", label: "Humidité de l'air" },
            ]}
            unit={ventilationForm.threshold.sensor === "temperature" ? "°C" : "%"}
          />

          <FlexibleActuatorCard
            title="Chauffage"
            description="Seuil sur la température, ou plage(s) horaire(s)"
            form={heatingForm}
            onChange={setHeatingForm}
            onSave={() => saveFlexible("heating", heatingForm)}
            saving={savingKey === "heating"}
            message={messages.heating}
            sensorOptions={[{ value: "temperature", label: "Température" }]}
            unit="°C"
          />
        </div>
      )}
    </div>
  );
}

// Client API : toujours des chemins relatifs (/api/..., /ws/...) — en dev,
// vite.config.ts les proxifie vers l'API Flask locale ; en prod (Docker),
// c'est nginx qui fait ce travail (voir web/nginx.conf). Le navigateur ne
// connaît donc jamais l'adresse réelle de l'API.

export interface HistoryPoint {
  value: number | null;
  created_at: string;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function authedFetch(token: string, path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(path, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) {
    throw new ApiError(res.status, "Session expirée ou accès refusé");
  }
  if (!res.ok) {
    const message = await res
      .clone()
      .json()
      .then((body) => (typeof body?.error === "string" ? body.error : undefined))
      .catch(() => undefined);
    throw new ApiError(res.status, message ?? "Erreur API");
  }
  return res;
}

export interface HistoryRange {
  limit?: number;
  start?: string;
  end?: string;
}

export async function fetchSensorHistory(
  token: string,
  sensor: string,
  range: HistoryRange = {},
): Promise<HistoryPoint[]> {
  const qs = new URLSearchParams();
  if (range.limit) qs.set("limit", String(range.limit));
  if (range.start) qs.set("start", range.start);
  if (range.end) qs.set("end", range.end);

  const res = await authedFetch(token, `/api/sensors/${sensor}/history?${qs.toString()}`);
  return res.json();
}

export function sensorWebSocketUrl(sensor: string, token: string): string {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${location.host}/ws/sensors/${sensor}?token=${encodeURIComponent(token)}`;
}

export interface ActuatorState {
  state: boolean;
  updated_at: string | null;
}

export type ActuatorSource = "manual" | "auto";

export interface ActuatorEvent {
  id: number;
  actuator: string;
  state: boolean;
  actor_email: string | null;
  source: ActuatorSource;
  created_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

export interface ActuatorEventsQuery {
  actuator?: string;
  start?: string;
  end?: string;
  limit?: number;
}

export async function fetchActuatorStates(token: string): Promise<Record<string, ActuatorState>> {
  const res = await authedFetch(token, "/api/actuators/state");
  return res.json();
}

export async function fetchActuatorEvents(token: string, query: ActuatorEventsQuery = {}): Promise<ActuatorEvent[]> {
  const qs = new URLSearchParams();
  if (query.actuator) qs.set("actuator", query.actuator);
  if (query.start) qs.set("start", query.start);
  if (query.end) qs.set("end", query.end);
  if (query.limit) qs.set("limit", String(query.limit));

  const res = await authedFetch(token, `/api/actuators/events?${qs.toString()}`);
  return res.json();
}

export async function toggleActuator(token: string, actuator: string, on: boolean): Promise<void> {
  await authedFetch(token, `/api/actuators/${actuator}/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ on }),
  });
}

export type RuleType = "schedule" | "threshold" | "schedule_threshold";
export type ActionMode = "duration" | "until_target";

export interface TimeRange {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

export interface ScheduleConfig {
  ranges: TimeRange[]; // non chevauchantes (validé côté serveur)
}

export interface ThresholdConfig {
  sensor: string;
  comparator: "above" | "below";
  threshold: number;
  action_mode: ActionMode;
  duration_minutes?: number; // si action_mode === "duration"
  target_value?: number; // si action_mode === "until_target"
}

// Lumière d'appoint : allumée seulement dans une des plages ET quand la
// moyenne du capteur ne dépasse pas (ou dépasse, selon comparator) le seuil.
export interface ScheduleThresholdConfig {
  ranges: TimeRange[];
  sensor: string;
  comparator: "above" | "below";
  threshold: number;
}

export interface AutomationRule {
  actuator: string;
  enabled: boolean;
  rule_type: RuleType;
  config: ScheduleConfig | ThresholdConfig | ScheduleThresholdConfig;
  updated_by: string | null;
  updated_at: string;
}

export async function fetchAutomationRules(token: string): Promise<Record<string, AutomationRule>> {
  const res = await authedFetch(token, "/api/automation/rules");
  return res.json();
}

export interface GerminationPrediction {
  chance_pct: number;
  based_on: Record<string, number>;
}

export async function fetchGerminationChance(token: string): Promise<GerminationPrediction> {
  const res = await authedFetch(token, "/api/prediction/germination");
  return res.json();
}

export interface SensorRecommendation {
  recommended_value: number;
  predicted_chance_pct: number;
}

export interface GerminationRecommendations {
  based_on: Record<string, number>;
  recommendations: Record<string, SensorRecommendation>;
}

export async function fetchGerminationRecommendations(token: string): Promise<GerminationRecommendations> {
  const res = await authedFetch(token, "/api/prediction/recommendations");
  return res.json();
}

export async function saveAutomationRule(
  token: string,
  actuator: string,
  rule: { enabled: boolean; rule_type: RuleType; config: ScheduleConfig | ThresholdConfig | ScheduleThresholdConfig },
): Promise<AutomationRule> {
  const res = await authedFetch(token, `/api/automation/rules/${actuator}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rule),
  });
  return res.json();
}

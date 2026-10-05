import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { fetchActuatorEvents, type ActuatorEvent } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { Page } from "../../components/Page";
import { presetToRange, RangePicker, type PresetKey } from "../../components/RangePicker";
import { Card, SectionTitle, Segmented, T } from "../../components/ui";
import { ACTUATOR_POLL_MS, ACTUATORS } from "../../config";
import { formatDateTime, formatDuration } from "../../format";
import { usePolling } from "../../hooks/usePolling";
import { colors } from "../../theme";

const FILTERS = [{ key: "all", label: "Tous" }, ...ACTUATORS.map((a) => ({ key: a.key, label: a.label }))];

export default function JournalPage() {
  const { token } = useAuth();

  const [actuatorFilter, setActuatorFilter] = useState<string>("all");
  const [preset, setPreset] = useState<PresetKey>("24h");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);

  const [events, setEvents] = useState<ActuatorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => presetToRange(preset, customStart, customEnd), [preset, customStart, customEnd]);
  // Sur un préréglage relatif (1h/24h/7j/30j), `range.end` est figé au moment
  // choisi : on l'ignore pour ne pas exclure les actions faites depuis, sinon
  // le polling ne les ferait jamais apparaître. En "Personnalisé", la plage
  // est volontairement figée dans le passé, on la respecte telle quelle.
  const live = preset !== "custom";

  const load = useCallback(() => {
    if (!token) return;
    setError(null);
    fetchActuatorEvents(token, {
      actuator: actuatorFilter === "all" ? undefined : actuatorFilter,
      start: range.start,
      end: live ? undefined : range.end,
      limit: 200,
    })
      .then(setEvents)
      .catch(() => setError("Impossible de charger le journal."))
      .finally(() => setLoading(false));
  }, [token, actuatorFilter, range.start, range.end, live]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Pas de canal temps réel pour le journal : on repasse régulièrement pour
  // voir apparaître les actions manuelles ou automatiques faites entre-temps.
  usePolling(load, ACTUATOR_POLL_MS);

  return (
    <Page>
      <SectionTitle>Journal des actions</SectionTitle>
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
      <Segmented options={FILTERS} value={actuatorFilter} onChange={setActuatorFilter} />

      <Card>
        {loading && (
          <T size={13} color={colors.textSecondary}>
            Chargement…
          </T>
        )}
        {error && (
          <T size={13} color={colors.red600}>
            {error}
          </T>
        )}
        {!loading && !error && events.length === 0 && (
          <T size={13} color={colors.textSecondary}>
            Aucune action sur cette période.
          </T>
        )}
        {!loading &&
          !error &&
          events.map((event, i) => {
            const actuator = ACTUATORS.find((a) => a.key === event.actuator);
            const manual = event.source === "manual";
            return (
              <View key={event.id} style={[styles.row, i > 0 && styles.divider]}>
                <View style={styles.line}>
                  <T weight="bold" size={14} style={{ flexShrink: 1 }}>
                    {actuator?.label ?? event.actuator}{" "}
                    <T weight={event.state ? "semibold" : "regular"} size={14} color={event.state ? colors.emerald600 : colors.textSecondary}>
                      {event.state ? "Activé" : "Désactivé"}
                    </T>
                  </T>
                  <View style={[styles.badge, { backgroundColor: manual ? colors.accentSoft : colors.emerald100 }]}>
                    <T weight="bold" size={11} color={manual ? colors.accent : colors.emerald700}>
                      {manual ? "Manuel" : "Auto"}
                    </T>
                  </View>
                </View>
                <T size={12} color={colors.textSecondary}>
                  {formatDateTime(event.created_at)} · durée {formatDuration(event.duration_seconds)}
                </T>
                <T size={12} color={colors.textMuted} numberOfLines={1}>
                  Par {event.actor_email ?? "—"}
                </T>
              </View>
            );
          })}
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 10, gap: 2 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(226,232,240,0.9)" },
  line: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
});

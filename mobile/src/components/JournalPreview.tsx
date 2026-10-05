import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { fetchActuatorEvents, type ActuatorEvent } from "../api";
import { useAuth } from "../auth/AuthContext";
import { ACTUATOR_POLL_MS, ACTUATORS } from "../config";
import { formatDateTime } from "../format";
import { usePolling } from "../hooks/usePolling";
import { colors } from "../theme";
import { Card, LinkText, T } from "./ui";

export function JournalPreview() {
  const { token } = useAuth();
  const [events, setEvents] = useState<ActuatorEvent[]>([]);

  const load = useCallback(() => {
    if (!token) return;
    fetchActuatorEvents(token, { limit: 5 })
      .then(setEvents)
      .catch(() => {
        // La page Journal complète affichera l'erreur ; ici on reste discret.
      });
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Pas de canal temps réel pour le journal : on repasse régulièrement pour
  // voir apparaître les actions manuelles ou automatiques faites entre-temps.
  usePolling(load, ACTUATOR_POLL_MS);

  return (
    <Card>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <T weight="bold" size={18}>
            Journal
          </T>
          <T size={12} color={colors.textSecondary} style={{ marginTop: 2 }}>
            Dernières actions sur les actionneurs
          </T>
        </View>
        <LinkText onPress={() => router.navigate("/journal")}>Tout voir →</LinkText>
      </View>

      {events.length === 0 ? (
        <T size={12} color={colors.textSecondary} style={{ marginTop: 16 }}>
          Aucune action enregistrée pour l'instant.
        </T>
      ) : (
        <View style={{ marginTop: 16, gap: 8 }}>
          {events.map((event) => {
            const actuator = ACTUATORS.find((a) => a.key === event.actuator);
            return (
              <View key={event.id}>
                <T size={12} color={colors.textSecondary}>
                  <T weight="bold" size={12}>
                    {actuator?.label ?? event.actuator}
                  </T>{" "}
                  {event.state ? "activé" : "désactivé"}
                  {event.actor_email ? ` par ${event.actor_email}` : ""}
                  {" · "}
                  {event.source === "manual" ? "manuel" : "auto"}
                </T>
                <T size={11} color={colors.textMuted}>
                  {formatDateTime(event.created_at)}
                </T>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
});

import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ApiError, fetchActuatorStates, toggleActuator, type ActuatorState } from "../api";
import { useAuth } from "../auth/AuthContext";
import { ACTUATOR_POLL_MS, ACTUATORS } from "../config";
import { formatDateTime } from "../format";
import { usePolling } from "../hooks/usePolling";
import { colors } from "../theme";
import { ToggleSwitch } from "./ToggleSwitch";
import { Card, LinkText, T } from "./ui";

export function ActuatorPanel() {
  const { token, handleUnauthorized } = useAuth();
  const [states, setStates] = useState<Record<string, ActuatorState>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setStates(await fetchActuatorStates(token));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) handleUnauthorized();
    }
  }, [token, handleUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  // Rattrape les changements faits ailleurs (une règle d'automatisation qui
  // se déclenche, un toggle depuis un autre appareil) sans qu'il n'y ait de
  // canal temps réel dédié aux actionneurs.
  usePolling(load, ACTUATOR_POLL_MS);

  async function handleToggle(key: string, next: boolean) {
    if (!token) return;
    setPending(key);
    setError(null);
    // Pas de retour matériel pour l'instant : on affiche l'état commandé
    // tout de suite (optimiste), la commande part en parallèle sur MQTT.
    setStates((prev) => ({ ...prev, [key]: { state: next, updated_at: new Date().toISOString() } }));
    try {
      await toggleActuator(token, key, next);
      await load();
    } catch (err) {
      setError("Impossible de changer l'état de l'actionneur.");
      if (err instanceof ApiError && err.status === 401) handleUnauthorized();
      load();
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <View style={styles.header}>
        <T weight="bold" size={18}>
          Actionneurs
        </T>
        <LinkText onPress={() => router.navigate("/automatisation")}>Automatisation →</LinkText>
      </View>
      <T size={12} color={colors.textSecondary} style={{ marginTop: 2 }}>
        Pas encore de matériel branché : les commandes sont envoyées sur MQTT et enregistrées, prêtes pour quand le Pico
        pilotera les relais. Peuvent aussi être pilotés automatiquement.
      </T>

      {error && (
        <T size={12} color={colors.red600} style={{ marginTop: 12 }}>
          {error}
        </T>
      )}

      <View style={{ marginTop: 8 }}>
        {ACTUATORS.map((actuator, i) => {
          const current = states[actuator.key];
          const on = current?.state ?? false;
          return (
            <View key={actuator.key} style={[styles.row, i > 0 && styles.divider]}>
              <View style={{ flex: 1 }}>
                <T weight="bold" size={14}>
                  {actuator.label}
                </T>
                <T size={11} color={colors.textSecondary}>
                  Dernier changement : {current?.updated_at ? formatDateTime(current.updated_at) : "jamais"}
                </T>
              </View>
              <ToggleSwitch
                checked={on}
                onChange={(next) => handleToggle(actuator.key, next)}
                disabled={pending === actuator.key}
                label={actuator.label}
              />
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(226,232,240,0.9)" },
});

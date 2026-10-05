import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import type { ActuatorState } from "../../api";
import { ACTUATORS } from "../../config";
import { formatRelativeToNow } from "../../format";
import { colors } from "../../theme";
import { ToggleSwitch } from "../ToggleSwitch";
import { LinkText, T } from "../ui";
import { ACTUATOR_ICONS } from "./icons";
import { SoftPulse, WidgetCard } from "./WidgetCard";

interface Props {
  states: Record<string, ActuatorState>;
  pending: string | null;
  onToggle: (key: string, next: boolean) => void;
  error?: string | null;
  delayMs?: number;
}

export function ActuatorsWidget({ states, pending, onToggle, error, delayMs = 0 }: Props) {
  return (
    <WidgetCard
      title="Actionneurs"
      subtitle="Pilotage direct — les règles peuvent reprendre la main"
      pill={<LinkText onPress={() => router.navigate("/automatisation")}>Automatisation →</LinkText>}
      delayMs={delayMs}
    >
      {error && (
        <T size={12} color={colors.red600} style={{ marginTop: 12 }}>
          {error}
        </T>
      )}

      <View style={styles.grid}>
        {ACTUATORS.map((actuator) => {
          const current = states[actuator.key];
          const on = current?.state ?? false;
          const Icon = ACTUATOR_ICONS[actuator.key];

          return (
            <View key={actuator.key} style={[styles.tile, { backgroundColor: on ? colors.white : "rgba(255,255,255,0.5)" }]}>
              <View style={styles.tileHeader}>
                <View style={styles.iconWrap}>
                  {on && <SoftPulse style={styles.glow} />}
                  <View style={[styles.icon, { backgroundColor: on ? colors.amber100 : colors.slate100 }]}>
                    {Icon && <Icon color={on ? colors.amber600 : colors.textMuted} />}
                  </View>
                </View>
                <ToggleSwitch
                  checked={on}
                  onChange={(next) => onToggle(actuator.key, next)}
                  disabled={pending === actuator.key}
                  label={actuator.label}
                />
              </View>

              <T weight="bold" size={14} style={{ marginTop: 12 }}>
                {actuator.label}
              </T>
              <T weight="bold" size={11} color={on ? colors.emerald600 : colors.textMuted}>
                {on ? "Allumé" : "Éteint"}
              </T>
              <T size={11} color={colors.textSecondary} style={{ marginTop: 2 }}>
                {current?.updated_at ? formatRelativeToNow(current.updated_at) : "jamais commandé"}
              </T>
            </View>
          );
        })}
      </View>
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  grid: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { flexGrow: 1, flexBasis: "45%", borderRadius: 16, padding: 14 },
  tileHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  iconWrap: { alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(252,211,77,0.4)" },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});

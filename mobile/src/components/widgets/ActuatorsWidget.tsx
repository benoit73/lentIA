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
      subtitle="Les règles peuvent reprendre la main"
      pill={<LinkText onPress={() => router.navigate("/automatisation")}>Règles →</LinkText>}
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
            <View
              key={actuator.key}
              style={[styles.tile, { backgroundColor: on ? colors.white : "rgba(255,255,255,0.5)" }]}
            >
              <View style={styles.iconWrap}>
                {on && <SoftPulse style={styles.glow} />}
                <View style={[styles.icon, { backgroundColor: on ? colors.amber100 : colors.slate100 }]}>
                  {Icon && <Icon color={on ? colors.amber600 : colors.textMuted} size={18} />}
                </View>
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="bold" size={13} numberOfLines={1}>
                  {actuator.label}
                </T>
                <T size={11} color={colors.textSecondary} numberOfLines={1}>
                  <T weight="bold" size={11} color={on ? colors.emerald600 : colors.textMuted}>
                    {on ? "Allumé" : "Éteint"}
                  </T>
                  {" · "}
                  {current?.updated_at ? formatRelativeToNow(current.updated_at) : "jamais commandé"}
                </T>
              </View>

              <ToggleSwitch
                checked={on}
                onChange={(next) => onToggle(actuator.key, next)}
                disabled={pending === actuator.key}
                label={actuator.label}
              />
            </View>
          );
        })}
      </View>
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  // Une ligne par actionneur : la grille 2×2 du web laisse des tuiles trop
  // étroites pour icône + libellé + interrupteur sur un téléphone.
  grid: { marginTop: 14, gap: 8 },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconWrap: { alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(252,211,77,0.4)" },
  icon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
});

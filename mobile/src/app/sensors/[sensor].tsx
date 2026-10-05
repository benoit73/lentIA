import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../auth/AuthContext";
import { LiveStatusDot } from "../../components/LiveStatusDot";
import { presetToRange, RangePicker, type PresetKey } from "../../components/RangePicker";
import { formatValue } from "../../components/SensorCard";
import { SensorChart } from "../../components/SensorChart";
import { TopBar } from "../../components/TopBar";
import { Card, T } from "../../components/ui";
import { sensorByKey } from "../../config";
import { useLiveSeries } from "../../hooks/useLiveSeries";
import { useSensorRealtime } from "../../hooks/useSensorRealtime";
import { colors, softCardShadow } from "../../theme";

function BackButton() {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      style={({ pressed }) => [styles.back, pressed && { backgroundColor: colors.accent }]}
    >
      {({ pressed }) => (
        <T weight="bold" size={14} color={pressed ? colors.white : colors.textPrimary}>
          ← Retour
        </T>
      )}
    </Pressable>
  );
}

export default function SensorDetail() {
  const { sensor: sensorKey } = useLocalSearchParams<{ sensor: string }>();
  const sensor = sensorByKey(sensorKey);
  const insets = useSafeAreaInsets();

  const [preset, setPreset] = useState<PresetKey>("24h");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);

  const { token } = useAuth();
  const range = useMemo(() => presetToRange(preset, customStart, customEnd), [preset, customStart, customEnd]);
  const live = preset !== "custom";
  const { value: liveValue, online, receivedAt } = useSensorRealtime(sensorKey ?? "", token);
  const { points, leftEdge, rightEdge, loading, error } = useLiveSeries(sensorKey ?? "", range, {
    live,
    liveValue,
    receivedAt,
  });

  const lastRealValue = [...points].reverse().find((p) => p.value !== null)?.value ?? null;
  const currentValue = liveValue ?? lastRealValue;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32, gap: 16 }}
    >
      <TopBar />
      <BackButton />

      {!sensor ? (
        <Card>
          <T size={14}>Capteur inconnu.</T>
        </Card>
      ) : (
        <Card style={{ gap: 16 }}>
          <View style={{ gap: 4 }}>
            <T weight="bold" size={24}>
              {sensor.label}
            </T>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <T size={13} color={colors.textSecondary}>
                Valeur actuelle :{" "}
                <T weight="bold" size={13}>
                  {currentValue !== null ? formatValue(currentValue, sensor.unit) : "—"}
                </T>
              </T>
              <LiveStatusDot online={online} />
            </View>
          </View>

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
          {!loading && !error && (
            <SensorChart points={points} leftEdge={leftEdge} rightEdge={rightEdge} color={sensor.color} unit={sensor.unit} />
          )}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  back: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.white,
    ...softCardShadow,
  },
});

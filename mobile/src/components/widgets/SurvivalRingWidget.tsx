import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import type { GerminationRecommendations } from "../../api";
import { sensorByKey } from "../../config";
import { colors, tabularNums } from "../../theme";
import { T } from "../ui";
import { ArrowDownIcon, ArrowUpIcon } from "./icons";
import { WidgetCard } from "./WidgetCard";

const RADIUS = 56;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ringColor(pct: number): string {
  if (pct >= 66) return "#10B981";
  if (pct >= 33) return "#F59E0B";
  return "#EF4444";
}

interface Advice {
  key: string;
  label: string;
  unit: string;
  current: number;
  target: number;
  gain: number;
}

/** Les 2 capteurs qui rapportent le plus de points de pousse si on les
 * corrige. L'API ne renvoie déjà que les leviers réels : un capteur dont la
 * courbe est plate (la luminosité, dans ce dataset) en est absent. */
function topAdvice(recommendations: GerminationRecommendations | null): Advice[] {
  if (!recommendations) return [];
  return Object.entries(recommendations.recommendations)
    .map(([key, recommendation]) => {
      const meta = sensorByKey(key);
      return {
        key,
        label: meta?.label ?? key,
        unit: meta?.unit ?? "",
        current: recommendations.based_on[key],
        target: recommendation.recommended_value,
        gain: recommendation.gain_pct,
      };
    })
    .filter((advice) => Number.isFinite(advice.current))
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 2);
}

const fr = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

interface Props {
  chancePct: number | null;
  recommendations: GerminationRecommendations | null;
  delayMs?: number;
}

export function SurvivalRingWidget({ chancePct, recommendations, delayMs = 0 }: Props) {
  const pct = chancePct ?? 0;
  const color = ringColor(pct);
  const advice = topAdvice(recommendations);

  return (
    <WidgetCard title="Chances de survie" subtitle="Prédiction du réseau de neurones" delayMs={delayMs}>
      <View style={styles.ringWrap}>
        <Svg width={144} height={144} viewBox="0 0 140 140" style={{ transform: [{ rotate: "-90deg" }] }}>
          <Circle cx="70" cy="70" r={RADIUS} fill="none" stroke="#E2E8F0" strokeWidth={13} />
          <Circle
            cx="70"
            cy="70"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={13}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - (chancePct === null ? 0 : pct / 100))}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <T weight="extrabold" size={30} color={color} style={tabularNums}>
            {chancePct === null ? "--" : `${Math.round(pct)}%`}
          </T>
          <T weight="bold" size={10} color={colors.textMuted} style={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
            de pousse
          </T>
        </View>
      </View>

      <View style={{ marginTop: 16, gap: 8 }}>
        {advice.length === 0 ? (
          <T size={12} color={colors.textSecondary} style={{ textAlign: "center" }}>
            {recommendations ? "Conditions déjà proches de l'optimum." : "En attente de relevés."}
          </T>
        ) : (
          advice.map((item) => {
            const increase = item.target > item.current;
            return (
              <View key={item.key} style={styles.advice}>
                <View style={[styles.arrow, { backgroundColor: increase ? colors.emerald100 : colors.blue100 }]}>
                  {increase ? <ArrowUpIcon color={colors.emerald600} /> : <ArrowDownIcon color={colors.blue600} />}
                </View>
                <T size={11} color={colors.textSecondary} style={{ flex: 1, lineHeight: 15 }}>
                  <T weight="bold" size={11}>
                    {item.label}
                  </T>{" "}
                  : vise{" "}
                  <T weight="bold" size={11} style={tabularNums}>
                    {fr(item.target)} {item.unit}
                  </T>{" "}
                  <T weight="bold" size={11} color={colors.emerald600} style={tabularNums}>
                    +{Math.round(item.gain)} pts
                  </T>
                  {"\n"}moy. 24 h : {fr(item.current)} {item.unit}
                </T>
              </View>
            );
          })
        )}
      </View>
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  ringWrap: { marginTop: 12, alignSelf: "center", width: 144, height: 144 },
  ringCenter: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  advice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: colors.whiteGlass,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  arrow: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});

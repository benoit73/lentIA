import { useState } from "react";
import { StyleSheet, View, type GestureResponderEvent } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import type { LiveChartPoint } from "../hooks/useLiveSeries";
import { colors, fonts } from "../theme";
import { computeScales, linePath, nearestPoint } from "./chart";
import { T } from "./ui";

const HEIGHT = 288;
const AXIS_LEFT = 44;
const AXIS_BOTTOM = 22;
const GRID_LINES = 4;
const X_TICKS = 3;
const TICK_COLOR = "#8B90A5";

function formatTick(time: number) {
  return new Date(time).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAxisValue(value: number) {
  const abs = Math.abs(value);
  return value.toLocaleString("fr-FR", { maximumFractionDigits: abs >= 100 ? 0 : 1 });
}

interface Props {
  points: LiveChartPoint[];
  leftEdge: number;
  rightEdge: number;
  color: string;
  unit: string;
}

/** Courbe détaillée d'un capteur, avec axes ; toucher/glisser le doigt
 * affiche la valeur la plus proche (équivalent du Tooltip Recharts). */
export function SensorChart({ points, leftEdge, rightEdge, color, unit }: Props) {
  const [width, setWidth] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const hasData = points.some((p) => p.value !== null);

  if (!hasData) {
    return (
      <View style={[styles.empty, { height: HEIGHT }]}>
        <T size={13} color={colors.textSecondary}>
          Aucune donnée sur cette plage.
        </T>
      </View>
    );
  }

  const scales =
    width > 0
      ? computeScales(points, leftEdge, rightEdge, { width, height: HEIGHT, left: AXIS_LEFT, right: 8, top: 8, bottom: AXIS_BOTTOM })
      : null;

  const toTime = (x: number) => {
    if (!scales) return leftEdge;
    const { left, right } = scales.inner;
    const ratio = Math.max(0, Math.min(1, (x - left) / (right - left)));
    return leftEdge + ratio * (rightEdge - leftEdge);
  };
  const selected = touchX !== null ? nearestPoint(points, toTime(touchX)) : null;

  const onTouch = (e: GestureResponderEvent) => setTouchX(e.nativeEvent.locationX);

  return (
    <View
      style={{ height: HEIGHT }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onResponderGrant={onTouch}
      onResponderMove={onTouch}
      onResponderRelease={() => setTouchX(null)}
      onResponderTerminate={() => setTouchX(null)}
    >
      {scales && (
        <Svg width={width} height={HEIGHT}>
          {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
            const value = scales.yMin + ((scales.yMax - scales.yMin) * i) / GRID_LINES;
            const y = scales.y(value);
            return (
              <SvgText key={`y${i}`} x={AXIS_LEFT - 6} y={y + 4} fontSize={11} fill={TICK_COLOR} textAnchor="end" fontFamily={fonts.medium}>
                {formatAxisValue(value)}
              </SvgText>
            );
          })}
          {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
            const y = scales.y(scales.yMin + ((scales.yMax - scales.yMin) * i) / GRID_LINES);
            return (
              <Line key={`g${i}`} x1={AXIS_LEFT} x2={scales.inner.right} y1={y} y2={y} stroke="#DDE1EE" strokeDasharray="3 4" />
            );
          })}
          {Array.from({ length: X_TICKS }, (_, i) => {
            const time = leftEdge + ((rightEdge - leftEdge) * i) / (X_TICKS - 1);
            const anchor = i === 0 ? "start" : i === X_TICKS - 1 ? "end" : "middle";
            return (
              <SvgText
                key={`x${i}`}
                x={scales.x(time)}
                y={HEIGHT - 6}
                fontSize={11}
                fill={TICK_COLOR}
                textAnchor={anchor}
                fontFamily={fonts.medium}
              >
                {formatTick(time)}
              </SvgText>
            );
          })}

          <Path
            d={linePath(points, leftEdge, rightEdge, scales)}
            stroke={color}
            strokeWidth={3}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {selected && (
            <>
              <Line
                x1={scales.x(selected.time)}
                x2={scales.x(selected.time)}
                y1={scales.inner.top}
                y2={scales.inner.bottom}
                stroke={colors.textMuted}
                strokeWidth={1}
              />
              <Circle cx={scales.x(selected.time)} cy={scales.y(selected.value)} r={5} fill={color} stroke={colors.white} strokeWidth={2} />
            </>
          )}
        </Svg>
      )}

      {selected && scales && (
        <View
          pointerEvents="none"
          style={[
            styles.tooltip,
            scales.x(selected.time) > width / 2
              ? { right: width - scales.x(selected.time) + 10 }
              : { left: scales.x(selected.time) + 10 },
          ]}
        >
          <T size={11} color={colors.textSecondary}>
            {new Date(selected.time).toLocaleString("fr-FR")}
          </T>
          <T weight="bold" size={13}>
            {selected.value} {unit}
          </T>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center" },
  tooltip: {
    position: "absolute",
    top: 8,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
});

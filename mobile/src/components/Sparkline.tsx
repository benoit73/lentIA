import { useState } from "react";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import type { LiveChartPoint } from "../hooks/useLiveSeries";
import { areaPath, computeScales, linePath } from "./chart";

interface Props {
  id: string;
  points: LiveChartPoint[];
  leftEdge: number;
  rightEdge: number;
  color: string;
  height?: number;
}

/** Mini-courbe en aire des cartes capteur (sans axes). */
export function Sparkline({ id, points, leftEdge, rightEdge, color, height = 64 }: Props) {
  const [width, setWidth] = useState(0);
  const scales = width > 0 ? computeScales(points, leftEdge, rightEdge, { width, height, top: 3, bottom: 3 }) : null;

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {scales && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={`grad-${id}`} x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.35} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={areaPath(points, leftEdge, rightEdge, scales)} fill={`url(#grad-${id})`} />
          <Path
            d={linePath(points, leftEdge, rightEdge, scales)}
            stroke={color}
            strokeWidth={3}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </Svg>
      )}
    </View>
  );
}

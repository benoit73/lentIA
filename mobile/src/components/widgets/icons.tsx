/** Petites icônes en trait (mêmes tracés que web/src/components/widgets/icons.tsx),
 * colorées via `color` pour suivre l'état allumé/éteint de la tuile. */

import type { ReactElement } from "react";
import Svg, { Circle, Path } from "react-native-svg";

interface IconProps {
  color: string;
  size?: number;
}

export function LightIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.8}>
      <Path d="M9 18h6M10 21h4" strokeLinecap="round" />
      <Path d="M12 3a6 6 0 0 0-3.5 10.9c.4.3.6.8.6 1.3v.8h5.8v-.8c0-.5.2-1 .6-1.3A6 6 0 0 0 12 3Z" strokeLinejoin="round" />
    </Svg>
  );
}

export function HeatingIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.8}>
      <Path
        d="M12 3s4.5 3.8 4.5 8.2a4.5 4.5 0 0 1-9 0C7.5 9.4 9 7.7 9 7.7s.8 1.4 1.8 1.8C11 7 12 5 12 3Z"
        strokeLinejoin="round"
      />
      <Path d="M12 14.5c.9 0 1.6.7 1.6 1.6 0 1.2-1.6 2.4-1.6 2.4s-1.6-1.2-1.6-2.4c0-.9.7-1.6 1.6-1.6Z" strokeLinejoin="round" />
    </Svg>
  );
}

export function WateringIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.8}>
      <Path d="M12 3.5c3 3.6 5 6.3 5 8.8a5 5 0 0 1-10 0c0-2.5 2-5.2 5-8.8Z" strokeLinejoin="round" />
      <Path d="M9.6 12.8a2.6 2.6 0 0 0 2.2 2.8" strokeLinecap="round" />
    </Svg>
  );
}

export function VentilationIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.8}>
      <Circle cx="12" cy="12" r="1.8" />
      <Path
        d="M12 10.2c.6-2.8.2-4.7-1.2-5.8-1.6-1.2-3.6.4-2.9 2.3.5 1.5 1.9 2.6 4.1 3.5ZM13.8 12c2.8-.6 4.7-.2 5.8 1.2 1.2 1.6-.4 3.6-2.3 2.9-1.5-.5-2.6-1.9-3.5-4.1ZM12 13.8c-.6 2.8-.2 4.7 1.2 5.8 1.6 1.2 3.6-.4 2.9-2.3-.5-1.5-1.9-2.6-4.1-3.5ZM10.2 12c-2.8.6-4.7.2-5.8-1.2-1.2-1.6.4-3.6 2.3-2.9 1.5.5 2.6 1.9 3.5 4.1Z"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ArrowUpIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2.4}>
      <Path d="M12 19V5M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ArrowDownIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2.4}>
      <Path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CameraIcon({ color, size = 40 }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.5}>
      <Path
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export const ACTUATOR_ICONS: Record<string, (props: IconProps) => ReactElement> = {
  light: LightIcon,
  heating: HeatingIcon,
  watering: WateringIcon,
  ventilation: VentilationIcon,
};

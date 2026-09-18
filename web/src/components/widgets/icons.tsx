/** Petites icônes en trait, dessinées en `currentColor` pour suivre la
 * couleur (et donc l'état allumé/éteint) de la tuile qui les contient. */

import type { ReactElement } from "react";

interface IconProps {
  className?: string;
}

const BASE = "w-5 h-5";

export function LightIcon({ className = BASE }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M9 18h6M10 21h4" strokeLinecap="round" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.4.3.6.8.6 1.3v.8h5.8v-.8c0-.5.2-1 .6-1.3A6 6 0 0 0 12 3Z" strokeLinejoin="round" />
    </svg>
  );
}

export function HeatingIcon({ className = BASE }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path
        d="M12 3s4.5 3.8 4.5 8.2a4.5 4.5 0 0 1-9 0C7.5 9.4 9 7.7 9 7.7s.8 1.4 1.8 1.8C11 7 12 5 12 3Z"
        strokeLinejoin="round"
      />
      <path d="M12 14.5c.9 0 1.6.7 1.6 1.6 0 1.2-1.6 2.4-1.6 2.4s-1.6-1.2-1.6-2.4c0-.9.7-1.6 1.6-1.6Z" strokeLinejoin="round" />
    </svg>
  );
}

export function WateringIcon({ className = BASE }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M12 3.5c3 3.6 5 6.3 5 8.8a5 5 0 0 1-10 0c0-2.5 2-5.2 5-8.8Z" strokeLinejoin="round" />
      <path d="M9.6 12.8a2.6 2.6 0 0 0 2.2 2.8" strokeLinecap="round" />
    </svg>
  );
}

export function VentilationIcon({ className = BASE }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <circle cx="12" cy="12" r="1.8" />
      <path
        d="M12 10.2c.6-2.8.2-4.7-1.2-5.8-1.6-1.2-3.6.4-2.9 2.3.5 1.5 1.9 2.6 4.1 3.5ZM13.8 12c2.8-.6 4.7-.2 5.8 1.2 1.2 1.6-.4 3.6-2.3 2.9-1.5-.5-2.6-1.9-3.5-4.1ZM12 13.8c-.6 2.8-.2 4.7 1.2 5.8 1.6 1.2 3.6-.4 2.9-2.3-.5-1.5-1.9-2.6-4.1-3.5ZM10.2 12c-2.8.6-4.7.2-5.8-1.2-1.2-1.6.4-3.6 2.3-2.9 1.5.5 2.6 1.9 3.5 4.1Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowUpIcon({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className={className}>
      <path d="M12 19V5M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowDownIcon({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className={className}>
      <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const ACTUATOR_ICONS: Record<string, (props: IconProps) => ReactElement> = {
  light: LightIcon,
  heating: HeatingIcon,
  watering: WateringIcon,
  ventilation: VentilationIcon,
};

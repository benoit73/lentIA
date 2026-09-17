export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export interface SensorMeta {
  key: string;
  label: string;
  unit: string;
  color: string;
}

export const SENSORS: SensorMeta[] = [
  { key: "soil_humidity", label: "Humidité du sol", unit: "%", color: "#8E94F2" },
  { key: "air_humidity", label: "Humidité de l'air", unit: "%", color: "#62C4DC" },
  { key: "temperature", label: "Température", unit: "°C", color: "#F08A63" },
  { key: "luminosity", label: "Luminosité", unit: "lux", color: "#E0C34F" },
  { key: "water_level", label: "Réservoir d'eau", unit: "%", color: "#4EBA88" },
];

export function sensorByKey(key: string | undefined): SensorMeta | undefined {
  return SENSORS.find((s) => s.key === key);
}

export interface ActuatorMeta {
  key: string;
  label: string;
}

export const ACTUATORS: ActuatorMeta[] = [
  { key: "light", label: "Lumière" },
  { key: "heating", label: "Chauffage" },
  { key: "watering", label: "Arrosage" },
  { key: "ventilation", label: "Ventilation" },
];

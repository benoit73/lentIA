export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Au-delà de ce délai sans message MQTT pour un capteur : considéré hors
// ligne (badge du dashboard) et, côté historique, un trou visible dans la
// courbe plutôt qu'une ligne continue qui laisserait croire à des données.
export const SENSOR_STALE_MS = 15_000;

// Pas de canal temps réel pour les actionneurs/le journal (contrairement aux
// capteurs) : on rafraîchit à intervalle régulier pour refléter les actions
// manuelles faites ailleurs et les changements de l'automatisation.
export const ACTUATOR_POLL_MS = 5_000;

// Taille de la fenêtre de moyenne mobile appliquée aux courbes (amortit le
// bruit de mesure, ex. HC-SR04). 1 = pas de lissage.
export const CHART_SMOOTHING_WINDOW = 5;

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

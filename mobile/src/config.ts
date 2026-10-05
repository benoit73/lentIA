// Mêmes constantes que le dashboard web (web/src/config.ts), plus l'adresse
// de l'API : pas de nginx devant l'app, elle appelle la VM en direct.

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://98.66.161.191").replace(/\/+$/, "");

// Client ID OAuth *web* : l'ID token renvoyé par la connexion native a cette
// audience, l'API le vérifie donc exactement comme celui du dashboard.
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

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

// Le capteur de niveau ne renvoie qu'un pourcentage : c'est cette capacité
// qui permet d'afficher aussi des litres sur le widget Réservoir.
export const WATER_TANK_LITERS = 5;

// Durée d'éclairage visée sur une journée quand la lumière n'a pas de règle
// d'automatisation programmée (sinon la cible vient des plages de la règle).
export const DEFAULT_LIGHT_TARGET_HOURS = 16;

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

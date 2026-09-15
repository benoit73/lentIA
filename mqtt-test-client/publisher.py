"""
Client MQTT de test pour le projet lentIA.

Simule un Raspberry Pi Pico W équipé de capteurs (humidité du sol, humidité
de l'air, température, luminosité, niveau du réservoir d'eau) en publiant
des valeurs aléatoires à intervalle régulier.

A remplacer, plus tard, par le vrai firmware du Pico W qui publiera sur le
même topic avec le même format JSON.
"""

import json
import os
import random
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

MQTT_HOST = os.environ.get("MQTT_HOST", "localhost")
MQTT_PORT = int(os.environ.get("MQTT_PORT", "1883"))
MQTT_TOPIC = os.environ.get("MQTT_TOPIC", "lentia/sensors/data")
INTERVAL = float(os.environ.get("PUBLISH_INTERVAL_SECONDS", "5"))

# Bornes réalistes pour chaque capteur, et un pas de variation max par tick
# pour simuler une évolution progressive plutôt que du bruit pur.
SENSORS = {
    "soil_humidity": {"min": 20.0, "max": 80.0, "step": 2.0, "start": 45.0},
    "air_humidity": {"min": 30.0, "max": 90.0, "step": 3.0, "start": 55.0},
    "temperature": {"min": 15.0, "max": 30.0, "step": 0.5, "start": 21.0},
    "luminosity": {"min": 0.0, "max": 100.0, "step": 8.0, "start": 60.0},
    "water_level": {"min": 0.0, "max": 100.0, "step": 1.0, "start": 80.0},
}

state = {key: cfg["start"] for key, cfg in SENSORS.items()}


def next_value(key: str) -> float:
    cfg = SENSORS[key]
    delta = random.uniform(-cfg["step"], cfg["step"])
    value = state[key] + delta
    value = max(cfg["min"], min(cfg["max"], value))
    state[key] = value
    return round(value, 1)


def build_reading() -> dict:
    reading = {key: next_value(key) for key in SENSORS}
    reading["created_at"] = datetime.now(timezone.utc).isoformat()
    return reading


def connect() -> mqtt.Client:
    client = mqtt.Client()
    for attempt in range(15):
        try:
            client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            print(f"[test-client] connecté à {MQTT_HOST}:{MQTT_PORT}")
            return client
        except (ConnectionRefusedError, OSError) as err:
            print(f"[test-client] broker indisponible (essai {attempt + 1}/15) : {err}")
            time.sleep(2)
    raise RuntimeError("Impossible de joindre le broker MQTT")


def main():
    client = connect()
    client.loop_start()
    print(f"[test-client] publication sur '{MQTT_TOPIC}' toutes les {INTERVAL}s")
    try:
        while True:
            reading = build_reading()
            client.publish(MQTT_TOPIC, json.dumps(reading))
            print(f"[test-client] envoyé : {reading}")
            time.sleep(INTERVAL)
    except KeyboardInterrupt:
        pass
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()

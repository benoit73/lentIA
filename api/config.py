"""Configuration (variables d'environnement) partagée par les modules de l'API."""

import os

MQTT_HOST = os.environ.get("MQTT_HOST", "localhost")
MQTT_PORT = int(os.environ.get("MQTT_PORT", "1883"))
# Un topic par capteur, ex. lentia/sensors/temperature, lentia/sensors/water_level...
MQTT_TOPIC_PREFIX = os.environ.get("MQTT_TOPIC_PREFIX", "lentia/sensors")
MQTT_SUBSCRIBE_TOPIC = f"{MQTT_TOPIC_PREFIX}/+"

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://lentia:lentia@localhost:5432/lentia"
)

SENSOR_FIELDS = [
    "soil_humidity",
    "air_humidity",
    "temperature",
    "luminosity",
    "water_level",
]

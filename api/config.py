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

# Un topic de commande par actionneur, ex. lentia/actuators/light/set.
# Pas de matériel branché pour l'instant : la commande est publiée sur MQTT
# et enregistrée en base, prête pour quand le Pico pilotera les relais.
ACTUATOR_TOPIC_PREFIX = os.environ.get("ACTUATOR_TOPIC_PREFIX", "lentia/actuators")

ACTUATOR_FIELDS = [
    "light",
    "heating",
    "watering",
    "ventilation",
]

# Intervalle (secondes) entre deux évaluations des règles d'automatisation.
AUTOMATION_POLL_SECONDS = int(os.environ.get("AUTOMATION_POLL_SECONDS", "30"))

# Authentification (Google Sign-In / OpenID Connect) pour le dashboard React.
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
# Liste blanche d'emails autorisés à se connecter (vide = n'importe quel
# compte Google valide est accepté).
ALLOWED_EMAILS = {
    email.strip().lower()
    for email in os.environ.get("ALLOWED_EMAILS", "").split(",")
    if email.strip()
}

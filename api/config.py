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

# Images de la caméra HM01B0 du Pico : message binaire, 4 octets d'en-tête
# (largeur, hauteur en big-endian) puis un octet de gris par pixel.
CAMERA_TOPIC = os.environ.get("CAMERA_TOPIC", "lentia/camera/frame")

# Un topic de commande par actionneur, ex. lentia/actuators/light/set. Le
# Pico s'y abonne et pilote la broche correspondante (lampe et pompe câblées,
# chauffage et ventilation pas encore).
ACTUATOR_TOPIC_PREFIX = os.environ.get("ACTUATOR_TOPIC_PREFIX", "lentia/actuators")

ACTUATOR_FIELDS = [
    "light",
    "heating",
    "watering",
    "ventilation",
]

# Intervalle (secondes) entre deux évaluations des règles d'automatisation.
AUTOMATION_POLL_SECONDS = int(os.environ.get("AUTOMATION_POLL_SECONDS", "30"))

# Fenêtre (minutes) de la moyenne utilisée par les règles à seuil — fixe,
# plus configurable par règle (simplifie l'UI : une seule fenêtre pour tous).
AUTOMATION_AVERAGE_WINDOW_MINUTES = int(os.environ.get("AUTOMATION_AVERAGE_WINDOW_MINUTES", "10"))

# Sécurité pompe : l'arrosage est refusé (et coupé s'il tourne) quand le
# dernier niveau du réservoir est à ce pourcentage ou en dessous. Un relevé
# plus vieux que WATER_LEVEL_MAX_AGE_SECONDS est ignoré : capteur hors ligne
# ne veut pas dire réservoir vide. Le Pico applique la même règle de son côté.
RESERVOIR_EMPTY_PCT = float(os.environ.get("RESERVOIR_EMPTY_PCT", "0"))
WATER_LEVEL_MAX_AGE_SECONDS = int(os.environ.get("WATER_LEVEL_MAX_AGE_SECONDS", "120"))

# Fenêtre (minutes) des moyennes envoyées au modèle de prédiction. Il est
# entraîné sur des moyennes journalières (voir ia/train_model.py) : lui
# passer un relevé instantané n'aurait pas de sens, la luminosité vaut 0 la
# nuit alors que les chances de pousse du jour, elles, ne changent pas.
PREDICTION_WINDOW_MINUTES = int(os.environ.get("PREDICTION_WINDOW_MINUTES", "1440"))

# Authentification (Google Sign-In / OpenID Connect) pour le dashboard React.
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
# Liste blanche d'emails autorisés à se connecter (vide = n'importe quel
# compte Google valide est accepté).
ALLOWED_EMAILS = {
    email.strip().lower()
    for email in os.environ.get("ALLOWED_EMAILS", "").split(",")
    if email.strip()
}

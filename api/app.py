"""
API Flask pour le projet lentIA.

Rôles :
1. S'abonner au broker MQTT et enregistrer chaque relevé reçu dans Postgres.
2. Exposer une API REST pour l'historique (utilisée par le dashboard).
3. Servir la page du mini dashboard.

Le temps réel du dashboard passe directement par MQTT over WebSocket
(le navigateur se connecte lui-même au broker), pas par cette API :
cette API ne fait que persister les données et servir l'historique.
"""

import json
import os
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt
import psycopg2
import psycopg2.extras
from flask import Flask, jsonify, request, send_from_directory

MQTT_HOST = os.environ.get("MQTT_HOST", "localhost")
MQTT_PORT = int(os.environ.get("MQTT_PORT", "1883"))
# Un topic par capteur, ex. lentia/sensors/temperature, lentia/sensors/water_level...
# On s'abonne au préfixe avec un wildcard pour tous les recevoir.
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

app = Flask(__name__, static_folder="static", template_folder="templates")


# --------------------------------------------------------------------------
# Base de données
# --------------------------------------------------------------------------

def get_conn(retries=10, delay=2):
    """Ouvre une connexion Postgres, avec un peu de patience au démarrage
    du stack (Postgres peut ne pas être totalement prêt)."""
    last_err = None
    for attempt in range(retries):
        try:
            return psycopg2.connect(DATABASE_URL)
        except psycopg2.OperationalError as err:
            last_err = err
            print(f"[db] connexion échouée (essai {attempt + 1}/{retries}) : {err}")
            time.sleep(delay)
    raise last_err


def insert_reading(data: dict):
    """Insère une ligne, avec NULL pour les champs absents de `data`
    (un message ne porte la valeur que d'un seul capteur à la fois)."""
    values = [data.get(field) for field in SENSOR_FIELDS]
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO readings ({", ".join(SENSOR_FIELDS)})
                VALUES ({", ".join(["%s"] * len(SENSOR_FIELDS))})
                """,
                values,
            )
        conn.commit()


def fetch_readings(limit: int):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, soil_humidity, air_humidity, temperature,
                       luminosity, water_level, created_at
                FROM readings
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall()
    # on renvoie du plus ancien au plus récent, plus pratique pour tracer un graphe
    rows.reverse()
    for row in rows:
        row["created_at"] = row["created_at"].isoformat()
    return rows


# --------------------------------------------------------------------------
# MQTT : abonnement en tâche de fond, insertion en base à chaque message
# --------------------------------------------------------------------------

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"[mqtt] connecté au broker {MQTT_HOST}:{MQTT_PORT}")
        client.subscribe(MQTT_SUBSCRIBE_TOPIC)
        print(f"[mqtt] abonné au topic '{MQTT_SUBSCRIBE_TOPIC}'")
    else:
        print(f"[mqtt] échec de connexion, code {rc}")


def on_message(client, userdata, msg):
    field = msg.topic.rsplit("/", 1)[-1]
    if field not in SENSOR_FIELDS:
        print(f"[mqtt] topic inconnu ignoré : {msg.topic}")
        return

    try:
        value = json.loads(msg.payload.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as err:
        print(f"[mqtt] message ignoré (JSON invalide) : {err}")
        return

    try:
        insert_reading({field: value})
        print(f"[mqtt] relevé enregistré : {field} = {value}")
    except Exception as err:  # on ne veut jamais tuer le thread MQTT
        print(f"[db] échec d'insertion : {err}")


def start_mqtt_client():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message

    # petite boucle de reconnexion au cas où mosquitto ne serait pas encore prêt
    for attempt in range(15):
        try:
            client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            break
        except (ConnectionRefusedError, OSError) as err:
            print(f"[mqtt] broker indisponible (essai {attempt + 1}/15) : {err}")
            time.sleep(2)
    else:
        raise RuntimeError("Impossible de joindre le broker MQTT")

    client.loop_start()  # tourne dans un thread séparé, non-bloquant
    return client


# --------------------------------------------------------------------------
# Routes HTTP
# --------------------------------------------------------------------------

@app.route("/")
def index():
    return send_from_directory(app.template_folder, "index.html")


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "time": datetime.now(timezone.utc).isoformat()})


@app.route("/api/readings")
def api_readings():
    limit = request.args.get("limit", default=200, type=int)
    limit = max(1, min(limit, 2000))
    return jsonify(fetch_readings(limit))


@app.route("/api/readings/latest")
def api_readings_latest():
    rows = fetch_readings(1)
    return jsonify(rows[0] if rows else None)


@app.route("/api/config")
def api_config():
    """Donne au dashboard l'adresse du broker MQTT websocket à utiliser,
    pour ne pas coder cette adresse en dur côté front."""
    return jsonify(
        {
            "mqtt_ws_host": request.host.split(":")[0],
            "mqtt_ws_port": 9001,
            "mqtt_topic": MQTT_SUBSCRIBE_TOPIC,
        }
    )


if __name__ == "__main__":
    start_mqtt_client()
    app.run(host="0.0.0.0", port=5000, threaded=True)

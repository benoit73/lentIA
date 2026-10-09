"""Client MQTT interne à l'API : s'abonne à lentia/sensors/+, persiste chaque
relevé en base et le diffuse aux abonnés temps réel (routes WebSocket). Reçoit
aussi les images de la caméra (lentia/camera/frame, voir camera.py).
Le même client sert aussi à publier les commandes d'actionneurs
(lentia/actuators/<actionneur>/set) envoyées depuis le dashboard."""

import json
import time

import paho.mqtt.client as mqtt

import camera
import db
from config import (
    ACTUATOR_TOPIC_PREFIX,
    CAMERA_TOPIC,
    LUMINOSITY_LUX_PER_PCT,
    MQTT_HOST,
    MQTT_PORT,
    MQTT_SUBSCRIBE_TOPIC,
    SENSOR_FIELDS,
)
from realtime import broadcaster

_client = None


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"[mqtt] connecté au broker {MQTT_HOST}:{MQTT_PORT}")
        client.subscribe([(MQTT_SUBSCRIBE_TOPIC, 0), (CAMERA_TOPIC, 0)])
        print(f"[mqtt] abonné aux topics '{MQTT_SUBSCRIBE_TOPIC}' et '{CAMERA_TOPIC}'")
        _publish_current_states(client)
    else:
        print(f"[mqtt] échec de connexion, code {rc}")


def on_message(client, userdata, msg):
    if msg.topic == CAMERA_TOPIC:
        try:
            camera.handle_frame(msg.payload)
        except Exception as err:  # on ne veut jamais tuer le thread MQTT
            print(f"[camera] image ignorée : {err}")
        return

    sensor = msg.topic.rsplit("/", 1)[-1]
    if sensor not in SENSOR_FIELDS:
        print(f"[mqtt] topic inconnu ignoré : {msg.topic}")
        return

    try:
        value = json.loads(msg.payload.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as err:
        print(f"[mqtt] message ignoré (JSON invalide) : {err}")
        return

    # Le Pico envoie un % du capteur : conversion en lux (voir config.py).
    if sensor == "luminosity" and isinstance(value, (int, float)):
        value = round(value * LUMINOSITY_LUX_PER_PCT, 1)

    try:
        db.insert_reading(sensor, value)
    except Exception as err:  # on ne veut jamais tuer le thread MQTT
        print(f"[db] échec d'insertion : {err}")
        return

    broadcaster.publish(sensor, value)


def start():
    global _client

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
    _client = client
    return client


def _publish_current_states(client):
    """Republie l'état en base de chaque actionneur (retained) : le broker a
    pu perdre ses messages retenus, et une commande envoyée pendant que
    l'API était arrêtée n'existe qu'en base."""
    try:
        states = db.fetch_actuator_states()
    except Exception as err:  # ne jamais bloquer la connexion MQTT
        print(f"[mqtt] états actionneurs non republiés : {err}")
        return
    for actuator, current in states.items():
        _publish(client, actuator, current["state"])


def _publish(client, actuator: str, state: bool):
    # retain : le broker garde la dernière commande de chaque actionneur et
    # la renvoie au Pico dès qu'il se (re)connecte. Sans ça, un Pico qui
    # redémarre éteint tout alors que la base (donc le dashboard) affiche
    # toujours l'état commandé.
    client.publish(f"{ACTUATOR_TOPIC_PREFIX}/{actuator}/set", json.dumps(state), retain=True)


def publish_actuator_command(actuator: str, state: bool):
    """Publie une commande sur lentia/actuators/<actionneur>/set. Le Pico
    s'y abonne et actionne le relais correspondant."""
    if _client is None:
        raise RuntimeError("client MQTT non connecté")
    _publish(_client, actuator, state)

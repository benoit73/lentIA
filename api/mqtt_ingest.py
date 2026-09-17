"""Client MQTT interne à l'API : s'abonne à lentia/sensors/+, persiste chaque
relevé en base et le diffuse aux abonnés temps réel (routes WebSocket).
Le même client sert aussi à publier les commandes d'actionneurs
(lentia/actuators/<actionneur>/set) envoyées depuis le dashboard."""

import json
import time

import paho.mqtt.client as mqtt

import db
from config import ACTUATOR_TOPIC_PREFIX, MQTT_HOST, MQTT_PORT, MQTT_SUBSCRIBE_TOPIC, SENSOR_FIELDS
from realtime import broadcaster

_client = None


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"[mqtt] connecté au broker {MQTT_HOST}:{MQTT_PORT}")
        client.subscribe(MQTT_SUBSCRIBE_TOPIC)
        print(f"[mqtt] abonné au topic '{MQTT_SUBSCRIBE_TOPIC}'")
    else:
        print(f"[mqtt] échec de connexion, code {rc}")


def on_message(client, userdata, msg):
    sensor = msg.topic.rsplit("/", 1)[-1]
    if sensor not in SENSOR_FIELDS:
        print(f"[mqtt] topic inconnu ignoré : {msg.topic}")
        return

    try:
        value = json.loads(msg.payload.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as err:
        print(f"[mqtt] message ignoré (JSON invalide) : {err}")
        return

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


def publish_actuator_command(actuator: str, state: bool):
    """Publie une commande sur lentia/actuators/<actionneur>/set. Le Pico
    (une fois câblé) s'y abonne et actionne le relais correspondant."""
    if _client is None:
        raise RuntimeError("client MQTT non connecté")
    _client.publish(f"{ACTUATOR_TOPIC_PREFIX}/{actuator}/set", json.dumps(state))

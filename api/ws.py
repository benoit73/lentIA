"""Routes WebSocket : une par capteur, pousse chaque nouvelle valeur reçue
sur MQTT (via realtime.broadcaster) au navigateur, en temps réel."""

import json

from flask_sock import Sock
from simple_websocket import ConnectionClosed

from config import SENSOR_FIELDS
from realtime import broadcaster

sock = Sock()


def register(app):
    sock.init_app(app)

    @sock.route("/ws/sensors/<sensor>")
    def sensor_ws(ws, sensor):
        if sensor not in SENSOR_FIELDS:
            return

        q = broadcaster.subscribe(sensor)
        try:
            while True:
                value = q.get()  # bloque jusqu'à la prochaine valeur publiée
                ws.send(json.dumps(value))
        except ConnectionClosed:
            pass
        finally:
            broadcaster.unsubscribe(sensor, q)

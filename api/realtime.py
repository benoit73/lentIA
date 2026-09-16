"""Petit pub/sub en mémoire : diffuse chaque nouvelle valeur de capteur
(reçue par mqtt_ingest) vers les routes WebSocket qui y sont abonnées."""

import queue
import threading


class SensorBroadcaster:
    def __init__(self):
        self._lock = threading.Lock()
        self._subscribers = {}  # capteur -> set de Queue

    def subscribe(self, sensor: str) -> "queue.Queue":
        q = queue.Queue()
        with self._lock:
            self._subscribers.setdefault(sensor, set()).add(q)
        return q

    def unsubscribe(self, sensor: str, q: "queue.Queue"):
        with self._lock:
            subs = self._subscribers.get(sensor)
            if subs:
                subs.discard(q)

    def publish(self, sensor: str, value):
        with self._lock:
            subs = list(self._subscribers.get(sensor, ()))
        for q in subs:
            q.put(value)


broadcaster = SensorBroadcaster()

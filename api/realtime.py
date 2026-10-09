"""Petit pub/sub en mémoire : diffuse chaque nouvelle valeur de capteur (ou
image de la caméra), reçue par mqtt_ingest, vers les routes WebSocket qui y
sont abonnées."""

import queue
import threading


class SensorBroadcaster:
    def __init__(self):
        self._lock = threading.Lock()
        self._subscribers = {}  # capteur -> set de Queue

    def subscribe(self, sensor: str, maxsize: int = 0) -> "queue.Queue":
        """`maxsize` > 0 : file bornée qui ne garde que les messages les plus
        récents (images de la caméra : un client lent saute des images
        plutôt que d'accumuler du retard et de la mémoire)."""
        q = queue.Queue(maxsize)
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
            while True:
                try:
                    q.put_nowait(value)
                    break
                except queue.Full:
                    try:
                        q.get_nowait()  # jette le plus ancien
                    except queue.Empty:
                        pass


broadcaster = SensorBroadcaster()

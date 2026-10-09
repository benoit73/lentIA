"""Caméra du bac (Arducam HM01B0 sur le Pico) : reçoit les images brutes
publiées sur MQTT, les convertit en JPEG et les diffuse en temps réel.

Rien n'est stocké en base : seule la dernière image est gardée en mémoire,
pour l'envoyer tout de suite à un client qui ouvre la page caméra."""

import base64
import io
import struct
import threading
from datetime import datetime, timezone

from PIL import Image

from realtime import broadcaster

CHANNEL = "camera"
HEADER_SIZE = 4  # largeur, hauteur : 2 x uint16 big-endian (voir pico/hm01b0.py)
MAX_DIMENSION = 1024
JPEG_QUALITY = 80

_lock = threading.Lock()
_latest = None


def handle_frame(payload: bytes):
    """Décode un message MQTT de la caméra (en-tête + niveaux de gris), le
    convertit en JPEG et le publie aux abonnés WebSocket. Lève ValueError si
    le message est mal formé."""
    global _latest

    if len(payload) < HEADER_SIZE:
        raise ValueError("message trop court")
    width, height = struct.unpack(">HH", payload[:HEADER_SIZE])
    if not (0 < width <= MAX_DIMENSION and 0 < height <= MAX_DIMENSION):
        raise ValueError(f"dimensions invalides : {width}x{height}")
    pixels = payload[HEADER_SIZE:]
    if len(pixels) != width * height:
        raise ValueError(f"{len(pixels)} octets reçus pour {width}x{height}")

    out = io.BytesIO()
    Image.frombytes("L", (width, height), bytes(pixels)).save(out, "JPEG", quality=JPEG_QUALITY)

    frame = {
        "width": width,
        "height": height,
        "received_at": datetime.now(timezone.utc).isoformat(),
        # base64 plutôt que binaire : directement utilisable en
        # data:image/jpeg;base64,... par le web comme par l'app mobile.
        "jpeg": base64.b64encode(out.getvalue()).decode("ascii"),
    }
    with _lock:
        _latest = frame
    broadcaster.publish(CHANNEL, frame)


def latest_frame():
    with _lock:
        return _latest

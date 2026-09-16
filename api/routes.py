"""Routes HTTP REST : santé, liste des capteurs, historique par capteur."""

from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

import db
from config import SENSOR_FIELDS

bp = Blueprint("routes", __name__)


@bp.route("/api/health")
def health():
    return jsonify({"status": "ok", "time": datetime.now(timezone.utc).isoformat()})


@bp.route("/api/sensors")
def list_sensors():
    return jsonify(SENSOR_FIELDS)


@bp.route("/api/sensors/<sensor>/history")
def sensor_history(sensor):
    if sensor not in SENSOR_FIELDS:
        return jsonify({"error": f"capteur inconnu : {sensor}"}), 404

    limit = request.args.get("limit", default=200, type=int)
    limit = max(1, min(limit, 2000))

    start = request.args.get("start")  # ISO 8601, optionnel
    end = request.args.get("end")      # ISO 8601, optionnel
    for label, value in (("start", start), ("end", end)):
        if value is None:
            continue
        try:
            datetime.fromisoformat(value)
        except ValueError:
            return jsonify({"error": f"paramètre '{label}' invalide, attendu ISO 8601"}), 400

    return jsonify(db.fetch_sensor_history(sensor, limit=limit, start=start, end=end))

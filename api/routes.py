"""Routes HTTP REST : santé, liste des capteurs, historique par capteur."""

import re
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request

import db
import mqtt_ingest
from auth import require_auth
from config import ACTUATOR_FIELDS, SENSOR_FIELDS

_HHMM_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")

bp = Blueprint("routes", __name__)


def _validate_iso_range(start, end):
    """Vérifie que `start`/`end` (si fournis) sont bien des timestamps ISO
    8601. Retourne un tuple (réponse, code) à renvoyer tel quel en cas
    d'erreur, sinon None."""
    for label, value in (("start", start), ("end", end)):
        if value is None:
            continue
        try:
            datetime.fromisoformat(value)
        except ValueError:
            return jsonify({"error": f"paramètre '{label}' invalide, attendu ISO 8601"}), 400
    return None


@bp.route("/api/health")
def health():
    return jsonify({"status": "ok", "time": datetime.now(timezone.utc).isoformat()})


@bp.route("/api/sensors")
@require_auth
def list_sensors():
    return jsonify(SENSOR_FIELDS)


@bp.route("/api/sensors/<sensor>/history")
@require_auth
def sensor_history(sensor):
    if sensor not in SENSOR_FIELDS:
        return jsonify({"error": f"capteur inconnu : {sensor}"}), 404

    limit = request.args.get("limit", default=200, type=int)
    limit = max(1, min(limit, 2000))

    start = request.args.get("start")  # ISO 8601, optionnel
    end = request.args.get("end")      # ISO 8601, optionnel
    error = _validate_iso_range(start, end)
    if error:
        return error

    return jsonify(db.fetch_sensor_history(sensor, limit=limit, start=start, end=end))


@bp.route("/api/actuators")
@require_auth
def list_actuators():
    return jsonify(ACTUATOR_FIELDS)


@bp.route("/api/actuators/state")
@require_auth
def actuators_state():
    return jsonify(db.fetch_actuator_states())


@bp.route("/api/actuators/events")
@require_auth
def actuators_events():
    limit = request.args.get("limit", default=50, type=int)
    limit = max(1, min(limit, 500))

    actuator = request.args.get("actuator")  # optionnel : filtre sur un seul actionneur
    if actuator and actuator not in ACTUATOR_FIELDS:
        return jsonify({"error": f"actionneur inconnu : {actuator}"}), 404

    start = request.args.get("start")  # ISO 8601, optionnel
    end = request.args.get("end")      # ISO 8601, optionnel
    error = _validate_iso_range(start, end)
    if error:
        return error

    return jsonify(db.fetch_actuator_events(actuator=actuator, start=start, end=end, limit=limit))


@bp.route("/api/actuators/<actuator>/toggle", methods=["POST"])
@require_auth
def toggle_actuator(actuator):
    if actuator not in ACTUATOR_FIELDS:
        return jsonify({"error": f"actionneur inconnu : {actuator}"}), 404

    payload = request.get_json(silent=True) or {}
    state = payload.get("on")
    if not isinstance(state, bool):
        return jsonify({"error": "corps JSON attendu : {\"on\": true|false}"}), 400

    # Toujours "manual" ici : les commandes automatiques passent par
    # automation.py, jamais par cette route.
    db.insert_actuator_event(actuator, state, g.user.get("email"), source="manual")
    mqtt_ingest.publish_actuator_command(actuator, state)
    return jsonify({"actuator": actuator, "on": state})


def _validate_rule_payload(rule_type, config):
    """Vérifie la forme de `config` selon `rule_type`. Retourne un tuple
    (réponse, code) à renvoyer tel quel en cas d'erreur, sinon None."""
    if rule_type == "schedule":
        for field in ("start", "end"):
            value = config.get(field)
            if not isinstance(value, str) or not _HHMM_RE.match(value):
                return jsonify({"error": f"config.{field} doit être au format HH:MM"}), 400
        return None

    if rule_type == "threshold":
        if config.get("sensor") not in SENSOR_FIELDS:
            return jsonify({"error": "config.sensor doit être un capteur connu"}), 400
        if config.get("comparator") not in ("above", "below"):
            return jsonify({"error": "config.comparator doit être 'above' ou 'below'"}), 400
        threshold = config.get("threshold")
        if not isinstance(threshold, (int, float)) or isinstance(threshold, bool):
            return jsonify({"error": "config.threshold doit être un nombre"}), 400
        window = config.get("window_minutes")
        if not isinstance(window, int) or isinstance(window, bool) or window <= 0:
            return jsonify({"error": "config.window_minutes doit être un entier positif"}), 400
        return None

    return jsonify({"error": "rule_type doit être 'schedule' ou 'threshold'"}), 400


@bp.route("/api/automation/rules")
@require_auth
def automation_rules():
    return jsonify(db.fetch_automation_rules())


@bp.route("/api/automation/rules/<actuator>", methods=["PUT"])
@require_auth
def update_automation_rule(actuator):
    if actuator not in ACTUATOR_FIELDS:
        return jsonify({"error": f"actionneur inconnu : {actuator}"}), 404

    payload = request.get_json(silent=True) or {}
    enabled = payload.get("enabled")
    rule_type = payload.get("rule_type")
    config = payload.get("config")

    if not isinstance(enabled, bool):
        return jsonify({"error": "champ 'enabled' (bool) requis"}), 400
    if not isinstance(config, dict):
        return jsonify({"error": "champ 'config' (objet) requis"}), 400

    error = _validate_rule_payload(rule_type, config)
    if error:
        return error

    db.upsert_automation_rule(actuator, enabled, rule_type, config, g.user.get("email"))
    return jsonify({"actuator": actuator, "enabled": enabled, "rule_type": rule_type, "config": config})

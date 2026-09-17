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


def _is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _hhmm_to_minutes(value):
    hours, minutes = value.split(":")
    return int(hours) * 60 + int(minutes)


def _range_to_intervals(range_config):
    """Une plage HH:MM -> une ou deux plages en minutes-depuis-minuit (deux
    si elle traverse minuit, ex. 22:00-06:00)."""
    start = _hhmm_to_minutes(range_config["start"])
    end = _hhmm_to_minutes(range_config["end"])
    if start < end:
        return [(start, end)]
    return [(start, 24 * 60), (0, end)]


def _intervals_overlap(a, b):
    return a[0] < b[1] and b[0] < a[1]


def _validate_schedule_ranges(ranges):
    if not isinstance(ranges, list) or len(ranges) == 0:
        return jsonify({"error": "config.ranges doit être une liste non vide de {start, end}"}), 400

    all_intervals = []
    for i, range_config in enumerate(ranges):
        if not isinstance(range_config, dict):
            return jsonify({"error": f"config.ranges[{i}] doit être un objet {{start, end}}"}), 400
        for field in ("start", "end"):
            value = range_config.get(field)
            if not isinstance(value, str) or not _HHMM_RE.match(value):
                return jsonify({"error": f"config.ranges[{i}].{field} doit être au format HH:MM"}), 400
        if range_config["start"] == range_config["end"]:
            return jsonify({"error": f"config.ranges[{i}] : début et fin identiques"}), 400
        all_intervals.append(_range_to_intervals(range_config))

    for i in range(len(all_intervals)):
        for j in range(i + 1, len(all_intervals)):
            for iv1 in all_intervals[i]:
                for iv2 in all_intervals[j]:
                    if _intervals_overlap(iv1, iv2):
                        return jsonify({"error": f"config.ranges[{i}] et config.ranges[{j}] se chevauchent"}), 400

    return None


def _validate_rule_payload(rule_type, config):
    """Vérifie la forme de `config` selon `rule_type`. Retourne un tuple
    (réponse, code) à renvoyer tel quel en cas d'erreur, sinon None."""
    if rule_type == "schedule":
        return _validate_schedule_ranges(config.get("ranges"))

    if rule_type == "threshold":
        if config.get("sensor") not in SENSOR_FIELDS:
            return jsonify({"error": "config.sensor doit être un capteur connu"}), 400
        if config.get("comparator") not in ("above", "below"):
            return jsonify({"error": "config.comparator doit être 'above' ou 'below'"}), 400
        if not _is_number(config.get("threshold")):
            return jsonify({"error": "config.threshold doit être un nombre"}), 400

        action_mode = config.get("action_mode")
        if action_mode == "duration":
            duration = config.get("duration_minutes")
            if not _is_number(duration) or duration <= 0:
                return jsonify({"error": "config.duration_minutes doit être un nombre positif"}), 400
        elif action_mode == "until_target":
            if not _is_number(config.get("target_value")):
                return jsonify({"error": "config.target_value doit être un nombre"}), 400
        else:
            return jsonify({"error": "config.action_mode doit être 'duration' ou 'until_target'"}), 400
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

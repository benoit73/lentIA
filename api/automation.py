"""Évaluation périodique des règles d'automatisation (lumière sur plage
horaire, arrosage/ventilation sur la moyenne d'un capteur) dans un thread de
fond. Rejoue exactement la même logique qu'un toggle manuel — insertion en
base + publication MQTT — mais avec `source="auto"`, pour que ces actions
apparaissent dans le journal au même titre que les actions manuelles."""

import threading
import time
from datetime import datetime, time as dtime

import db
import mqtt_ingest
from config import ACTUATOR_FIELDS, AUTOMATION_POLL_SECONDS


def _parse_hhmm(value: str) -> dtime:
    hours, minutes = value.split(":")
    return dtime(int(hours), int(minutes))


def _schedule_desired_state(config: dict, now: datetime) -> bool:
    start = _parse_hhmm(config["start"])
    end = _parse_hhmm(config["end"])
    current = now.time()
    if start <= end:
        return start <= current < end
    return current >= start or current < end  # plage qui traverse minuit


def _threshold_desired_state(config: dict):
    """None si pas assez de données pour décider (on ne touche alors à
    rien plutôt que de deviner)."""
    average = db.fetch_sensor_average(config["sensor"], config["window_minutes"])
    if average is None:
        return None
    if config["comparator"] == "above":
        return average > config["threshold"]
    return average < config["threshold"]


def evaluate_once():
    rules = db.fetch_automation_rules()
    states = db.fetch_actuator_states()
    now = datetime.now()

    for actuator in ACTUATOR_FIELDS:
        rule = rules.get(actuator)
        if not rule or not rule["enabled"]:
            continue

        if rule["rule_type"] == "schedule":
            desired = _schedule_desired_state(rule["config"], now)
        elif rule["rule_type"] == "threshold":
            desired = _threshold_desired_state(rule["config"])
        else:
            continue

        if desired is None:
            continue

        current = states.get(actuator, {}).get("state", False)
        if desired == current:
            continue

        db.insert_actuator_event(actuator, desired, None, source="auto")
        mqtt_ingest.publish_actuator_command(actuator, desired)
        print(f"[automation] {actuator} -> {'ON' if desired else 'OFF'} (règle {rule['rule_type']})")


def _loop():
    while True:
        try:
            evaluate_once()
        except Exception as err:  # ne jamais tuer le thread d'automatisation
            print(f"[automation] erreur d'évaluation : {err}")
        time.sleep(AUTOMATION_POLL_SECONDS)


def start():
    thread = threading.Thread(target=_loop, daemon=True)
    thread.start()
    return thread

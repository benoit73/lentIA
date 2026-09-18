"""Évaluation périodique des règles d'automatisation (plage(s) horaire(s) ou
seuil sur la moyenne d'un capteur) dans un thread de fond. Rejoue exactement
la même logique qu'un toggle manuel — insertion en base + publication MQTT —
mais avec `source="auto"`, pour que ces actions apparaissent dans le journal
au même titre que les actions manuelles.

Schéma des règles (`config` selon `rule_type`) :
  'schedule'  -> {"ranges": [{"start": "07:00", "end": "12:00"}, ...]}
                 (plages non chevauchantes, validées à l'écriture)
  'threshold' -> {"sensor": "soil_humidity", "comparator": "below"|"above",
                  "threshold": 35,
                  "action_mode": "duration"|"until_target",
                  "duration_minutes": 5,       # si action_mode == "duration"
                  "target_value": 55}          # si action_mode == "until_target"
  'schedule_threshold' -> {"ranges": [...], "sensor": "luminosity",
                  "comparator": "below"|"above", "threshold": 200}
                 (lumière d'appoint : allumé seulement dans une plage ET
                 quand la moyenne du capteur ne dépasse pas le seuil)

Pas d'état séparé à maintenir pour "duration"/"until_target" : on relit
l'état courant de l'actionneur (`db.fetch_actuator_states`), dont
`updated_at` est l'horodatage du dernier changement — peu importe si ce
changement était manuel ou automatique, la règle prend la main sur la
décision d'éteindre tant qu'elle est activée."""

import threading
import time
from datetime import datetime, time as dtime, timezone

import db
import mqtt_ingest
from config import ACTUATOR_FIELDS, AUTOMATION_AVERAGE_WINDOW_MINUTES, AUTOMATION_POLL_SECONDS


def _parse_hhmm(value: str) -> dtime:
    hours, minutes = value.split(":")
    return dtime(int(hours), int(minutes))


def _range_contains(range_config: dict, current: dtime) -> bool:
    start = _parse_hhmm(range_config["start"])
    end = _parse_hhmm(range_config["end"])
    if start <= end:
        return start <= current < end
    return current >= start or current < end  # plage qui traverse minuit


def _schedule_desired_state(config: dict, now_local: datetime) -> bool:
    current = now_local.time()
    return any(_range_contains(r, current) for r in config["ranges"])


def _threshold_desired_state(config: dict, currently_on: bool, state_updated_at):
    """None si pas assez de données pour décider (on ne touche alors à rien
    plutôt que de deviner)."""
    average = db.fetch_sensor_average(config["sensor"], AUTOMATION_AVERAGE_WINDOW_MINUTES)
    if average is None:
        return None

    comparator = config["comparator"]
    threshold = config["threshold"]
    triggered = average > threshold if comparator == "above" else average < threshold

    if not currently_on:
        # Éteint : ne s'allume que si la condition de déclenchement est vraie.
        return triggered

    # Allumé (par cette règle ou manuellement) : la condition d'arrêt dépend
    # du mode choisi, pas du déclencheur d'origine.
    action_mode = config.get("action_mode", "duration")
    if action_mode == "until_target":
        target = config["target_value"]
        if comparator == "below":
            return average < target  # on chauffe/arrose tant que la cible n'est pas atteinte par le haut
        return average > target  # on ventile tant que la cible n'est pas atteinte par le bas

    # "duration" : reste allumé jusqu'à ce que la durée choisie soit écoulée.
    if state_updated_at is None:
        return False
    elapsed_minutes = (datetime.now(timezone.utc) - state_updated_at).total_seconds() / 60
    return elapsed_minutes < config["duration_minutes"]


def _schedule_threshold_desired_state(config: dict, now_local: datetime):
    """Combine plage horaire et seuil (lumière d'appoint) : n'allume que si
    on est dans une des plages ET que la moyenne du capteur ne dépasse pas
    (ou dépasse, selon `comparator`) le seuil. `None` si pas assez de
    données pour décider une fois dans la plage."""
    if not _schedule_desired_state(config, now_local):
        return False

    average = db.fetch_sensor_average(config["sensor"], AUTOMATION_AVERAGE_WINDOW_MINUTES)
    if average is None:
        return None

    comparator = config["comparator"]
    return average > config["threshold"] if comparator == "above" else average < config["threshold"]


def evaluate_once():
    rules = db.fetch_automation_rules()
    states = db.fetch_actuator_states()
    now_local = datetime.now()

    for actuator in ACTUATOR_FIELDS:
        rule = rules.get(actuator)
        if not rule or not rule["enabled"]:
            continue

        current_state = states.get(actuator, {})
        currently_on = current_state.get("state", False)
        updated_at_raw = current_state.get("updated_at")
        updated_at = datetime.fromisoformat(updated_at_raw) if updated_at_raw else None

        if rule["rule_type"] == "schedule":
            desired = _schedule_desired_state(rule["config"], now_local)
        elif rule["rule_type"] == "threshold":
            desired = _threshold_desired_state(rule["config"], currently_on, updated_at)
        elif rule["rule_type"] == "schedule_threshold":
            desired = _schedule_threshold_desired_state(rule["config"], now_local)
        else:
            continue

        if desired is None or desired == currently_on:
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

"""Accès Postgres : écriture des relevés, lecture de l'historique par capteur."""

import time

import psycopg2
import psycopg2.extras
from psycopg2 import sql

from config import ACTUATOR_FIELDS, DATABASE_URL, SENSOR_FIELDS


def get_conn(retries=10, delay=2):
    """Ouvre une connexion Postgres, avec un peu de patience au démarrage
    du stack (Postgres peut ne pas être totalement prêt)."""
    last_err = None
    for attempt in range(retries):
        try:
            return psycopg2.connect(DATABASE_URL)
        except psycopg2.OperationalError as err:
            last_err = err
            print(f"[db] connexion échouée (essai {attempt + 1}/{retries}) : {err}")
            time.sleep(delay)
    raise last_err


def insert_reading(sensor: str, value):
    """Insère une ligne avec la valeur d'un seul capteur (les autres colonnes
    restent NULL) : un message MQTT ne porte qu'un seul capteur à la fois."""
    if sensor not in SENSOR_FIELDS:
        raise ValueError(f"capteur inconnu : {sensor}")

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                sql.SQL("INSERT INTO readings ({field}) VALUES (%s)").format(
                    field=sql.Identifier(sensor)
                ),
                (value,),
            )
        conn.commit()


def fetch_sensor_history(sensor: str, limit: int = 200, start: str = None, end: str = None):
    """Historique d'un capteur (relevés non NULL), du plus ancien au plus
    récent. `start`/`end` sont des timestamps ISO 8601 optionnels."""
    if sensor not in SENSOR_FIELDS:
        raise ValueError(f"capteur inconnu : {sensor}")

    clauses = [sql.SQL("{field} IS NOT NULL").format(field=sql.Identifier(sensor))]
    params = []
    if start:
        clauses.append(sql.SQL("created_at >= %s::timestamptz"))
        params.append(start)
    if end:
        clauses.append(sql.SQL("created_at <= %s::timestamptz"))
        params.append(end)
    params.append(limit)

    query = sql.SQL(
        "SELECT {field} AS value, created_at FROM readings "
        "WHERE {where} ORDER BY created_at DESC LIMIT %s"
    ).format(field=sql.Identifier(sensor), where=sql.SQL(" AND ").join(clauses))

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()

    rows.reverse()
    for row in rows:
        row["created_at"] = row["created_at"].isoformat()
    return rows


def insert_actuator_event(actuator: str, state: bool, actor_email: str | None, source: str = "manual"):
    """Enregistre une commande d'actionneur (qui, quoi, quand, manuel ou
    automatique). C'est aussi cette table qui sert de source pour l'état
    affiché dans le dashboard, en attendant un vrai retour matériel."""
    if actuator not in ACTUATOR_FIELDS:
        raise ValueError(f"actionneur inconnu : {actuator}")

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO actuator_events (actuator, state, actor_email, source) VALUES (%s, %s, %s, %s)",
                (actuator, state, actor_email, source),
            )
        conn.commit()


def fetch_actuator_states():
    """Dernier état connu de chaque actionneur (le plus récent événement par
    actionneur). Défaut à `False` / jamais changé si aucun événement."""
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT DISTINCT ON (actuator) actuator, state, created_at
                FROM actuator_events
                WHERE actuator = ANY(%s)
                ORDER BY actuator, created_at DESC
                """,
                (ACTUATOR_FIELDS,),
            )
            rows = cur.fetchall()

    states = {actuator: {"state": False, "updated_at": None} for actuator in ACTUATOR_FIELDS}
    for row in rows:
        states[row["actuator"]] = {
            "state": row["state"],
            "updated_at": row["created_at"].isoformat(),
        }
    return states


def fetch_actuator_events(
    actuator: str | None = None,
    start: str | None = None,
    end: str | None = None,
    limit: int = 50,
):
    """Journal des commandes, du plus récent au plus ancien, avec la durée de
    chaque état (jusqu'au changement suivant pour ce même actionneur —
    `ended_at`/`duration_seconds` valent `None` si l'état est toujours en
    cours). La chaîne des événements (`LEAD`) est calculée sur tout
    l'historique avant de filtrer/limiter, pour ne pas fausser la durée du
    dernier événement visible dans la plage demandée."""
    if actuator is not None and actuator not in ACTUATOR_FIELDS:
        raise ValueError(f"actionneur inconnu : {actuator}")

    query = """
        WITH chained AS (
            SELECT id, actuator, state, actor_email, source, created_at,
                   LEAD(created_at) OVER (PARTITION BY actuator ORDER BY created_at) AS ended_at
            FROM actuator_events
        )
        SELECT * FROM chained
        WHERE (%(actuator)s IS NULL OR actuator = %(actuator)s)
          AND (%(start)s IS NULL OR created_at >= %(start)s::timestamptz)
          AND (%(end)s IS NULL OR created_at <= %(end)s::timestamptz)
        ORDER BY created_at DESC
        LIMIT %(limit)s
    """
    params = {"actuator": actuator, "start": start, "end": end, "limit": limit}

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()

    for row in rows:
        created_at = row["created_at"]
        ended_at = row["ended_at"]
        row["created_at"] = created_at.isoformat()
        if ended_at is not None:
            row["ended_at"] = ended_at.isoformat()
            row["duration_seconds"] = (ended_at - created_at).total_seconds()
        else:
            row["ended_at"] = None
            row["duration_seconds"] = None
    return rows


def fetch_sensor_average(sensor: str, window_minutes: int):
    """Moyenne d'un capteur sur les `window_minutes` dernières minutes.
    `None` si aucun relevé sur cette fenêtre."""
    if sensor not in SENSOR_FIELDS:
        raise ValueError(f"capteur inconnu : {sensor}")

    query = sql.SQL(
        "SELECT AVG({field}) FROM readings "
        "WHERE {field} IS NOT NULL AND created_at >= now() - (%s * INTERVAL '1 minute')"
    ).format(field=sql.Identifier(sensor))

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (window_minutes,))
            (average,) = cur.fetchone()
    return average


def fetch_automation_rules():
    """Toutes les règles d'automatisation enregistrées, indexées par
    actionneur (un actionneur sans règle enregistrée est absent du dict)."""
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT actuator, enabled, rule_type, config, updated_by, updated_at FROM automation_rules"
            )
            rows = cur.fetchall()

    rules = {}
    for row in rows:
        row["updated_at"] = row["updated_at"].isoformat()
        rules[row["actuator"]] = row
    return rules


def upsert_automation_rule(actuator: str, enabled: bool, rule_type: str, config: dict, updated_by: str | None):
    """Crée ou remplace la règle d'un actionneur (une seule règle par
    actionneur : un nouvel enregistrement écrase le précédent)."""
    if actuator not in ACTUATOR_FIELDS:
        raise ValueError(f"actionneur inconnu : {actuator}")

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO automation_rules (actuator, enabled, rule_type, config, updated_by, updated_at)
                VALUES (%s, %s, %s, %s, %s, now())
                ON CONFLICT (actuator) DO UPDATE SET
                    enabled = EXCLUDED.enabled,
                    rule_type = EXCLUDED.rule_type,
                    config = EXCLUDED.config,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = now()
                """,
                (actuator, enabled, rule_type, psycopg2.extras.Json(config), updated_by),
            )
        conn.commit()

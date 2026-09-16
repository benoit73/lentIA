"""Accès Postgres : écriture des relevés, lecture de l'historique par capteur."""

import time

import psycopg2
import psycopg2.extras
from psycopg2 import sql

from config import DATABASE_URL, SENSOR_FIELDS


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

-- Table des relevés de capteurs pour le projet lentIA
CREATE TABLE IF NOT EXISTS readings (
    id             SERIAL PRIMARY KEY,
    soil_humidity  DOUBLE PRECISION,   -- % humidité du sol
    air_humidity   DOUBLE PRECISION,   -- % humidité de l'air
    temperature    DOUBLE PRECISION,   -- °C
    luminosity     DOUBLE PRECISION,   -- % de luminosité (0-100)
    water_level    DOUBLE PRECISION,   -- % restant dans le réservoir d'eau
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_readings_created_at ON readings (created_at DESC);

-- Journal des commandes d'actionneurs (lumière, chauffage, arrosage).
-- Pas de matériel branché pour l'instant : chaque ligne n'est qu'une
-- commande envoyée (via MQTT) et enregistrée, pas un retour physique
-- confirmé. Le dernier événement par actionneur sert d'état affiché.
CREATE TABLE IF NOT EXISTS actuator_events (
    id           SERIAL PRIMARY KEY,
    actuator     TEXT NOT NULL,
    state        BOOLEAN NOT NULL,
    actor_email  TEXT,
    source       TEXT NOT NULL DEFAULT 'manual', -- 'manual' ou 'auto'
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_actuator_events_actuator_created_at
    ON actuator_events (actuator, created_at DESC);

-- Règles d'automatisation : une ligne par actionneur. `config` dépend de
-- `rule_type` :
--   'schedule'  -> {"start": "06:00", "end": "22:00"}
--   'threshold' -> {"sensor": "soil_humidity", "comparator": "below"|"above",
--                   "threshold": 40, "window_minutes": 60}
CREATE TABLE IF NOT EXISTS automation_rules (
    actuator     TEXT PRIMARY KEY,
    enabled      BOOLEAN NOT NULL DEFAULT false,
    rule_type    TEXT NOT NULL,
    config       JSONB NOT NULL,
    updated_by   TEXT,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

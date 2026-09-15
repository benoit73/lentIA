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

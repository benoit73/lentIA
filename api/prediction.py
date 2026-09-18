"""Charge le réseau de neurones entraîné hors-ligne (voir `ia/train_model.py`)
et l'utilise pour prédire les chances de pousse des lentilles à partir des
derniers relevés de capteurs, ainsi que pour recommander des valeurs cibles
par capteur qui maximisent cette prédiction."""

from pathlib import Path

import joblib
import numpy as np

MODEL_PATH = Path(__file__).parent / "model" / "germination_model.joblib"

_bundle = None


def _load():
    global _bundle
    if _bundle is None:
        _bundle = joblib.load(MODEL_PATH)
    return _bundle


def predict_germination_chance(temperature, humidite_sol, luminosite, humidite_air):
    """Retourne le % de chances de pousse (0-100) prédit par le modèle, à
    partir des 4 relevés capteur utilisés à l'entraînement (voir
    `ia/train_model.py::FEATURES` pour l'ordre attendu)."""
    bundle = _load()
    features = [[temperature, humidite_sol, luminosite, humidite_air]]
    (prediction,) = bundle["model"].predict(features)
    return float(max(0.0, min(100.0, prediction)))


# Plages balayées pour la recommandation, calées sur le min/max observé
# dans le dataset d'entraînement (`ia/dataset_germination_lentilles.csv`) :
# rester dans ce que le modèle a vu à l'entraînement plutôt que d'extrapoler
# au-delà, où une prédiction de réseau de neurones n'a pas de sens garanti.
SENSOR_BOUNDS = {
    "temperature": (12.0, 41.0),
    "soil_humidity": (9.0, 100.0),
    "luminosity": (0.0, 2150.0),
    "air_humidity": (20.0, 92.0),
}
_GRID_POINTS = 121


def recommend_values(current: dict) -> dict:
    """Pour chaque capteur, balaie sa plage plausible pour trouver la valeur
    qui maximise la prédiction du modèle, les 3 autres capteurs restant
    fixés à leur relevé actuel (`current`) — une recommandation locale
    ("vise Y% d'humidité du sol dans les conditions actuelles"), pas une
    optimisation jointe sur les 4 capteurs en même temps."""
    bundle = _load()
    model = bundle["model"]
    recommendations = {}

    for sensor, (low, high) in SENSOR_BOUNDS.items():
        grid = np.linspace(low, high, _GRID_POINTS)
        rows = []
        for candidate in grid:
            params = dict(current)
            params[sensor] = float(candidate)
            rows.append(
                [params["temperature"], params["soil_humidity"], params["luminosity"], params["air_humidity"]]
            )
        predictions = np.clip(model.predict(rows), 0, 100)
        best_index = int(np.argmax(predictions))
        recommendations[sensor] = {
            "recommended_value": round(float(grid[best_index]), 1),
            "predicted_chance_pct": round(float(predictions[best_index]), 2),
        }

    return recommendations

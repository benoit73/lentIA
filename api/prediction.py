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


_GRID_POINTS = 121

# En dessous de ce gain (en points de % de pousse), on n'affiche pas de
# cible. Dans ce dataset, température et humidité du sol pèsent des dizaines
# de points, tandis que luminosité et humidité de l'air oscillent de quelques
# points sans vrai signal : ce seuil ne laisse passer que les leviers réels
# plutôt que d'inventer une cible sur une courbe quasi plate.
MIN_RECOMMENDATION_GAIN_PCT = 8.0


def recommend_values(current: dict) -> dict:
    """Pour chaque capteur, balaie la plage observée à l'entraînement pour
    trouver la valeur qui maximise la prédiction, les autres capteurs restant
    fixés à leur valeur actuelle (`current`, des moyennes — voir
    `PREDICTION_WINDOW_MINUTES`). Recommandation locale ("vise Y% d'humidité
    du sol dans les conditions actuelles"), pas une optimisation jointe.

    Les bornes de balayage viennent du modèle lui-même : au-delà de ce qu'il
    a vu à l'entraînement, un réseau de neurones extrapole sans garantie."""
    bundle = _load()
    model = bundle["model"]
    sensors = bundle["sensors"]
    bounds = bundle["bounds"]

    baseline_row = [float(current[sensor]) for sensor in sensors]
    baseline = float(np.clip(model.predict([baseline_row]), 0, 100)[0])

    recommendations = {}
    for index, sensor in enumerate(sensors):
        low, high = bounds[sensor]
        grid = np.linspace(low, high, _GRID_POINTS)
        rows = np.tile(baseline_row, (len(grid), 1))
        rows[:, index] = grid

        predictions = np.clip(model.predict(rows), 0, 100)
        best_index = int(np.argmax(predictions))
        gain = float(predictions[best_index]) - baseline
        if gain < MIN_RECOMMENDATION_GAIN_PCT:
            continue

        recommendations[sensor] = {
            "recommended_value": round(float(grid[best_index]), 1),
            "predicted_chance_pct": round(float(predictions[best_index]), 2),
            "gain_pct": round(gain, 2),
        }

    return recommendations

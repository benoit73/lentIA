"""Charge le réseau de neurones entraîné hors-ligne (voir `ia/train_model.py`)
et l'utilise pour prédire les chances de pousse des lentilles à partir des
derniers relevés de capteurs."""

from pathlib import Path

import joblib

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

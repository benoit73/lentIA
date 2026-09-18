"""Entraîne un réseau de neurones (MLPRegressor) qui prédit les chances de
pousse des lentilles à partir des relevés de capteurs.

Le dataset (`dataset_germination_lentilles.csv`) contient, pour 25 bacs
suivis heure par heure sur 8 jours, les relevés de température, humidité du
sol, luminosité et humidité de l'air, ainsi que le pourcentage de chances de
pousse observé (`chances_pousse_pct`, une valeur par bac/jour).

Usage :
    pip install -r requirements.txt
    python train_model.py

Écrit le modèle entraîné (réseau + normalisation, dans un seul objet
scikit-learn) dans `../api/model/germination_model.joblib`, chargé au
démarrage par l'API (voir `api/prediction.py`).
"""

import csv
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import GroupShuffleSplit
from sklearn.neural_network import MLPRegressor
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

DATASET_PATH = Path(__file__).parent / "dataset_germination_lentilles.csv"
MODEL_PATH = Path(__file__).parent.parent / "api" / "model" / "germination_model.joblib"

# Les capteurs réellement disponibles côté matériel (pas jour/heure : ce
# sont des coordonnées du dataset de simulation, pas des relevés capteur).
FEATURES = ["temperature_C", "humidite_sol_pct", "luminosite_lux", "humidite_air_pct"]
TARGET = "chances_pousse_pct"


def load_dataset():
    lot_ids, X, y = [], [], []
    with open(DATASET_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            lot_ids.append(int(row["lot_id"]))
            X.append([float(row[field]) for field in FEATURES])
            y.append(float(row[TARGET]))
    return np.array(lot_ids), np.array(X), np.array(y)


def main():
    lot_ids, X, y = load_dataset()
    print(f"{len(y)} relevés, {len(set(lot_ids))} bacs")

    # Split par bac (lot_id), pas par ligne : les relevés d'un même bac sont
    # très corrélés (même trajectoire de pousse heure par heure), un split
    # aléatoire ligne par ligne ferait fuiter le même bac dans train ET test
    # et surestimerait la performance.
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, test_idx = next(splitter.split(X, y, groups=lot_ids))
    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]

    model = make_pipeline(
        StandardScaler(),
        MLPRegressor(
            hidden_layer_sizes=(32, 16),
            activation="relu",
            solver="adam",
            alpha=1e-3,
            max_iter=2000,
            early_stopping=True,
            n_iter_no_change=25,
            random_state=42,
        ),
    )
    model.fit(X_train, y_train)

    pred_test = np.clip(model.predict(X_test), 0, 100)
    mae = mean_absolute_error(y_test, pred_test)
    r2 = r2_score(y_test, pred_test)
    print(f"MAE (test, bacs jamais vus à l'entraînement) : {mae:.2f} points de %")
    print(f"R2  (test, bacs jamais vus à l'entraînement) : {r2:.3f}")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": model, "features": FEATURES}, MODEL_PATH)
    print(f"Modèle sauvegardé dans {MODEL_PATH}")


if __name__ == "__main__":
    main()

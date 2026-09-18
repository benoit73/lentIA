"""Entraîne un réseau de neurones (MLPRegressor) qui prédit les chances de
pousse des lentilles à partir des relevés de capteurs.

Point important sur la granularité : le dataset contient 4800 lignes
horaires, mais `chances_pousse_pct` est constant sur les 24 heures d'une
même journée — il n'y a donc que 25 bacs × 8 jours = **200 vraies
observations**. Entraîner ligne par ligne revient à dupliquer 24 fois chaque
étiquette en la mariant à des valeurs instantanées sans rapport : la
luminosité vaut 0 la nuit et 1100 lux à midi pour la *même* cible, si bien
que le modèle n'y voyait que du bruit (corrélation +0.008) et finissait par
recommander « 0 lux ». On agrège donc chaque journée en moyennes avant
d'entraîner, et l'API doit interroger le modèle avec des moyennes sur 24 h
(cf. `PREDICTION_WINDOW_MINUTES` côté API).

Usage :
    pip install -r requirements.txt
    python train_model.py

Écrit le modèle entraîné (réseau + normalisation + bornes de balayage) dans
`../api/model/germination_model.joblib`.
"""

import csv
from collections import defaultdict
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

# Colonnes du dataset et clés capteur correspondantes côté API, dans l'ordre
# attendu par le modèle.
FEATURES = ["temperature_C", "humidite_sol_pct", "luminosite_lux", "humidite_air_pct"]
SENSORS = ["temperature", "soil_humidity", "luminosity", "air_humidity"]
TARGET = "chances_pousse_pct"


def load_daily_observations():
    """Une ligne par (bac, jour) : moyennes des capteurs sur la journée et
    la cible observée ce jour-là."""
    with open(DATASET_PATH, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    by_lot_day = defaultdict(list)
    for row in rows:
        by_lot_day[(int(row["lot_id"]), int(row["jour"]))].append(row)

    lots, X, y = [], [], []
    for (lot, _day), day_rows in sorted(by_lot_day.items()):
        lots.append(lot)
        X.append([float(np.mean([float(r[field]) for r in day_rows])) for field in FEATURES])
        y.append(float(day_rows[0][TARGET]))

    print(f"{len(rows)} relevés horaires -> {len(y)} observations journalières ({len(set(lots))} bacs)")
    return np.array(lots), np.array(X), np.array(y)


def sweep_report(model, X):
    """Vérification de bon sens : pour chaque capteur, où le modèle place-t-il
    l'optimum, et combien de points de survie sépare le meilleur du pire ?
    Un capteur quasi plat (faible amplitude) ne devrait pas donner lieu à une
    recommandation — c'est ce que fait `api/prediction.py`."""
    base = np.median(X, axis=0)
    print("\nBalayage autour du bac médian :")
    for index, (field, (low, high)) in enumerate(zip(FEATURES, zip(X.min(axis=0), X.max(axis=0)))):
        grid = np.linspace(low, high, 61)
        candidates = np.tile(base, (len(grid), 1))
        candidates[:, index] = grid
        predictions = np.clip(model.predict(candidates), 0, 100)
        best = int(np.argmax(predictions))
        print(
            f"  {field:>20s} : optimum {grid[best]:7.1f} "
            f"(amplitude {predictions.max() - predictions.min():5.1f} pts)"
        )


def main():
    lots, X, y = load_daily_observations()

    # Split par bac : les 8 jours d'un même bac partagent la même trajectoire,
    # les séparer entre train et test surestimerait la performance.
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, test_idx = next(splitter.split(X, y, groups=lots))

    # lbfgs plutôt qu'adam : sur 160 observations d'entraînement il converge
    # mieux qu'une descente stochastique. Réseau volontairement petit et
    # `alpha` élevé : sans ça la surface part dans tous les sens là où le
    # dataset est pauvre, et le balayage y trouve de faux optimums.
    model = make_pipeline(
        StandardScaler(),
        MLPRegressor(
            hidden_layer_sizes=(12,),
            activation="relu",
            solver="lbfgs",
            alpha=10.0,
            max_iter=8000,
            random_state=42,
        ),
    )
    model.fit(X[train_idx], y[train_idx])

    predictions = np.clip(model.predict(X[test_idx]), 0, 100)
    print(f"\nMAE (test, bacs jamais vus) : {mean_absolute_error(y[test_idx], predictions):.2f} points de %")
    print(f"R2  (test, bacs jamais vus) : {r2_score(y[test_idx], predictions):.3f}")

    sweep_report(model, X)

    # Bornes de balayage = étendue réellement observée sur les moyennes
    # journalières : hors de cette plage, le réseau extrapole sans garantie.
    bounds = {sensor: (float(X[:, i].min()), float(X[:, i].max())) for i, sensor in enumerate(SENSORS)}

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": model, "features": FEATURES, "sensors": SENSORS, "bounds": bounds}, MODEL_PATH)
    print(f"\nModèle sauvegardé dans {MODEL_PATH}")


if __name__ == "__main__":
    main()

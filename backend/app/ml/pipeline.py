"""scikit-learn preprocessing + estimator construction.

The preprocessing (imputation, one-hot encoding, scaling) and the estimator are
wrapped in a single :class:`~sklearn.pipeline.Pipeline`. That object is what we
persist with joblib, which guarantees the exact same transformations are
applied at training, evaluation and detection time.
"""

from __future__ import annotations

from typing import Iterable

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier

from ..config import ALGORITHMS, RANDOM_STATE

# Documented hyper-parameters (shown in the UI / project report).
HYPERPARAMETERS = {
    "random_forest": {
        "n_estimators": 150,
        "max_depth": None,
        "min_samples_leaf": 1,
        "class_weight": None,
        "n_jobs": -1,
    },
    "decision_tree": {"max_depth": None, "min_samples_leaf": 1, "class_weight": None},
    "logistic_regression": {"max_iter": 300, "solver": "lbfgs", "C": 1.0, "tol": 1e-3},
}

# Numeric scaling is only required by the linear model; tree ensembles are
# scale invariant so we skip it to keep training fast.
SCALE_NUMERIC = {"logistic_regression": True, "random_forest": False, "decision_tree": False}


def build_estimator(algorithm: str, random_state: int = RANDOM_STATE):
    if algorithm not in ALGORITHMS:
        raise ValueError(f"Unsupported algorithm '{algorithm}'. Choose one of {ALGORITHMS}.")
    params = dict(HYPERPARAMETERS[algorithm])
    params.pop("n_jobs", None)
    if algorithm == "random_forest":
        return RandomForestClassifier(random_state=random_state, n_jobs=-1, **params)
    if algorithm == "decision_tree":
        return DecisionTreeClassifier(random_state=random_state, **params)
    return LogisticRegression(random_state=random_state, **params)


def build_preprocessor(
    numeric_columns: Iterable[str],
    categorical_columns: Iterable[str],
    *,
    scale_numeric: bool,
) -> ColumnTransformer:
    numeric_steps: list[tuple[str, object]] = [
        ("imputer", SimpleImputer(strategy="median")),
    ]
    if scale_numeric:
        numeric_steps.append(("scaler", StandardScaler()))

    transformers: list[tuple[str, object, list[str]]] = []
    numeric_list = list(numeric_columns)
    categorical_list = list(categorical_columns)

    if numeric_list:
        transformers.append(("numeric", Pipeline(numeric_steps), numeric_list))
    if categorical_list:
        transformers.append(
            (
                "categorical",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent", fill_value="missing")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                categorical_list,
            )
        )
    if not transformers:
        raise ValueError("No usable feature columns were found for training.")

    return ColumnTransformer(transformers=transformers, remainder="drop", sparse_threshold=0.3)


def build_pipeline(
    numeric_columns: Iterable[str],
    categorical_columns: Iterable[str],
    algorithm: str,
    random_state: int = RANDOM_STATE,
) -> Pipeline:
    return Pipeline(
        steps=[
            (
                "preprocess",
                build_preprocessor(
                    numeric_columns,
                    categorical_columns,
                    scale_numeric=SCALE_NUMERIC[algorithm],
                ),
            ),
            ("model", build_estimator(algorithm, random_state)),
        ]
    )

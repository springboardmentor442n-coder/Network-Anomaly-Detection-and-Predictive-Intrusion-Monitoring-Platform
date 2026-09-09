from dataclasses import dataclass
from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


@dataclass
class PreparedData:
    features: pd.DataFrame
    labels: pd.Series
    metadata: dict


def clean_frame(frame: pd.DataFrame, label_column: str) -> pd.DataFrame:
    cleaned = frame.copy()
    cleaned.columns = [str(column).strip() for column in cleaned.columns]
    cleaned = cleaned.replace([np.inf, -np.inf], np.nan)
    cleaned = cleaned.dropna(subset=[label_column]).drop_duplicates()
    return cleaned


def build_preprocessor(frame: pd.DataFrame, label_column: str) -> tuple[ColumnTransformer, list[str]]:
    ignored = {label_column, "Source_File", "id", "Flow ID", "Timestamp", "Src IP", "Dst IP", "Source IP", "Destination IP"}
    feature_columns = [column for column in frame.columns if column not in ignored]
    numeric = frame[feature_columns].select_dtypes(include=["number"]).columns.tolist()
    categorical = [column for column in feature_columns if column not in numeric]
    transformers = []
    if numeric:
        transformers.append(("numeric", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scale", StandardScaler())]), numeric))
    if categorical:
        transformers.append(("categorical", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("onehot", OneHotEncoder(handle_unknown="ignore"))]), categorical))
    return ColumnTransformer(transformers=transformers), feature_columns


def prepare_frame(frame: pd.DataFrame, label_column: str) -> PreparedData:
    cleaned = clean_frame(frame, label_column)
    preprocessor, feature_columns = build_preprocessor(cleaned, label_column)
    return PreparedData(cleaned[feature_columns], cleaned[label_column].astype(str).str.strip(), {"rows": len(cleaned), "features": feature_columns})


def save_metadata(path: Path, metadata: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(metadata, indent=2, default=str), encoding="utf-8")

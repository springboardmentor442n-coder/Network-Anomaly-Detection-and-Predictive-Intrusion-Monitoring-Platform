"""
NETSHIELD AI - CICIDS2017 Preprocessing Pipeline
Proper ML preprocessing with no data leakage.
"""
import logging
import numpy as np
import pandas as pd
import joblib
import os
from typing import Tuple, List, Dict, Optional
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer

logger = logging.getLogger(__name__)

# CICIDS2017 expected label column names (case-insensitive search)
LABEL_COLUMN_CANDIDATES = [
    " Label", "Label", "label", " label",
    "Attack", "attack", "Class", "class"
]

# Columns to drop (non-numeric or irrelevant identifiers)
COLUMNS_TO_DROP = [
    "Flow ID", " Flow ID", "flow_id",
    "Source IP", " Source IP", "source_ip", "Src IP",
    "Destination IP", " Destination IP", "dst_ip", "Dst IP",
    "Timestamp", " Timestamp", "timestamp",
]

# CICIDS2017 known attack label normalization
LABEL_NORMALIZATION = {
    "BENIGN": "BENIGN",
    "Benign": "BENIGN",
    "benign": "BENIGN",
    "DoS Hulk": "DoS Hulk",
    "PortScan": "PortScan",
    "DDoS": "DDoS",
    "DoS GoldenEye": "DoS GoldenEye",
    "FTP-Patator": "FTP-Patator",
    "SSH-Patator": "SSH-Patator",
    "DoS slowloris": "DoS slowloris",
    "DoS Slowhttptest": "DoS Slowhttptest",
    "Bot": "Bot",
    "Web Attack  Brute Force": "Web Attack - Brute Force",
    "Web Attack  XSS": "Web Attack - XSS",
    "Web Attack  Sql Injection": "Web Attack - SQL Injection",
    "Web Attack - Brute Force": "Web Attack - Brute Force",
    "Web Attack - XSS": "Web Attack - XSS",
    "Web Attack - SQL Injection": "Web Attack - SQL Injection",
    "Infiltration": "Infiltration",
    "Heartbleed": "Heartbleed",
}


def normalize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """Strip whitespace from column names."""
    df.columns = df.columns.str.strip()
    return df


def detect_label_column(df: pd.DataFrame) -> Optional[str]:
    """Detect the target label column in CICIDS2017 CSV."""
    cols = df.columns.tolist()
    # Try exact matches first
    for candidate in LABEL_COLUMN_CANDIDATES:
        if candidate in cols:
            return candidate
        if candidate.strip() in [c.strip() for c in cols]:
            # Find the actual column
            for c in cols:
                if c.strip() == candidate.strip():
                    return c
    # Case-insensitive fallback
    for c in cols:
        if c.lower().strip() in ["label", "attack", "class"]:
            return c
    return None


def validate_dataset(df: pd.DataFrame) -> Dict:
    """
    Validate a CICIDS2017 dataframe.
    Returns a validation report.
    """
    report = {
        "valid": True,
        "errors": [],
        "warnings": [],
        "stats": {}
    }

    df = normalize_column_names(df)

    # Check label column
    label_col = detect_label_column(df)
    if label_col is None:
        report["valid"] = False
        report["errors"].append(
            "No label column found. Expected one of: Label, Attack, Class. "
            "CICIDS2017 CSV must contain a target column."
        )
        return report

    report["stats"]["label_column"] = label_col

    # Check rows
    n_rows = len(df)
    if n_rows == 0:
        report["valid"] = False
        report["errors"].append("Dataset is empty (0 rows).")
        return report

    report["stats"]["num_rows"] = n_rows
    report["stats"]["num_columns"] = len(df.columns)

    # Numeric features (excluding label + drop columns)
    drop_names = [c.strip() for c in COLUMNS_TO_DROP]
    feature_cols = [
        c for c in df.columns
        if c.strip() not in drop_names and c != label_col
    ]

    # Try to find numeric features
    numeric_cols = []
    for c in feature_cols:
        try:
            pd.to_numeric(df[c], errors="raise")
            numeric_cols.append(c)
        except Exception:
            pass

    if len(numeric_cols) < 5:
        report["valid"] = False
        report["errors"].append(
            f"Too few numeric features found ({len(numeric_cols)}). "
            "CICIDS2017 should have many numeric flow statistics columns."
        )
        return report

    report["stats"]["num_features"] = len(numeric_cols)
    report["stats"]["feature_columns"] = numeric_cols

    # Class distribution
    labels = df[label_col].astype(str).str.strip()
    class_dist = labels.value_counts().to_dict()
    report["stats"]["class_distribution"] = class_dist
    report["stats"]["num_classes"] = len(class_dist)

    if report["stats"]["num_classes"] < 2:
        report["warnings"].append("Only 1 class found. Dataset may not be useful for classification.")

    # Missing values
    nan_counts = df[numeric_cols].isna().sum()
    total_nans = int(nan_counts.sum())
    report["stats"]["missing_values"] = total_nans

    # Infinite values
    total_infs = 0
    for c in numeric_cols:
        try:
            col_numeric = pd.to_numeric(df[c], errors="coerce")
            total_infs += int(np.isinf(col_numeric).sum())
        except Exception:
            pass
    report["stats"]["infinite_values"] = total_infs

    # Duplicate rows
    n_duplicates = int(df.duplicated().sum())
    report["stats"]["duplicate_rows"] = n_duplicates

    if total_nans > 0:
        report["warnings"].append(f"{total_nans} missing values will be imputed during preprocessing.")
    if total_infs > 0:
        report["warnings"].append(f"{total_infs} infinite values will be replaced during preprocessing.")
    if n_duplicates > 0:
        report["warnings"].append(f"{n_duplicates} duplicate rows found (will be removed during training).")

    return report


def load_and_preprocess_for_training(
    filepath: str,
    test_size: float = 0.2,
    random_seed: int = 42,
) -> Tuple:
    """
    Full preprocessing pipeline for training.
    Returns: X_train, X_test, y_train, y_test, feature_names, label_encoder, preprocessing_pipeline
    """
    from sklearn.model_selection import train_test_split

    logger.info(f"Loading dataset: {filepath}")
    df = pd.read_csv(filepath, low_memory=False)
    df = normalize_column_names(df)

    logger.info(f"Dataset shape: {df.shape}")

    # Detect label column
    label_col = detect_label_column(df)
    if label_col is None:
        raise ValueError("No label column found in dataset.")

    logger.info(f"Label column: {label_col}")

    # Normalize labels
    df[label_col] = df[label_col].astype(str).str.strip()
    df[label_col] = df[label_col].map(lambda x: LABEL_NORMALIZATION.get(x, x))

    # Drop irrelevant columns
    drop_cols = []
    drop_names_stripped = [c.strip() for c in COLUMNS_TO_DROP]
    for c in df.columns:
        if c.strip() in drop_names_stripped:
            drop_cols.append(c)
    if drop_cols:
        df = df.drop(columns=drop_cols)
        logger.info(f"Dropped columns: {drop_cols}")

    # Separate features and target
    X = df.drop(columns=[label_col])
    y = df[label_col]

    # Remove duplicate rows
    before = len(df)
    df_dedup = df.drop_duplicates()
    X = df_dedup.drop(columns=[label_col])
    y = df_dedup[label_col]
    after = len(df_dedup)
    if before != after:
        logger.info(f"Removed {before - after} duplicate rows.")

    # Select only numeric columns
    numeric_features = []
    for c in X.columns:
        try:
            X[c] = pd.to_numeric(X[c], errors="coerce")
            numeric_features.append(c)
        except Exception:
            pass

    X = X[numeric_features]

    logger.info(f"Numeric features: {len(numeric_features)}")

    # Encode labels BEFORE splitting (fitting only on training later is fine for LE)
    le = LabelEncoder()
    y_encoded = le.fit_transform(y.astype(str))

    # Train/test split (BEFORE fitting preprocessing)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=test_size, random_state=random_seed, stratify=y_encoded
    )

    logger.info(f"Train size: {len(X_train)}, Test size: {len(X_test)}")

    # Build preprocessing pipeline - fit ONLY on training data
    preprocessing_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    X_train_processed = preprocessing_pipeline.fit_transform(X_train)
    X_test_processed = preprocessing_pipeline.transform(X_test)

    logger.info("Preprocessing pipeline fitted on training data only.")

    return (
        X_train_processed,
        X_test_processed,
        y_train,
        y_test,
        numeric_features,
        le,
        preprocessing_pipeline,
    )


def preprocess_chunk_for_prediction(
    chunk: pd.DataFrame,
    feature_names: List[str],
    preprocessing_pipeline,
) -> Optional[np.ndarray]:
    """
    Preprocess a single chunk for prediction using the saved pipeline.
    The saved pipeline was fitted on training data ONLY.
    """
    chunk = normalize_column_names(chunk)

    # Drop label column if present
    label_col = detect_label_column(chunk)
    if label_col and label_col in chunk.columns:
        chunk = chunk.drop(columns=[label_col])

    # Drop irrelevant columns
    drop_names_stripped = [c.strip() for c in COLUMNS_TO_DROP]
    drop_cols = [c for c in chunk.columns if c.strip() in drop_names_stripped]
    if drop_cols:
        chunk = chunk.drop(columns=drop_cols)

    # Select only trained features (handle missing columns gracefully)
    available_features = []
    missing_features = []
    for f in feature_names:
        if f in chunk.columns:
            available_features.append(f)
        else:
            missing_features.append(f)

    if missing_features:
        logger.warning(f"Missing {len(missing_features)} features in chunk.")

    # Build feature matrix with missing columns as zeros
    X = pd.DataFrame(index=chunk.index)
    for f in feature_names:
        if f in chunk.columns:
            X[f] = pd.to_numeric(chunk[f], errors="coerce")
        else:
            X[f] = 0.0

    X = X[feature_names]

    # Handle infinite values
    X = X.replace([np.inf, -np.inf], np.nan)

    # Apply saved preprocessing pipeline
    try:
        X_processed = preprocessing_pipeline.transform(X)
        return X_processed
    except Exception as e:
        logger.error(f"Preprocessing error: {e}")
        return None

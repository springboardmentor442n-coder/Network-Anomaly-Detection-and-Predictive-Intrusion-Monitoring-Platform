"""Dataset management routes - upload, validate, inspect CICIDS2017 CSVs."""
import os
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import pandas as pd

from app.database.session import get_db
from app.database.models import User
from app.api.deps import get_current_user, require_analyst
from app.ml.preprocessing import validate_dataset, normalize_column_names, detect_label_column
from app.core.config import settings

router = APIRouter()


def _get_data_dir() -> str:
    data_dir = settings.DATA_DIR
    os.makedirs(data_dir, exist_ok=True)
    return data_dir


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    current_user: User = Depends(require_analyst),
):
    """Upload a CICIDS2017 CSV file."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    data_dir = _get_data_dir()
    save_path = os.path.join(data_dir, file.filename)

    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_size = os.path.getsize(save_path)

    return {
        "filename": file.filename,
        "path": save_path,
        "size_bytes": file_size,
        "message": "File uploaded successfully",
    }


@router.get("/list")
async def list_datasets(
    current_user: User = Depends(get_current_user),
):
    """List available CSV datasets."""
    data_dir = _get_data_dir()
    files = []
    for f in os.listdir(data_dir):
        if f.endswith(".csv"):
            fp = os.path.join(data_dir, f)
            files.append({
                "filename": f,
                "path": fp,
                "size_bytes": os.path.getsize(fp),
                "modified_at": os.path.getmtime(fp),
            })
    return files


@router.post("/inspect")
async def inspect_dataset(
    filename: str = Form(...),
    current_user: User = Depends(get_current_user),
):
    """Inspect a CICIDS2017 dataset and return statistics."""
    data_dir = _get_data_dir()
    filepath = os.path.join(data_dir, filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")

    try:
        # Read a sample for fast inspection
        df_sample = pd.read_csv(filepath, nrows=10000, low_memory=False)
        df_sample = normalize_column_names(df_sample)

        # Count total rows efficiently
        with open(filepath, encoding="utf-8", errors="replace") as f:
            total_rows = sum(1 for _ in f) - 1  # subtract header

        label_col = detect_label_column(df_sample)

        # Numeric features
        drop_cols_lower = {"flow id", "source ip", "destination ip", "timestamp", "src ip", "dst ip"}
        feature_cols = [
            c for c in df_sample.columns
            if c.lower().strip() not in drop_cols_lower
            and c != label_col
        ]

        numeric_cols = []
        for c in feature_cols:
            try:
                pd.to_numeric(df_sample[c], errors="raise")
                numeric_cols.append(c)
            except Exception:
                pass

        file_size = os.path.getsize(filepath)

        # Class distribution (from sample)
        class_dist = {}
        if label_col and label_col in df_sample.columns:
            class_dist = df_sample[label_col].astype(str).str.strip().value_counts().to_dict()

        import numpy as np
        nan_count = int(df_sample[numeric_cols].isna().sum().sum())
        inf_count = 0
        for c in numeric_cols:
            try:
                inf_count += int(np.isinf(pd.to_numeric(df_sample[c], errors="coerce")).sum())
            except Exception:
                pass
        dup_count = int(df_sample.duplicated().sum())

        return {
            "filename": filename,
            "size_bytes": file_size,
            "size_mb": round(file_size / 1024 / 1024, 2),
            "total_rows": total_rows,
            "sample_rows": len(df_sample),
            "num_columns": len(df_sample.columns),
            "num_features": len(numeric_cols),
            "label_column": label_col,
            "num_classes": len(class_dist),
            "class_distribution": class_dist,
            "missing_values": nan_count,
            "infinite_values": inf_count,
            "duplicate_rows": dup_count,
            "all_columns": list(df_sample.columns),
            "feature_columns": numeric_cols,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inspection failed: {str(e)}")


@router.post("/validate")
async def validate_dataset_endpoint(
    filename: str = Form(...),
    current_user: User = Depends(get_current_user),
):
    """Validate a CICIDS2017 dataset for training/scanning."""
    data_dir = _get_data_dir()
    filepath = os.path.join(data_dir, filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")

    try:
        df = pd.read_csv(filepath, nrows=50000, low_memory=False)
        report = validate_dataset(df)
        report["filename"] = filename
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")

# Train and export the 3 NetShield-AI models in Kaggle

1. Open your Kaggle notebook and attach the dataset containing separate train and test files (CSV or parquet). Filenames should include `train` and `test` (for example `UNSW_NB15_training-set.csv` and `UNSW_NB15_testing-set.csv`, or `train.parquet` and `test.parquet`).
2. Add a new code cell, copy all code from `kaggle/train_export_models.py` into it, and run it. It searches `/kaggle/input` for the train/test files.
3. Wait for the three models to finish. It writes `/kaggle/working/netshield_model_artifacts.zip`.
4. In Kaggle, use the right-side **Output** panel to download `netshield_model_artifacts.zip` to Windows.
5. Extract the ZIP. It should contain `random_forest.joblib`, `extra_trees.joblib`, `xgboost.joblib`, `feature_columns.json`, `label_classes.json`, `target_column.json`, and `metrics.json`.
6. Copy those files into your extracted project folder:
   `NetShield-AI-Connected\backend\artifacts\`
   If Windows asks, merge/replace files. Do not put the ZIP itself in `artifacts`.
7. Restart FastAPI. Open `http://127.0.0.1:8000/api/health`; all three model values should show `true`.

The uploaded CSV in the dashboard must contain the same input feature columns used by this training run. A target column such as `label`, `attack_cat`, or `Attack Type` can be present; the API removes known target columns before prediction. Do not upload arbitrary CSVs and expect reliable predictions if their feature schema differs.

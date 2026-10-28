COPY TRAINED MODEL ARTIFACT FILES INTO THIS FOLDER.
Required files for all 3 models:
  random_forest.joblib
  extra_trees.joblib
  xgboost.joblib
  feature_columns.json
  label_classes.json
  target_column.json
  metrics.json (optional for inference, useful for reporting)

Get these by running backend/train_models.py locally or the Kaggle helper at kaggle/train_export_models.py. The Kaggle script creates netshield_model_artifacts.zip in /kaggle/working; download and extract it, then copy the extracted files here. Do not put only the ZIP in this folder.

OPTION A — Local training data:
Place your separate training and testing CSV files here with exact names:
  UNSW_NB15_training-set.csv
  UNSW_NB15_testing-set.csv
The shared target column can be attack_cat, Attack Type, Label, label, or target.
Run `python train_models.py` from the backend folder.

OPTION B — Kaggle training (recommended if you already use Kaggle):
Open kaggle/train_export_models.py as a reference and paste its code into a Kaggle notebook cell with your dataset attached. Run it, download netshield_model_artifacts.zip from the Kaggle Output panel, extract it, then copy all extracted artifact files into backend/artifacts/.

The CSV uploaded from the dashboard should have the same model input columns as the training data. You may include target columns such as label, attack_cat, Attack Type, or Binary_Target; the API drops these known columns before prediction. Results are predictions, not a guarantee that a row is malicious; validate with your mentor and dataset documentation.

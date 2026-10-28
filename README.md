# NetShield AI — CSV Threat Detection + React + FastAPI

This project has a React/Vite SOC dashboard, a FastAPI API, CSV upload-and-scan workflow, alert creation, risk scoring, and a Kaggle helper to train/export three model pipelines.

## A. Start the frontend
Open the extracted `NetShield-AI-Connected` root folder in VS Code. The root folder must show `package.json`, `src`, `backend`, and `vite.config.js`.

```powershell
node --version
npm --version
npm install
npm run dev
```
Open the exact Vite URL printed in the terminal (usually `http://127.0.0.1:5173/`). Keep the terminal running.

## B. Start FastAPI in a second terminal
Open a second terminal in the same project root:

```powershell
cd backend
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
If activation is blocked in PowerShell, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` and activate again. Keep both terminals running.

Check `http://127.0.0.1:8000/api/health` and `http://127.0.0.1:8000/docs`. Vite proxies `/api` requests to FastAPI.

## C. Train the 3 models in Kaggle
1. Open `kaggle/train_export_models.py` from this project and paste its full contents into a new Kaggle notebook code cell.
2. Attach a dataset that contains separate train/test CSV or parquet files (e.g. `UNSW_NB15_training-set.csv` and `UNSW_NB15_testing-set.csv`, or `train.parquet` and `test.parquet`). The script searches `/kaggle/input` for filenames containing `train` and `test`.
3. Run the cell. It trains Random Forest, Extra Trees, and XGBoost and creates `/kaggle/working/netshield_model_artifacts.zip`.
4. Download that ZIP from the Kaggle notebook's Output panel and extract it on Windows.
5. Copy the extracted files (not the ZIP) into `NetShield-AI-Connected\backend\artifacts\`.
6. Restart the backend and check `/api/health`; all three model entries should be `true`.

You can alternatively put the matching training/test CSVs in `backend/data/` with the standard names and run `python train_models.py` from the `backend` directory. The target may be `attack_cat`, `Attack Type`, `Label`, `label`, or `target` in both splits.

## D. Upload a CSV from the dashboard
1. Open the home/Overview page in Chrome.
2. In **Upload network traffic CSV**, choose the model (XGBoost, Random Forest, or Extra Trees).
3. Click **Add CSV file**. The Windows file picker opens. Choose your `.csv`; the upload and scan begin automatically.
4. The dashboard shows total rows scanned, predicted threat rows, critical-risk count, alert count, predicted classes, confidence, and risk scores.
5. Click **Download all results CSV** to download a results file containing every scored row. Open **Alert Center** to review generated findings.

The uploaded CSV must contain the same feature columns used when training the model. Known target columns such as `label`, `attack_cat`, `Attack Type`, `Binary_Target`, or `id` are dropped before prediction. Files larger than 50 MB are rejected; split larger files into smaller CSVs.

## Risk scoring
The API uses the model's predicted class and its probability. Normal/benign rows receive a low uncertainty-based score; attack categories use a severity mapping multiplied by confidence. This is a triage heuristic for the project, not a calibrated production security score. Validate the mapping with your mentor.

## Important
- Actual CSV inference requires model artifacts in `backend/artifacts/`; the API returns a clear error if a selected model has not been trained/copied in.
- Alert storage is currently in memory and resets when FastAPI restarts. PostgreSQL/MongoDB persistence, login/roles, and live packet capture are not implemented.
- Dashboard overview charts outside the CSV scan result panel still include sample/demo visualization data.

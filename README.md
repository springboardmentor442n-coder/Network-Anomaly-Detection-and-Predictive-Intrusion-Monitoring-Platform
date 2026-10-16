# NetShield AI — Network Anomaly Detection and Intrusion Monitoring System

NetShield AI is a college-level cybersecurity project that turns the **UNSW-NB15**
network intrusion dataset into a working Security Operations Centre (SOC)
workflow: upload traffic data, analyse it, train a real scikit-learn model,
evaluate it on a separate test split, score new traffic with that model, triage
the resulting alerts, and export the evidence as CSV reports.

Everything runs locally. No dataset, model or alert ever leaves the machine.

> **Scope, stated plainly.** This project performs **offline, dataset-driven
> analysis**. It does **not** capture live packets, does **not** block or
> quarantine anything on the network, and does **not** integrate with any
> firewall, IDS/IPS or cloud service. Every number shown in the UI is computed
> from a CSV file you loaded. See [Limitations](#limitations).

---

## Table of contents

- [Screenshots](#screenshots)
- [The eight pages](#the-eight-pages)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Quick start](#quick-start)
- [Dataset setup](#dataset-setup)
- [End-to-end workflow](#end-to-end-workflow)
- [Machine learning methodology](#machine-learning-methodology)
- [Anti-leakage guarantees](#anti-leakage-guarantees)
- [Reports](#reports)
- [API reference](#api-reference)
- [Testing](#testing)
- [Project layout](#project-layout)
- [Deployment guidance](#deployment-guidance)
- [Limitations](#limitations)
- [Future scope](#future-scope)
- [References](#references)

---

## Screenshots

The screenshots below are **not committed to the repository** (they go stale
quickly). Take them yourself after starting both servers:

```bash
# terminal 1
cd backend ; .venv\Scripts\python -m uvicorn app.main:app --port 8000

# terminal 2
npm run dev        # http://localhost:3000
```

Then capture, in order, and save into `docs/screenshots/`:

| File name | Page | What to show |
| --- | --- | --- |
| `01-dashboard.png` | `/` | Metric cards + attack-category and severity charts filled in |
| `02-dataset-overview.png` | `/dataset` | Overview tab with row/column counts and column types |
| `03-dataset-correlation.png` | `/dataset` | Correlation heatmap tab |
| `04-training.png` | `/training` | Algorithm/target selection + job progress + class distribution |
| `05-evaluation.png` | `/evaluation` | Metric bars, confusion matrix, per-class table |
| `06-detection.png` | `/detection` | Detection results with severity distribution |
| `07-alerts.png` | `/alerts` | Alert table with status filters and a detail panel open |
| `08-reports.png` | `/reports` | The four CSV download panels |

To embed them in this README, add:

```markdown
![Security dashboard](docs/screenshots/01-dashboard.png)
```

---

## The eight pages

| # | Route | Purpose |
| --- | --- | --- |
| 1 | `/` | **Security Dashboard** — posture summary: records analysed, normal vs attack counts, high/critical risk counts, alert status counts, category/protocol/service/severity distributions, model + dataset status, recent alerts |
| 2 | `/dataset` | **Dataset Analysis** — upload or pick a CSV, then overview, column profile, numeric statistics, distributions, correlation heatmap and a searchable/paginated/filterable data table with CSV export |
| 3 | `/training` | **Model Training** — choose dataset, target (`label` or `attack_cat`) and algorithm (Random Forest / Decision Tree / Logistic Regression); watch real progress; inspect class distribution; manage and activate trained models |
| 4 | `/evaluation` | **Model Evaluation** — score a model on a *separate* testing dataset: accuracy, precision, recall, F1, confusion matrix, classification report, FPR/FNR, per-class metrics, model comparison, CSV export |
| 5 | `/detection` | **Threat Detection** — upload traffic, apply the saved preprocessing + trained model, get predicted class, attack category, confidence, severity and defensive recommendations; export results |
| 6 | `/alerts` | **Security Alerts** — persistent alert queue with severity/status filters, search, sorting, detail view, acknowledge/resolve, bulk actions, duplicate prevention, CSV export |
| 7 | `/reports` | **Reports** — four working CSV downloads plus a printable project report |
| 8 | `/about` | **About Project** — abstract, objectives, architecture, stack, workflow, implementation status and limitations |

---

## Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Browser (Next.js 16 App Router, React 19, TypeScript, Tailwind)           │
│                                                                           │
│  /  /dataset  /training  /evaluation  /detection  /alerts  /reports  /about│
│         │                                                                 │
│         ├── AnalysisContext  ── single source of truth for shared state    │
│         ├── src/lib/api.ts   ── one typed API client for every page        │
│         ├── src/lib/useJob.ts── job polling (progress / errors)            │
│         └── src/components/* ── SOC panels, charts, tables, primitives     │
└──────────────────────────────┬────────────────────────────────────────────┘
                               │  fetch '/pyapi/...' (same origin)
                               │  next.config.mjs rewrite  ──▶ BACKEND_URL
┌──────────────────────────────▼────────────────────────────────────────────┐
│ FastAPI backend (Python 3.14)                                             │
│                                                                           │
│  routers/  system · datasets · models · detection · alerts                │
│  ml/       schema_utils · dataset · pipeline · training · metrics ·        │
│            evaluation · detection · targets                               │
│  store.py  JSON metadata registry      cache.py  mtime-keyed CSV cache     │
│  jobs.py   in-process job registry     alerts.py SQLite alert store        │
└──────────────┬──────────────────────────────┬─────────────────────────────┘
               │                              │
      backend/storage/                  <project>/data/
      ├── datasets/   uploaded CSVs      ├── UNSW_NB15_training-set.csv
      ├── models/     joblib pipelines   ├── UNSW_NB15_testing-set.csv
      ├── evaluations/ JSON metrics      └── sample/  (synthetic fixtures)
      ├── detections/ JSONL results
      └── alerts.db   SQLite
```

**Data flow**

```
Dataset upload ─▶ validation ─▶ Dataset Analysis ─▶ Model Training
       ─▶ Model Evaluation ─▶ Threat Detection ─▶ Security Alerts ─▶ Reports
```

---

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16.4 (App Router), React 19.3, TypeScript 5.9, Tailwind CSS 3.4 |
| Charts | Hand-written SVG components (no charting dependency) |
| Backend | FastAPI 0.143, Uvicorn, Pydantic |
| Machine learning | scikit-learn 1.9 (`Pipeline`, `ColumnTransformer`, `RandomForestClassifier`, `DecisionTreeClassifier`, `LogisticRegression`, `OneHotEncoder`, `SimpleImputer`, `StandardScaler`) |
| Data processing | pandas 3.0, NumPy 2.5 |
| Model persistence | joblib 1.6 |
| Alert storage | SQLite (via Python's `sqlite3`) |
| Frontend tests | Vitest 4, @testing-library/react, jsdom |
| Backend tests | pytest 9, FastAPI `TestClient` |

---

## Quick start

### Prerequisites

- **Node.js 20+** and npm
- **Python 3.11+** (developed on 3.14)

### 1. Backend

```powershell
cd backend

# create and activate a virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1        # Windows PowerShell
# source .venv/bin/activate          # macOS / Linux

# install dependencies
pip install -r requirements.txt

# generate the synthetic sample data (optional, but lets you try the UI at once)
python scripts/make_sample_data.py

# run the API
python -m uvicorn app.main:app --reload --port 8000
```

Interactive API docs: <http://127.0.0.1:8000/docs>

### 2. Frontend

In a second terminal, from the **project root**:

```powershell
npm install
npm run dev
```

Open <http://localhost:3000>.

Copy `.env.example` to `.env` only if you need to change the defaults — the
defaults (`/pyapi` → `http://127.0.0.1:8000`) already work.

### 3. Verify everything

```powershell
npm run typecheck        # tsc --noEmit
npm run lint             # eslint .
npm test                 # vitest (frontend)
npm run build            # production build

cd backend
.\.venv\Scripts\python -m pytest tests -q     # backend
```

---

## Dataset setup

The project uses the official **UNSW-NB15** dataset from UNSW Canberra:

<https://research.unsw.edu.au/projects/unsw-nb15-dataset>

Place the two CSV files in the project-level `data/` folder:

```
data/
├── UNSW_NB15_training-set.csv     175,341 rows   (train)
├── UNSW_NB15_testing-set.csv       82,332 rows   (evaluate)
└── sample/
    ├── SAMPLE_synthetic_training-set.csv
    ├── SAMPLE_synthetic_testing-set.csv
    └── SAMPLE_synthetic_traffic.csv
```

Both files are detected automatically on the **Dataset Analysis** page. You can
also upload a CSV directly through the UI.

Target columns:

- `label` — `0` = normal, `1` = attack → **binary classification**
- `attack_cat` — `Normal`, `Generic`, `Exploits`, `Fuzzers`, `DoS`,
  `Reconnaissance`, `Analysis`, `Backdoor`, `Shellcode`, `Worms`
  → **multiclass classification**

See [`data/README.md`](data/README.md) for the full schema notes.

### Sample data is clearly labelled

`data/sample/` contains **synthetic** files generated by
`backend/scripts/make_sample_data.py`. They reproduce the UNSW-NB15 *schema*
so the workflow can be exercised without the real 250 MB dataset.

**They are not UNSW-NB15.** Any accuracy, precision or recall produced from them
is meaningless as a research result, and the UI marks them with a
"Sample data — not UNSW-NB15" badge everywhere they are used. Real datasets are
git-ignored (`data/**/*.csv`) because of their size and licensing.

---

## End-to-end workflow

1. **Dataset Analysis** — upload `UNSW_NB15_training-set.csv` (or pick it from
   project files). Confirm the row count, column types, missing values and class
   distribution.
2. **Model Training** — select the training dataset, target `label`, and
   algorithm `Random Forest`. Press **Train model**. A progress bar polls the
   backend job until it finishes. The fitted preprocessing pipeline and
   estimator are saved together as one joblib artifact.
3. **Model Evaluation** — select the trained model and
   `UNSW_NB15_testing-set.csv`. Press **Run evaluation**. Metrics come from
   `pipeline.predict()` on the held-out split; preprocessing is *loaded*, never
   re-fitted.
4. **Threat Detection** — upload a traffic CSV (e.g.
   `data/sample/SAMPLE_synthetic_traffic.csv`). The rows are matched to the
   model's saved feature schema, the saved pipeline is applied, and each row is
   scored. Severity is assigned from the predicted probability using the
   documented thresholds.
5. **Security Alerts** — if alerts were created during detection, triage them
   here: filter, search, acknowledge, resolve, export.
6. **Reports** — download the four CSVs, or print the project report.

### Severity rules

Severity is derived from the model's predicted probability for the attack
class. These thresholds are shown in the UI and are configurable per detection
run:

| Severity | Rule |
| --- | --- |
| Critical | predicted attack, probability ≥ 0.90 |
| High | predicted attack, probability ≥ 0.75 |
| Medium | predicted attack, probability ≥ 0.60 |
| Low | predicted normal, or an attack below the medium threshold |

Confidence is **model output**, not proof that a threat exists.

---

## Machine learning methodology

### Pipeline

Every model is a single scikit-learn `Pipeline` persisted with `joblib`, so the
exact preprocessing travels with the estimator:

```
ColumnTransformer
├── numeric columns  ──▶ SimpleImputer(strategy="median")
│                        [ ▶ StandardScaler — Logistic Regression only ]
└── categorical cols ──▶ SimpleImputer(strategy="most_frequent")
                         ▶ OneHotEncoder(handle_unknown="ignore")
        │
        ▼
Estimator
├── RandomForestClassifier
├── DecisionTreeClassifier
└── LogisticRegression
```

`handle_unknown="ignore"` means a category present at prediction time but absent
during training does not crash the pipeline; it is encoded as all-zeros.

`StandardScaler` is applied only for Logistic Regression, where feature scale
materially affects convergence. Tree models are scale-invariant, so scaling them
would add cost without benefit.

### Evaluation metrics

- **Binary** (`label`): accuracy, precision, recall, F1 for the positive class
  (`1` = attack), plus the confusion matrix, false-positive rate
  (`FP / (FP + TN)`) and false-negative rate (`FN / (FN + TP)`).
- **Multiclass** (`attack_cat`): macro-averaged precision / recall / F1,
  weighted averages, per-class metrics, and a per-class confusion matrix.
- **Multiclass FPR/FNR** are computed as macro one-vs-rest averages: each class
  is treated as "positive" in turn, its FPR/FNR computed, and the results
  averaged over classes where the denominator is non-zero.
- **Undefined metrics are returned as `null`**, never as `0`. The UI prints
  `undefined` in that case, so a metric that could not be computed can never be
  mistaken for a measured zero.

---

## Anti-leakage guarantees

Label leakage is the easiest way to produce impressive-looking but worthless
results, so it is enforced in code rather than by convention:

1. **Target columns are never features.** `id`, `label` and `attack_cat` are
   excluded by `feature_columns()` in
   [`backend/app/ml/schema_utils.py`](backend/app/ml/schema_utils.py) — the
   single chokepoint every training, evaluation and detection path goes through.
2. **Monotonic unique-integer columns are treated as identifiers** and excluded,
   so a stray row-index column cannot act as a fingerprint for the label.
3. **Preprocessing is fitted on training data only.** `fit_transform` is used on
   the training split; the evaluation and detection paths call `transform` /
   `predict` on the *loaded* pipeline. Preprocessing is never re-fitted on test
   data.
4. **Test labels are never model inputs.** The evaluation split's target column
   is used only to compute metrics, after predictions have been made.
5. These rules are covered by
   [`backend/tests/test_leakage_and_features.py`](backend/tests/test_leakage_and_features.py),
   which also asserts that Logistic Regression coefficients are unchanged by an
   evaluation run (i.e. no accidental re-fit).

---

## Reports

### CSV downloads (Reports page)

| Report | Contents |
| --- | --- |
| **A — Dataset summary** | filename, rows, columns, missing values, duplicate rows, class distribution, analysis timestamp |
| **B — Model evaluation** | algorithm, target, evaluation dataset, accuracy, precision, recall, F1, FPR, FNR, per-class metrics, timestamp |
| **C — Threat detection results** | record reference, predicted class, attack category, confidence, severity, explanation, recommended action |
| **D — Security alerts** | alert ID, timestamp, category, severity, status, description, recommended action |

Only genuinely computed values are exported. If no evaluation has been run,
Report B tells you so instead of emitting placeholders.

### Project report (Reports page → *Project report* tab)

A print-friendly write-up containing the abstract, introduction, problem
statement, objectives, existing vs proposed system, architecture, technologies,
dataset description, preprocessing, methodology, evaluation methodology, results,
limitations, future enhancements, conclusion and references.

The **Results** section reads from the stored evaluation record. If nothing has
been measured, it prints a clear warning — it never invents numbers.

Use **Print / Save as PDF** (or `Ctrl+P`) to produce a PDF via the browser.

---

## API reference

Base path: `/api`. The frontend calls these through the `/pyapi` proxy.

### System

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness + version + storage status |
| GET | `/meta` | Algorithms, targets, severity rules, limits |
| GET | `/state` | Aggregated application state (datasets, model, evaluation, detection, alerts) |

### Datasets

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/datasets` | List uploaded datasets |
| GET | `/datasets/project-files` | List CSVs found in `data/` |
| POST | `/datasets/upload` | Upload and validate a CSV |
| POST | `/datasets/{id}/reanalyze` | Re-profile an existing dataset |
| GET | `/datasets/{id}/summary` | Full profile (columns, stats, distributions, correlation) |
| GET | `/datasets/{id}/rows` | Paginated / searchable / filterable rows |
| GET | `/datasets/{id}/filter-options` | Distinct values for the filter dropdowns |
| GET | `/datasets/{id}/export` | Filtered CSV export |
| GET | `/datasets/{id}/report` | Report A (CSV) |
| DELETE | `/datasets/{id}` | Delete a dataset |

### Models, jobs and evaluations

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/models` | List trained models + active model id |
| GET | `/models/active` | The active model |
| POST | `/models/train` | Start a training job → `{ jobId }` |
| POST | `/models/{id}/activate` | Make a model active |
| DELETE | `/models/{id}` | Delete a model |
| GET | `/jobs/{id}` | Job status: `queued` / `running` / `succeeded` / `failed` + progress |
| POST | `/evaluate` | Start an evaluation job → `{ jobId }` |
| GET | `/evaluations` | List evaluations + comparison table |
| GET | `/evaluations/latest` | Most recent evaluation |
| GET | `/evaluations/{id}` | One evaluation |
| GET | `/evaluations/{id}/report` | Report B (CSV) |

### Detection and alerts

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/detect` | Upload traffic and start a detection job (`mode=model\|heuristic`) |
| GET | `/detections` | List detection runs |
| GET | `/detections/latest` | Most recent detection run |
| GET | `/detections/{id}` | One detection run |
| GET | `/detections/{id}/rows` | Paginated detection results |
| GET | `/detections/{id}/report` | Report C (CSV) |
| POST | `/detections/{id}/alerts` | Materialise alerts from a run |
| DELETE | `/detections/{id}` | Delete a run |
| GET | `/alerts` | Paginated, filterable, sortable alerts |
| GET | `/alerts/stats` | Counts by status and severity |
| GET | `/alerts/{id}` | One alert |
| GET | `/alerts/report` | Report D (CSV) |
| PATCH | `/alerts/{id}` | Update alert status |
| POST | `/alerts/bulk-status` | Update many alerts at once |
| POST | `/alerts/delete` | Delete alerts (requires `confirm: true`) |

Errors always use one envelope so the client only has to parse one shape:

```json
{
  "detail": {
    "error": "invalid_dataset",
    "message": "Required target columns are missing.",
    "details": ["Expected a 'label' column ..."]
  }
}
```

---

## Testing

### Backend — pytest

```powershell
cd backend
.\.venv\Scripts\python -m pytest tests -q
```

| File | Covers |
| --- | --- |
| `test_dataset_validation.py` | CSV parsing, extension header/schema validation, empty and malformed files |
| `test_leakage_and_features.py` | Feature selection, target/identifier exclusion, no re-fitting on test data |
| `test_metrics.py` | Binary and multiclass metric maths, undefined values staying `null` |
| `test_training_evaluation.py` | Training, artifact persistence, evaluation on a held-out split |
| `test_detection_alerts.py` | Model-backed detection, alert creation, duplicate prevention, status transitions |
| `test_api_endpoints.py` | HTTP surface, error envelopes, full train → evaluate → detect → alert workflow |

### Frontend — Vitest

```powershell
npm test            # single run
npm run test:watch  # watch mode
```

| File | Covers |
| --- | --- |
| `src/lib/__tests__/api.test.ts` | Request building, error-envelope parsing, network failures, download URLs, multipart payloads |
| `src/lib/__tests__/format.test.ts` | Number/percent/byte/date formatting, undefined never rendered as `0` |
| `src/lib/__tests__/severity.test.ts` | Severity and status mapping, unknown-value fallbacks |
| `src/lib/__tests__/useJob.test.tsx` | Job polling: success, failure details, network errors, reset |
| `src/components/ui/__tests__/primitives.test.tsx` | Metric cards, empty/error states, tabs, pagination, badges |
| `src/components/charts/__tests__/charts.test.tsx` | Bar/donut/heatmap/confusion-matrix rendering and arc-offset maths |
| `src/components/layout/__tests__/navigation.test.ts` | All eight routes exist on disk and are reachable from the sidebar |

> **Note on the Vitest pool.** `vitest.config.ts` sets `pool: 'threads'`. The
> default `forks` pool fails to start its worker on machines where the project
> lives in a synced (OneDrive) or non-ASCII path.

---

## Project layout

```
.
├── src/                              # Next.js frontend
│   ├── app/                          # App Router: one folder per page
│   │   ├── page.tsx                  # layout.tsx  globals.css
│   │   ├── dataset/  training/  evaluation/
│   │   └── detection/  alerts/  reports/  about/
│   ├── components/
│   │   ├── charts/charts.tsx         # SVG bar / donut / heatmap / confusion matrix
│   │   ├── layout/AppShell.tsx       # shell, error boundary, toasts, banner
│   │   ├── layout/Sidebar.tsx        # navigation (+ NAV_ITEMS)
│   │   ├── ui/primitives.tsx         # Panel, Button, MetricCard, Tabs, Pagination…
│   │   └── dataset/DatasetLoader.tsx # shared upload / project-file picker
│   ├── context/AnalysisContext.tsx   # shared application state
│   ├── lib/
│   │   ├── api.ts                    # typed API client + ApiError
│   │   ├── useJob.ts                 # job polling hook
│   │   ├── format.ts severity.ts     # formatting and colour tokens
│   │   └── types.ts                  # shared TypeScript types
│   └── test/setup.ts                 # Vitest setup
│
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI app, CORS, error handlers
│   │   ├── config.py                 # paths, limits, algorithms, severity rules
│   │   ├── store.py                  # JSON metadata registry
│   │   ├── cache.py                  # mtime-keyed CSV cache
│   │   ├── jobs.py                   # in-process job registry
│   │   ├── alerts.py                 # SQLite alert store (fingerprint dedupe)
│   │   ├── schemas.py                # request models
│   │   ├── ml/
│   │   │   ├── schema_utils.py       # column classification, feature_columns()
│   │   │   ├── dataset.py            # profiling, statistics, pagination
│   │   │   ├── pipeline.py           # sklearn Pipeline + ColumnTransformer
│   │   │   ├── training.py           # fit + joblib persistence
│   │   │   ├── metrics.py            # safe metric maths
│   │   │   ├── evaluation.py         # evaluation on a held-out split
│   │   │   ├── detection.py          # scoring + severity assignment
│   │   │   └── targets.py            # target/class helpers
│   │   └── routers/                  # system, datasets, models, detection, alerts
│   ├── scripts/make_sample_data.py   # synthetic fixtures
│   ├── tests/                        # pytest suite
│   ├── requirements.txt
│   └── pytest.ini
│
├── data/                             # dataset drop folder (CSVs git-ignored)
├── .env.example
├── .gitignore
├── eslint.config.mjs
├── next.config.mjs
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

---

## Deployment guidance

Nothing here is deployed for you; these are the steps if you want to host it.

**Frontend (Vercel or any Node host)**

```bash
npm ci
npm run build
npm start          # serves on :3000
```

Set `NEXT_PUBLIC_API_BASE` to the backend's public URL *before* building — it is
inlined into the client bundle at build time. If you instead keep the `/pyapi`
rewrite, set `BACKEND_URL` so the server proxies to your backend.

**Backend (Render, Railway, Fly.io, a VM…)**

```
Start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
Root directory: backend
```

Add every origin that will call the API to `CORS_ORIGINS` in
[`backend/app/config.py`](backend/app/config.py). Point `NETSHIELD_STORAGE_DIR`
at a persistent volume, otherwise trained models disappear on redeploy.

**Do not** commit `.env`, `backend/storage/`, `node_modules/`, `.next/`, or the
real UNSW-NB15 CSVs. `.gitignore` already covers all of them.

---

## Limitations

Being explicit about these matters more than listing features.

1. **No live capture.** There is no packet sniffer and no interface to a
   network tap. Traffic must arrive as a CSV in UNSW-NB15's schema.
2. **No automatic response.** Alerts are records to be triaged by a human. The
   system does not block, throttle, quarantine or reconfigure anything.
3. **Training runs in-process.** Training happens on a worker thread inside the
   API process. A full UNSW-NB15 Random Forest takes a while and blocks nothing
   else only because the job registry is separate — but it is still single-node.
4. **Job state is in memory.** `GET /api/jobs/{id}` only returns jobs started by
   the same process since it booted. Restarting the backend loses job history
   (trained models, evaluations, detections and alerts are all persisted).
5. **Alerts are single-user.** The SQLite alert store has no authentication or
   per-user attribution; anyone who can reach the API can triage alerts.
6. **No authentication at all.** The API is intended for local use. Do not
   expose it to the internet without putting auth in front of it.
7. **Sample data is synthetic.** Numbers produced from `data/sample/` are not
   research results. Only the real UNSW-NB15 files give meaningful metrics.
8. **Feature schema matching is by column name.** Detection requires the input
   CSV to use the same column names as the training data; missing columns are
   imputed, but renamed or reordered semantics are not inferred.
9. **Confidence ≠ threat.** A probability of 0.97 means the model is confident
   about its prediction. It is not evidence that an attack is happening.

---

## Future scope

- Live capture via a packet library, feeding a streaming feature extractor.
- Active response through an authorised firewall or SDN controller.
- Persistent job queue (Celery / RQ) so training can scale beyond one node.
- Authentication and per-analyst alert assignment.
- Model registry with versioning, drift detection and scheduled retraining.
- Additional detectors (autoencoder / isolation forest) for unsupervised
  anomaly detection on unlabelled traffic.
- Alert notification channels (email, webhook, SIEM export).

---

## References

1. Moustafa, N., & Slay, J. (2015). *UNSW-NB15: a comprehensive data set for
   network intrusion detection systems.* MilCIS 2015.
   <https://research.unsw.edu.au/projects/unsw-nb15-dataset>
2. Moustafa, N., & Slay, J. (2016). *The evaluation of Network Anomaly Detection
   Systems: Statistical analysis of the UNSW-NB15 data set and the comparison
   with the KDD99 data set.* Information Security Journal, 25(1–3), 18–31.
3. Pedregosa, F. et al. (2011). *Scikit-learn: Machine Learning in Python.*
   JMLR 12, 2825–2830. <https://scikit-learn.org>
4. Breiman, L. (2001). *Random Forests.* Machine Learning, 45(1), 5–32.
5. FastAPI documentation. <https://fastapi.tiangolo.com>
6. Next.js documentation. <https://nextjs.org/docs>

---

## License

MIT. See [`package.json`](package.json).

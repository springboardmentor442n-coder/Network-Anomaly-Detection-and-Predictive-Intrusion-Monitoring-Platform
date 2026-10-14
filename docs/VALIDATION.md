# Validation October 13 2026

## Backend regression

Fifteen checks passed in 9.47 seconds after the final inference optimization. Coverage: risk calculation/boundaries, class normalization, valid/invalid IPs, authentication and roles, full small-file SSE scan, row-one restart, saved export, duplicate consumer rejection, source confinement, invalid schema/values, Label cannot influence predictions, polling/Stop, upload ownership, incident permissions/notes, Viewer restrictions, bounded slow-consumer queue with saved data, recoverable chunk failure, lost-job no-resume behaviour, best-effort memory telemetry, real-IP evidence, grouped incident occurrence totals, printable report, nested CSV selection and protected deletion that preserves sources.

One warning: Starlette's current TestClient warns that its httpx interface is deprecated in favour of httpx2. It did not affect the checks. Installed runtime versions are pinned.

## Real dataset and ML benchmark

Every extracted file length was verified against the CRC-checked official ZIP. Definitive preparation processed 2,099,976 raw rows and retained 2,099,971 rows with valid values in the selected 15 features. Per-file hashes and counts are stored in models/data_manifest.json.

Three classifiers were fitted on 80,439 retained unique real-data examples and evaluated on the same 45,032 holdout examples. Two training-only randomized parameter candidates/model were measured with grouped two-fold CV. No feature-identical hashes cross training/holdout. Models/metrics.json records actual macro/weighted F1, recall, FPR, AP, log loss, per-class reports/supports, confusion matrices, timing/search settings and source limits.

## Full file scan and optimization

A complete Tuesday CSV scan read and saved all 322,078 rows, with no invalid/skipped rows. It produced 27,152 review flows grouped into 6,751 incidents. Chunk size was 2,000, one active scan, polling transport. Initial run: 215.418 seconds, 1,495.13 rows/second. Optimized run: 66.087 seconds, 4,873.52 rows/second. Global severity lookup and array-based feature evidence eliminated repeated per-row Python/pandas work. All 243 demonstration payloads remained exactly equal. Full-scan prediction/risk/review totals were identical before and after.

The final database occupied 687,399,528 bytes. This is an important disk requirement, not a memory benchmark. OS process RSS was unavailable and is recorded as null. The benchmark was a processing/persistence test; Tuesday contains some training records, so it is not an independent model accuracy test. There is no deployment SLA or sustained two-scan load claim. Source processing results are in docs/benchmark_before_optimization.json and docs/full_scan_benchmark.json.

## Frontend logic

Seven DOM checks passed using jsdom and real model/inference fixture payloads with mocked transport: model/class/matrix render, SSE parsing and final completed state, total counts/200-row window, row explanation dialog, history report opening, grouped incident update request, polling completion and matrix selection. This caught and fixed completed-state overwrite and history-report/row-evidence confusion.

A downloaded browser binary could not start because the environment restricts socket operations. No real-browser rendering/popup/download/visual claim is made. Test on local Chrome before the mentor demo. The Word change log was separately rendered and visually checked; that validates the document, not the web layout.

## Remaining limits

No UNSW-NB15 model, live packet capture, future intrusion forecasting, external intelligence/notifications, optional LLM, Docker execution or cloud deployment. Capped feature-hash evaluation changes prevalence and does not provide independent host/session/day validation. Rare classes have tiny support. Confidence is uncalibrated; severity thresholds are policy assumptions. Classifier timing is measured on 1,000-row batches over ten repeats; production alert delivery/browser latency is not separately measured.

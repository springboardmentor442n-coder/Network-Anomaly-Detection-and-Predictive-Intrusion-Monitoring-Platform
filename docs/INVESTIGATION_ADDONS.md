# Investigation add-ons October 15 2026

## Install without replacing the theme
Stop Uvicorn. Merge this patch into your original Git-connected netshield-ai folder, replacing matching files. The patch contains complete files, not snippets. It deliberately contains no style.css, model files, mentor README, environment or database. Keep existing files not included here.

Run in PowerShell from the project root:

    .\venv\Scripts\python.exe -m pip install -r requirements.txt
    .\venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 1

Open http://127.0.0.1:8000 and press Ctrl+F5. Use your existing environment name if different. There is no retraining or database reset.

## Review the additions
1. Executive overview: summaries of all scans visible to the current role. Repeated scans count repeatedly. Running scans may not have final summaries. Critical groups include every status and are not confirmed incidents.
2. Incident queue: click Investigate / PDF. The case console shows source/destination, occurrences, notes, related review flows and analyst next steps. Continue editing status/notes in the existing queue.
3. Historical reference: same source IP and same scan, restricted to rows before the first incident row AND strictly earlier capture timestamps. At least 20 earlier records are required for each feature. Missing timestamps or little history produce insufficient history. This is descriptive reference traffic, possibly including attacks; it is not employee UEBA, a verified normal baseline or a learned user identity. Z scores measure standard deviations from the reference mean. A constant reference uses an explicit changed/unchanged flag instead of dividing by zero. Baselines do not alter risk.
4. Explain first row: native XGBoost TreeSHAP explains the first incident row's XGBoost-selected class. Contributions add to a raw class margin, before softmax. They are not probability percentages, risk points, causal explanations, or explanations of the majority vote. The additive check is shown.
5. Download PDF case file: genuine backend-generated PDF containing case metadata, selected flow evidence, reference comparisons, TreeSHAP and review guidance. It does not automatically recommend blocking a device.
6. Reports & exports: genuine XLSX workbook containing the latest 10,000 incident groups visible to the current role. This is an incident register, not the admin audit table. Text cells prevent notes from being interpreted as spreadsheet formulas. Existing scan HTML/print and complete NDJSON exports remain available via history.

## Evidence limits
Each case inspects the first 50,000 saved rows in its scan. The console displays at most 200 matching review flows; PDF shows at most 10. Coverage/truncation is disclosed. The first incident row is fetched directly even outside that window, so its explanation remains available; related flows and reference coverage can be incomplete. Use full NDJSON for complete evidence. Reference timestamps are parsed from CSV data, not ingestion time. There is no cross-scan history aggregation, per-user monitoring, USB/email analysis or verified benign baseline. Existing saved incidents work without new model training; usable explanations require persisted feature evidence.

## Verification
17 backend tests passed, including existing scan tests and add-on checks for ownership/authentication, PDF signature, XLSX text safety, overview totals, native SHAP additivity, reference timestamp exclusion and constant references. Seven jsdom checks passed for new screen rendering/interactions and escaping; transport was mocked. JavaScript syntax and Python compilation passed. style.css is byte-identical to the delivered hacker theme. Browser download failed, so actual desktop/mobile layout and Windows integration remain local verification steps.

## Local acceptance checklist
Use a newly completed demo scan. Open overview, inspect an incident, request its explanation, download/open the PDF and XLSX. Confirm history and scan controls still work. A small demo may correctly have insufficient reference history. Do not manufacture baseline values to fill the screen.

## Git checkpoint
Stage the included files explicitly after local acceptance. Run git --no-pager diff --cached --check, commit as "Add incident investigation reports and local explanations", and push origin mansi-gaikwad. Keep the mentor README and original notebook unchanged.

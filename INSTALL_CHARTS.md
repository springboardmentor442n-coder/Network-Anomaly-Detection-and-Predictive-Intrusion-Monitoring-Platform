# Charts and cards update October 17

Requires the October 15 investigation add-on already installed. Complete replacement files are included, not snippets.

1. Stop Uvicorn with Ctrl+C.
2. Merge frontend and backend contents into the original Git-connected netshield-ai folder, replacing matching files. Merge docs as well.
3. Keep the existing style.css, models, database, environment and mentor README.
4. Start with .\venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 1
5. Open http://127.0.0.1:8000 and press Ctrl+F5.
6. Traffic monitor: current-scan risk donut and top attack chart. Executive overview: six cards and historical charts. Explain the system: six expandable quick guide cards.

No new dependency installation or retraining is required. The original hacker stylesheet remains unchanged; visuals.css only adds layout rules for the new components. Risk charts show scored flows, not confirmed incidents. Top attack charts exclude BENIGN and group classes after the top six as Other. Current scan results reset when a new scan starts. Historical charts aggregate saved summaries; repeated scans count again. Model laboratory metrics remain saved holdout benchmarks.

Validation: nine chart-function checks passed with stubbed DOM containers, unique HTML IDs verified, JavaScript syntax and Python compilation passed. Actual browser layout and Windows integration remain local checks; no full backend suite rerun in this environment.

After local review stage only the included files, run git --no-pager diff --cached --check, commit and push to mansi-gaikwad.

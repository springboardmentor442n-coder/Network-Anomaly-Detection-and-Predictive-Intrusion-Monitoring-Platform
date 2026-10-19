# Install the security events and IP investigation update

This patch is based on your `mansi-gaikwad` branch at commit `26f7d89`. It contains complete changed files. Merge its folders into your existing project; keep your existing `.env`, `venv`, models and data.

1. Stop Uvicorn with Ctrl+C. Back up your project, including the data directory. A database schema upgrade is included, so stop the server before copying or backing up SQLite files.
2. Extract this ZIP into a temporary folder. Copy its `backend`, `frontend`, `docs`, `tests` folders and this installation file into `C:\Users\Mansi\Downloads\netshield-ai`, replacing matching files. Do not create a second nested project folder.
3. No dependency was added. Keep using the installed requirements and current virtual environment.
4. From the original project root, run `.\venv\Scripts\python.exe -m pytest -q`. Tests use a temporary database and mocked email/CAPTCHA; they do not send verification emails or alter your real accounts.
5. Start `.\venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 1`.
6. On first startup, the app adds tables and IP indexes, copies existing audit records once, and indexes existing saved flow addresses. A large saved database can make this first start take longer. Keep the terminal running and wait for Application startup complete.
7. Open http://127.0.0.1:8000 and press Ctrl+F5 so the new HTML and JavaScript load. Log in with your existing account and human verification.
8. Open Security events & IP investigation. Your successful login should appear with its actual UTC time. An Admin can also see anonymous failed attempts; other roles see their own account-attributed events.
9. Scan `cicids_demo_real_ips.csv`. Click Investigate source IP in a flow or incident, or enter an IP in the new section. Review the evidence, save an investigation note, export JSON and try Print / Save IP report PDF.
10. Sign out. The current access token is revoked and its logout event is recorded. Other separately issued sessions remain valid.

The finalized `frontend/style.css`, `frontend/experience.js` voice/CAPTCHA fixes, models, mentor README and existing notebooks are unchanged. No real database, secret, account, CAPTCHA bypass or test virtual environment is included in this patch.

## Quick demonstration

Show a successful login event, refresh spinner, action filter, request ID details and filtered NDJSON export. Run the real-IP demo, investigate a source IP, explain capture time versus recorded time, open an incident and TreeSHAP, save an Investigating note and export the IP evidence. Sign out, then log back in to show the recorded logout.

## Important meanings

Application events use current server UTC time. CSV capture times come from the dataset, commonly 2017. Historical rows without an ingestion timestamp remain unknown. The request peer is the address reported by the server; local use normally shows 127.0.0.1 and a proxy can change which peer is visible. Do not present it as the CSV source IP.

This is application auditing and local saved-flow analysis. It does not collect Windows Event Viewer logs, sniff live packets, block IPs or query external threat feeds. An address with no saved matches is not a verified safe address.

## Files in this update

- `backend/main.py` — request actor, durable IP fields, review events and security module installation.
- `backend/secure_auth.py` — unique token ID for each successful login.
- `backend/security_ops.py` — schema migration, structured events, filters, exports, IP evidence, notes and logout revocation.
- `frontend/index.html` — dedicated analyst section.
- `frontend/app.js` — IP pivots and server-confirmed sign out.
- `frontend/security.js` — new section interactions and exports.
- `frontend/security.css` — additive layout and print rules using the existing theme.
- `tests/test_system.py` — existing tests plus audit, IP, migration and logout regression checks.
- `docs/NetShield.postman_collection.json` — added security API requests.
- `docs/POSTMAN.md`, `docs/CHANGELOG.md`, `docs/SECURITY_EVENTS.md` — explanations and change record.
- `docs/security_events_validation.json` — measured verification summary.
- `docs/TraceVigil_Security_Events_Change_Log_20261018.docx` — separate Word change log.
- `INSTALL_SECURITY_EVENTS.md` — these installation steps.

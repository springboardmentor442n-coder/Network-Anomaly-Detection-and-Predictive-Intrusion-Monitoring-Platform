# NetShield AI change log

## October 13 2026 Real CICIDS release

This log starts the continuing record requested on October 13. Future changes should append a dated entry with files, before/after behaviour, reason, challenge and evidence. It separates the current verified release from the earlier sample-trained package and your historical uploaded models.

### Source and model changes

1. Inspected the available original RF artifacts and recovered their 15 feature names. The requested XGB, feature-list, encoder and performance attachments were unavailable. Original RF pickles reported sklearn 1.9.0, while this runtime uses 1.8.0. The active models were retrained consistently; historical comparisons were preserved rather than relabelled as new results.
2. Used the official CNS2022 improved CICIDS archive. Verified ZIP CRC and all extracted sizes. A Thursday copy was shorter than the archive entry; it was re-extracted, and the preliminary preparation result was discarded. The definitive pass matched your valid-flow total exactly.
3. Added setup_data.py with official download, SHA256 comparison, CRC check, expected-file whitelist, disk-space check, temporary extraction files and byte-length verification. Partial extractions are not exposed as valid CSVs.
4. Added prepare_cicids.py. It inspected 2,099,976 source rows in 50,000-row chunks, relabelled 11,979 Attempted Category records, excluded five invalid selected-feature rows and retained 2,099,971 valid selected-feature rows. The 15-column schema was preserved.
5. Created deterministic feature-hash train/holdout partitions and bounded unique per-class reservoirs. Actual samples are 80,439 training rows and 45,032 holdout rows. Identical numeric feature vectors cannot cross the split. This does not eliminate host/session correlation or retrospectively inherited feature-selection limitations; per-class caps alter prevalence.
6. Added train_cicids.py. RF, XGBoost and Extra Trees use identical training/holdout samples. Two randomized hyperparameter candidates per classifier are compared using grouped two-fold CV on training-only tuning samples. The selected settings are fitted on the retained training sample. No holdout-based tuning is performed.
7. Fitted Isolation Forest on 40,000 benign training flows with contamination 0.03. Measured benign holdout flag rate 3.02% and attack holdout flag rate 74.59%. These are review signals, not attack probabilities. Confidence remains explicitly uncalibrated.
8. Saved the authoritative compressed bundle plus complete standalone RF/XGB/Extra Trees/feature/encoder artifacts, detailed per-class metrics, confusion matrices, search results, source hashes, anomaly evidence and dependencies. Preserved original reported comparison and traffic summary under docs as historical records.
9. Added a 243-row holdout-derived demo containing original source/destination IPs, ports, protocol, timestamp and labels. Replaced synthetic-IP-first presentation with this real metadata example. The demo is not an independent new evaluation.

### Application changes

10. Updated engine.py to retain source/destination ports, protocol name and IP validation/private-address information. Every valid result includes explicit review reasons, the consensus rule and its 15 numerical input values. IP metadata and Label are never model inputs. Existing compatible risk formula remains severity times confidence; priority is out of 100.
11. Updated main.py to discover permitted nested CSVs, including data/cicids, while checking resolved paths and upload ownership. Added fallback imports so both project-root and backend entry conventions can be explained consistently. App serves frontend and API from one origin.
12. Grouped incidents within each scan by source IP, destination IP and predicted class. Occurrence counts and maximum observed risk update atomically. Analyst status/notes are retained instead of repeatedly overwritten. Different scans remain separate incidents. The full Tuesday scan produced 27,152 review flows grouped into 6,751 incidents.
13. Added protocol counts, top predicted attack sources and capture-hour attack counts. Source tracking is capped at 5,000 addresses and time buckets at 512 to avoid unbounded analytics memory. Top buckets are shown in chronological order. These are model-predicted activity summaries, not external intelligence or confirmed attacker attribution.
14. Added reports.py and a protected HTML report route. The report shows scan status/scope, processing counts, measured classifier comparison, risk/type/protocol/source/time summaries and scoring interpretation. Values are escaped before rendering. Print/Save PDF uses the browser; JSON report and NDJSON export remain available.
15. Added protected deletion of completed/stopped scan results and incidents while preserving source CSVs. No automatic deletion is enabled. Added maintenance.py for deliberate SQLite compaction after stopping the server; this compacts free pages and does not delete records.
16. Added rare-class support/recall/F1 table, selectable 16-class confusion matrix and global feature-importance display to the Model laboratory. Global importance is labelled training-wide, not a causal row explanation.
17. Expanded the monitoring UI with real-IP demonstration selection, source/protocol/capture-hour analytics and live measured processing rate. Row explanation begins with the actual risk calculation and review reasons rather than only raw JSON. The displayed recent window remains bounded at 200 rows.
18. Updated incident UI to show grouped occurrence counts and original addresses. History/report actions and streaming state were checked with DOM fixtures. Fixed two real bugs: final completion was overwritten with Idle, and history report metadata was incorrectly treated as a row with IP fields.
19. Kept stop/start generation guards to prevent stale stream/poll responses modifying a later scan. Disabled duplicate scan submission during creation. No automatic reconnect or new-reader restart occurs after a stream failure.
20. Added complete compatibility login/signup/dashboard entry files pointing to the served workspace. Added a new walkthrough exploration.ipynb and kept the original notebook as historical reference. Added start.ps1, updated README/setup/requirements and Postman collection; scripts and frontend files are formatted for readability.

### Performance and verification changes

21. Ran a full 322,078-row Tuesday scan, verifying every saved row, no skipped rows and no lost display events during the benchmark. Initial throughput was 1,495 rows/second and elapsed time 215.418 seconds, with a 2,000-row chunk size.
22. Optimized repeated severity dictionary construction, repeated IP parsing and 15 repeated pandas row lookups per flow. Severity lookup is cached, each address is parsed once and feature evidence is copied from a numerical array. All 243 demo row payloads remained exactly unchanged.
23. Repeated the same full Tuesday scan after optimization. It saved every row with identical prediction/risk/alert totals in 66.087 seconds at 4,873.52 rows/second, about 3.26 times faster. This is a measured run on this environment, not a deployment SLA. The database occupied about 687 MB; bounded RAM does not mean bounded disk use.
24. Extended regression coverage for real-IP evidence, grouped alert totals, printable report, nested sources and protected scan cleanup. Fifteen backend checks passed. Added seven frontend DOM checks using actual model/inference payloads and mocked transport; no browser-layout claim is made.
25. Updated learning/status/validation documents, archived the earlier sample-trained PDF guide, and created this separate continuing Word change log. Complete current files are delivered in one package; no fragment-only code edits are required.

### Challenges and resolution

- Missing attachments: proceeded with recoverable RF feature metadata and retrained all active classifiers consistently. No claim that missing files were read.
- Model version mismatch: sklearn cross-version pickle loading is unsupported, so original objects were not adopted as the active runtime benchmark. Reproducible pinned dependencies are included.
- Incomplete extracted CSV: byte-length verification caught Thursday truncation; re-extraction and definitive preparation removed the faulty run from evidence.
- Dataset leakage and rare labels: feature-identical partitions and grouped CV reduce duplicate leakage; session correlation and tiny rare-class supports remain explicitly documented.
- Excess alert volume: related review flows are grouped while retaining counts and highest priority. Investigation status is not automatically reset on repetition.
- Slow non-ML processing: the end-to-end benchmark exposed Python/pandas overhead. Optimizations improved speed without changing saved evidence or predictions.
- Browser restrictions: automatic current-browser download failed, and an alternate browser binary could not run because sockets were restricted. UI logic was checked with jsdom; a real Chrome visual/demo test remains necessary on your computer.
- Memory telemetry: OS process RSS is unavailable here, so the benchmark reports null rather than fabricating a measurement or failing the scan.
- Local storage warning: your screenshot shows a full sync location. Use a local project copy and review disk availability before large scans; result persistence needs space beyond raw CSV storage.

### Current remaining goals

UNSW-NB15 pipeline, live packet capture/flow exporter, future intrusion forecasting, external reputation/notifications, optional LLM chatbot and actual cloud deployment are not implemented in this release. React/Next.js and PostgreSQL/MongoDB from the reference stack are not used; the working implementation uses HTML/JS and SQLite. Full source inspection and capped real-data training do not equal fitting or independently validating all original records.

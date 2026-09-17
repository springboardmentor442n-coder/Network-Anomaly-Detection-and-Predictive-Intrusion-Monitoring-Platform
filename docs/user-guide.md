# NetShield AI - User Guide

Written for security analysts using the console.

## Signing in

Open the dashboard (default `http://127.0.0.1:5173` in development,
`http://localhost:8080` under Docker).

- **Create account** registers a new **analyst**. Passwords need at least 8
  characters including a letter and a digit.
- **Sign in** authenticates an existing account.

Analyst accounts see every operational page. Admin pages (Admin, Audit logs)
appear only for admin accounts - an administrator has to grant that role.

Your session lasts 2 hours by default. When it expires you are returned to the
sign-in screen; nothing you saved is lost.

## Dashboard

The landing page answers "what is happening right now".

**Counters** — flows analyzed, benign, non-benign, anomalous, high risk
(score >= 65), critical alerts, open incidents, and detections in the selected
window.

**Charts** — detection volume by severity (hourly), severity distribution,
anomaly trend, alerts by status, plus corpus label and protocol distributions.

**Tables** — top attack classifications, top source IPs, recent detections.

Two distinct data sources appear on this page, and the panel titles say which is
which:

- *Operational* panels count what **this platform** has detected. They start
  empty on a fresh install.
- *Corpus* panels describe the **CICIDS2017 dataset on disk**. They are
  populated from the moment the dataset is present.

The header shows the live transport (`websocket`, `sse` or `polling`) and the
counters refresh automatically when a new detection arrives.

If everything reads zero, that is accurate, not broken - run a scan from **Live
monitor** to generate detections.

## Live monitor

This is where traffic gets analyzed.

**Data sources.** Four cards show what is usable on this machine:

| Source | What it is |
|---|---|
| `cicids2017` | Direct chunked read of the dataset |
| `csv_replay` | Sequential replay with a cursor - the default |
| `packet_capture` | Live capture via Scapy; off unless enabled |
| `zeek` | Zeek `conn.log` reader; off unless configured |

An unavailable source states its reason (dataset missing, capture disabled,
Npcap not installed, Zeek not configured).

**Running a scan.** Pick a source and batch size, then **Scan now**, or
**Start auto-scan** to run every 6 seconds. Each scan pulls that many flows and
runs the full detection pipeline on them, so detections, alerts, notifications
and stream events all appear as they would in live operation.

**Why replay is the default.** CICIDS2017 is a static capture. Replay walks real
dataset rows one batch at a time, which demonstrates real-time detection without
inventing traffic. **Rewind cursor** restarts from the beginning.

**"Skipped" flows.** A scan may report flows that were recorded but not scored.
This happens with live capture and Zeek: a sniffed packet cannot supply most of
the 85 features the model was trained on (subflow statistics, bulk-rate
averages, idle/active windows). Rather than fill the gaps with made-up zeros and
show you a meaningless verdict, those flows are marked unscored with the list of
what is missing. Use `csv_replay` when you want scored results.

## Detection

Analyze a single flow and see exactly why it scored the way it did.

The model needs ~85 features, so the page is built around editing a real example
rather than typing values:

1. **Load example flow** fills the form from an actual dataset row. Its recorded
   label is shown so you can sanity-check the prediction. That label is *not*
   sent to the model.
2. Features are grouped (ports, flow timing, packet counts, packet sizes, TCP
   flags, throughput, bulk/subflow, idle/active). Expand a group to edit it, or
   use the filter box to find a field.
3. Optionally add source and destination IPs. These enrich the resulting alert;
   they are not model inputs.
4. **Run detection**.

Missing or non-numeric fields are flagged inline before anything is submitted,
and the group containing the first problem opens automatically.

### Reading the result

- **Predicted class** and **severity** badge.
- **Risk score** (0-100), **confidence**, **attack probability**, **anomaly**
  status.
- **Why this risk level** - a bar per contributing term with its points, its
  maximum, and a plain-language reason. The four terms are anomaly detection
  (up to 35), attack probability (up to 45), model confidence (up to 15) and
  attack-type weight. Together they are the whole score; there is no hidden
  component.
- **Class probabilities** - the top classes the classifier considered.
- **Notifications** - which channels were tried and what happened.

If the score crosses the alert threshold you will see the new alert's ID.

## Alerts

Alerts are created automatically when a detection's risk score reaches the
configured threshold (65 by default).

Filter by status and severity, search by IP, attack type or ID, and sort by
recency, risk or severity. Select an alert to open the investigation panel.

Workflow:

| Action | Meaning |
|---|---|
| **Acknowledge** | You have seen it. Records you and the time. |
| **Investigating** | Actively being worked. |
| **Resolve** | Handled. Records you and the time. |
| **False positive** | Not a real threat - useful signal that the threshold or model needs tuning. |

Add an investigation note to leave context for whoever picks it up next.

If you find yourself marking many alerts false positive, say so - it usually
means `NETSHIELD_ALERT_MIN_RISK_SCORE` should be raised.

## Incidents

An incident groups related alerts into one investigation.

**New incident** takes a title, severity, priority (1 highest to 10 lowest) and
description, and assigns it to you.

In the detail panel you can change status and severity, link an alert by its ID,
and add timestamped notes. Moving an incident to `CLOSED` records the closure
time.

Statuses: `OPEN`, `INVESTIGATING`, `RESOLVED`, `CLOSED`.

## Threat intelligence

Check whether an IP is known-bad, and maintain a local indicator list.

**Lookup** returns one of:

| Result | Meaning |
|---|---|
| **malicious** | Matched an indicator at MEDIUM or above |
| **not flagged** | Matched an indicator rated LOW |
| **no verdict** | No record exists - nothing is being asserted |

"No verdict" is a real answer, not a failure. With no external provider
configured the platform answers from the local indicator table only; it will
never guess that an address is malicious.

The banner states whether an external provider is configured. Administrators can
add and remove indicators (IP, domain, hash, URL) with a threat level and
description.

## Analytics

Deeper charts than the dashboard, over a 24 hour / 7 day / 30 day window:
detection volume by severity, anomaly trends, severity distribution, corpus
attack categories, detections by predicted class, protocol mix, and corpus top
sources and destinations.

Every chart is drawn from backend data. An empty chart states that no data was
returned rather than showing a placeholder shape.

## Reports

Generate a security report over 1, 7, 30 or 90 days.

The preview shows the period summary, counters, top threats, recommendations and
the model performance figures that will be included. **Generate & store** saves
it; stored reports can be exported as JSON or CSV, and as PDF when `reportlab`
is installed on the server (the page says so if it is not).

Recommendations are derived only from observed counts - for example "12 alerts
are still in NEW state" or "8 of 20 alerts were marked false positive (>30%);
consider raising the threshold". A period with no detections produces an empty
recommendation list and says so.

## Model

What the active model is and how well it actually performs.

Version, dataset, training rows, feature count, and the metrics recorded by the
training run: accuracy, macro precision/recall/F1, weighted F1.

**Read macro F1, not accuracy.** The corpus is dominated by benign traffic, so
accuracy looks flattering. Macro F1 treats every class equally and is the honest
figure. The per-class table makes this concrete: classes with zero support in
the held-out split are shown with an F1 of 0 in red rather than hidden.

The confusion matrix is available behind a **Show** button (it is large -
diagonal cells in green are correct, off-diagonal in red are confusions).

The **Risk scoring policy** section lists the exact weights, severity thresholds
and attack-family weights currently in force.

## Admin (administrators only)

**Users** — search and filter by role and status; promote to admin, demote to
analyst, activate, deactivate, and view a user's audit activity. You cannot
demote or deactivate your own account.

**Configuration status** — which integrations are configured, shown as pills. No
secret value is ever displayed. Warnings appear for a default JWT secret, open
CORS, or SQLite in a production environment.

**Notification channels** — per-channel state. An unconfigured channel records
notifications as `SKIPPED`; nothing is sent and nothing fails.

**Model registry** — the on-disk model plus registered versions. **Register
on-disk model** records the current model in the registry. Retraining is
deliberately not available here: it runs on the host with
`python -m backend.scripts.train_models`, so no web request can trigger training.

## Audit logs (administrators only)

Every significant action: `register`, `login`, `login_failed`,
`login_denied_inactive`, `logout`, `prediction`, `report_generated`,
`model_registry_sync`. Filter by user or action, and page through the history.

Passwords, tokens and API keys are never recorded.

## Settings

Read-only view of runtime configuration: your account, detection pipeline state,
monitoring source availability, real-time transport, threat-intel provider, the
risk-scoring formula, and a reference table of environment variables.

Configuration lives in server-side environment variables, so it is changed on
the server (see `.env.example`) and not from the browser.

## Common situations

**Everything shows zero.** Correct for a fresh install - no flows have been
analyzed. Run a scan from Live monitor.

**"No trained model found."** Run `python -m backend.scripts.train_models` on
the server and reload.

**Analytics says the dataset was not found.** The CICIDS2017 CSVs are not in
place. See `data/README.md`. The rest of the platform still works.

**Transport says `polling`.** WebSocket and SSE were unavailable (commonly a
buffering proxy). Everything still updates, just on a 4-second poll.

**Live capture is unavailable.** Expected by default. It needs
`NETSHIELD_CAPTURE_ENABLED=true`, Scapy, and Npcap on Windows - and even then
its flows are not scoreable against the CICIDS2017 model.

**Admin pages are missing.** Your account is an analyst. An administrator can
change that.

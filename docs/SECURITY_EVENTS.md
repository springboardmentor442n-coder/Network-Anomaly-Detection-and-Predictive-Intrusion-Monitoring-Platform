# Security events and IP investigations

The dedicated section turns the previous admin-only raw JSON audit view into a searchable event trail for analysts. It also connects an IP address to the evidence already saved by the application. It keeps current application activity separate from historical network captures.

## What is recorded

Successful login, email verification, registration requests, rejected authentication, rate limits, denied API requests, uploads, scan start/completion/failure, chunk failures, model review batches, scan stop requests and deletion, incident changes, role changes, report and data exports, IP investigation, IP notes and sign out. A failed request is recorded with a safe reason from an allowlist where available. Read-only event refreshes are not logged repeatedly.

Each structured event has an increasing ID, server UTC timestamp, actor/service, action, category, outcome, severity, resource and safe detail. HTTP events include the server-reported request peer IP and a fresh server-generated request ID. The request ID also appears in the response header. Forwarding headers and client-supplied request IDs are not read by this module. A deployment must separately configure trusted proxy handling in its ASGI server. Background and legacy records may have no peer or request ID.

Passwords, OTPs, email bodies, invitation codes, CAPTCHA tokens and raw bearer tokens are excluded. Login failures are attributed to anonymous rather than a claimed identity or an email address from an untrusted form. Only Admin sees those anonymous failures. A verified account that attempts a forbidden operation has that rejection attributed to its own username.

## Access and retention

Admin sees workspace events and all saved scans. Analyst and Viewer see only events attributed to their username and their own scans. Viewer can read and export permitted evidence but cannot save notes. The older `/api/audit` endpoint remains admin-only for compatibility; the team screen now focuses on roles.

Structured events reject UPDATE and DELETE through SQLite triggers. There is no audit deletion endpoint. These are application-level append-only controls, not a tamper-proof external archive: someone with filesystem or database administrator access can still replace the database or drop its schema. Logs and saved flows grow on disk. No automatic retention purge is enabled. Back up the database with the server stopped.

## Time and address meaning

Recorded UTC is when TraceVigil performed or logged an action. CSV capture time is when the source dataset says the network flow occurred. CICIDS example rows often show 2017, even when scanned now. The new recorded_at field is populated only for new saved flows. The migration does not invent old ingestion timestamps or client IPs.

The event request IP identifies the peer reported to FastAPI, normally 127.0.0.1 for a local browser. A proxy or NAT can affect its meaning. The IP in a traffic flow comes from the CSV. Matching these addresses does not identify a person, prove endpoint ownership or prove the same physical machine.

## Event controls

Search actor, action, resource or request ID; filter action, outcome, severity and a time interval. Date controls accept the browser's local time and convert it to UTC. The newest 50 events are shown first, with cursor pagination. Refresh has a spinner and completion time. Optional automatic refresh runs every ten seconds only while the section and browser tab are visible, and pauses on older pages.

NDJSON export applies the same permission scope and filters and includes at most the latest 10,000 matching events. Headers state exported/total counts and truncation. SHA-256 checks the downloaded bytes; it is not a signature or proof that the database was never changed.

## Investigating an IP

1. Validate and normalize IPv4 or IPv6. URLs, port suffixes and zone IDs are rejected.
2. Classify the address as loopback, link local, private/special, shared space, multicast or globally scoped. Address properties are not reputation.
3. Use indexed source/destination columns to find role-permitted saved flows. Optionally restrict to a selected scan. Count total matches, then inspect at most the latest 50,000 matches by storage ID. The interface states truncation; aggregate counts refer to this evidence window, not every historical match when capped.
4. Summarize scored/invalid rows, predicted attack flows, review flags, source/destination role counts, peers, destination ports, model disagreements, anomaly flags and maximum/mean policy risk. A self-flow contributes to both source and destination role counts but is one matched row.
5. Show the top 20 peers and remote ports, protocol counts, up to 256 capture-hour buckets, up to 100 flow samples and up to 200 related incident groups. Inspect the existing incident console for model comparison, TreeSHAP and PDF case evidence.
6. Explain descriptive leads. At least ten observed outbound destination ports suggests reviewing discovery/scanning; at least five destination addresses suggests reviewing service dependencies. These are transparent triage prompts, not trained detection rules or evidence of compromise by themselves.
7. Display up to 50 application events with the same request-peer IP, separately labelled. Display visible analyst notes. Save your own disposition and note with version checking so a stale tab cannot overwrite a newer note silently.
8. Download authenticated JSON evidence or print the displayed investigation to PDF. Downloads include a byte checksum. Print is a browser action; cancelling a print dialog is not recorded as a completed export.

External reputation always says Not checked. This update makes no request to VirusTotal, AbuseIPDB, WHOIS, DNS or a target host. No-match results do not imply safe. A future external feed integration would need a named provider, attribution, cache time, limits and clear handling for private addresses; it is not simulated here.

## Schema and migration

`security_events` stores structured events and a unique link to migrated legacy audit rows. `flows` gains nullable source_ip, destination_ip and recorded_at columns with address indexes. `ip_cases` stores one current note per analyst and normalized IP, with disposition/version/updated time. `revoked_tokens` stores SHA-256 token digests and expiry, not plaintext tokens. `security_migrations` tracks the one-time IP backfill.

The migration preserves existing users, scans, incidents, audit rows and CSVs. It processes old flow payloads in batches of 1,000, normalizes their addresses and leaves unavailable ingestion timestamps null. A large database needs additional disk space for indexes and may take longer at first startup. Use one Uvicorn worker as before.

Sign out revokes the presented bearer token, clears it from browser session storage after server confirmation and records the event. New logins have a unique jti so two sessions issued in the same second have different tokens. Existing tokens can still be validated and revoked by digest without requiring a jti.

## API and validation

The Postman collection includes GET /api/security/events, GET /api/security/events/export, GET /api/security/ip, GET /api/security/ip/export, PUT /api/security/ip/case and POST /api/logout. IP investigation accepts ip and optional scan_id. Note updates require the current version, initially zero; stale writes return 409. Event pagination accepts before and limit up to 200. Date filter strings must include a UTC offset.

The validation JSON records the actual backend/browser checks and environment. CAPTCHA and email are mocked only in isolated tests. Tests do not establish a production penetration test, independent model accuracy, Windows-specific performance or an external threat intelligence result.

## Design references

- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- Python IP address properties: https://docs.python.org/3/library/ipaddress.html

These references informed the timestamp/actor/action fields, secret exclusions and IP interpretation. They do not certify the application.

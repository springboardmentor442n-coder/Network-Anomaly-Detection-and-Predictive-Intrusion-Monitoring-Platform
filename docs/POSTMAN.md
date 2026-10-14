# Postman walkthrough

Import `NetShield.postman_collection.json`. Collection variables:
- base_url = http://127.0.0.1:8000
- username = your username
- password = your chosen 10+ character password
- token = captured after Login
- source = cicids_demo_real_ips.csv
- scan_id = captured after Create SSE scan
- incident_id = a row ID from List incidents

1. Start the local server. Send Health.
2. Send Signup once, then Login. Login test script saves access_token.
3. Send Me and Model performance. Protected requests inherit Bearer token.
4. Send Backend CSV sources. Change source if needed.
5. Send Create SSE scan. Test script captures scan_id. This starts processing; promptly send Stream SSE events. Inspect event IDs, start, chunk, done.
6. Send Scan report; summary only becomes available once processing finishes.
7. Send Export rows; save the response as NDJSON. Each line is one JSON record.
8. Send List incidents, copy an ID to incident_id and send Update incident.
9. Send Create polling scan followed by Poll results repeatedly if SSE is unsuitable.
10. Stop scan explicitly. Starting a new scan is a new operation from row one.

For CSV upload, send POST /api/upload with Body -> form-data -> key `file` -> File -> choose CSV. Response supplies a generated source name. Put it in collection variable source before scan creation.

HTTP status examples: 401 expired/invalid token, 403 wrong role or owner, 409 username exists/duplicate stream consumer, 413 oversized upload, 422 missing required features/invalid schema, 429 maximum two active scans. Errors inside an already-open SSE stream are event messages because HTTP response headers have already been sent.

Postman can inspect SSE HTTP streams. It does not change how the ML model works. Native browser EventSource cannot set custom headers, but our fetch-based client does; this design avoids putting login tokens in URLs.

Sources: https://blog.postman.com/support-for-server-sent-events/ and https://learning.postman.com/docs/use/send-requests/requests/

The October 13 release also provides GET /api/scans/{scan_id}/report-html for a printable report, and authenticated DELETE /api/scans/{scan_id} for deliberate cleanup after completion. Grouped incident records include occurrences, source/destination and maximum observed risk.

# Docker and cloud deployment runbook

The repository is packaged for deployment; no AWS/Azure resources were created in this task.

## Local Docker

Run `docker compose up --build` from the project folder. Visit http://127.0.0.1:8000. Source data and SQLite live in the named volume; initialize an Admin using the CLI inside the running container if needed. Docker image uses Python 3.12 and a non-root user. One worker is required by in-process scan jobs.

For larger CSVs copy/mount them into the configured data directory; review permissions. Do not expose the entire host filesystem. Do not bake passwords, private traffic or secret tokens into an image.

## User-owned VM deployment

1. Choose a VM/cloud account and budget. Install Docker using current official provider/Docker instructions.
2. Upload the package and your validated model bundle. Transfer data securely. Confirm dataset licence and privacy requirements.
3. Run Compose. Keep database/storage persistent and backed up.
4. Put an HTTPS reverse proxy in front of localhost:8000. Disable buffering for SSE, set idle timeout above heartbeat interval, preserve Authorization, and stream responses without caching. Health route is /api/health.
5. Set a strong JWT_SECRET through the host's secret-management mechanism. Restrict network ingress and account signup/provisioning for an exposed service.
6. Test SSE, polling, Stop, ownership and export over the actual proxy. Measure representative large-file and concurrent-scan load. Monitor storage growth, memory and errors.
7. For multiple workers/replicas implement shared job state/messaging or guaranteed sticky routing. This package does not include Redis; do not merely increase worker count.

Current authentication is suitable for a private teaching demo. Before public exposure add request/login rate limits, controlled account creation, retention controls, proper TLS and operational review. A container build file is not evidence of a successful cloud deployment.

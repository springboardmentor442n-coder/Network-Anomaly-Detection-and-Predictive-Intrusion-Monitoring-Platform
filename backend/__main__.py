"""
Development entry point: python -m backend

Host, port and reload are configurable so this does not collide with another
service already bound to the default port:

    NETSHIELD_HOST    default 127.0.0.1
    NETSHIELD_PORT    default 8000
    NETSHIELD_RELOAD  default true

The port is checked before binding, because uvicorn's reloader can otherwise
appear to start successfully while a different process keeps serving the port -
which surfaces later as confusing 404s from the other application.
"""

import os
import socket
import sys

import uvicorn


def _port_is_free(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        probe.settimeout(1.0)
        return probe.connect_ex((host, port)) != 0


def main() -> None:
    host = os.getenv("NETSHIELD_HOST", "127.0.0.1")
    port = int(os.getenv("NETSHIELD_PORT", "8000"))
    reload_enabled = os.getenv("NETSHIELD_RELOAD", "true").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }

    if not _port_is_free(host, port):
        print(
            f"ERROR: {host}:{port} is already in use by another process.\n"
            f"\n"
            f"Something else is serving that port, so starting here would leave the\n"
            f"other application answering your requests (you would see 404s such as\n"
            f'{{"detail":"Not Found"}} from the NetShield frontend).\n'
            f"\n"
            f"Either stop the other process, or pick a different port:\n"
            f"\n"
            f"  PowerShell:  $env:NETSHIELD_PORT = \"8001\"; python -m backend\n"
            f"  bash:        NETSHIELD_PORT=8001 python -m backend\n"
            f"\n"
            f"Then point the frontend at it (frontend/.env):\n"
            f"\n"
            f"  VITE_PROXY_TARGET=http://127.0.0.1:8001\n"
            f"\n"
            f"To see what holds the port on Windows:\n"
            f"\n"
            f"  netstat -ano | findstr :{port}\n"
            f"  Get-Process -Id <PID>\n",
            file=sys.stderr,
        )
        raise SystemExit(1)

    print(f"NetShield AI API starting on http://{host}:{port} (docs at /docs)")
    uvicorn.run("backend.app.main:app", host=host, port=port, reload=reload_enabled)


if __name__ == "__main__":
    main()

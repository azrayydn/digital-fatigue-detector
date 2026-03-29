from __future__ import annotations

import threading
from typing import Any

from flask import Flask, jsonify, request

from engine import create_tracker_state, update_tracker_state
from shared import app_metadata


def create_app() -> Flask:
    app = Flask(__name__)

    # Thread-safe state for a single-process development server.
    lock = threading.Lock()
    app_state: dict[str, Any] = {"tracker_state": create_tracker_state()}

    @app.get("/status")
    def status() -> Any:
        with lock:
            tracker_state = app_state["tracker_state"]
        meta = app_metadata()
        return jsonify(
            {
                "app": meta["name"],
                "runtime": meta["runtime"],
                "status": tracker_state.status,
                "is_running": tracker_state.is_running,
                "started_at": tracker_state.started_at.isoformat() if tracker_state.started_at else None,
            }
        )

    @app.post("/control")
    def control() -> Any:
        payload = request.get_json(silent=True) or {}
        action = str(payload.get("action", "")).lower()

        with lock:
            previous_state = app_state["tracker_state"]

            if action == "start":
                should_start = True
            elif action in {"pause", "stop"}:
                should_start = False
            else:
                return (
                    jsonify({"error": "invalid action. Use 'start' or 'pause'."}),
                    400,
                )

            app_state["tracker_state"] = update_tracker_state(
                previous_state=previous_state,
                should_start=should_start,
            )

            tracker_state = app_state["tracker_state"]

        return jsonify({"status": tracker_state.status, "is_running": tracker_state.is_running})

    @app.get("/")
    def index() -> Any:
        # Minimal page to manually verify endpoints.
        return """
<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>FlowGuard AI</title>
  </head>
  <body>
    <h2>FlowGuard AI (Flask)</h2>
    <div id="status">loading...</div>
    <button onclick="fetch('/control', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'start'})}).then(()=>refresh())">Start</button>
    <button onclick="fetch('/control', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'pause'})}).then(()=>refresh())">Pause</button>
    <script>
      async function refresh() {
        const res = await fetch('/status');
        const data = await res.json();
        document.getElementById('status').innerText = JSON.stringify(data, null, 2);
      }
      refresh();
    </script>
  </body>
</html>
"""

    return app


def run_server(host: str = "127.0.0.1", port: int = 5000) -> None:
    app = create_app()
    # Development server; for production you should use gunicorn/uwsgi.
    app.run(host=host, port=port, debug=True)


if __name__ == "__main__":
    run_server()


"""
FlowGuard AI — Flask App v2.3
================================
v2.3 değişiklikleri:
- /sessions response: avg_focus_score, idle_s, idle_ratio alanları eklendi
- /finish endpoint'i eklendi: oturumu bitirir + kaydeder + idle duruma geçer
- _state_to_dict: avg_focus_score alanı eklendi
- Kayıt mantığı: start + pause + finish üçlüsünde tutarlı
"""
from __future__ import annotations

import threading
from datetime import datetime, timezone
from typing import Any

from flask import Flask, jsonify, render_template, request

from engine import (
    create_tracker_state,
    start_session,
    pause_session,
    resume_session,
    record_activity,
)
from shared import app_metadata
from storage import SessionStore
from storage.session_store import build_record


def create_app() -> Flask:
    app = Flask(__name__)

    lock = threading.Lock()
    app_state: dict[str, Any] = {
        "tracker_state": create_tracker_state(),
        "session_id": None,
    }
    store = SessionStore()

    # ── Yardımcılar ───────────────────────────────────────────────────────────

    def _make_sid(ts: Any) -> str:
        if ts.session_started_at:
            return ts.session_started_at.strftime("%Y%m%d_%H%M%S")
        return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    def _try_save(ts: Any, sid: str | None) -> bool:
        """Kaydeder. Başarılı kayıt → True, atlandı → False."""
        if sid is None:
            return False
        rec = build_record(ts, session_id=sid)
        if rec:
            store.save(rec)
            return True
        return False

    def _state_to_dict(ts: Any) -> dict:
        meta = app_metadata()
        return {
            "app":                   meta["name"],
            "runtime":               meta["runtime"],
            "status":                ts.status,
            "is_running":            ts.is_running,
            "started_at":            ts.started_at.isoformat() if ts.started_at else None,
            "focus_score":           ts.focus_score,
            "avg_focus_score":       ts.avg_focus_score,      # YENİ
            "peak_score":            ts.peak_score,
            "fatigue_level":         ts.fatigue_level,
            "writing_activity":      ts.writing_activity,
            "session_duration_s":    ts.session_duration_s,
            "accumulated_duration_s": ts.accumulated_duration_s,
            "can_resume":            ts.status == "paused",
        }

    # ── Endpoint'ler ───────────────────────────────────────────────────────────

    @app.get("/status")
    def status() -> Any:
        with lock:
            ts = app_state["tracker_state"]
        return jsonify(_state_to_dict(ts))

    @app.post("/control")
    def control() -> Any:
        payload = request.get_json(silent=True) or {}
        action  = str(payload.get("action", "")).lower().strip()

        with lock:
            prev     = app_state["tracker_state"]
            prev_sid = app_state["session_id"]

            if action == "start":
                # Önceki oturum anlamlıysa kaydet (yeni oturum açılmadan önce)
                if prev.session_duration_s >= 30:
                    _try_save(prev, prev_sid)
                new_ts = start_session(previous_state=prev)
                app_state["tracker_state"] = new_ts
                app_state["session_id"]    = _make_sid(new_ts)

            elif action == "pause":
                new_ts = pause_session(previous_state=prev)
                app_state["tracker_state"] = new_ts
                # Duraklatmada kaydet (devam edince üzerine yazılır)
                _try_save(new_ts, prev_sid)

            elif action == "resume":
                new_ts = resume_session(previous_state=prev)
                app_state["tracker_state"] = new_ts
                # session_id aynı kalır

            elif action == "finish":
                # Oturumu tamamlar, kaydeder, idle'a alır
                finished_ts = pause_session(previous_state=prev)
                saved = _try_save(finished_ts, prev_sid)
                app_state["tracker_state"] = create_tracker_state()
                app_state["session_id"]    = None
                ts = app_state["tracker_state"]
                return jsonify({**_state_to_dict(ts), "saved": saved})

            else:
                return jsonify({
                    "error": "Geçersiz komut. 'start', 'pause', 'resume' veya 'finish' kullanın."
                }), 400

            ts = app_state["tracker_state"]

        return jsonify(_state_to_dict(ts))

    @app.post("/activity")
    def activity() -> Any:
        payload      = request.get_json(silent=True) or {}
        keystrokes   = int(payload.get("keystrokes",   0))
        mouse_events = int(payload.get("mouse_events", 0))
        active       = bool(payload.get("active",      False))

        with lock:
            prev = app_state["tracker_state"]
            if prev.is_running:
                app_state["tracker_state"] = record_activity(
                    state=prev,
                    keystrokes=keystrokes,
                    mouse_events=mouse_events,
                    active=active,
                )
            ts = app_state["tracker_state"]

        return jsonify(_state_to_dict(ts))

    @app.get("/sessions")
    def sessions() -> Any:
        """Geçmiş oturum verilerini grafik için döndürür."""
        try:
            limit = min(int(request.args.get("limit", 30)), 100)
        except ValueError:
            limit = 30

        records = store.all(limit=limit)
        return jsonify({
            "count": len(records),
            "sessions": [
                {
                    "id":              r.id,
                    "date":            r.date,
                    "started_at":      r.started_at,
                    "ended_at":        r.ended_at,
                    "duration_s":      r.duration_s,
                    "duration_min":    round(r.duration_s / 60, 1),
                    "focus_score":     r.focus_score,
                    "avg_focus_score": r.avg_focus_score,   # YENİ
                    "peak_score":      r.peak_score,
                    "fatigue_level":   r.fatigue_level,
                    "keystrokes":      r.keystrokes,
                    "active_ratio":    r.active_ratio,
                    "active_pct":      round(r.active_ratio * 100, 1),
                    "idle_s":          r.idle_s,             # YENİ
                    "idle_min":        round(r.idle_s / 60, 1),  # YENİ
                    "idle_ratio":      r.idle_ratio,         # YENİ
                }
                for r in records
            ],
        })

    @app.get("/")
    def index() -> Any:
        return render_template("index.html")

    return app


def run_server(host: str = "127.0.0.1", port: int = 5000) -> None:
    app = create_app()
    app.run(host=host, port=port, debug=True)


if __name__ == "__main__":
    run_server()

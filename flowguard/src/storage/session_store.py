"""
FlowGuard AI — Session Store v2.3
====================================
v2.3 değişiklikleri:
- SessionRecord: avg_focus_score, idle_s, idle_ratio alanları eklendi
- build_record: avg_focus_score TrackerState'den alınır;
  idle_s = idle_intervals * 5 (5 saniyelik periyot varsayımı)
- Mevcut verilerle geriye dönük uyumlu (eksik alanlar 0/varsayılan ile doldurulur)
"""
from __future__ import annotations

import json
import threading
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional


@dataclass
class SessionRecord:
    id: str
    date: str
    started_at: str
    ended_at: str
    duration_s: int
    focus_score: int       # oturum sonu anlık skor
    avg_focus_score: int   # YENİ: oturum ortalama skoru
    peak_score: int
    fatigue_level: str
    keystrokes: int
    mouse_events: int
    active_ratio: float
    idle_s: int = 0        # YENİ: boşta geçen tahmini süre (sn)
    idle_ratio: float = 0.0  # YENİ: boşta oran


class SessionStore:
    """Thread-safe JSON dosyası tabanlı oturum geçmişi."""

    def __init__(self, data_dir: Optional[str] = None) -> None:
        if data_dir is None:
            here = Path(__file__).resolve()
            project_root = here.parent.parent.parent
            data_dir = str(project_root / "data")

        self._path = Path(data_dir) / "sessions.json"
        self._lock = threading.Lock()
        self._ensure_file()

    def _ensure_file(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        if not self._path.exists():
            self._path.write_text("[]", encoding="utf-8")

    def _read(self) -> list:
        try:
            raw = self._path.read_text(encoding="utf-8")
            return json.loads(raw) if raw.strip() else []
        except (json.JSONDecodeError, OSError):
            return []

    def _write(self, records: list) -> None:
        tmp = self._path.with_suffix(".tmp")
        tmp.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(self._path)

    def _deserialize(self, r: dict) -> SessionRecord:
        """Geriye dönük uyumlu deserializasyon — eksik alanları doldurur."""
        return SessionRecord(
            id=r.get("id", ""),
            date=r.get("date", ""),
            started_at=r.get("started_at", ""),
            ended_at=r.get("ended_at", ""),
            duration_s=r.get("duration_s", 0),
            focus_score=r.get("focus_score", 0),
            avg_focus_score=r.get("avg_focus_score", r.get("focus_score", 0)),  # eski kayıtlarda yok
            peak_score=r.get("peak_score", r.get("focus_score", 0)),
            fatigue_level=r.get("fatigue_level", "Düşük"),
            keystrokes=r.get("keystrokes", 0),
            mouse_events=r.get("mouse_events", 0),
            active_ratio=r.get("active_ratio", 0.0),
            idle_s=r.get("idle_s", 0),
            idle_ratio=r.get("idle_ratio", 0.0),
        )

    def save(self, record: SessionRecord) -> None:
        with self._lock:
            records = self._read()
            for i, r in enumerate(records):
                if r.get("id") == record.id:
                    records[i] = asdict(record)
                    self._write(records)
                    return
            records.append(asdict(record))
            self._write(records)

    def all(self, limit: int = 30) -> List[SessionRecord]:
        with self._lock:
            records = self._read()
        records.sort(key=lambda r: r.get("started_at", ""))
        tail = records[-limit:]
        result = []
        for r in tail:
            try:
                result.append(self._deserialize(r))
            except Exception:
                continue
        return result

    def count(self) -> int:
        with self._lock:
            return len(self._read())


def build_record(tracker_state: object, session_id: Optional[str] = None) -> Optional[SessionRecord]:
    """TrackerState → SessionRecord. 30 saniyeden kısa oturumları atlar."""
    ts = tracker_state

    if ts.session_duration_s < 30:  # type: ignore[attr-defined]
        return None

    m = ts.metrics  # type: ignore[attr-defined]
    total_intervals = m.active_intervals + m.idle_intervals

    active_ratio = round(m.active_intervals / total_intervals, 3) if total_intervals > 0 else 0.0
    idle_ratio   = round(m.idle_intervals  / total_intervals, 3) if total_intervals > 0 else 0.0

    # idle_s: boşta interval sayısı × 5 sn (flush periyodu)
    idle_s = m.idle_intervals * 5

    now = datetime.now(timezone.utc)
    sid = session_id or now.strftime("%Y%m%d_%H%M%S")

    started_str = ""
    if hasattr(ts, "session_started_at") and ts.session_started_at:
        started_str = ts.session_started_at.isoformat()
    elif hasattr(ts, "started_at") and ts.started_at:
        started_str = ts.started_at.isoformat()
    else:
        started_str = now.isoformat()

    # avg_focus_score: TrackerState'de tutuluyorsa al, yoksa focus_score kullan
    avg_score = getattr(ts, "avg_focus_score", ts.focus_score)  # type: ignore[attr-defined]

    return SessionRecord(
        id=sid,
        date=now.strftime("%Y-%m-%d"),
        started_at=started_str,
        ended_at=now.isoformat(),
        duration_s=ts.session_duration_s,   # type: ignore[attr-defined]
        focus_score=ts.focus_score,          # type: ignore[attr-defined]
        avg_focus_score=avg_score,
        peak_score=getattr(ts, "peak_score", ts.focus_score),  # type: ignore[attr-defined]
        fatigue_level=ts.fatigue_level,      # type: ignore[attr-defined]
        keystrokes=m.keystrokes,
        mouse_events=m.mouse_events,
        active_ratio=active_ratio,
        idle_s=idle_s,
        idle_ratio=idle_ratio,
    )

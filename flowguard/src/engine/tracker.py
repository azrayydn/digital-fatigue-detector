"""
FlowGuard AI — Tracker Engine v2.3
====================================
v2.3 değişiklikleri:
- SessionMetrics: score_sum + score_count → oturum içi ortalama skor
- _compute_scores: her çağrıda score_sum/count güncellenir
- idle_s türetmek için idle_intervals * 5 (5sn'lik periyot varsayımı)
- Diğer her şey aynı
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional


@dataclass
class SessionMetrics:
    """Kullanıcı davranış sayaçları — tüm oturum boyunca birikir."""
    keystrokes: int = 0
    mouse_events: int = 0
    active_intervals: int = 0
    idle_intervals: int = 0
    last_activity_ts: Optional[float] = None
    # YENİ: ortalama skor için birikimli toplam
    score_sum: int = 0
    score_count: int = 0


@dataclass
class TrackerState:
    is_running: bool
    status: str                           # idle | tracking | paused | fatigue_warning

    started_at: Optional[datetime]
    paused_at: Optional[datetime]
    accumulated_duration_s: int

    session_started_at: Optional[datetime] = None

    metrics: SessionMetrics = field(default_factory=SessionMetrics)

    focus_score: int = 0
    peak_score: int = 0
    avg_focus_score: int = 0             # YENİ: oturum ortalama skoru
    fatigue_level: str = "Düşük"
    writing_activity: str = "Pasif"
    session_duration_s: int = 0


def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, val))


def _active_segment_s(state: TrackerState) -> int:
    if not state.is_running or state.started_at is None:
        return 0
    now = datetime.now(timezone.utc).timestamp()
    return max(0, int(now - state.started_at.timestamp()))


def _total_active_s(state: TrackerState) -> int:
    return state.accumulated_duration_s + _active_segment_s(state)


def _compute_scores(state: TrackerState) -> TrackerState:
    m = state.metrics
    session_s = _total_active_s(state)

    if not state.is_running:
        avg = m.score_sum // m.score_count if m.score_count > 0 else state.focus_score
        return TrackerState(
            is_running=False,
            status=state.status,
            started_at=state.started_at,
            paused_at=state.paused_at,
            accumulated_duration_s=state.accumulated_duration_s,
            session_started_at=state.session_started_at,
            metrics=m,
            focus_score=state.focus_score,
            peak_score=state.peak_score,
            avg_focus_score=avg,
            fatigue_level=state.fatigue_level,
            writing_activity="Pasif",
            session_duration_s=session_s,
        )

    total_intervals = m.active_intervals + m.idle_intervals
    activity_ratio = m.active_intervals / total_intervals if total_intervals > 0 else 0.0

    elapsed_minutes = max(session_s / 60.0, 0.1)
    kpm = m.keystrokes / elapsed_minutes
    mpm = m.mouse_events / elapsed_minutes

    base        = activity_ratio * 60.0
    kpm_bonus   = _clamp(kpm / 5.0,  0.0, 30.0)
    mouse_bonus = _clamp(mpm / 10.0, 0.0, 10.0)
    raw_score   = base + kpm_bonus + mouse_bonus

    fatigue_penalty = 0.0
    if session_s > 2700:
        extra_minutes = (session_s - 2700) / 60.0
        fatigue_penalty = _clamp(extra_minutes * 0.8, 0.0, 35.0)

    final_score = int(_clamp(raw_score - fatigue_penalty, 0.0, 100.0))
    new_peak    = max(state.peak_score, final_score)

    # YENİ: score_sum / score_count güncelle
    new_score_sum   = m.score_sum + final_score
    new_score_count = m.score_count + 1
    avg_score = new_score_sum // new_score_count

    new_metrics = SessionMetrics(
        keystrokes=m.keystrokes,
        mouse_events=m.mouse_events,
        active_intervals=m.active_intervals,
        idle_intervals=m.idle_intervals,
        last_activity_ts=m.last_activity_ts,
        score_sum=new_score_sum,
        score_count=new_score_count,
    )

    if final_score >= 70:   fatigue = "Düşük"
    elif final_score >= 45: fatigue = "Orta"
    elif final_score >= 20: fatigue = "Yüksek"
    else:                   fatigue = "Çok Yüksek"

    now_ts = datetime.now(timezone.utc).timestamp()
    recent = m.last_activity_ts is not None and (now_ts - m.last_activity_ts) < 10.0
    writing = "Aktif" if recent else ("Beklemede" if final_score > 20 else "Pasif")

    new_status = "fatigue_warning" if final_score < 20 and session_s > 300 else "tracking"

    return TrackerState(
        is_running=True,
        status=new_status,
        started_at=state.started_at,
        paused_at=None,
        accumulated_duration_s=state.accumulated_duration_s,
        session_started_at=state.session_started_at,
        metrics=new_metrics,
        focus_score=final_score,
        peak_score=new_peak,
        avg_focus_score=avg_score,
        fatigue_level=fatigue,
        writing_activity=writing,
        session_duration_s=session_s,
    )


def create_tracker_state() -> TrackerState:
    return TrackerState(
        is_running=False,
        status="idle",
        started_at=None,
        paused_at=None,
        accumulated_duration_s=0,
        session_started_at=None,
    )


def start_session(*, previous_state: TrackerState) -> TrackerState:
    if previous_state.is_running:
        return _compute_scores(previous_state)
    now = datetime.now(timezone.utc)
    return _compute_scores(TrackerState(
        is_running=True,
        status="tracking",
        started_at=now,
        paused_at=None,
        accumulated_duration_s=0,
        session_started_at=now,
        metrics=SessionMetrics(),
        peak_score=0,
        avg_focus_score=0,
    ))


def pause_session(*, previous_state: TrackerState) -> TrackerState:
    if not previous_state.is_running:
        return previous_state
    segment_s = _active_segment_s(previous_state)
    new_acc = previous_state.accumulated_duration_s + segment_s
    m = previous_state.metrics
    avg = m.score_sum // m.score_count if m.score_count > 0 else previous_state.focus_score
    return TrackerState(
        is_running=False,
        status="paused",
        started_at=None,
        paused_at=datetime.now(timezone.utc),
        accumulated_duration_s=new_acc,
        session_started_at=previous_state.session_started_at,
        metrics=previous_state.metrics,
        focus_score=previous_state.focus_score,
        peak_score=previous_state.peak_score,
        avg_focus_score=avg,
        fatigue_level=previous_state.fatigue_level,
        writing_activity="Pasif",
        session_duration_s=new_acc,
    )


def resume_session(*, previous_state: TrackerState) -> TrackerState:
    if previous_state.is_running:
        return _compute_scores(previous_state)
    if previous_state.status not in {"paused", "fatigue_warning"}:
        return previous_state
    return _compute_scores(TrackerState(
        is_running=True,
        status="tracking",
        started_at=datetime.now(timezone.utc),
        paused_at=None,
        accumulated_duration_s=previous_state.accumulated_duration_s,
        session_started_at=previous_state.session_started_at,
        metrics=previous_state.metrics,
        peak_score=previous_state.peak_score,
        avg_focus_score=previous_state.avg_focus_score,
    ))


def record_activity(
    *,
    state: TrackerState,
    keystrokes: int = 0,
    mouse_events: int = 0,
    active: bool = True,
) -> TrackerState:
    if not state.is_running:
        return state
    m = state.metrics
    now_ts = datetime.now(timezone.utc).timestamp()
    new_metrics = SessionMetrics(
        keystrokes=m.keystrokes + keystrokes,
        mouse_events=m.mouse_events + mouse_events,
        active_intervals=m.active_intervals + (1 if active else 0),
        idle_intervals=m.idle_intervals + (0 if active else 1),
        last_activity_ts=now_ts if (keystrokes > 0 or mouse_events > 0) else m.last_activity_ts,
        score_sum=m.score_sum,
        score_count=m.score_count,
    )
    return _compute_scores(TrackerState(
        is_running=state.is_running,
        status=state.status,
        started_at=state.started_at,
        paused_at=state.paused_at,
        accumulated_duration_s=state.accumulated_duration_s,
        session_started_at=state.session_started_at,
        metrics=new_metrics,
        peak_score=state.peak_score,
        avg_focus_score=state.avg_focus_score,
    ))


def update_tracker_state(*, previous_state: TrackerState, should_start: bool) -> TrackerState:
    if should_start:
        return start_session(previous_state=previous_state)
    return pause_session(previous_state=previous_state)

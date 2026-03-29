from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class TrackerState:
    is_running: bool
    started_at: datetime | None
    status: str


def create_tracker_state() -> TrackerState:
    return TrackerState(is_running=False, started_at=None, status="idle")


def update_tracker_state(*, previous_state: TrackerState, should_start: bool) -> TrackerState:
    if should_start and previous_state.is_running:
        return previous_state

    if not should_start and not previous_state.is_running:
        return previous_state

    if should_start:
        return TrackerState(
            is_running=True,
            started_at=datetime.now(timezone.utc),
            status="tracking",
        )

    return TrackerState(is_running=False, started_at=None, status="paused")


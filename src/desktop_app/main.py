from __future__ import annotations

from engine import create_tracker_state, update_tracker_state
from shared import app_metadata


def run() -> dict[str, str]:
    metadata = app_metadata()
    initial_state = create_tracker_state()
    current_state = update_tracker_state(previous_state=initial_state, should_start=True)
    return {
        "app": metadata["name"],
        "runtime": metadata["runtime"],
        "status": current_state.status,
    }


if __name__ == "__main__":
    result = run()
    print(f'{result["app"]} ({result["runtime"]}) status: {result["status"]}')


from engine import create_tracker_state, update_tracker_state


def test_tracker_starts() -> None:
    state = create_tracker_state()
    updated_state = update_tracker_state(previous_state=state, should_start=True)
    assert updated_state.is_running is True
    assert updated_state.status == "tracking"


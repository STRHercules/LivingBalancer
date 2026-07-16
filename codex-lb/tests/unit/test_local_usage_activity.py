import json

from app.modules.local_usage import activity


def _rollout(tmp_path, session_id: str, event_type: str):
    path = tmp_path / f"rollout-2026-07-16T00-00-00-{session_id}.jsonl"
    row = {"timestamp": "2026-07-16T12:00:00Z", "type": "event_msg", "payload": {"type": event_type}}
    path.write_text(json.dumps(row) + "\n", encoding="utf-8")
    return path


def test_recent_activity_returns_all_active_chats(monkeypatch, tmp_path):
    active_a = _rollout(tmp_path, "00000000-0000-0000-0000-000000000001", "task_started")
    active_b = _rollout(tmp_path, "00000000-0000-0000-0000-000000000002", "agent_reasoning")
    completed = _rollout(tmp_path, "00000000-0000-0000-0000-000000000003", "task_complete")
    monkeypatch.setattr(activity, "_recent_rollouts", lambda: [active_a, active_b, completed])

    result = activity.recent_activity()

    assert [session["session_id"] for session in result["sessions"]] == [
        "00000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-000000000002",
    ]
    assert result["session_id"] == result["sessions"][0]["session_id"]

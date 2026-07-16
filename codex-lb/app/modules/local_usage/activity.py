from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

_RELEVANT_EVENT_MARKERS = (
    b'"agent_reasoning"',
    b'"reasoning"',
    b'"task_started"',
    b'"task_complete"',
    b'"patch_apply_end"',
    b'"custom_tool_call"',
)
_ACTIVE_WINDOW = timedelta(minutes=5)
_MAX_ACTIVE_SESSIONS = 8


def _classify(row_type: str, payload: dict[str, Any]) -> tuple[str, str] | None:
    event_type = str(payload.get("type") or "")
    if event_type in {"agent_reasoning", "reasoning"}:
        return "thinking", "Analyzing the current task"
    if event_type == "task_started":
        return "workflow", "Task started"
    if event_type == "task_complete":
        return "workflow", "Task completed"
    if event_type == "patch_apply_end":
        return "tool", "Applied file changes"
    if row_type != "response_item" or event_type != "custom_tool_call":
        return None

    tool_input = str(payload.get("input") or "").lower()
    if "search_query" in tool_input or "web__run" in tool_input:
        return "search", "Searching the web"
    if "browser" in tool_input or "node_repl" in tool_input:
        return "tool", "Using the browser"
    if "apply_patch" in tool_input:
        return "tool", "Editing files"
    if "shell_command" in tool_input:
        return "tool", "Running a terminal command"
    return "tool", f"Using {payload.get('name') or 'a tool'}"


def _recent_rollouts() -> list[Path]:
    from tokdash.clientpaths import codex_sessions_dir

    root = codex_sessions_dir()
    today = datetime.now()
    candidates = [
        path
        for date in (today, today - timedelta(days=1))
        for path in (root / f"{date:%Y/%m/%d}").glob("rollout-*.jsonl")
    ]
    candidates.sort(key=lambda path: path.stat().st_mtime, reverse=True)
    if not candidates:
        return []
    cutoff = today.timestamp() - _ACTIVE_WINDOW.total_seconds()
    return [
        path
        for path in candidates[:_MAX_ACTIVE_SESSIONS]
        if path == candidates[0] or path.stat().st_mtime >= cutoff
    ]


def _tail_lines(path: Path, limit: int) -> list[bytes]:
    with path.open("rb") as source:
        source.seek(0, 2)
        position = source.tell()
        buffer = b""
        while position > 0 and buffer.count(b"\n") <= limit:
            size = min(64 * 1024, position)
            position -= size
            source.seek(position)
            buffer = source.read(size) + buffer
    return buffer.splitlines()[-limit:]


def _rollout_activity(path: Path, limit: int) -> dict[str, Any]:
    events: list[dict[str, Any]] = []
    for index, line in enumerate(_tail_lines(path, max(64, limit * 4))):
        # Tool results can be megabytes; reject irrelevant rows before JSON decoding.
        if not any(marker in line for marker in _RELEVANT_EVENT_MARKERS):
            continue
        try:
            row = json.loads(line)
        except (UnicodeDecodeError, json.JSONDecodeError):
            continue
        payload = row.get("payload") if isinstance(row.get("payload"), dict) else {}
        classified = _classify(str(row.get("type") or ""), payload)
        if classified:
            kind, label = classified
            events.append({
                "id": (
                    f"{row.get('timestamp', '')}-{payload.get('type', '')}-"
                    f"{payload.get('call_id') or payload.get('turn_id') or index}"
                ),
                "kind": kind,
                "label": label,
                "timestamp": row.get("timestamp"),
            })

    visible = events[-limit:]
    last = visible[-1] if visible else None
    state = "idle" if last is None or last["label"] == "Task completed" else last["kind"]
    return {"session_id": path.stem[-36:], "state": state, "events": visible}


def recent_activity(limit: int = 16) -> dict[str, Any]:
    rollouts = _recent_rollouts()
    if not rollouts:
        return {"session_id": None, "state": "idle", "events": [], "sessions": []}

    sessions = [_rollout_activity(path, limit) for path in rollouts]
    sessions = [
        session
        for index, session in enumerate(sessions)
        if session["events"] and (index == 0 or session["state"] != "idle")
    ]
    if not sessions:
        return {"session_id": None, "state": "idle", "events": [], "sessions": []}
    return {**sessions[0], "sessions": sessions}


if __name__ == "__main__":
    import tempfile

    assert _classify("event_msg", {"type": "agent_reasoning"}) == ("thinking", "Analyzing the current task")
    assert _classify("response_item", {"type": "custom_tool_call", "input": "search_query"}) == (
        "search",
        "Searching the web",
    )
    with tempfile.TemporaryDirectory() as directory:
        sample = Path(directory) / "events.jsonl"
        sample.write_text("one\ntwo\nthree\nfour\n", encoding="utf-8")
        assert _tail_lines(sample, 2) == [b"three", b"four"]

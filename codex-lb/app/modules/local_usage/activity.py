from __future__ import annotations

import json
from collections import deque
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any


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


def _latest_rollout() -> Path | None:
    from tokdash.clientpaths import codex_sessions_dir

    # ponytail: follow the newest local task only; aggregate rollouts if concurrent-task visualization matters.
    root = codex_sessions_dir()
    today = datetime.now()
    candidates = [
        path
        for date in (today, today - timedelta(days=1))
        for path in (root / f"{date:%Y/%m/%d}").glob("rollout-*.jsonl")
    ]
    return max(candidates, key=lambda path: path.stat().st_mtime, default=None)


def recent_activity(limit: int = 16) -> dict[str, Any]:
    path = _latest_rollout()
    if path is None:
        return {"session_id": None, "state": "idle", "events": []}

    with path.open("r", encoding="utf-8") as source:
        lines = deque(source, maxlen=240)

    events: list[dict[str, Any]] = []
    for index, line in enumerate(lines):
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        payload = row.get("payload") if isinstance(row.get("payload"), dict) else {}
        classified = _classify(str(row.get("type") or ""), payload)
        if classified:
            kind, label = classified
            events.append({
                "id": f"{row.get('timestamp', '')}-{payload.get('type', '')}-{payload.get('call_id') or payload.get('turn_id') or index}",
                "kind": kind,
                "label": label,
                "timestamp": row.get("timestamp"),
            })

    visible = events[-limit:]
    last = visible[-1] if visible else None
    state = "idle" if last is None or last["label"] == "Task completed" else last["kind"]
    return {"session_id": path.stem[-36:], "state": state, "events": visible}


if __name__ == "__main__":
    assert _classify("event_msg", {"type": "agent_reasoning"}) == ("thinking", "Analyzing the current task")
    assert _classify("response_item", {"type": "custom_tool_call", "input": "search_query"}) == ("search", "Searching the web")

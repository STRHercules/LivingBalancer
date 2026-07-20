from __future__ import annotations

import hashlib
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any

from app.core.config.settings import get_settings

MIN_BACKUPS = 10
MAX_UNIVERSE_BYTES = 50 * 1024 * 1024
_lock = Lock()


class UniverseConflictError(Exception):
    pass


def _root() -> Path:
    return Path(get_settings().data_dir) / "living-codex"


def _serialized_universe(universe: dict[str, Any]) -> bytes:
    if universe.get("version") != 4:
        raise ValueError("Living Codex universe must use schema version 4")
    systems = universe.get("starSystems")
    planets = universe.get("planets")
    satellites = universe.get("satellites")
    if not all(isinstance(items, list) for items in (systems, planets, satellites)):
        raise ValueError("Living Codex universe is missing systems, planets, or satellites")
    system_ids = {item.get("id") for item in systems if isinstance(item, dict) and isinstance(item.get("id"), str)}
    planet_ids = {item.get("id") for item in planets if isinstance(item, dict) and isinstance(item.get("id"), str)}
    if len(system_ids) != len(systems) or len(planet_ids) != len(planets):
        raise ValueError("Living Codex universe contains invalid or duplicate system/planet IDs")
    if any(not isinstance(item, dict) or item.get("starSystemId") not in system_ids for item in planets):
        raise ValueError("Living Codex planet has no valid system owner")
    if any(not isinstance(item, dict) or item.get("planetId") not in planet_ids for item in satellites):
        raise ValueError("Living Codex satellite has no valid planet owner")
    serialized = json.dumps(universe, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if len(serialized) > MAX_UNIVERSE_BYTES:
        raise ValueError("Living Codex universe exceeds the 50 MB storage limit")
    return serialized


def _envelope(universe: dict[str, Any], saved_at: str | None = None) -> dict[str, Any]:
    serialized = _serialized_universe(universe)
    return {
        "savedAt": saved_at or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "revision": hashlib.sha256(serialized).hexdigest(),
        "universe": universe,
    }


def _write_atomic(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        json.dump(value, handle, ensure_ascii=False, separators=(",", ":"))
        handle.flush()
        os.fsync(handle.fileno())
        temporary = Path(handle.name)
    temporary.replace(path)


def _read(path: Path) -> dict[str, Any] | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(value, dict) or not isinstance(value.get("universe"), dict):
            return None
        expected = _envelope(value["universe"], value.get("savedAt"))
        return expected if value.get("revision") == expected["revision"] else None
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError):
        return None


def _backup_paths(root: Path) -> list[Path]:
    return sorted((root / "backups").glob("backup-*.json"))


def _archive(root: Path, value: dict[str, Any], suffix: str = "") -> None:
    timestamp = str(value["savedAt"]).replace("-", "").replace(":", "").replace(".", "")
    name = f"backup-{timestamp}-{value['revision'][:12]}{suffix}.json"
    path = root / "backups" / name
    if _read(path) is None:
        _write_atomic(path, value)


def _ensure_backups(root: Path, current: dict[str, Any]) -> None:
    valid = [path for path in _backup_paths(root) if _read(path)]
    for index in range(len(valid), MIN_BACKUPS):
        _archive(root, current, f"-seed{index:02d}")
    valid = [path for path in _backup_paths(root) if _read(path)]
    for path in valid[: max(0, len(valid) - MIN_BACKUPS)]:
        path.unlink(missing_ok=True)


def load_universe() -> dict[str, Any]:
    with _lock:
        root = _root()
        current_path = root / "current.json"
        current = _read(current_path)
        recovered = False
        if current is None:
            for path in reversed(_backup_paths(root)):
                current = _read(path)
                if current:
                    break
            if current:
                if current_path.exists():
                    current_path.replace(root / f"current.corrupt-{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}.json")
                _write_atomic(current_path, current)
                recovered = True
        if current:
            _ensure_backups(root, current)
        backups = []
        for path in reversed(_backup_paths(root)):
            value = _read(path)
            if value:
                universe = value["universe"]
                backups.append({"id": path.name, "savedAt": value["savedAt"], "revision": value["revision"], "systemCount": len(universe["starSystems"]), "planetCount": len(universe["planets"]), "satelliteCount": len(universe["satellites"])})
        return {"current": current, "backups": backups, "minimumBackups": MIN_BACKUPS, "recovered": recovered}


def save_universe(universe: dict[str, Any], base_revision: str | None, force: bool = False) -> dict[str, Any]:
    incoming = _envelope(universe)
    with _lock:
        root = _root()
        current_path = root / "current.json"
        current = _read(current_path)
        if current and current["revision"] == incoming["revision"]:
            _ensure_backups(root, current)
            return current
        if current and not force and base_revision != current["revision"]:
            raise UniverseConflictError("Living Codex was updated by another dashboard")
        if current:
            _archive(root, current)
        _write_atomic(current_path, incoming)
        _ensure_backups(root, incoming)
        return incoming


def restore_backup(backup_id: str) -> dict[str, Any]:
    if Path(backup_id).name != backup_id or not backup_id.startswith("backup-"):
        raise ValueError("Invalid Living Codex backup ID")
    with _lock:
        root = _root()
        selected = _read(root / "backups" / backup_id)
        if selected is None:
            raise FileNotFoundError("Living Codex backup was not found or is corrupt")
        current = _read(root / "current.json")
        if current:
            _archive(root, current)
        restored = _envelope(selected["universe"])
        _write_atomic(root / "current.json", restored)
        _ensure_backups(root, restored)
        return restored

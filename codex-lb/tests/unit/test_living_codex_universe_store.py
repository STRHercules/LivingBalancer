from __future__ import annotations

import json

from app.modules.local_usage import universe_store


def _universe(satellites: int) -> dict:
    return {
        "version": 4,
        "universe": {},
        "starSystems": [{"id": "system_core"}],
        "planets": [{"id": "planet_core", "starSystemId": "system_core"}],
        "satellites": [{"id": f"sat_{index}", "planetId": "planet_core"} for index in range(satellites)],
    }


def test_universe_is_atomic_recoverable_and_always_has_ten_backups(monkeypatch, tmp_path):
    monkeypatch.setattr(universe_store, "_root", lambda: tmp_path)

    current = universe_store.save_universe(_universe(1), None)
    assert len(universe_store.load_universe()["backups"]) == 10

    for count in range(2, 14):
        current = universe_store.save_universe(_universe(count), current["revision"])
    result = universe_store.load_universe()
    assert len(result["backups"]) == 10
    assert result["current"]["universe"]["satellites"][-1]["id"] == "sat_12"

    restored = universe_store.restore_backup(result["backups"][-1]["id"])
    assert restored["revision"] != current["revision"]
    assert len(universe_store.load_universe()["backups"]) == 10

    (tmp_path / "current.json").write_text("{broken", encoding="utf-8")
    recovered = universe_store.load_universe()
    assert recovered["recovered"] is True
    assert len(recovered["backups"]) == 10
    assert json.loads((tmp_path / "current.json").read_text(encoding="utf-8"))["revision"] == recovered["current"]["revision"]

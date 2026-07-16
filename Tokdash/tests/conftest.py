from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def isolated_usage_db(monkeypatch, tmp_path):
    """Keep the default-on persistent usage DB isolated per test.

    The runtime default is intentionally controlled by application code, but
    tests must not share ~/.tokdash/usage.sqlite3 or one test's cached rows can
    leak into another source fixture.
    """
    data_dir = tmp_path / ".tokdash-test"
    monkeypatch.setenv("TOKDASH_DATA_DIR", str(data_dir))
    monkeypatch.setenv("TOKDASH_USAGE_DB_PATH", str(data_dir / "usage.sqlite3"))

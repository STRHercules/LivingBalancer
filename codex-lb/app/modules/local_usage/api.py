from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from app.core.auth.dependencies import set_dashboard_error_format, validate_dashboard_session

router = APIRouter(
    prefix="/api/local-usage",
    tags=["dashboard"],
    dependencies=[Depends(validate_dashboard_session), Depends(set_dashboard_error_format)],
)


class QuotaConsent(BaseModel):
    codex_api: bool = False
    claude_api: bool = False
    antigravity_api: bool = False


class QuotaSettings(BaseModel):
    enabled: bool = True
    poll_interval_minutes: int = 30


def start_quota_polling() -> None:
    try:
        from tokdash.cli import _start_quota_poll_daemon

        _start_quota_poll_daemon()
    except ModuleNotFoundError:
        pass


@router.get("/activity")
async def activity(limit: int = Query(default=16, ge=1, le=50)) -> dict[str, Any]:
    try:
        from app.modules.local_usage.activity import recent_activity

        return await run_in_threadpool(recent_activity, limit)
    except Exception as exc:
        raise _collector_error(exc) from exc


def _collector_error(exc: Exception) -> HTTPException:
    if isinstance(exc, ModuleNotFoundError):
        return HTTPException(status_code=503, detail="Local usage collector is not installed")
    if isinstance(exc, (ValueError, FileNotFoundError)):
        return HTTPException(status_code=400, detail=str(exc))
    return HTTPException(status_code=500, detail=str(exc))


@router.get("/usage")
async def usage(
    period: str = "today",
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict[str, Any]:
    try:
        from tokdash.compute import compute_usage_with_comparison

        return await run_in_threadpool(compute_usage_with_comparison, period, date_from, date_to)
    except Exception as exc:
        raise _collector_error(exc) from exc


@router.get("/tools")
async def tools(period: str = "today") -> dict[str, Any]:
    try:
        from tokdash.compute import get_tools_data

        return await run_in_threadpool(get_tools_data, period)
    except Exception as exc:
        raise _collector_error(exc) from exc


@router.get("/openclaw")
async def openclaw(period: str = "today") -> dict[str, Any]:
    try:
        from tokdash.compute import get_openclaw_data

        return await run_in_threadpool(get_openclaw_data, period)
    except Exception as exc:
        raise _collector_error(exc) from exc


@router.get("/sessions")
async def sessions(
    tool: str = "codex",
    period: str = "today",
    date_from: str | None = None,
    date_to: str | None = None,
    include_review_sessions: bool | None = None,
) -> dict[str, Any]:
    try:
        from tokdash.sessions import get_sessions_data

        return await run_in_threadpool(
            get_sessions_data,
            tool,
            period,
            date_from,
            date_to,
            include_review_sessions=include_review_sessions,
        )
    except Exception as exc:
        raise _collector_error(exc) from exc


@router.get("/session")
async def session(tool: str, session_id: str) -> dict[str, Any]:
    try:
        from tokdash.sessions import get_session_detail

        return await run_in_threadpool(get_session_detail, tool, session_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise _collector_error(exc) from exc


@router.get("/stats")
async def stats(year: int | None = Query(default=None, ge=2000, le=2200)) -> dict[str, Any]:
    try:
        from tokdash.compute import compute_stats

        return await run_in_threadpool(compute_stats, year)
    except Exception as exc:
        raise _collector_error(exc) from exc


@router.get("/quota")
async def quota() -> dict[str, Any]:
    try:
        from tokdash.sources.quota import quota_state

        return await run_in_threadpool(quota_state)
    except Exception as exc:
        raise _collector_error(exc) from exc


@router.get("/quota/history")
async def quota_history(
    providers: str | None = None,
    granularity: str = "hour",
    start: int | None = None,
    end: int | None = None,
    max_points: int = Query(default=300, ge=1, le=2000),
) -> dict[str, Any]:
    try:
        from tokdash.usage_store import UsageEntryStore

        provider_list = [provider.strip() for provider in (providers or "").split(",") if provider.strip()]
        store = UsageEntryStore()
        return await run_in_threadpool(
            store.quota_history,
            providers=provider_list or None,
            granularity=granularity,
            start=start,
            end=end,
            max_points=max_points,
        )
    except Exception as exc:
        raise _collector_error(exc) from exc


@router.post("/quota/consent")
async def quota_consent(payload: QuotaConsent) -> dict[str, Any]:
    try:
        from tokdash.sources.quota.config import set_quota_consent

        return {"consent": await run_in_threadpool(set_quota_consent, payload.model_dump())}
    except Exception as exc:
        raise _collector_error(exc) from exc


@router.post("/quota/settings")
async def quota_settings(payload: QuotaSettings) -> dict[str, Any]:
    if payload.poll_interval_minutes not in {15, 30, 60, 120}:
        raise HTTPException(status_code=400, detail="poll_interval_minutes must be 15, 30, 60, or 120")
    try:
        from tokdash.sources.quota import config

        await run_in_threadpool(config.set_quota_enabled, payload.enabled)
        await run_in_threadpool(config.set_poll_interval_minutes, payload.poll_interval_minutes)
        return {"enabled": config.quota_tracking_enabled(), "poll_interval_minutes": payload.poll_interval_minutes}
    except Exception as exc:
        raise _collector_error(exc) from exc


@router.post("/quota/refresh")
async def quota_refresh() -> dict[str, Any]:
    try:
        from tokdash.sources.quota import poll_quota

        return await run_in_threadpool(poll_quota, include_network=True)
    except Exception as exc:
        raise _collector_error(exc) from exc

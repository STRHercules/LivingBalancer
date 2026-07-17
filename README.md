# LivingBalancer


## Video Demo

https://github.com/user-attachments/assets/99bc8953-72a9-458c-87fd-ef45df25d400

--- 

LivingBalancer is a local-first extension of [CodexLB](./codex-lb/README.md) that keeps its account, request, API, report, settings, and automation controls while adding two integrated views of local Codex work:

- **Living Codex** — an interactive cosmic visualization of projects, chats, integrations, automations, and observed local activity, embedded in the normal Dashboard.
- **Local usage** — [TokDash](./Tokdash/README.md) collection and calculation capabilities surfaced inside CodexLB, rather than through a separate TokDash server or UI.

The application binds only to `127.0.0.1` in the provided compose stack. It is for local use; do not expose these ports with a tunnel or reverse proxy while dashboard authentication is disabled.

## What is custom here

### Living Codex dashboard

The standard CodexLB Dashboard retains its existing account and request-management experience. Beneath it, Living Codex turns observable local work into a persistent, navigable universe:

- Each observed workspace becomes a project star system. Inactive projects begin as nebulae; qualifying activity forms a star and planets.
- Local Codex sessions and activity become orbiting satellites, animated task signals, and a live activity feed. The visualization uses metadata and telemetry, not prompt or response content.
- Active, archived, and deleted Codex chats are represented separately. Archived chats become asteroid-belt history; deleted-chat metadata is retained only as a visualization tombstone, not a recoverable conversation.
- Installed plugins and MCP servers appear as infrastructure stations, with healthy/degraded/configured state.
- Recurring Codex automations appear as pulsars, including their schedule and status.
- The universe supports project/system and planet focus, pan/zoom navigation, a universe overview, expanded globe mode, deterministic layout, local persistence, automatic backups, and migration of saved visual state.
- Project removal collapses a system into a black-hole state while retaining its visual history; returning project metadata restores its system identity.
- As activity grows, the universe can form new planets and redistribute visual satellites. These animations are presentation-only and never control Codex work.

### Codex observer

[`scripts/living-codex-observer.mjs`](./scripts/living-codex-observer.mjs) is a small localhost-only bridge between the Living Codex UI and the Codex app-server. It exposes `http://127.0.0.1:2460/snapshot`; the frontend proxies that endpoint as `/api/codex-observer/snapshot`.

It observes only the metadata needed to draw the universe:

- registered project IDs, paths, and labels
- active and archived thread IDs, titles, paths, and timestamps
- installed plugins and MCP status
- recurring automation IDs, names, schedules, status, and project association

It does **not** retain prompts, responses, tool payloads, credentials, or workspace file contents. Deleted-thread visualization tombstones and project snapshots are stored under `CODEX_HOME` so the local visual history can survive restarts.

The observer refreshes its snapshot every three seconds and reconnects to Codex if its app-server process restarts. It is separate from the Docker stack, so start it once after every Windows restart:

```powershell
& .\scripts\start-living-codex-observer.ps1
```

The launcher first checks the local observer endpoint and exits without creating a second process when one is already running. It uses `node` from `PATH`, `CODEX_NODE`, or Codex's bundled runtime.

### TokDash inside CodexLB

TokDash is vendored as a read-only Python source dependency in the server container. Its collectors and calculations power CodexLB's **Local usage** page and `/api/local-usage` endpoints; its dashboard, themes, PWA shell, and standalone server are deliberately not run.

Local usage provides:

- combined token, cache, cost, message, and estimated-energy totals
- per-coding-tool and per-model breakdowns
- Codex, Claude Code, OpenCode, Pi, and Mimo session exploration, including per-turn detail
- activity heatmap and yearly statistics
- local activity used by the Living Codex feed
- opt-in provider quota snapshots, history, refresh, and polling settings

CodexLB coalesces local collector reads and caches short-lived snapshots so multiple open dashboard views do not repeatedly scan the same local history.

## Run locally

Prerequisites:

- Docker Desktop with Compose
- Codex installed and running when you want Living Codex metadata
- Node.js available through `PATH`, `CODEX_NODE`, or the Codex bundled runtime (only for the observer)

Start the observer, then the combined stack:

```powershell
& .\scripts\start-living-codex-observer.ps1
docker compose -f docker-compose.living.yml up --build
```

Open:

| Service | Address | Purpose |
| --- | --- | --- |
| Living Codex / CodexLB UI | <http://localhost:5173/dashboard> | Original dashboard plus the Living Codex universe |
| Local usage | <http://localhost:5173/local-usage> | TokDash-powered local usage and quotas |
| CodexLB API/dashboard service | <http://localhost:2455> | Backend API and production dashboard service |
| OAuth callback | <http://localhost:1455/auth/callback> | CodexLB OAuth callback |
| Observer snapshot | <http://127.0.0.1:2460/snapshot> | Local metadata bridge; normally reached through the UI proxy |

The compose configuration mounts local coding-tool history read-only into the server and persists CodexLB/TokDash-derived data in the `living-codex-lb-data` Docker volume. The server and frontend restart automatically unless stopped manually.

## Dashboard map

- **Dashboard** — original CodexLB account/request controls plus the Living Codex universe and live Codex activity panel.
- **Local usage** — the integrated TokDash view.
- **Reports, Accounts, APIs, Settings, Automations** — CodexLB's existing product surfaces, unchanged in purpose.

If the Living Codex globe says it is standing by, first open Codex and start the observer. The rest of CodexLB and Local usage can still run without the observer; only the app-server-derived universe metadata will be unavailable.

## Architecture at a glance

```text
Codex app-server ── observer (127.0.0.1:2460) ──> Living Codex Dashboard
Local coding histories ── TokDash collectors ──> CodexLB /api/local-usage ──> Local usage + Living Codex telemetry
CodexLB backend + frontend ── Docker Compose ──> localhost:2455 / localhost:5173
```

## Upstream documentation

This repository contains customized working copies. Consult the upstream project documentation for the complete original setup, configuration, API, security, and contribution guidance:

- [CodexLB README](./codex-lb/README.md)
- [TokDash README](./Tokdash/README.md)

LivingBalancer-specific design notes are kept in [`docs/`](./docs/), including the universe, star-system, and expansion contracts.

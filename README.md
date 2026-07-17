# LivingBalancer

CodexLB with the existing dashboard and controls intact, plus the living Codex dashboard from `indexv2.html` and TokDash telemetry.

```powershell
& .\scripts\start-living-codex-observer.ps1
docker compose -f docker-compose.living.yml up --build
```

The local observer connects to Codex app-server and supplies project IDs, archived-thread metadata, installed plugins, MCP status, and recurring automation metadata to Living Codex. It retains no prompt, response, tool-payload, credential, or file content. Run the observer launcher again after a Windows restart; it exits immediately when the observer is already running.

- Living dashboard: <http://localhost:5173/dashboard>
- Local usage: <http://localhost:5173/local-usage>
- CodexLivingBalancer API/production dashboard: <http://localhost:2455>
- Codex OAuth callback: <http://localhost:1455/auth/callback>

TokDash's collectors run inside CodexLB; there is no TokDash server or second dashboard. CodexLB exposes the merged token/cache/cost totals, coding-tool and model breakdowns, session explorer, contribution calendar, energy estimate, and provider quota views under `/local-usage`. The same data remains available to local statusline/report integrations under `/api/local-usage`.

Only TokDash's collection and calculation capabilities are reused. Its dashboard, themes, styles, and PWA shell are not included.

This test stack binds only to `127.0.0.1` and disables the dashboard password. Do not expose these ports through a tunnel or reverse proxy.

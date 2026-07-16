# LivingBalancer

CodexLB with the existing dashboard and controls intact, plus the living Codex dashboard from `indexv2.html` and TokDash telemetry.

```powershell
docker compose -f docker-compose.living.yml up --build
```

- Living dashboard: <http://localhost:5173/dashboard>
- Local usage: <http://localhost:5173/local-usage>
- CodexLivingBalancer API/production dashboard: <http://localhost:2455>
- Codex OAuth callback: <http://localhost:1455/auth/callback>

TokDash's collectors run inside CodexLB; there is no TokDash server or second dashboard. CodexLB exposes the merged token/cache/cost totals, coding-tool and model breakdowns, session explorer, contribution calendar, energy estimate, and provider quota views under `/local-usage`. The same data remains available to local statusline/report integrations under `/api/local-usage`.

Only TokDash's collection and calculation capabilities are reused. Its dashboard, themes, styles, and PWA shell are not included.

This test stack binds only to `127.0.0.1` and disables the dashboard password. Do not expose these ports through a tunnel or reverse proxy.

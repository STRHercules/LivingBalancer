import { useMemo, useState } from "react";
import { Activity, CalendarDays, Coins, Database, MessageSquare, Zap } from "lucide-react";

import { AlertMessage } from "@/components/alert-message";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LOCAL_TOOLS, type LocalTool } from "../api";
import { useLocalQuota, useLocalSession, useLocalSessions, useLocalStats, useLocalUsage } from "../hooks/use-local-usage";

const number = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const currency = new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const TOOL_LABELS: Record<LocalTool, string> = { codex: "Codex", claude: "Claude Code", opencode: "OpenCode", pi_agent: "Pi", mimo: "Mimo" };

const formatDate = (value: string | null | undefined) => value ? new Date(value).toLocaleString() : "—";
const energyWh = (models: Array<{ tokens_in: number; tokens_cache: number; tokens_out: number }>) => models.reduce((total, model) => total + model.tokens_in + model.tokens_cache * 0.1 + model.tokens_out * 3, 0) / 3_600;

export function LocalUsagePage() {
  const [period, setPeriod] = useState("today");
  const [tool, setTool] = useState<LocalTool>("codex");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const year = new Date().getFullYear();
  const usageQuery = useLocalUsage(period);
  const sessionsQuery = useLocalSessions(tool, period);
  const sessionQuery = useLocalSession(tool, selectedSessionId);
  const statsQuery = useLocalStats(year);
  const quotaQuery = useLocalQuota();
  const usage = usageQuery.data;
  const sessions = sessionsQuery.data;
  const stats = statsQuery.data;
  const quota = quotaQuery.data;
  const allModels = useMemo(() => Object.values(usage?.coding_apps ?? {}).flatMap((app) => app.models), [usage]);
  const models = usage?.combined_models.length ? usage.combined_models : allModels;
  const activityDays = useMemo(() => {
    const contributions = new Map((stats?.contributions ?? []).map((day) => [day.date, day]));
    const days = [];
    for (let date = new Date(year, 0, 1); date < new Date(year + 1, 0, 1); date.setDate(date.getDate() + 1)) {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      days.push(contributions.get(key) ?? { date: key, intensity: 0, totals: { tokens: 0 } });
    }
    return days;
  }, [stats, year]);
  const totalCache = Object.values(usage?.coding_apps ?? {}).reduce((sum, app) => sum + app.tokens_cache, 0);
  const cacheRatio = usage?.total_tokens ? totalCache / usage.total_tokens * 100 : 0;
  const hasError = [usageQuery.error, sessionsQuery.error, statsQuery.error, quotaQuery.error].some(Boolean);
  const summary = [
    { label: "Tokens", value: number.format(usage?.total_tokens ?? 0), detail: `${number.format(totalCache)} cached`, icon: Zap },
    { label: "Cost", value: currency.format(usage?.total_cost ?? 0), detail: comparison(usage?.comparison?.cost_pct), icon: Coins },
    { label: "Messages", value: number.format(usage?.total_messages ?? 0), detail: comparison(usage?.comparison?.messages_pct), icon: MessageSquare },
    { label: "Cache hit rate", value: `${cacheRatio.toFixed(1)}%`, detail: `${Object.keys(usage?.coding_apps ?? {}).length} tools indexed`, icon: Database },
    { label: "Estimated energy", value: `${energyWh(allModels).toFixed(1)} Wh`, detail: "relative estimate", icon: Activity },
  ];

  return (
    <div className="animate-fade-in-up space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold tracking-tight">Local usage</h1><p className="mt-1 text-sm text-muted-foreground">Coding sessions, token composition, quotas, and activity history collected by CodexLB.</p></div>
        <select aria-label="Usage period" value={period} onChange={(event) => { setPeriod(event.target.value); setSelectedSessionId(null); }} className="h-8 rounded-md border bg-background px-3 text-xs text-foreground">
          <option value="today">Today</option><option value="7">7 days</option><option value="30">30 days</option><option value="year">This year</option><option value="all">All time</option>
        </select>
      </div>

      {hasError ? <AlertMessage variant="error">Some local usage sources could not be read. Available sources are still shown.</AlertMessage> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summary.map(({ label, value, detail, icon: Icon }) => <div key={label} className="rounded-lg border bg-card p-4"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span><Icon className="h-4 w-4" /></div><div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div><div className="mt-1 text-xs text-muted-foreground">{detail}</div></div>)}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3"><h2 className="text-sm font-medium">Usage by coding tool</h2></div>
          <Table><TableHeader><TableRow><TableHead>Tool</TableHead><TableHead className="text-right">Input</TableHead><TableHead className="text-right">Cache</TableHead><TableHead className="text-right">Output</TableHead><TableHead className="text-right">Messages</TableHead><TableHead className="text-right">Cost</TableHead></TableRow></TableHeader><TableBody>
            {Object.entries(usage?.coding_apps ?? {}).map(([name, app]) => <TableRow key={name}><TableCell className="font-medium">{name}</TableCell><TableCell className="text-right">{number.format(app.tokens_in)}</TableCell><TableCell className="text-right">{number.format(app.tokens_cache)}</TableCell><TableCell className="text-right">{number.format(app.tokens_out)}</TableCell><TableCell className="text-right">{number.format(app.messages)}</TableCell><TableCell className="text-right">{currency.format(app.cost)}</TableCell></TableRow>)}
            {!Object.keys(usage?.coding_apps ?? {}).length ? <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No local tool usage in this period.</TableCell></TableRow> : null}
          </TableBody></Table>
        </section>
        <section className="rounded-lg border bg-card"><div className="border-b px-4 py-3"><h2 className="text-sm font-medium">Models</h2></div><div className="divide-y">
          {models.slice(0, 8).map((model) => <div key={model.name} className="flex items-center justify-between gap-4 px-4 py-3 text-sm"><span className="min-w-0 truncate font-medium">{model.name}</span><span className="shrink-0 text-muted-foreground">{number.format(model.tokens)} · {currency.format(model.cost)}</span></div>)}
          {!allModels.length ? <p className="p-6 text-center text-sm text-muted-foreground">No model data in this period.</p> : null}
        </div></section>
      </div>

      <section className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"><h2 className="text-sm font-medium">Sessions</h2><div className="flex flex-wrap gap-1">{LOCAL_TOOLS.map((item) => <Button key={item} type="button" size="sm" variant={tool === item ? "secondary" : "ghost"} className="h-7 text-xs" onClick={() => { setTool(item); setSelectedSessionId(null); }}>{TOOL_LABELS[item]}</Button>)}</div></div>
        <Table><TableHeader><TableRow><TableHead>Session</TableHead><TableHead>Model</TableHead><TableHead className="text-right">Input</TableHead><TableHead className="text-right">Cache</TableHead><TableHead className="text-right">Output</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Last updated</TableHead></TableRow></TableHeader><TableBody>
          {(sessions?.sessions ?? []).slice(0, 30).map((session) => <TableRow key={session.session_id} data-state={selectedSessionId === session.session_id ? "selected" : undefined}><TableCell><button type="button" className="max-w-72 truncate text-left font-medium hover:underline" onClick={() => setSelectedSessionId(session.session_id)}>{session.display_name || session.project || session.session_id.slice(0, 8)}</button></TableCell><TableCell>{session.model}</TableCell><TableCell className="text-right">{number.format(session.tokens_in)}</TableCell><TableCell className="text-right">{number.format(session.tokens_cache)}</TableCell><TableCell className="text-right">{number.format(session.tokens_out)}</TableCell><TableCell className="text-right">{number.format(session.tokens)}</TableCell><TableCell className="text-right">{currency.format(session.cost)}</TableCell><TableCell className="text-right text-muted-foreground">{formatDate(session.last_seen_at)}</TableCell></TableRow>)}
          {!sessions?.sessions.length ? <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No {TOOL_LABELS[tool]} sessions in this period.</TableCell></TableRow> : null}
        </TableBody></Table>
        {sessionQuery.data ? <div className="border-t bg-muted/20 p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-medium">Turn breakdown · {sessionQuery.data.session.display_name || sessionQuery.data.session.project}</h3><Button size="sm" variant="ghost" onClick={() => setSelectedSessionId(null)}>Close</Button></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{sessionQuery.data.turns.map((turn) => <div key={turn.turn_index} className="rounded-md border bg-background p-3 text-xs"><div className="flex justify-between"><strong>Turn {turn.turn_index}</strong><span className="text-muted-foreground">{currency.format(turn.cost)}</span></div><div className="mt-2 text-muted-foreground">{number.format(turn.tokens)} tokens · {number.format(turn.tokens_cache)} cached</div></div>)}</div></div> : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_.6fr]">
        <section className="rounded-lg border bg-card p-4"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-medium">{year} activity</h2><span className="text-xs text-muted-foreground">{stats?.summary.activeDays ?? 0} active days</span></div><div className="grid auto-cols-[12px] grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-2" aria-label={`${year} token activity heatmap`}>{activityDays.map((day) => <div key={day.date} title={`${day.date}: ${number.format(day.totals.tokens)} tokens`} className="h-3 w-3 rounded-[2px] bg-primary" style={{ opacity: day.intensity ? 0.2 + Math.min(day.intensity, 4) * 0.2 : 0.08 }} />)}</div><div className="mt-4 flex flex-wrap gap-6 text-xs text-muted-foreground"><span>Top model <strong className="text-foreground">{stats?.stats.favorite_model ?? "—"}</strong></span><span>Tokens <strong className="text-foreground">{number.format(stats?.summary.totalTokens ?? 0)}</strong></span><span>Cost <strong className="text-foreground">{currency.format(stats?.summary.totalCost ?? 0)}</strong></span></div></section>
        <section className="rounded-lg border bg-card"><div className="flex items-center gap-2 border-b px-4 py-3"><CalendarDays className="h-4 w-4 text-muted-foreground"/><h2 className="text-sm font-medium">Provider quotas</h2></div><div className="divide-y">{Object.entries(quota?.providers ?? {}).flatMap(([provider, data]) => data.buckets.map((bucket) => <div key={`${provider}-${bucket.bucket}`} className="p-4"><div className="flex justify-between text-sm"><span className="font-medium">{provider} · {bucket.bucket_label}</span><span>{bucket.used_percent.toFixed(0)}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(100, bucket.used_percent)}%` }} /></div><div className="mt-2 text-xs text-muted-foreground">Resets {bucket.resets_at ? new Date(bucket.resets_at * 1000).toLocaleString() : "—"}</div></div>))}{!Object.keys(quota?.providers ?? {}).length ? <p className="p-6 text-center text-sm text-muted-foreground">No provider quota snapshots yet.</p> : null}</div></section>
      </div>
    </div>
  );
}

function comparison(value: number | null | undefined) {
  return value == null ? "No previous-period comparison" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}% vs previous period`;
}

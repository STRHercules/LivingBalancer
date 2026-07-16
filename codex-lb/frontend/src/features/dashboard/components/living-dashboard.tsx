import { Activity, CircleDollarSign, Gauge, Zap } from "lucide-react";

import { CodexGlobe } from "./codex-globe";
import type { DashboardOverview, RequestLog } from "../schemas";
import { useLocalActivity, useLocalSessions, useLocalUsage } from "@/features/local-usage/hooks/use-local-usage";
import "./living-dashboard.css";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const money = new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

function value(value: number | null | undefined) {
  return value == null ? "—" : compact.format(value);
}

export function LivingDashboard({ overview, requests }: { overview: DashboardOverview; requests: RequestLog[] }) {
  const localUsage = useLocalUsage("today").data;
  const activity = useLocalActivity().data;
  const localSessions = useLocalSessions("codex", "today").data;
  const latest = requests[0];
  const session = localSessions?.latest_session;
  const usage = localUsage;
  const codex = usage?.apps.codex;
  const recentTokens = requests.reduce((sum, request) => sum + (request.tokens ?? 0), 0);
  const input = codex?.tokens_in ?? requests.reduce((sum, request) => sum + (request.inputTokens ?? 0), 0);
  const output = codex?.tokens_out ?? requests.reduce((sum, request) => sum + (request.outputTokens ?? 0), 0);
  const cached = codex?.tokens_cache ?? requests.reduce((sum, request) => sum + (request.cachedInputTokens ?? 0), 0);
  const successCount = requests.filter((request) => ["success", "completed"].includes(request.status)).length;
  const successRate = requests.length ? `${Math.round(successCount / requests.length * 100)}%` : "—";
  const latestEvent = activity?.events.at(-1);

  const signals = [
    ["MODEL", session?.model || latest?.model || "Waiting for traffic", latest?.reasoningEffort || "default"],
    ["WORKFLOW", activity?.state || latest?.status || "idle", latestEvent?.kind || latest?.source || "Codex LB"],
    ["CONTEXT", session?.project || latest?.apiKeyName || "local session", session ? "local history" : "request stream"],
    ["TOKENS", value(session?.tokens || latest?.tokens), `${value(cached)} cached`],
    ["ACTIVITY", latestEvent?.label || "Standing by", latestEvent?.timestamp ? new Date(latestEvent.timestamp).toLocaleTimeString() : "live session"],
    ["QUEUE", latest?.latencyQueueMs == null ? "—" : `${latest.latencyQueueMs.toFixed(0)} ms`, `${requests.length} sampled`],
  ];

  return (
    <section className="living-dashboard" aria-label="Living Codex dashboard">
      <aside className="living-panel living-accounts">
        <div className="living-panel-title">Accounts <span>{overview.accounts.length}</span></div>
        <div className="living-account-list">
          {overview.accounts.slice(0, 5).map((account) => {
            const remaining = account.usage?.primaryRemainingPercent ?? 0;
            return (
              <div className="living-account" key={account.accountId}>
                <div><strong>{account.displayName || account.email || account.accountId}</strong><span>{account.status}</span></div>
                <div className="living-meter"><i style={{ width: `${Math.max(0, Math.min(100, remaining))}%` }} /></div>
                <div className="living-account-meta"><span>{remaining.toFixed(0)}% remaining</span><span>{account.planType || "Codex"}</span></div>
              </div>
            );
          })}
        </div>
        <div className="living-account-summary">
          <span>Capacity remaining</span>
          <strong>{overview.summary.primaryWindow.remainingPercent.toFixed(1)}%</strong>
        </div>
      </aside>

      <div className="living-panel living-core">
        <div className="living-panel-title">Living Codex <span>{latest ? "request telemetry" : "standing by"}</span></div>
        <div className="living-globe-scene">
          <CodexGlobe activity={recentTokens} eventId={latestEvent?.id} activityKind={latestEvent?.kind} eventLabel={latestEvent?.label} model={signals[0][1]} context={signals[2][1]} />
        </div>
      </div>

      <aside className="living-right">
        <div className="living-panel living-overall">
          <div className="living-panel-title">Overall stats</div>
          <div className="living-stat-grid">
            <div><Gauge /><span>Latency</span><strong>{latest?.latencyMs == null ? "—" : `${latest.latencyMs.toFixed(0)} ms`}</strong></div>
            <div><Zap /><span>Tokens</span><strong>{value(usage?.total_tokens ?? overview.summary.metrics?.tokens)}</strong></div>
            <div><Activity /><span>Success</span><strong>{successRate}</strong></div>
            <div><CircleDollarSign /><span>Cost today</span><strong>{money.format(usage?.total_cost ?? overview.summary.cost.totalUsd)}</strong></div>
          </div>
        </div>
        <div className="living-panel living-tokdash">
          <div className="living-panel-title">Local session usage <span>{usage ? "indexed" : "unavailable"}</span></div>
          <div className="living-token-row"><span>Input</span><strong>{value(input)}</strong></div>
          <div className="living-token-row"><span>Output</span><strong>{value(output)}</strong></div>
          <div className="living-token-row"><span>Cache</span><strong>{value(cached)}</strong></div>
          <div className="living-token-row"><span>Messages</span><strong>{value(usage?.total_messages ?? codex?.messages)}</strong></div>
          <div className="living-token-row"><span>Models</span><strong>{value(codex?.models.length)}</strong></div>
          <div className="living-token-row"><span>Cache ratio</span><strong>{codex?.tokens ? `${(codex.tokens_cache / codex.tokens * 100).toFixed(1)}%` : "—"}</strong></div>
        </div>
      </aside>

      <div className="living-panel living-feed">
        <div className="living-panel-title">Live Codex activity <span>{activity?.events.length ?? 0} events</span></div>
        <div className="living-feed-rows">
          {[...(activity?.events ?? [])].reverse().slice(0, 6).map((event) => (
            <div key={event.id} data-kind={event.kind}>
              <time>{event.timestamp ? new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "now"}</time>
              <span>{event.label}</span>
              <em>{event.kind}</em>
              <strong>{activity?.state === event.kind ? "active" : "observed"}</strong>
            </div>
          ))}
          {!activity?.events.length ? requests.slice(0, 6).map((request) => (
            <div key={request.requestId}>
              <time>{new Date(request.requestedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
              <span>{request.model}{request.reasoningEffort ? ` · ${request.reasoningEffort}` : ""}</span>
              <em>{request.source || request.transport || "request"}</em>
              <strong>{request.status}</strong>
            </div>
          )) : null}
          {!activity?.events.length && !requests.length ? <p>No observable Codex activity yet.</p> : null}
        </div>
      </div>

    </section>
  );
}

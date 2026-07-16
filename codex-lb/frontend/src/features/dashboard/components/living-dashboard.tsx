import { useEffect, useState, type CSSProperties } from "react";
import { Activity, ChevronDown, ChevronUp, CircleDollarSign, Maximize2, Minimize2, Gauge, Zap } from "lucide-react";

import { CodexGlobe, type SatelliteSummary } from "./codex-globe";
import type { DashboardOverview, RequestLog } from "../schemas";
import { formatRequestSuccessRate } from "../utils";
import { useLocalActivity, useLocalSessions, useLocalUsage } from "@/features/local-usage/hooks/use-local-usage";
import "./living-dashboard.css";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const money = new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

function value(value: number | null | undefined) {
  return value == null ? "—" : compact.format(value);
}

export function LivingDashboard({ overview, requests }: { overview: DashboardOverview; requests: RequestLog[] }) {
  const [satellites, setSatellites] = useState<SatelliteSummary[]>([]);
  const [activityOpen, setActivityOpen] = useState(true);
  const [globeExpanded, setGlobeExpanded] = useState(false);
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
  const successRate = formatRequestSuccessRate(requests);
  const latestEvent = activity?.events.at(-1);

  useEffect(() => {
    if (!globeExpanded) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setGlobeExpanded(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [globeExpanded]);

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
      <aside className="living-panel living-satellites">
        <div className="living-panel-title">Satellites <span>{satellites.length}</span></div>
        <div className="living-satellite-list">
          {satellites.map((satellite) => (
            <div className="living-satellite" key={satellite.id} style={{ "--satellite-color": satellite.color } as CSSProperties}>
              <strong>{satellite.label}</strong>
              <span>{satellite.type}</span>
            </div>
          ))}
          {!satellites.length ? <p>Satellites will appear as Codex completes tasks.</p> : null}
        </div>
      </aside>

      <div className={`living-panel living-core${globeExpanded ? " is-expanded" : ""}`}>
        <div className="living-panel-title">Living Codex <div className="living-panel-actions"><span>{latest ? "request telemetry" : "standing by"}</span><button type="button" aria-label={globeExpanded ? "Restore globe panel" : "Expand globe panel"} aria-pressed={globeExpanded} onClick={() => setGlobeExpanded((expanded) => !expanded)}>{globeExpanded ? <Minimize2 /> : <Maximize2 />}</button></div></div>
        <div className="living-globe-scene">
          <CodexGlobe activity={recentTokens} eventId={latestEvent?.id} activityKind={latestEvent?.kind} eventLabel={latestEvent?.label} model={signals[0][1]} context={signals[2][1]} onSatellitesChange={setSatellites} />
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
        <div className="living-panel-title">Live Codex activity <button type="button" aria-expanded={activityOpen} aria-controls="living-codex-activity" onClick={() => setActivityOpen((open) => !open)}><span>{activity?.events.length ?? 0} events</span>{activityOpen ? <ChevronUp /> : <ChevronDown />}</button></div>
        <div className="living-feed-rows" id="living-codex-activity" hidden={!activityOpen}>
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

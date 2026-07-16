import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";

import { CodexGlobe, type ChatActivitySignal, type SatelliteSummary } from "./codex-globe";
import { UNIVERSE_CONFIG, type UniverseSummary } from "../universe";
import type { DashboardOverview, RequestLog } from "../schemas";
import { useLocalActivity, useLocalSessions, useLocalUsage } from "@/features/local-usage/hooks/use-local-usage";
import "./living-dashboard.css";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
function value(value: number | null | undefined) {
  return value == null ? "—" : compact.format(value);
}

export function LivingDashboard({ requests }: { overview: DashboardOverview; requests: RequestLog[] }) {
  const [satellites, setSatellites] = useState<SatelliteSummary[]>([]);
  const [universe, setUniverse] = useState<UniverseSummary | null>(null);
  const [activityOpen, setActivityOpen] = useState(true);
  const [globeExpanded, setGlobeExpanded] = useState(false);
  const localUsage = useLocalUsage("today").data;
  const activity = useLocalActivity().data;
  const { data: localSessions, refetch: refetchLocalSessions } = useLocalSessions("codex", "today");
  const activitySessions = useMemo(() => activity?.sessions.length ? activity.sessions : activity?.session_id ? [{ session_id: activity.session_id, state: activity.state, events: activity.events }] : [], [activity]);
  const sessionsById = useMemo(() => new Map((localSessions?.sessions ?? []).map((item) => [item.session_id, item])), [localSessions?.sessions]);
  const latest = requests[0];
  const activeSession = activity?.session_id ? sessionsById.get(activity.session_id) : null;
  const session = activity?.session_id ? activeSession : localSessions?.latest_session;
  const usage = localUsage;
  const recentTokens = requests.reduce((sum, request) => sum + (request.tokens ?? 0), 0);
  const cached = usage?.apps.codex?.tokens_cache ?? requests.reduce((sum, request) => sum + (request.cachedInputTokens ?? 0), 0);
  const latestEvent = activity?.events.at(-1);
  const chatActivities: ChatActivitySignal[] = activitySessions.map((chat) => {
    const localSession = sessionsById.get(chat.session_id);
    const event = chat.events.at(-1);
    return { sessionId: chat.session_id, eventId: event?.id, activityKind: chat.state, eventLabel: event?.label, projectIdentity: localSession?.project_id ? { repositoryId: localSession.project_id, displayName: localSession.project } : null };
  });
  const activityEvents = activitySessions.flatMap((chat) => chat.events.map((event) => ({ ...event, sessionId: chat.session_id, sessionState: chat.state, project: sessionsById.get(chat.session_id)?.project }))).sort((a, b) => String(b.timestamp ?? "").localeCompare(String(a.timestamp ?? "")));
  const largestSystem = universe?.systems.reduce((largest, system) => system.satelliteCount > largest.satelliteCount ? system : largest, universe.systems[0]);
  const mostUsedModel = usage?.combined_models.reduce((mostUsed, model) => model.tokens > mostUsed.tokens ? model : mostUsed, usage.combined_models[0]);

  useEffect(() => {
    if (activitySessions.some(({ session_id }) => !sessionsById.has(session_id))) void refetchLocalSessions();
  }, [activitySessions, sessionsById, refetchLocalSessions]);

  useEffect(() => {
    if (!globeExpanded) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented && !(event.target instanceof Element && event.target.closest(".living-globe-runtime"))) setGlobeExpanded(false); };
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
  const focusSystem = (id: string) => window.dispatchEvent(new CustomEvent("living-system-focus", { detail: id }));
  const focusPlanet = (id: string) => window.dispatchEvent(new CustomEvent("living-planet-focus", { detail: id }));

  return (
    <section className="living-dashboard" aria-label="Living Codex dashboard">
      <aside className="living-panel living-satellites">
        <div className="living-panel-title">Satellites <span>{satellites.length} across {universe?.planetCount ?? 1} {universe?.planetCount === 1 ? "planet" : "planets"}</span></div>
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
          <CodexGlobe activity={recentTokens} eventId={!activity?.session_id || activeSession ? latestEvent?.id : undefined} activityKind={latestEvent?.kind} eventLabel={latestEvent?.label} projectIdentity={session?.project_id ? { repositoryId: session.project_id, displayName: session.project } : null} chatActivities={chatActivities} model={signals[0][1]} context={signals[2][1]} onSatellitesChange={setSatellites} onUniverseChange={setUniverse} />
        </div>
      </div>

      <aside className="living-right">
        <div className="living-panel living-codex-core">
          <div className="living-panel-title">Codex Core <span>Universal stats</span></div>
          <div className="living-core-stats">
            <div style={{ "--stat-color": "#ffac5c" } as CSSProperties}><strong>Stars</strong><span>{value(universe?.systemCount)}</span></div>
            <div style={{ "--stat-color": "#b080ff" } as CSSProperties}><strong>Planets</strong><span>{value(universe?.planetCount)}</span></div>
            <div style={{ "--stat-color": "#52f6ad" } as CSSProperties}><strong>Satellites</strong><span>{value(universe?.satelliteCount)}</span></div>
            <div style={{ "--stat-color": "#37d7ff" } as CSSProperties}><strong>Largest system</strong><span>{largestSystem ? `${largestSystem.displayName} · ${largestSystem.satelliteCount}` : "—"}</span></div>
            <div style={{ "--stat-color": "#ff6f87" } as CSSProperties}><strong>Most used model</strong><span>{mostUsedModel?.name || latest?.model || "—"}</span></div>
          </div>
        </div>
      </aside>

      <div className="living-panel living-lower-panel">
        {universe ? <section className="living-focus-panels" aria-label="Living Codex focus information">
        <details className="living-panel living-focus-card" open>
          <summary><strong>Codex universe</strong><span>{universe.systemCount} systems · {universe.planetCount} planets</span></summary>
          <div className="living-focus-body" aria-live="polite">
            <span>{universe.satelliteCount} satellites · {universe.activeSignals} signals · {universe.activeMigrations} transfers</span>
            {universe.formation ? <span>Project star {universe.formation.phase} · {Math.round(universe.formation.progress * 100)}%</span> : null}
            {universe.expansion ? <span>Planetary expansion {universe.expansion.phase} · {Math.round(universe.expansion.progress * 100)}%</span> : null}
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("living-overview-request"))}>View universe</button>
          </div>
        </details>
        {universe.selectedSystem ? <details className="living-panel living-focus-card" open>
          <summary><strong>{universe.selectedSystem.displayName}</strong><span>{universe.selectedSystem.satelliteCount} satellites</span></summary>
          <div className="living-focus-body">
            {universe.systems.length > 1 ? <label>Project system<select aria-label="Project systems" value={universe.selectedSystem.id} onChange={(event) => focusSystem(event.target.value)}>{universe.systems.map((system) => <option key={system.id} value={system.id}>{system.displayName}{system.lifecycleState === "dormant" ? " · dormant" : ""}</option>)}</select></label> : null}
            <label>Planet<select aria-label={`Planets in ${universe.selectedSystem.displayName}`} value={universe.selectedPlanet?.starSystemId === universe.selectedSystem.id ? universe.selectedPlanet.id : ""} onChange={(event) => focusPlanet(event.target.value)}><option value="" disabled>Select a planet</option>{universe.selectedSystemPlanets.map((planet) => <option key={planet.id} value={planet.id}>{planet.name} · {planet.lifecycleState}</option>)}</select></label>
            <span>{universe.selectedSystem.lifecycleState} · {universe.selectedSystem.planetIds.length} planets · {universe.selectedSystem.totalTasksProcessed} tasks</span>
            <span>Maturity {Math.round(universe.selectedSystem.maturity * 100)}% · {universe.selectedSystem.totalCrossSystemSignals} cross-system signals</span>
            <span>{universe.selectedSystem.dominantActivityTypes.length ? `Dominant: ${universe.selectedSystem.dominantActivityTypes.join(", ")}` : "No dominant activity yet"}</span>
            <button type="button" onClick={() => focusSystem(universe.selectedSystem!.id)}>Focus system</button>
          </div>
        </details> : null}
        {universe.selectedPlanet ? <details className="living-panel living-focus-card" open>
          <summary><strong>{universe.selectedPlanet.name}</strong><span>{universe.selectedPopulation} satellites</span></summary>
          <div className="living-focus-body">
            <span>{universe.selectedPlanetSystem?.displayName} · orbit band {universe.selectedPlanet.orbit.band}</span>
            <span>Generation {universe.selectedPlanet.generation} · capacity {Math.round(universe.selectedPopulation / UNIVERSE_CONFIG.planetCapacity.expansionThreshold * 100)}%</span>
            <span>{universe.selectedPlanet.lifecycleState} · maturity {Math.round(universe.selectedPlanet.maturity * 100)}%</span>
            <span>{universe.selectedPlanet.totalSignalsSent} sent · {universe.selectedPlanet.totalSignalsReceived} received</span>
            <div><button type="button" onClick={() => focusPlanet(universe.selectedPlanet!.id)}>Focus planet</button><button type="button" onClick={() => focusSystem(universe.selectedPlanet!.starSystemId)}>Focus system</button></div>
          </div>
        </details> : null}
        </section> : null}

        <div className="living-panel living-feed">
          <div className="living-panel-title">Live Codex activity <button type="button" aria-expanded={activityOpen} aria-controls="living-codex-activity" onClick={() => setActivityOpen((open) => !open)}><span>{activitySessions.filter(({ state }) => state !== "idle").length} chats · {activityEvents.length} events</span>{activityOpen ? <ChevronUp /> : <ChevronDown />}</button></div>
          <div className="living-feed-rows" id="living-codex-activity" hidden={!activityOpen}>
            {activityEvents.slice(0, 8).map((event) => (
              <div key={`${event.sessionId}:${event.id}`} data-kind={event.kind}>
                <time>{event.timestamp ? new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "now"}</time>
                <span>{event.project ? `${event.project} · ` : ""}{event.label}</span>
                <em>{event.kind}</em>
                <strong>{event.sessionState === event.kind ? "active" : "observed"}</strong>
              </div>
            ))}
            {!activityEvents.length ? requests.slice(0, 6).map((request) => (
              <div key={request.requestId}>
                <time>{new Date(request.requestedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
                <span>{request.model}{request.reasoningEffort ? ` · ${request.reasoningEffort}` : ""}</span>
                <em>{request.source || request.transport || "request"}</em>
                <strong>{request.status}</strong>
              </div>
            )) : null}
            {!activityEvents.length && !requests.length ? <p>No observable Codex activity yet.</p> : null}
          </div>
        </div>
      </div>

    </section>
  );
}

import { createReadStream, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

import { generateUniqueSatelliteNameMetadata, hashTaskSeed, type SatelliteType } from "../codex-lb/frontend/src/features/dashboard/satellite-naming";
import { addSatellite, advanceUniverse, assertUniverseIntegrity, createUniverse, reconcileUniverseSnapshot, restoreUniverse, summarizeUniverse, type ProjectIdentityInput, type TaskKey } from "../codex-lb/frontend/src/features/dashboard/universe";

const START = "2026-07-15T21:26:00.000Z";
const CUTOFF = "2026-07-20T05:45:22.000Z";
const LIMIT = 1_500;
const SESSIONS = process.env.CODEX_SESSIONS_DIR ?? "/sessions";
const PROJECTS = process.env.LIVING_CODEX_PROJECTS_FILE ?? "/codex/living-codex-projects.json";
const output = process.argv[2];
if (!output) throw new Error("Usage: bun rebuild-living-codex-universe.ts OUTPUT.json");

type Event = { timestamp: string; sessionId: string; eventId: string; taskKey: TaskKey; cwd: string };
const events: Event[] = [];

function classify(rowType: string, payload: Record<string, unknown>): TaskKey | null {
  const eventType = String(payload.type ?? "");
  if (["agent_reasoning", "reasoning"].includes(eventType)) return "think";
  if (["task_started", "task_complete"].includes(eventType)) return "verify";
  if (eventType === "patch_apply_end") return "tool";
  if (rowType !== "response_item" || eventType !== "custom_tool_call") return null;
  const input = String(payload.input ?? "").toLowerCase();
  return input.includes("search_query") || input.includes("web__run") ? "search" : "tool";
}

for (const day of readdirSync(SESSIONS, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()) {
  for (const filename of readdirSync(join(SESSIONS, day)).filter((name) => name.startsWith("rollout-") && name.endsWith(".jsonl")).sort()) {
    const path = join(SESSIONS, day, filename);
    let cwd = "";
    let sessionId = filename.slice(-42, -6);
    let index = 0;
    for await (const line of createInterface({ input: createReadStream(path), crlfDelay: Infinity })) {
      index += 1;
      let row: Record<string, unknown>;
      try { row = JSON.parse(line); } catch { continue; }
      const timestamp = String(row.timestamp ?? "");
      const payload = row.payload && typeof row.payload === "object" && !Array.isArray(row.payload) ? row.payload as Record<string, unknown> : {};
      if (row.type === "session_meta") {
        cwd = String(payload.cwd ?? cwd);
        sessionId = String(payload.id ?? payload.session_id ?? sessionId);
      }
      if (!timestamp || timestamp < START || timestamp >= CUTOFF) continue;
      const taskKey = classify(String(row.type ?? ""), payload);
      if (!taskKey || !cwd) continue;
      const eventType = String(payload.type ?? "");
      const eventId = `${timestamp}-${eventType}-${payload.call_id ?? payload.turn_id ?? index}`;
      events.push({ timestamp, sessionId, eventId, taskKey, cwd });
    }
  }
}

const history = events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
if (history.length < LIMIT) throw new Error(`Only ${history.length} recoverable events were found`);
const selected = Array.from({ length: LIMIT }, (_, index) => history[Math.floor(index * history.length / LIMIT)]);

const startedAt = Date.parse(selected[0].timestamp);
const universe = createUniverse([], startedAt);
const observedProjects = JSON.parse(readFileSync(PROJECTS, "utf8")) as Array<{ projectId: string; path: string; label: string; removed?: boolean; removalAuthoritative?: boolean }>;
reconcileUniverseSnapshot(universe, {
  source: "living-codex-history-recovery",
  revision: `history-${CUTOFF}`,
  observedAt: CUTOFF,
  projects: observedProjects.map((project) => ({ identity: { repositoryId: project.projectId, workspaceRoot: project.path, displayName: project.label }, removed: project.removed, removalAuthoritative: project.removalAuthoritative })),
}, startedAt);

const names = new Set<string>();
const colors: Record<TaskKey, string> = { think: "#ffac5c", search: "#b080ff", tool: "#52f6ad", write: "#37d7ff", verify: "#ff6f87" };
const types: Record<TaskKey, SatelliteType> = { think: "thinking", search: "search", tool: "tools", write: "communication", verify: "verification" };
const projectCounts = new Map<string, number>();

selected.forEach((event, offset) => {
  const index = offset + 1;
  const displayName = event.cwd.split(/[\\/]/).filter(Boolean).at(-1) ?? event.cwd;
  const project: ProjectIdentityInput = { repositoryId: event.cwd, workspaceRoot: event.cwd, displayName };
  const naming = generateUniqueSatelliteNameMetadata({ type: types[event.taskKey], index, taskSeed: hashTaskSeed(`${event.sessionId}:${event.eventId}`), generation: 1 }, names);
  names.add(naming.displayName);
  const now = Date.parse(event.timestamp);
  addSatellite(universe, { id: `sat_${String(index).padStart(6, "0")}`, taskKey: event.taskKey, naming, color: colors[event.taskKey], createdAtIso: event.timestamp, sourceId: event.sessionId }, project, now);
  advanceUniverse(universe, now + 60_000);
  projectCounts.set(displayName, (projectCounts.get(displayName) ?? 0) + 1);
});

let settleAt = Date.parse(selected.at(-1)!.timestamp) + 60_000;
for (let index = 0; index < 100 && (universe.activeStarFormation || universe.activeExpansion || universe.activeMigrations.length); index += 1) {
  settleAt += 60_000;
  advanceUniverse(universe, settleAt);
}
universe.camera.mode = "universe-overview";
universe.camera.panX = 0;
universe.camera.panY = 0;
universe.camera.zoom = 1;
assertUniverseIntegrity(universe);

const summary = summarizeUniverse(universe);
writeFileSync(output, JSON.stringify({ format: "codex-lb-living-codex", exportedAt: new Date().toISOString(), reconstructedFrom: { eventCount: LIMIT, start: selected[0].timestamp, end: selected.at(-1)!.timestamp, cutoff: CUTOFF }, universe }, null, 2));
const roundTrip = restoreUniverse((JSON.parse(readFileSync(output, "utf8")) as { universe: unknown }).universe);
if (!roundTrip) throw new Error("Generated recovery file failed to restore");
assertUniverseIntegrity(roundTrip);
console.log(JSON.stringify({ output, systems: summary.systemCount, planets: summary.planetCount, satellites: summary.satelliteCount, projects: Object.fromEntries([...projectCounts].sort((a, b) => b[1] - a[1])), systemSummary: summary.systems.map(({ displayName, satelliteCount, planetIds }) => ({ displayName, satellites: satelliteCount, planets: planetIds.length })).filter(({ satellites, planets }) => satellites || planets) }, null, 2));

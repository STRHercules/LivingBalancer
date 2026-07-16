import type { SatelliteNameMetadata } from "./satellite-naming";

export type TaskKey = "think" | "search" | "tool" | "write" | "verify";
export type Point3D = { x: number; y: number; z: number };
export type PlanetState = "forming" | "stabilizing" | "stable" | "active" | "communicating" | "preparing-expansion" | "launching" | "redistributing" | "dormant";
export type MigrationState = "queued" | "departing" | "in-transit" | "arriving" | "captured" | "settling";
export type CameraMode = "planet-focus" | "universe-overview" | "free-navigation" | "launch-cinematic" | "migration-cinematic";

export type UniverseSatellite = {
  id: string;
  taskKey: TaskKey;
  naming: SatelliteNameMetadata;
  color: string;
  createdAtIso: string;
  planetId: string;
  previousPlanetId: string | null;
  migrationState: MigrationState | "none";
  orbitSlot: number;
  transferHistory: Array<{ from: string; to: string; completedAt: string }>;
};

export type Planet = {
  id: string;
  name: string;
  generation: number;
  parentPlanetId: string | null;
  childPlanetIds: string[];
  position: Point3D;
  radius: number;
  maturity: number;
  lifecycleState: PlanetState;
  createdAt: string;
  lastActiveAt: string;
  totalTasksProcessed: number;
  totalSignalsSent: number;
  totalSignalsReceived: number;
};

export type Expansion = {
  id: string;
  parentPlanetId: string;
  childPlanetId: string;
  phase: "launching" | "forming" | "redistributing";
  startedAt: string;
  progress: number;
};

export type Migration = {
  id: string;
  satelliteId: string;
  sourcePlanetId: string;
  destinationPlanetId: string;
  startedAt: string;
  durationMs: number;
  progress: number;
  state: MigrationState;
};

export type UniverseSignal = {
  id: string;
  sourcePlanetId: string;
  destinationPlanetId: string;
  taskKey: TaskKey;
  startedAt: string;
  durationMs: number;
  progress: number;
  response: boolean;
};

export type UniverseState = {
  version: 2;
  universe: {
    id: "codex_universe";
    seed: string;
    createdAt: string;
    totalTasks: number;
    totalSignals: number;
    totalExpansions: number;
    focusedPlanetId: string;
    selectedPlanetId: string | null;
    expansionInProgress: boolean;
    paused: boolean;
  };
  planets: Planet[];
  satellites: UniverseSatellite[];
  activeExpansion: Expansion | null;
  activeMigrations: Migration[];
  activeSignals: UniverseSignal[];
  camera: { mode: CameraMode; panX: number; panY: number; zoom: number; rotation: number };
};

export type UniverseSummary = {
  planetCount: number;
  satelliteCount: number;
  activeSignals: number;
  activeMigrations: number;
  selectedPlanet: Planet | null;
  selectedPopulation: number;
  expansion: Expansion | null;
};

export const UNIVERSE_STORAGE_KEY = "codex-lb-living-universe-v2";
export const LEGACY_SATELLITE_STORAGE_KEY = "codex-lb-living-satellites-v1";

export const UNIVERSE_CONFIG = {
  planetCapacity: {
    softLimit: 80,
    expansionThreshold: 100,
    maximumOperationalCapacity: 120,
    targetFillRatioAfterSplit: 0.65,
    minimumStablePopulation: 20,
  },
  expansion: { launchDurationMs: 6_000, formationDurationMs: 8_000, redistributionDelayMs: 1_200 },
  placement: { baseSpacing: 3.4, verticalVariance: 0.45, safetyMargin: 0.7 },
  migration: { minimumWaveSize: 2, maximumWaveSize: 8, waveDelayMs: 700, durationMs: 4_200, maximumConcurrentTransfers: 50 },
  communication: { maximumConcurrentSignals: 100, maximumRouteHops: 2 },
  camera: { minimumPlanetScreenSize: 24, overviewPadding: 1.25 },
} as const;

const PLANET_NAMES = ["Axiom Reach", "Beacon Meridian", "Atlas Node", "Synapse Haven", "Archive World", "Vector Crown", "Cortex Minor", "Theorem Station", "Oracle Horizon", "Nexus Vault", "Parallax Ascent"];
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const iso = (now: number) => new Date(now).toISOString();
const planetPopulation = (state: UniverseState, planetId: string) => state.satellites.reduce((count, satellite) => count + Number(satellite.planetId === planetId), 0);

function planetPosition(index: number): Point3D {
  if (!index) return { x: 0, y: 0, z: 0 };
  const distance = UNIVERSE_CONFIG.placement.baseSpacing * Math.sqrt(index);
  return {
    x: Math.cos(index * GOLDEN_ANGLE) * distance,
    y: Math.sin(index * 5.31) * UNIVERSE_CONFIG.placement.verticalVariance,
    z: Math.sin(index * GOLDEN_ANGLE) * distance,
  };
}

function makePlanet(index: number, parent: Planet | null, now: number): Planet {
  const id = `planet_${String(index + 1).padStart(4, "0")}`;
  return {
    id,
    name: index ? PLANET_NAMES[(index - 1) % PLANET_NAMES.length] + (index > PLANET_NAMES.length ? ` ${Math.floor(index / PLANET_NAMES.length) + 1}` : "") : "Codex Prime",
    generation: parent ? parent.generation + 1 : 1,
    parentPlanetId: parent?.id ?? null,
    childPlanetIds: [],
    position: planetPosition(index),
    radius: 1,
    maturity: index ? 0.16 : 1,
    lifecycleState: index ? "forming" : "stable",
    createdAt: iso(now),
    lastActiveAt: iso(now),
    totalTasksProcessed: 0,
    totalSignalsSent: 0,
    totalSignalsReceived: 0,
  };
}

export function createUniverse(satellites: Omit<UniverseSatellite, "planetId" | "previousPlanetId" | "migrationState" | "orbitSlot" | "transferHistory">[] = [], now = Date.now()): UniverseState {
  const prime = makePlanet(0, null, now);
  return {
    version: 2,
    universe: { id: "codex_universe", seed: "codex-living-balancer-v2", createdAt: iso(now), totalTasks: satellites.length, totalSignals: 0, totalExpansions: 0, focusedPlanetId: prime.id, selectedPlanetId: prime.id, expansionInProgress: false, paused: false },
    planets: [prime],
    satellites: satellites.map((satellite, orbitSlot) => ({ ...satellite, planetId: prime.id, previousPlanetId: null, migrationState: "none", orbitSlot, transferHistory: [] })),
    activeExpansion: null,
    activeMigrations: [],
    activeSignals: [],
    camera: { mode: "planet-focus", panX: 0, panY: 0, zoom: 1, rotation: 0 },
  };
}

function validSatellite(value: unknown, planetIds: Set<string>, names: Set<string>): value is UniverseSatellite {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.planetId !== "string" || !planetIds.has(value.planetId) || typeof value.color !== "string" || typeof value.createdAtIso !== "string" || !isRecord(value.naming) || typeof value.naming.displayName !== "string" || names.has(value.naming.displayName)) return false;
  if (!(typeof value.taskKey === "string" && ["think", "search", "tool", "write", "verify"].includes(value.taskKey))) return false;
  names.add(value.naming.displayName);
  return true;
}

export function restoreUniverse(value: unknown, now = Date.now()): UniverseState | null {
  if (!isRecord(value) || value.version !== 2 || !Array.isArray(value.planets) || !Array.isArray(value.satellites) || !isRecord(value.universe) || !isRecord(value.camera)) return null;
  const planets = value.planets.filter((planet): planet is Planet => isRecord(planet) && typeof planet.id === "string" && typeof planet.name === "string" && isRecord(planet.position) && typeof planet.position.x === "number" && typeof planet.position.y === "number" && typeof planet.position.z === "number");
  if (!planets.length || new Set(planets.map(({ id }) => id)).size !== planets.length) return null;
  const planetIds = new Set(planets.map(({ id }) => id));
  const names = new Set<string>();
  const satellites = value.satellites.filter((satellite): satellite is UniverseSatellite => validSatellite(satellite, planetIds, names));
  const state = value as unknown as UniverseState;
  state.planets = planets;
  state.satellites = satellites;
  state.activeSignals = [];
  state.activeMigrations = Array.isArray(value.activeMigrations) ? value.activeMigrations.filter((migration): migration is Migration => isRecord(migration) && typeof migration.id === "string" && typeof migration.satelliteId === "string" && typeof migration.sourcePlanetId === "string" && typeof migration.destinationPlanetId === "string" && planetIds.has(migration.sourcePlanetId) && planetIds.has(migration.destinationPlanetId)) : [];
  state.activeExpansion = isRecord(value.activeExpansion) && typeof value.activeExpansion.id === "string" ? value.activeExpansion as unknown as Expansion : null;
  state.universe.focusedPlanetId = planetIds.has(state.universe.focusedPlanetId) ? state.universe.focusedPlanetId : planets[0].id;
  state.universe.selectedPlanetId = state.universe.selectedPlanetId && planetIds.has(state.universe.selectedPlanetId) ? state.universe.selectedPlanetId : state.universe.focusedPlanetId;
  state.camera.zoom = Math.max(0.35, Math.min(4, Number(state.camera.zoom) || 1));
  state.camera.panX = Number(state.camera.panX) || 0;
  state.camera.panY = Number(state.camera.panY) || 0;
  state.camera.rotation = Number(state.camera.rotation) || 0;
  advanceUniverse(state, now);
  return state;
}

export function beginExpansion(state: UniverseState, parentPlanetId: string, now = Date.now()): Planet | null {
  if (state.universe.expansionInProgress || state.universe.paused || state.planets.length >= 25) return null;
  const parent = state.planets.find(({ id }) => id === parentPlanetId);
  if (!parent || !["stable", "preparing-expansion", "active", "communicating"].includes(parent.lifecycleState) || planetPopulation(state, parent.id) < UNIVERSE_CONFIG.planetCapacity.expansionThreshold) return null;
  const child = makePlanet(state.planets.length, parent, now);
  parent.childPlanetIds.push(child.id);
  parent.lifecycleState = "launching";
  state.planets.push(child);
  state.universe.expansionInProgress = true;
  state.universe.totalExpansions += 1;
  state.activeExpansion = { id: `expansion_${state.universe.totalExpansions}`, parentPlanetId: parent.id, childPlanetId: child.id, phase: "launching", startedAt: iso(now), progress: 0 };
  state.camera.mode = "launch-cinematic";
  return child;
}

export function evaluateExpansion(state: UniverseState, now = Date.now()): Planet | null {
  if (state.universe.expansionInProgress) return null;
  const candidate = state.planets.filter(({ lifecycleState }) => ["stable", "active", "communicating", "preparing-expansion"].includes(lifecycleState)).sort((a, b) => planetPopulation(state, b.id) - planetPopulation(state, a.id))[0];
  if (!candidate) return null;
  const population = planetPopulation(state, candidate.id);
  if (population >= UNIVERSE_CONFIG.planetCapacity.expansionThreshold) return beginExpansion(state, candidate.id, now);
  if (population >= UNIVERSE_CONFIG.planetCapacity.softLimit) candidate.lifecycleState = "preparing-expansion";
  else if (candidate.lifecycleState === "preparing-expansion") candidate.lifecycleState = "stable";
  return null;
}

function planRedistribution(state: UniverseState, expansion: Expansion, now: number) {
  const sourcePopulation = planetPopulation(state, expansion.parentPlanetId);
  const moveCount = Math.max(0, sourcePopulation - Math.round(sourcePopulation * UNIVERSE_CONFIG.planetCapacity.targetFillRatioAfterSplit));
  const candidates = state.satellites.filter(({ planetId, migrationState }) => planetId === expansion.parentPlanetId && migrationState === "none").sort((a, b) => a.createdAtIso.localeCompare(b.createdAtIso)).slice(0, Math.min(moveCount, sourcePopulation - UNIVERSE_CONFIG.planetCapacity.minimumStablePopulation));
  state.activeMigrations = candidates.map((satellite, index) => {
    satellite.previousPlanetId = expansion.parentPlanetId;
    satellite.migrationState = "queued";
    const wave = Math.floor(index / UNIVERSE_CONFIG.migration.maximumWaveSize);
    return { id: `migration_${expansion.id}_${satellite.id}`, satelliteId: satellite.id, sourcePlanetId: expansion.parentPlanetId, destinationPlanetId: expansion.childPlanetId, startedAt: iso(now + UNIVERSE_CONFIG.expansion.redistributionDelayMs + wave * UNIVERSE_CONFIG.migration.waveDelayMs), durationMs: UNIVERSE_CONFIG.migration.durationMs, progress: 0, state: "queued" };
  });
}

export function advanceUniverse(state: UniverseState, now = Date.now()) {
  const expansion = state.activeExpansion;
  if (expansion) {
    const elapsed = Math.max(0, now - Date.parse(expansion.startedAt));
    const launchEnd = UNIVERSE_CONFIG.expansion.launchDurationMs;
    const formationEnd = launchEnd + UNIVERSE_CONFIG.expansion.formationDurationMs;
    const parent = state.planets.find(({ id }) => id === expansion.parentPlanetId);
    const child = state.planets.find(({ id }) => id === expansion.childPlanetId);
    if (!parent || !child) {
      state.activeExpansion = null;
      state.universe.expansionInProgress = false;
    } else if (elapsed < launchEnd) {
      expansion.phase = "launching";
      expansion.progress = elapsed / launchEnd;
      parent.lifecycleState = "launching";
    } else if (elapsed < formationEnd) {
      expansion.phase = "forming";
      expansion.progress = (elapsed - launchEnd) / UNIVERSE_CONFIG.expansion.formationDurationMs;
      child.lifecycleState = expansion.progress > 0.76 ? "stabilizing" : "forming";
      child.maturity = 0.16 + expansion.progress * 0.34;
    } else {
      const enteringRedistribution = expansion.phase !== "redistributing";
      expansion.phase = "redistributing";
      expansion.progress = 1;
      parent.lifecycleState = "redistributing";
      child.lifecycleState = "redistributing";
      if (enteringRedistribution) state.camera.mode = "migration-cinematic";
      if (!state.activeMigrations.length && !state.satellites.some(({ migrationState }) => migrationState !== "none")) planRedistribution(state, expansion, now);
    }
  }

  const satellitesById = new Map(state.satellites.map((satellite) => [satellite.id, satellite]));
  for (const migration of state.activeMigrations) {
    const elapsed = now - Date.parse(migration.startedAt);
    migration.progress = Math.max(0, Math.min(1, elapsed / migration.durationMs));
    migration.state = migration.progress <= 0 ? "queued" : migration.progress < 0.15 ? "departing" : migration.progress < 0.75 ? "in-transit" : migration.progress < 0.92 ? "arriving" : "settling";
    const satellite = satellitesById.get(migration.satelliteId);
    if (satellite) satellite.migrationState = migration.state;
    if (migration.progress >= 1 && satellite) {
      satellite.planetId = migration.destinationPlanetId;
      satellite.migrationState = "none";
      satellite.transferHistory.push({ from: migration.sourcePlanetId, to: migration.destinationPlanetId, completedAt: iso(now) });
    }
  }
  state.activeMigrations = state.activeMigrations.filter(({ progress }) => progress < 1);
  if (state.activeExpansion?.phase === "redistributing" && !state.activeMigrations.length && !state.satellites.some(({ migrationState }) => migrationState !== "none")) {
    const parent = state.planets.find(({ id }) => id === state.activeExpansion?.parentPlanetId);
    const child = state.planets.find(({ id }) => id === state.activeExpansion?.childPlanetId);
    if (parent) parent.lifecycleState = "stable";
    if (child) { child.lifecycleState = "stable"; child.maturity = Math.max(child.maturity, 0.5); }
    state.activeExpansion = null;
    state.universe.expansionInProgress = false;
    if (state.camera.mode === "migration-cinematic" || state.camera.mode === "launch-cinematic") state.camera.mode = "universe-overview";
  }

  for (let index = state.activeSignals.length - 1; index >= 0; index -= 1) {
    const signal = state.activeSignals[index];
    signal.progress = Math.max(0, Math.min(1, (now - Date.parse(signal.startedAt)) / signal.durationMs));
    if (signal.progress >= 1) state.activeSignals.splice(index, 1);
  }
  if (!state.activeSignals.length) {
    for (const planet of state.planets) {
      if (planet.lifecycleState === "communicating") planet.lifecycleState = planetPopulation(state, planet.id) >= UNIVERSE_CONFIG.planetCapacity.softLimit ? "preparing-expansion" : "stable";
    }
  }
}

export function addSatellite(state: UniverseState, satellite: Omit<UniverseSatellite, "planetId" | "previousPlanetId" | "migrationState" | "orbitSlot" | "transferHistory">, now = Date.now()) {
  if (state.satellites.some(({ id }) => id === satellite.id)) return;
  const stable = state.planets.filter(({ lifecycleState }) => !["forming", "stabilizing", "launching"].includes(lifecycleState));
  const planet = stable.sort((a, b) => planetPopulation(state, a.id) - planetPopulation(state, b.id))[0] ?? state.planets[0];
  state.satellites.push({ ...satellite, planetId: planet.id, previousPlanetId: null, migrationState: "none", orbitSlot: planetPopulation(state, planet.id), transferHistory: [] });
  planet.lastActiveAt = iso(now);
  planet.totalTasksProcessed += 1;
  planet.maturity = Math.min(1, Math.max(planet.maturity, .35 + planet.totalTasksProcessed / 200));
  state.universe.totalTasks += 1;
  state.universe.focusedPlanetId = planet.id;
  evaluateExpansion(state, now);
}

export function routeSignal(state: UniverseState, taskKey: TaskKey, now = Date.now()): UniverseSignal | null {
  if (state.planets.length < 2) return null;
  const source = state.planets.find(({ id }) => id === (state.universe.selectedPlanetId ?? state.universe.focusedPlanetId)) ?? state.planets[0];
  const destinations = state.planets.filter(({ id, lifecycleState }) => id !== source.id && lifecycleState !== "forming");
  if (!destinations.length) return null;
  const score = (planet: Planet) => state.satellites.reduce((total, satellite) => total + Number(satellite.planetId === planet.id && satellite.taskKey === taskKey), 0) - planetPopulation(state, planet.id) * 0.02;
  const destination = destinations.sort((a, b) => score(b) - score(a))[0];
  const duration = { think: 2_800, search: 1_500, tool: 1_200, write: 1_900, verify: 2_100 }[taskKey];
  const signal: UniverseSignal = { id: `signal_${state.universe.totalSignals + 1}`, sourcePlanetId: source.id, destinationPlanetId: destination.id, taskKey, startedAt: iso(now), durationMs: duration, progress: 0, response: taskKey !== "write" };
  state.activeSignals.push(signal);
  if (state.activeSignals.length > UNIVERSE_CONFIG.communication.maximumConcurrentSignals) state.activeSignals.splice(0, state.activeSignals.length - UNIVERSE_CONFIG.communication.maximumConcurrentSignals);
  source.totalSignalsSent += 1;
  destination.totalSignalsReceived += 1;
  source.lifecycleState = "communicating";
  destination.lifecycleState = "communicating";
  state.universe.totalSignals += 1;
  return signal;
}

export function summarizeUniverse(state: UniverseState): UniverseSummary {
  const selected = state.planets.find(({ id }) => id === state.universe.selectedPlanetId) ?? null;
  return { planetCount: state.planets.length, satelliteCount: state.satellites.length, activeSignals: state.activeSignals.length, activeMigrations: state.activeMigrations.length, selectedPlanet: selected, selectedPopulation: selected ? planetPopulation(state, selected.id) : 0, expansion: state.activeExpansion };
}

export function assertUniverseIntegrity(state: UniverseState) {
  const planetIds = new Set(state.planets.map(({ id }) => id));
  if (planetIds.size !== state.planets.length) throw new Error("Duplicate planet ID");
  const satelliteIds = new Set<string>();
  for (const satellite of state.satellites) {
    if (satelliteIds.has(satellite.id)) throw new Error("Duplicate satellite ID");
    if (!planetIds.has(satellite.planetId)) throw new Error("Satellite has no planet owner");
    satelliteIds.add(satellite.id);
  }
}

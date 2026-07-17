import type { SatelliteNameMetadata } from "./satellite-naming";

export type TaskKey = "think" | "search" | "tool" | "write" | "verify";
export type Point3D = { x: number; y: number; z: number };
export type PlanetState = "forming" | "stabilizing" | "stable" | "active" | "communicating" | "preparing-expansion" | "launching" | "redistributing" | "dormant";
export type StarSystemState = "nebula" | "forming" | "stable" | "dormant" | "black-hole";
export type MigrationState = "queued" | "departing" | "in-transit" | "arriving" | "captured" | "settling";
export type CameraMode = "planet-focus" | "star-system-focus" | "universe-overview" | "task-focus" | "communication-focus" | "free-navigation" | "formation-cinematic" | "launch-cinematic" | "migration-cinematic";
export type IdentitySource = "repository" | "git" | "workspace" | "session" | "core";

export type ProjectIdentityInput = {
  repositoryId?: string | null;
  workspaceId?: string | null;
  gitRoot?: string | null;
  workspaceRoot?: string | null;
  sessionProjectPath?: string | null;
  displayName?: string | null;
};

export type PlanetOrbit = {
  band: number;
  radius: number;
  inclination: number;
  phase: number;
  speed: number;
  direction: 1 | -1;
};

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
  sourceId?: string;
};

export type Planet = {
  id: string;
  starSystemId: string;
  orbit: PlanetOrbit;
  name: string;
  generation: number;
  parentPlanetId: string | null;
  childPlanetIds: string[];
  position: Point3D;
  radius: number;
  hasRings: boolean;
  moonCount: number;
  maturity: number;
  lifecycleState: PlanetState;
  createdAt: string;
  lastActiveAt: string;
  totalTasksProcessed: number;
  totalSignalsSent: number;
  totalSignalsReceived: number;
};

export type StarSystem = {
  id: string;
  projectKey: string;
  identitySource: IdentitySource;
  identityAliases: string[];
  displayName: string;
  lifecycleState: StarSystemState;
  lastNonRemovedLifecycleState: "nebula" | "stable" | "dormant" | null;
  observedAt: string;
  lastObservedAt: string;
  removedAt: string | null;
  observationSource: string;
  lastSourceRevision: string | null;
  visualFlags: string[];
  position: Point3D;
  radius: number;
  color: string;
  intensity: number;
  maturity: number;
  planetIds: string[];
  pendingActivityCount: number;
  createdAt: string;
  lastActiveAt: string;
  totalTasksProcessed: number;
  totalSignalsSent: number;
  totalSignalsReceived: number;
  totalCrossSystemSignals: number;
};

export type Asteroid = {
  id: string;
  sourceId: string;
  systemId: string;
  state: "archived" | "deleted";
  title: string;
  lastActiveAt: string;
  changedAt: string;
  recoverable: boolean;
  archivedSatellite?: UniverseSatellite;
};

export type SpaceStation = {
  id: string;
  systemId: string;
  kind: "mcp" | "plugin" | "ci" | "tool";
  integrationId: string;
  displayName: string;
  status: "configured" | "active" | "healthy" | "degraded" | "offline";
  firstObservedAt: string;
  lastObservedAt: string;
  lastUsedAt: string | null;
};

export type Pulsar = {
  id: string;
  systemId: string;
  automationId: string;
  displayName: string;
  schedule: string;
  status: "healthy" | "running" | "failed" | "paused" | "removed";
  firstObservedAt: string;
  lastObservedAt: string;
  lastRunAt: string | null;
};

export type SystemTransition = { id: string; systemId: string; kind: "formation" | "collapse" | "recovery"; startedAt: string };

export type UniverseObservationSnapshot = {
  source: string;
  revision?: string;
  observedAt: string;
  projects?: Array<{ identity: ProjectIdentityInput; removed?: boolean; removalAuthoritative?: boolean }>;
  chats?: Array<{ sourceId: string; project?: ProjectIdentityInput | null; state: "active" | "archived" | "deleted"; title?: string; lastActiveAt?: string; changedAt?: string; satelliteId?: string }>;
  stations?: Array<{ integrationId: string; project?: ProjectIdentityInput | null; kind: SpaceStation["kind"]; displayName: string; status: SpaceStation["status"]; lastUsedAt?: string | null }>;
  pulsars?: Array<{ automationId: string; project?: ProjectIdentityInput | null; displayName: string; schedule: string; status: Pulsar["status"]; lastRunAt?: string | null }>;
};

export type Expansion = {
  id: string;
  parentPlanetId: string;
  childPlanetId: string;
  phase: "launching" | "forming" | "redistributing";
  startedAt: string;
  progress: number;
};

export type StarFormation = {
  id: string;
  systemId: string;
  phase: "spark" | "core" | "signal" | "stabilizing";
  startedAt: string;
  durationMs: number;
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
  sourceSystemId: string;
  destinationSystemId: string;
  crossSystem: boolean;
  taskKey: TaskKey;
  startedAt: string;
  durationMs: number;
  progress: number;
  response: boolean;
};

export type UniverseState = {
  version: 4;
  universe: {
    id: "codex_universe";
    seed: string;
    createdAt: string;
    totalProjects: number;
    totalTasks: number;
    totalSignals: number;
    totalCrossSystemSignals: number;
    totalExpansions: number;
    focusedSystemId: string;
    focusedPlanetId: string | null;
    selectedSystemId: string | null;
    selectedPlanetId: string | null;
    expansionInProgress: boolean;
    paused: boolean;
  };
  starSystems: StarSystem[];
  planets: Planet[];
  satellites: UniverseSatellite[];
  asteroidBelts: Asteroid[];
  spaceStations: SpaceStation[];
  pulsars: Pulsar[];
  activeSystemTransitions: SystemTransition[];
  activeStarFormation: StarFormation | null;
  activeExpansion: Expansion | null;
  activeMigrations: Migration[];
  activeSignals: UniverseSignal[];
  camera: { mode: CameraMode; focusedSystemId: string; focusedPlanetId: string | null; panX: number; panY: number; zoom: number; rotation: number; pitch: number };
};

export type StarSystemSummary = StarSystem & { satelliteCount: number; asteroidCount: number; stationCount: number; pulsarCount: number; dominantActivityTypes: TaskKey[] };
export type UniverseSummary = {
  systemCount: number;
  planetCount: number;
  satelliteCount: number;
  activeSignals: number;
  activeMigrations: number;
  systems: StarSystemSummary[];
  selectedSystem: StarSystemSummary | null;
  selectedSystemPlanets: Planet[];
  selectedSystemPopulation: number;
  selectedPlanet: Planet | null;
  selectedPlanetSystem: StarSystem | null;
  selectedPopulation: number;
  formation: StarFormation | null;
  expansion: Expansion | null;
  cameraMode: CameraMode;
  asteroidCount: number;
  stationCount: number;
  pulsarCount: number;
};

export const UNIVERSE_STORAGE_KEY = "codex-lb-living-universe-v4";
export const VERSION_3_UNIVERSE_STORAGE_KEY = "codex-lb-living-universe-v3";
export const VERSION_2_UNIVERSE_STORAGE_KEY = "codex-lb-living-universe-v2";
export const LEGACY_SATELLITE_STORAGE_KEY = "codex-lb-living-satellites-v1";
export const CORE_SYSTEM_ID = "system_codex_core";

export const UNIVERSE_CONFIG = {
  planetCapacity: { softLimit: 80, expansionThreshold: 100, maximumOperationalCapacity: 120, targetFillRatioAfterSplit: 0.65, minimumStablePopulation: 20 },
  expansion: { launchDurationMs: 6_000, formationDurationMs: 8_000, redistributionDelayMs: 1_200 },
  placement: { baseSpacing: 3.4, verticalVariance: 0.45, safetyMargin: 0.7 },
  migration: { minimumWaveSize: 2, maximumWaveSize: 8, waveDelayMs: 700, durationMs: 4_200, maximumConcurrentTransfers: 50 },
  communication: { maximumConcurrentSignals: 100, maximumRouteHops: 2 },
  camera: { minimumPlanetScreenSize: 24, overviewPadding: 1.25 },
  starSystems: { enabled: true, coreSystemName: "Codex Core", minimumActivitiesToMaterialize: 1, formationDurationMs: 5_000, dormantAfterDays: 30, maximumIdentityAliases: 8, maximumVisibleSystemLabels: 24, autoFollowActiveProject: false },
  systemPlacement: { baseSpacing: 18, ringSpacing: 14, verticalVariance: 4, safetyMargin: 6, layout: "seeded-spiral" },
  planetOrbits: { baseRadius: 3.4, bandSpacing: 2.4, minimumSurfaceClearance: 1, spacingVariance: .9, minimumPlanetRadius: .62, maximumPlanetRadius: 1.7, minimumSpeed: 0.008, maximumSpeed: 0.024 },
  crossSystemCommunication: { enabled: true, maximumConcurrentSignals: 24, idleTrafficEnabled: false },
  universeObjects: { importObservedProjects: true, blackHoleRetention: "indefinite", deletedChatTombstonesEnabled: true, stationOfflineRetentionDays: 30, maximumRenderedAsteroidsPerSystem: 160, maximumRenderedStationsPerSystem: 12, maximumRenderedPulsarsPerSystem: 12 },
} as const;

const PLANET_NAMES = ["Axiom Reach", "Beacon Meridian", "Atlas Node", "Synapse Haven", "Archive World", "Vector Crown", "Cortex Minor", "Theorem Station", "Oracle Horizon", "Nexus Vault", "Parallax Ascent"];
const SYSTEM_COLORS = ["#ffd27a", "#f2ad73", "#d6c57d", "#cf9f78", "#e7b87b", "#bfae83"];
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const iso = (now: number) => new Date(now).toISOString();
const planetPopulation = (state: UniverseState, planetId: string) => state.satellites.reduce((count, satellite) => count + Number(satellite.planetId === planetId), 0);
const systemPopulation = (state: UniverseState, systemId: string) => {
  const planetIds = new Set(state.starSystems.find(({ id }) => id === systemId)?.planetIds ?? []);
  return state.satellites.reduce((count, satellite) => count + Number(planetIds.has(satellite.planetId)), 0);
};

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  return (result >>> 0).toString(16).padStart(8, "0");
}

const hashUnit = (value: string) => Number.parseInt(hash(value), 16) / 0xffffffff;

function planetRadiusForBand(systemId: string, band: number) {
  const { minimumPlanetRadius, maximumPlanetRadius } = UNIVERSE_CONFIG.planetOrbits;
  return minimumPlanetRadius + hashUnit(`${systemId}:planet-size:${band}`) ** 1.8 * (maximumPlanetRadius - minimumPlanetRadius);
}

function planetTraitsForBand(systemId: string, band: number) {
  const radius = planetRadiusForBand(systemId, band);
  const config = UNIVERSE_CONFIG.planetOrbits;
  const relativeSize = (radius - config.minimumPlanetRadius) / (config.maximumPlanetRadius - config.minimumPlanetRadius);
  const moonRoll = hashUnit(`${systemId}:moons:${band}`);
  return {
    radius,
    hasRings: hashUnit(`${systemId}:rings:${band}`) < .12 + relativeSize * .32,
    moonCount: moonRoll > .25 + relativeSize * .5 ? 0 : 1 + Math.floor(hashUnit(`${systemId}:moon-count:${band}`) * (relativeSize > .65 ? 3 : 2)),
  };
}

function orbitRadiusForBand(systemId: string, band: number) {
  const config = UNIVERSE_CONFIG.planetOrbits;
  let radius = config.baseRadius;
  for (let index = 1; index <= band; index += 1) {
    const safeGap = planetRadiusForBand(systemId, index - 1) + planetRadiusForBand(systemId, index) + config.minimumSurfaceClearance;
    radius += Math.max(config.bandSpacing, safeGap) + hashUnit(`${systemId}:orbit-gap:${index}`) * config.spacingVariance;
  }
  return radius;
}

function normalizePath(value: string) {
  const normalized = value.trim().replace(/\\/g, "/").replace(/\/+$/, "");
  return /^[a-z]:\//i.test(normalized) || normalized.startsWith("//") ? normalized.toLowerCase() : normalized;
}

function cleanIdentityValue(value: string | null | undefined, path = false) {
  if (!value?.trim() || value.trim().toLowerCase() === "unknown") return null;
  return path ? normalizePath(value) : value.trim().toLowerCase();
}

function displayNameFrom(value: string) {
  return value.split(/[\\/]/).filter(Boolean).at(-1) ?? `Project ${hash(value).slice(0, 4).toUpperCase()}`;
}

function canonicalProjectName(value: string | null | undefined) {
  return value?.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, "") ?? "";
}

export function normalizeProjectIdentity(input?: ProjectIdentityInput | null) {
  if (!input) return { source: "core" as const, projectKey: "codex:core", aliases: [] as string[], displayName: UNIVERSE_CONFIG.starSystems.coreSystemName };
  const candidates: Array<{ source: IdentitySource; key: string; value: string }> = [];
  const add = (source: IdentitySource, prefix: string, value: string | null) => { if (value) candidates.push({ source, key: `${prefix}:${value}`, value }); };
  add("repository", "repo", cleanIdentityValue(input.repositoryId));
  add("repository", "workspace-id", cleanIdentityValue(input.workspaceId));
  add("git", "git", cleanIdentityValue(input.gitRoot, true));
  add("workspace", "workspace", cleanIdentityValue(input.workspaceRoot, true));
  add("session", "session", cleanIdentityValue(input.sessionProjectPath, true));
  const strongest = candidates[0];
  if (!strongest) return { source: "core" as const, projectKey: "codex:core", aliases: [] as string[], displayName: UNIVERSE_CONFIG.starSystems.coreSystemName };
  return {
    source: strongest.source,
    projectKey: strongest.key,
    aliases: [...new Set(candidates.slice(1).map(({ key }) => key))],
    displayName: input.displayName?.trim() || displayNameFrom(strongest.value),
  };
}

function systemPosition(index: number): Point3D {
  if (!index) return { x: 0, y: 0, z: 0 };
  const distance = UNIVERSE_CONFIG.systemPlacement.baseSpacing + UNIVERSE_CONFIG.systemPlacement.ringSpacing * Math.sqrt(index - 1);
  return { x: Math.cos(index * GOLDEN_ANGLE) * distance, y: Math.sin(index * 4.17) * UNIVERSE_CONFIG.systemPlacement.verticalVariance, z: Math.sin(index * GOLDEN_ANGLE) * distance };
}

export function starSystemExtent(state: UniverseState, systemId: string) {
  return Math.max(1, ...state.planets.filter((planet) => planet.starSystemId === systemId).map((planet) => planet.orbit.radius + planet.radius * 2.2));
}

function relayoutStarSystems(state: UniverseState) {
  const placed: Array<{ position: Point3D; extent: number }> = [];
  const config = UNIVERSE_CONFIG.systemPlacement;
  // ponytail: radial packing is intentionally simple while the universe is capped at 50 visible systems.
  state.starSystems.forEach((system, index) => {
    const extent = starSystemExtent(state, system.id);
    let position = systemPosition(index);
    if (index) {
      const angle = index * GOLDEN_ANGLE;
      let distance = Math.hypot(position.x, position.z);
      while (placed.some((other) => Math.hypot(position.x - other.position.x, position.z - other.position.z) < extent + other.extent + config.safetyMargin)) {
        distance += Math.max(2, config.safetyMargin * .5);
        position = { x: Math.cos(angle) * distance, y: position.y, z: Math.sin(angle) * distance };
      }
    }
    system.position = position;
    for (const planet of state.planets) if (planet.starSystemId === system.id) planet.position = position;
    placed.push({ position, extent });
  });
}

function makeCore(now: number): StarSystem {
  const observedAt = iso(now);
  return { id: CORE_SYSTEM_ID, projectKey: "codex:core", identitySource: "core", identityAliases: [], displayName: UNIVERSE_CONFIG.starSystems.coreSystemName, lifecycleState: "stable", lastNonRemovedLifecycleState: "stable", observedAt, lastObservedAt: observedAt, removedAt: null, observationSource: "core", lastSourceRevision: null, visualFlags: [], position: systemPosition(0), radius: .32, color: SYSTEM_COLORS[0], intensity: .85, maturity: 1, planetIds: [], pendingActivityCount: 0, createdAt: observedAt, lastActiveAt: observedAt, totalTasksProcessed: 0, totalSignalsSent: 0, totalSignalsReceived: 0, totalCrossSystemSignals: 0 };
}

function makeOrbit(systemPlanetIndex: number, planetId: string, systemId: string): PlanetOrbit {
  const seed = Number.parseInt(hash(`${systemId}:${planetId}`), 16);
  const band = systemPlanetIndex;
  return {
    band,
    radius: orbitRadiusForBand(systemId, band),
    inclination: (hashUnit(`${systemId}:orbital-plane`) - .5) * .28,
    phase: (seed % 6_283) / 1_000,
    speed: UNIVERSE_CONFIG.planetOrbits.minimumSpeed + (seed % 1_000) / 1_000 * (UNIVERSE_CONFIG.planetOrbits.maximumSpeed - UNIVERSE_CONFIG.planetOrbits.minimumSpeed),
    direction: seed % 2 ? 1 : -1,
  };
}

function makePlanet(index: number, parent: Planet | null, system: StarSystem, now: number): Planet {
  const id = `planet_${String(index + 1).padStart(4, "0")}`;
  const systemPlanetIndex = system.planetIds.length;
  const traits = planetTraitsForBand(system.id, systemPlanetIndex);
  return {
    id,
    starSystemId: system.id,
    orbit: makeOrbit(systemPlanetIndex, id, system.id),
    name: index ? PLANET_NAMES[(index - 1) % PLANET_NAMES.length] + (index > PLANET_NAMES.length ? ` ${Math.floor(index / PLANET_NAMES.length) + 1}` : "") : "Codex Prime",
    generation: parent ? parent.generation + 1 : 1,
    parentPlanetId: parent?.id ?? null,
    childPlanetIds: [],
    position: system.position,
    ...traits,
    maturity: index ? .16 : 1,
    lifecycleState: index ? "forming" : "stable",
    createdAt: iso(now),
    lastActiveAt: iso(now),
    totalTasksProcessed: 0,
    totalSignalsSent: 0,
    totalSignalsReceived: 0,
  };
}

export function planetPositionOnOrbit(planet: Planet, system: StarSystem, angle: number): Point3D {
  const tilt = planet.orbit.inclination;
  const radial = Math.sin(angle) * planet.orbit.radius;
  return {
    x: system.position.x + Math.cos(angle) * planet.orbit.radius,
    y: system.position.y + radial * Math.sin(tilt),
    z: system.position.z + radial * Math.cos(tilt),
  };
}

export function planetPositionAt(planet: Planet, system: StarSystem, now = Date.now()): Point3D {
  const elapsed = Math.max(0, now - Date.parse(planet.createdAt)) / 1_000;
  return planetPositionOnOrbit(planet, system, planet.orbit.phase + elapsed * planet.orbit.speed * planet.orbit.direction);
}

export function createUniverse(satellites: Omit<UniverseSatellite, "planetId" | "previousPlanetId" | "migrationState" | "orbitSlot" | "transferHistory">[] = [], now = Date.now()): UniverseState {
  const core = makeCore(now);
  const prime = makePlanet(0, null, core, now);
  core.planetIds.push(prime.id);
  return {
    version: 4,
    universe: { id: "codex_universe", seed: "codex-living-balancer-v4", createdAt: iso(now), totalProjects: 1, totalTasks: satellites.length, totalSignals: 0, totalCrossSystemSignals: 0, totalExpansions: 0, focusedSystemId: core.id, focusedPlanetId: prime.id, selectedSystemId: core.id, selectedPlanetId: prime.id, expansionInProgress: false, paused: false },
    starSystems: [core],
    planets: [prime],
    satellites: satellites.map((satellite, orbitSlot) => ({ ...satellite, planetId: prime.id, previousPlanetId: null, migrationState: "none", orbitSlot, transferHistory: [] })),
    asteroidBelts: [],
    spaceStations: [],
    pulsars: [],
    activeSystemTransitions: [],
    activeStarFormation: null,
    activeExpansion: null,
    activeMigrations: [],
    activeSignals: [],
    camera: { mode: "planet-focus", focusedSystemId: core.id, focusedPlanetId: prime.id, panX: 0, panY: 0, zoom: 1, rotation: 0, pitch: 0 },
  };
}

function migrateVersion2(value: Record<string, unknown>, now: number): UniverseState | null {
  if (!Array.isArray(value.planets) || !Array.isArray(value.satellites) || !isRecord(value.universe) || !isRecord(value.camera)) return null;
  const core = makeCore(Date.parse(String(value.universe.createdAt)) || now);
  const planets = value.planets.filter(isRecord).map((record, index): Planet | null => {
    if (typeof record.id !== "string" || typeof record.name !== "string") return null;
    const planet = { ...record, starSystemId: core.id, orbit: makeOrbit(index, record.id, core.id) } as unknown as Planet;
    planet.position = isRecord(record.position) && typeof record.position.x === "number" && typeof record.position.y === "number" && typeof record.position.z === "number" ? record.position as Point3D : core.position;
    return planet;
  }).filter((planet): planet is Planet => !!planet);
  if (!planets.length) return null;
  core.planetIds = planets.map(({ id }) => id);
  const planetIds = new Set(core.planetIds);
  const satellites = value.satellites.filter((satellite): satellite is UniverseSatellite => isRecord(satellite) && typeof satellite.id === "string" && typeof satellite.planetId === "string" && planetIds.has(satellite.planetId)) as UniverseSatellite[];
  const oldUniverse = value.universe;
  const focusedPlanetId = typeof oldUniverse.focusedPlanetId === "string" && planetIds.has(oldUniverse.focusedPlanetId) ? oldUniverse.focusedPlanetId : planets[0].id;
  const selectedPlanetId = typeof oldUniverse.selectedPlanetId === "string" && planetIds.has(oldUniverse.selectedPlanetId) ? oldUniverse.selectedPlanetId : focusedPlanetId;
  return repairUniverse({
    version: 4,
    universe: { id: "codex_universe", seed: "codex-living-balancer-v4", createdAt: typeof oldUniverse.createdAt === "string" ? oldUniverse.createdAt : iso(now), totalProjects: 1, totalTasks: Number(oldUniverse.totalTasks) || satellites.length, totalSignals: Number(oldUniverse.totalSignals) || 0, totalCrossSystemSignals: 0, totalExpansions: Number(oldUniverse.totalExpansions) || 0, focusedSystemId: core.id, focusedPlanetId, selectedSystemId: core.id, selectedPlanetId, expansionInProgress: Boolean(oldUniverse.expansionInProgress), paused: Boolean(oldUniverse.paused) },
    starSystems: [core], planets, satellites, asteroidBelts: [], spaceStations: [], pulsars: [], activeSystemTransitions: [], activeStarFormation: null,
    activeExpansion: isRecord(value.activeExpansion) ? value.activeExpansion as unknown as Expansion : null,
    activeMigrations: Array.isArray(value.activeMigrations) ? value.activeMigrations as Migration[] : [],
    activeSignals: [],
    camera: { mode: value.camera.mode === "universe-overview" ? "star-system-focus" : value.camera.mode === "planet-focus" ? "planet-focus" : "free-navigation", focusedSystemId: core.id, focusedPlanetId, panX: Number(value.camera.panX) || 0, panY: Number(value.camera.panY) || 0, zoom: Number(value.camera.zoom) || 1, rotation: Number(value.camera.rotation) || 0, pitch: Number(value.camera.pitch) || 0 },
  }, now);
}

function validTaskKey(value: unknown): value is TaskKey { return typeof value === "string" && ["think", "search", "tool", "write", "verify"].includes(value); }

function migrateVersion3(value: Record<string, unknown>, now: number): UniverseState | null {
  if (!Array.isArray(value.starSystems) || !Array.isArray(value.planets) || !Array.isArray(value.satellites) || !isRecord(value.universe) || !isRecord(value.camera)) return null;
  const observedAt = iso(now);
  const state = value as unknown as UniverseState;
  state.version = 4;
  state.universe.seed = "codex-living-balancer-v4";
  for (const system of state.starSystems) {
    const oldState = system.lifecycleState as string;
    system.lifecycleState = oldState === "latent" ? "nebula" : oldState === "dormant" ? "dormant" : oldState === "forming" || oldState === "stabilizing" ? "forming" : "stable";
    system.lastNonRemovedLifecycleState = system.lifecycleState === "forming" ? "stable" : system.lifecycleState;
    system.observedAt = system.createdAt || observedAt;
    system.lastObservedAt = system.lastActiveAt || observedAt;
    system.removedAt = null;
    system.observationSource = system.id === CORE_SYSTEM_ID ? "core" : "version-3-migration";
    system.lastSourceRevision = null;
  }
  state.asteroidBelts = [];
  state.spaceStations = [];
  state.pulsars = [];
  state.activeSystemTransitions = [];
  return repairUniverse(state, now);
}

function repairUniverse(state: UniverseState, now: number) {
  const seenSystems = new Set<string>();
  state.starSystems = state.starSystems.filter((system) => system?.id && !seenSystems.has(system.id) && seenSystems.add(system.id));
  let core = state.starSystems.find(({ id }) => id === CORE_SYSTEM_ID);
  if (!core) { core = makeCore(now); state.starSystems.unshift(core); }
  core.projectKey = "codex:core"; core.identitySource = "core"; core.displayName = UNIVERSE_CONFIG.starSystems.coreSystemName; core.lifecycleState = "stable"; core.lastNonRemovedLifecycleState = "stable"; core.removedAt = null;
  const owners = new Map<string, StarSystem>();
  const redirects = new Map<string, string>();
  for (const system of state.starSystems) {
    if (system.id === CORE_SYSTEM_ID) continue;
    system.identityAliases ??= [];
    const identityKeys = [system.projectKey, ...system.identityAliases].filter(Boolean).map((key) => `identity:${key}`);
    const existing = identityKeys.map((key) => owners.get(key)).find(Boolean);
    if (!existing) {
      for (const key of identityKeys) owners.set(key, system);
      continue;
    }
    redirects.set(system.id, existing.id);
    existing.identityAliases = [...new Set([...existing.identityAliases, system.projectKey, ...system.identityAliases].filter((key) => key !== existing.projectKey))].slice(-UNIVERSE_CONFIG.starSystems.maximumIdentityAliases);
    existing.visualFlags = [...new Set([...(existing.visualFlags ?? []), ...(system.visualFlags ?? [])])];
    existing.createdAt = existing.createdAt < system.createdAt ? existing.createdAt : system.createdAt;
    existing.lastActiveAt = existing.lastActiveAt > system.lastActiveAt ? existing.lastActiveAt : system.lastActiveAt;
    existing.pendingActivityCount += system.pendingActivityCount || 0;
    existing.totalTasksProcessed += system.totalTasksProcessed || 0;
    existing.totalSignalsSent += system.totalSignalsSent || 0;
    existing.totalSignalsReceived += system.totalSignalsReceived || 0;
    existing.totalCrossSystemSignals += system.totalCrossSystemSignals || 0;
    existing.maturity = Math.max(existing.maturity, system.maturity);
    existing.intensity = Math.max(existing.intensity, system.intensity);
    if (existing.lifecycleState === "nebula" && system.lifecycleState !== "nebula") existing.lifecycleState = system.lifecycleState;
    for (const key of identityKeys) owners.set(key, existing);
  }
  if (redirects.size) {
    const canonicalSystemId = (id: string) => redirects.get(id) ?? id;
    state.starSystems = state.starSystems.filter(({ id }) => !redirects.has(id));
    for (const planet of state.planets) planet.starSystemId = canonicalSystemId(planet.starSystemId);
    for (const item of [...(state.asteroidBelts ?? []), ...(state.spaceStations ?? []), ...(state.pulsars ?? []), ...(state.activeSystemTransitions ?? [])]) item.systemId = canonicalSystemId(item.systemId);
    if (state.activeStarFormation) state.activeStarFormation.systemId = canonicalSystemId(state.activeStarFormation.systemId);
    for (const signal of state.activeSignals ?? []) { signal.sourceSystemId = canonicalSystemId(signal.sourceSystemId); signal.destinationSystemId = canonicalSystemId(signal.destinationSystemId); }
    state.universe.focusedSystemId = canonicalSystemId(state.universe.focusedSystemId);
    if (state.universe.selectedSystemId) state.universe.selectedSystemId = canonicalSystemId(state.universe.selectedSystemId);
    state.camera.focusedSystemId = canonicalSystemId(state.camera.focusedSystemId);
  }
  const systemIds = new Set(state.starSystems.map(({ id }) => id));
  for (const system of state.starSystems) {
    system.lastNonRemovedLifecycleState ??= system.lifecycleState === "black-hole" ? "stable" : system.lifecycleState === "forming" ? "stable" : system.lifecycleState;
    system.observedAt ||= system.createdAt || iso(now);
    system.lastObservedAt ||= system.lastActiveAt || system.observedAt;
    system.removedAt ??= null;
    system.observationSource ||= system.id === CORE_SYSTEM_ID ? "core" : "legacy";
    system.lastSourceRevision ??= null;
  }
  const planetIds = new Set<string>();
  state.planets = state.planets.filter((planet) => planet?.id && !planetIds.has(planet.id) && planetIds.add(planet.id));
  state.planets.forEach((planet, index) => {
    if (!systemIds.has(planet.starSystemId)) planet.starSystemId = CORE_SYSTEM_ID;
    planet.orbit = planet.orbit && Number.isFinite(planet.orbit.radius) ? planet.orbit : makeOrbit(index, planet.id, planet.starSystemId);
  });
  for (const system of state.starSystems) {
    const planets = state.planets.filter(({ starSystemId }) => starSystemId === system.id);
    system.planetIds = planets.map(({ id }) => id);
    planets.forEach((planet, band) => {
      const orbit = makeOrbit(band, planet.id, system.id);
      Object.assign(planet, planetTraitsForBand(system.id, band));
      planet.orbit = { ...orbit, phase: Number.isFinite(planet.orbit.phase) ? planet.orbit.phase : orbit.phase, speed: Number.isFinite(planet.orbit.speed) ? planet.orbit.speed : orbit.speed, direction: planet.orbit.direction === -1 ? -1 : 1 };
    });
  }
  if (!core.planetIds.length) { const prime = makePlanet(state.planets.length, null, core, now); prime.name = "Codex Prime"; state.planets.unshift(prime); core.planetIds.push(prime.id); planetIds.add(prime.id); }
  const satelliteIds = new Set<string>();
  state.satellites = state.satellites.filter((satellite) => satellite?.id && !satelliteIds.has(satellite.id) && planetIds.has(satellite.planetId) && validTaskKey(satellite.taskKey) && satelliteIds.add(satellite.id));
  const aliasOwners = new Map<string, number>();
  for (const system of state.starSystems) for (const alias of new Set(system.identityAliases ?? [])) aliasOwners.set(alias, (aliasOwners.get(alias) ?? 0) + 1);
  for (const system of state.starSystems) system.identityAliases = [...new Set(system.identityAliases ?? [])].filter((alias) => aliasOwners.get(alias) === 1).slice(-UNIVERSE_CONFIG.starSystems.maximumIdentityAliases);
  state.activeMigrations = (state.activeMigrations ?? []).filter(({ satelliteId, sourcePlanetId, destinationPlanetId }) => satelliteIds.has(satelliteId) && planetIds.has(sourcePlanetId) && planetIds.has(destinationPlanetId));
  state.activeSignals = (state.activeSignals ?? []).filter(({ sourcePlanetId, destinationPlanetId }) => planetIds.has(sourcePlanetId) && planetIds.has(destinationPlanetId));
  const uniqueOwned = <T extends { id: string; systemId: string }>(items: T[] | undefined) => {
    const ids = new Set<string>();
    return (Array.isArray(items) ? items : []).filter((item) => item?.id && systemIds.has(item.systemId) && !ids.has(item.id) && ids.add(item.id));
  };
  state.asteroidBelts = uniqueOwned(state.asteroidBelts).filter((item) => item.sourceId && (item.state === "archived" || item.state === "deleted"));
  state.spaceStations = uniqueOwned(state.spaceStations).filter((item) => item.integrationId);
  state.pulsars = uniqueOwned(state.pulsars).filter((item) => item.automationId);
  state.activeSystemTransitions = uniqueOwned(state.activeSystemTransitions);
  if (state.activeExpansion && (!planetIds.has(state.activeExpansion.parentPlanetId) || !planetIds.has(state.activeExpansion.childPlanetId))) state.activeExpansion = null;
  if (state.activeStarFormation && !systemIds.has(state.activeStarFormation.systemId)) state.activeStarFormation = null;
  state.universe.focusedSystemId = systemIds.has(state.universe.focusedSystemId) ? state.universe.focusedSystemId : CORE_SYSTEM_ID;
  state.universe.selectedSystemId = state.universe.selectedSystemId && systemIds.has(state.universe.selectedSystemId) ? state.universe.selectedSystemId : state.universe.focusedSystemId;
  state.universe.focusedPlanetId = state.universe.focusedPlanetId && planetIds.has(state.universe.focusedPlanetId) ? state.universe.focusedPlanetId : null;
  state.universe.selectedPlanetId = state.universe.selectedPlanetId && planetIds.has(state.universe.selectedPlanetId) ? state.universe.selectedPlanetId : null;
  state.camera.focusedSystemId = state.universe.focusedSystemId;
  state.camera.focusedPlanetId = state.universe.focusedPlanetId;
  state.camera.zoom = Math.max(.35, Math.min(4, Number(state.camera.zoom) || 1));
  state.camera.panX = Number(state.camera.panX) || 0; state.camera.panY = Number(state.camera.panY) || 0; state.camera.rotation = Number(state.camera.rotation) || 0; state.camera.pitch = Math.max(-1.35, Math.min(1.35, Number(state.camera.pitch) || 0));
  state.universe.totalProjects = state.starSystems.length;
  state.universe.expansionInProgress = Boolean(state.activeExpansion);
  return state;
}

export function restoreUniverse(value: unknown, now = Date.now()): UniverseState | null {
  if (!isRecord(value)) return null;
  if (value.version === 2) return migrateVersion2(value, now);
  if (value.version === 3) return migrateVersion3(value, now);
  if (value.version !== 4 || !Array.isArray(value.starSystems) || !Array.isArray(value.planets) || !Array.isArray(value.satellites) || !isRecord(value.universe) || !isRecord(value.camera)) return null;
  const state = repairUniverse(value as unknown as UniverseState, now);
  advanceUniverse(state, now);
  return state;
}

export function resolveProjectSystem(state: UniverseState, input?: ProjectIdentityInput | null, now = Date.now()) {
  const identity = normalizeProjectIdentity(input);
  if (identity.source === "core") return state.starSystems.find(({ id }) => id === CORE_SYSTEM_ID)!;
  const keys = [identity.projectKey, ...identity.aliases];
  const existing = state.starSystems.find((system) => keys.includes(system.projectKey) || system.identityAliases.some((alias) => keys.includes(alias)));
  if (existing) {
    existing.identityAliases = [...new Set([...existing.identityAliases, ...keys.filter((key) => key !== existing.projectKey)])].slice(-UNIVERSE_CONFIG.starSystems.maximumIdentityAliases);
    if (existing.lifecycleState === "black-hole") {
      existing.lifecycleState = existing.lastNonRemovedLifecycleState ?? (existing.planetIds.length ? "stable" : "nebula");
      existing.removedAt = null;
      state.activeSystemTransitions = state.activeSystemTransitions.filter(({ systemId, kind }) => systemId !== existing.id || kind !== "collapse");
    }
    return existing;
  }
  const id = `system_${hash(identity.projectKey)}`;
  const observedAt = iso(now);
  const system: StarSystem = { id, projectKey: identity.projectKey, identitySource: identity.source, identityAliases: identity.aliases.slice(-UNIVERSE_CONFIG.starSystems.maximumIdentityAliases), displayName: identity.displayName, lifecycleState: "nebula", lastNonRemovedLifecycleState: "nebula", observedAt, lastObservedAt: observedAt, removedAt: null, observationSource: "activity", lastSourceRevision: null, visualFlags: [], position: systemPosition(state.starSystems.length), radius: .28, color: SYSTEM_COLORS[state.starSystems.length % SYSTEM_COLORS.length], intensity: .76, maturity: 0, planetIds: [], pendingActivityCount: 0, createdAt: observedAt, lastActiveAt: observedAt, totalTasksProcessed: 0, totalSignalsSent: 0, totalSignalsReceived: 0, totalCrossSystemSignals: 0 };
  state.starSystems.push(system); state.universe.totalProjects = state.starSystems.length;
  return system;
}

function observationIsCurrent(lastObservedAt: string, observedAt: string) { return Date.parse(observedAt) >= Date.parse(lastObservedAt); }

export function reconcileUniverseSnapshot(state: UniverseState, snapshot: UniverseObservationSnapshot, now = Date.now()) {
  const observedAt = Number.isFinite(Date.parse(snapshot.observedAt)) ? snapshot.observedAt : iso(now);
  for (const project of snapshot.projects ?? []) {
    const identity = normalizeProjectIdentity(project.identity);
    if (identity.source === "core") continue;
    const keys = [identity.projectKey, ...identity.aliases];
    let system = state.starSystems.find((candidate) => keys.includes(candidate.projectKey) || candidate.identityAliases.some((alias) => keys.includes(alias)));
    const migratedMatches = state.starSystems.filter((candidate) => candidate.id !== CORE_SYSTEM_ID && candidate.lifecycleState !== "black-hole" && candidate.observationSource === "version-3-migration" && canonicalProjectName(candidate.displayName) === canonicalProjectName(identity.displayName));
    if (migratedMatches.length === 1 && system !== migratedMatches[0]) {
      migratedMatches[0].identityAliases = [...new Set([...migratedMatches[0].identityAliases, ...keys])].slice(-UNIVERSE_CONFIG.starSystems.maximumIdentityAliases);
      repairUniverse(state, now);
      system = migratedMatches[0];
    }
    if (!system) system = resolveProjectSystem(state, project.identity, Date.parse(observedAt));
    if (!observationIsCurrent(system.lastObservedAt, observedAt)) continue;
    system.identityAliases = [...new Set([...system.identityAliases, ...keys.filter((key) => key !== system.projectKey)])].slice(-UNIVERSE_CONFIG.starSystems.maximumIdentityAliases);
    system.displayName = identity.displayName;
    system.lastObservedAt = observedAt;
    system.observationSource = snapshot.source;
    system.lastSourceRevision = snapshot.revision ?? system.lastSourceRevision;
    if (project.removed && project.removalAuthoritative) {
      if (system.id === CORE_SYSTEM_ID || system.lifecycleState === "black-hole") continue;
      system.lastNonRemovedLifecycleState = system.lifecycleState === "forming" ? "stable" : system.lifecycleState;
      system.lifecycleState = "black-hole";
      system.removedAt = observedAt;
      state.activeSystemTransitions = state.activeSystemTransitions.filter(({ systemId }) => systemId !== system.id);
      state.activeSystemTransitions.push({ id: `transition_collapse_${system.id}`, systemId: system.id, kind: "collapse", startedAt: observedAt });
    } else if (system.lifecycleState === "black-hole") {
      system.lifecycleState = system.lastNonRemovedLifecycleState ?? (system.planetIds.length ? "stable" : "nebula");
      system.removedAt = null;
      state.activeSystemTransitions = state.activeSystemTransitions.filter(({ systemId }) => systemId !== system.id);
      state.activeSystemTransitions.push({ id: `transition_recovery_${system.id}`, systemId: system.id, kind: "recovery", startedAt: observedAt });
    }
  }
  for (const chat of snapshot.chats ?? []) {
    if (!chat.sourceId) continue;
    const system = resolveProjectSystem(state, chat.project, Date.parse(observedAt));
    const id = `asteroid_${hash(`${system.id}:${chat.sourceId}`)}`;
    const existing = state.asteroidBelts.find((item) => item.id === id);
    const changedAt = chat.changedAt && Number.isFinite(Date.parse(chat.changedAt)) ? chat.changedAt : observedAt;
    if (existing && !observationIsCurrent(existing.changedAt, changedAt)) continue;
    if (chat.state === "active") {
      if (existing?.archivedSatellite && !state.satellites.some(({ id: satelliteId }) => satelliteId === existing.archivedSatellite!.id)) state.satellites.push(existing.archivedSatellite);
      state.asteroidBelts = state.asteroidBelts.filter((item) => item.id !== id);
      continue;
    }
    if (chat.state === "deleted" && !UNIVERSE_CONFIG.universeObjects.deletedChatTombstonesEnabled) continue;
    const satellite = state.satellites.find((item) => item.id === chat.satelliteId || item.sourceId === chat.sourceId);
    if (satellite) state.satellites = state.satellites.filter(({ id: satelliteId }) => satelliteId !== satellite.id);
    const asteroid: Asteroid = { id, sourceId: chat.sourceId, systemId: system.id, state: chat.state, title: chat.title?.trim() || "Archived chat", lastActiveAt: chat.lastActiveAt ?? observedAt, changedAt, recoverable: chat.state === "archived", archivedSatellite: satellite ?? existing?.archivedSatellite };
    if (existing) Object.assign(existing, asteroid); else state.asteroidBelts.push(asteroid);
  }
  for (const station of snapshot.stations ?? []) {
    if (!station.integrationId) continue;
    const system = resolveProjectSystem(state, station.project, Date.parse(observedAt));
    const id = `station_${hash(`${station.kind}:${station.integrationId}:${system.id}`)}`;
    const existing = state.spaceStations.find((item) => item.id === id);
    if (existing && !observationIsCurrent(existing.lastObservedAt, observedAt)) continue;
    const value: SpaceStation = { id, systemId: system.id, kind: station.kind, integrationId: station.integrationId, displayName: station.displayName, status: station.status, firstObservedAt: existing?.firstObservedAt ?? observedAt, lastObservedAt: observedAt, lastUsedAt: station.lastUsedAt ?? existing?.lastUsedAt ?? null };
    if (existing) Object.assign(existing, value); else state.spaceStations.push(value);
  }
  for (const pulsar of snapshot.pulsars ?? []) {
    if (!pulsar.automationId) continue;
    const system = resolveProjectSystem(state, pulsar.project, Date.parse(observedAt));
    const id = `pulsar_${hash(`${pulsar.automationId}:${system.id}`)}`;
    const existing = state.pulsars.find((item) => item.id === id);
    if (existing && !observationIsCurrent(existing.lastObservedAt, observedAt)) continue;
    const value: Pulsar = { id, systemId: system.id, automationId: pulsar.automationId, displayName: pulsar.displayName, schedule: pulsar.schedule, status: pulsar.status, firstObservedAt: existing?.firstObservedAt ?? observedAt, lastObservedAt: observedAt, lastRunAt: pulsar.lastRunAt ?? existing?.lastRunAt ?? null };
    if (existing) Object.assign(existing, value); else state.pulsars.push(value);
  }
  repairUniverse(state, now);
  return state;
}

function beginStarFormation(state: UniverseState, system: StarSystem, now: number) {
  if (system.lifecycleState !== "nebula" || system.pendingActivityCount < UNIVERSE_CONFIG.starSystems.minimumActivitiesToMaterialize) return;
  system.lifecycleState = "forming";
  system.lastNonRemovedLifecycleState = "stable";
  if (!system.planetIds.length) {
    const position = { ...system.position };
    const planet = makePlanet(state.planets.length, null, system, now); state.planets.push(planet); system.planetIds.push(planet.id); relayoutStarSystems(state);
    system.position = position; planet.position = position;
  }
  if (state.activeStarFormation) {
    system.lifecycleState = "stable";
    for (const planet of state.planets.filter(({ starSystemId }) => starSystemId === system.id)) { planet.lifecycleState = "stable"; planet.maturity = Math.max(.35, planet.maturity); }
    return;
  }
  state.activeStarFormation = { id: `formation_${system.id}_${now}`, systemId: system.id, phase: "spark", startedAt: iso(now), durationMs: UNIVERSE_CONFIG.starSystems.formationDurationMs, progress: 0 };
  state.activeSystemTransitions = state.activeSystemTransitions.filter(({ systemId }) => systemId !== system.id);
  state.activeSystemTransitions.push({ id: `transition_formation_${system.id}`, systemId: system.id, kind: "formation", startedAt: iso(now) });
}

export function beginExpansion(state: UniverseState, parentPlanetId: string, now = Date.now()): Planet | null {
  if (state.universe.expansionInProgress || state.universe.paused || state.planets.length >= 100) return null;
  const parent = state.planets.find(({ id }) => id === parentPlanetId);
  const system = parent && state.starSystems.find(({ id }) => id === parent.starSystemId);
  if (!parent || !system || !["stable", "preparing-expansion", "active", "communicating"].includes(parent.lifecycleState) || planetPopulation(state, parent.id) < UNIVERSE_CONFIG.planetCapacity.expansionThreshold) return null;
  const child = makePlanet(state.planets.length, parent, system, now);
  parent.childPlanetIds.push(child.id); parent.lifecycleState = "launching"; system.planetIds.push(child.id); state.planets.push(child);
  relayoutStarSystems(state);
  state.universe.expansionInProgress = true; state.universe.totalExpansions += 1;
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
    satellite.previousPlanetId = expansion.parentPlanetId; satellite.migrationState = "queued";
    const wave = Math.floor(index / UNIVERSE_CONFIG.migration.maximumWaveSize);
    return { id: `migration_${expansion.id}_${satellite.id}`, satelliteId: satellite.id, sourcePlanetId: expansion.parentPlanetId, destinationPlanetId: expansion.childPlanetId, startedAt: iso(now + UNIVERSE_CONFIG.expansion.redistributionDelayMs + wave * UNIVERSE_CONFIG.migration.waveDelayMs), durationMs: UNIVERSE_CONFIG.migration.durationMs, progress: 0, state: "queued" };
  });
}

export function advanceUniverse(state: UniverseState, now = Date.now()) {
  const formation = state.activeStarFormation;
  if (formation) {
    formation.progress = Math.max(0, Math.min(1, (now - Date.parse(formation.startedAt)) / formation.durationMs));
    formation.phase = formation.progress < .2 ? "spark" : formation.progress < .45 ? "core" : formation.progress < .72 ? "signal" : "stabilizing";
    const system = state.starSystems.find(({ id }) => id === formation.systemId);
    if (!system) state.activeStarFormation = null;
    else if (formation.progress >= 1) {
      system.lifecycleState = "stable";
      system.lastNonRemovedLifecycleState = "stable";
      for (const planet of state.planets.filter(({ starSystemId }) => starSystemId === system.id)) { planet.lifecycleState = "stable"; planet.maturity = Math.max(.35, planet.maturity); }
      state.activeStarFormation = null;
      state.activeSystemTransitions = state.activeSystemTransitions.filter(({ systemId, kind }) => systemId !== system.id || kind !== "formation");
    }
  } else {
    const ready = state.starSystems.find((system) => system.lifecycleState === "nebula" && system.pendingActivityCount >= UNIVERSE_CONFIG.starSystems.minimumActivitiesToMaterialize);
    if (ready) beginStarFormation(state, ready, now);
  }

  const expansion = state.activeExpansion;
  if (expansion) {
    const elapsed = Math.max(0, now - Date.parse(expansion.startedAt));
    const launchEnd = UNIVERSE_CONFIG.expansion.launchDurationMs;
    const formationEnd = launchEnd + UNIVERSE_CONFIG.expansion.formationDurationMs;
    const parent = state.planets.find(({ id }) => id === expansion.parentPlanetId);
    const child = state.planets.find(({ id }) => id === expansion.childPlanetId);
    if (!parent || !child) { state.activeExpansion = null; state.universe.expansionInProgress = false; }
    else if (elapsed < launchEnd) { expansion.phase = "launching"; expansion.progress = elapsed / launchEnd; parent.lifecycleState = "launching"; }
    else if (elapsed < formationEnd) { expansion.phase = "forming"; expansion.progress = (elapsed - launchEnd) / UNIVERSE_CONFIG.expansion.formationDurationMs; child.lifecycleState = expansion.progress > .76 ? "stabilizing" : "forming"; child.maturity = .16 + expansion.progress * .34; }
    else {
      const entering = expansion.phase !== "redistributing"; expansion.phase = "redistributing"; expansion.progress = 1; parent.lifecycleState = "redistributing"; child.lifecycleState = "redistributing";
      if (entering) state.camera.mode = "migration-cinematic";
      if (!state.activeMigrations.length && !state.satellites.some(({ migrationState }) => migrationState !== "none")) planRedistribution(state, expansion, now);
    }
  }

  const satellitesById = new Map(state.satellites.map((satellite) => [satellite.id, satellite]));
  for (const migration of state.activeMigrations) {
    migration.progress = Math.max(0, Math.min(1, (now - Date.parse(migration.startedAt)) / migration.durationMs));
    migration.state = migration.progress <= 0 ? "queued" : migration.progress < .15 ? "departing" : migration.progress < .75 ? "in-transit" : migration.progress < .92 ? "arriving" : "settling";
    const satellite = satellitesById.get(migration.satelliteId); if (satellite) satellite.migrationState = migration.state;
    if (migration.progress >= 1 && satellite) { satellite.planetId = migration.destinationPlanetId; satellite.migrationState = "none"; satellite.transferHistory.push({ from: migration.sourcePlanetId, to: migration.destinationPlanetId, completedAt: iso(now) }); }
  }
  state.activeMigrations = state.activeMigrations.filter(({ progress }) => progress < 1);
  if (state.activeExpansion?.phase === "redistributing" && !state.activeMigrations.length && !state.satellites.some(({ migrationState }) => migrationState !== "none")) {
    const parent = state.planets.find(({ id }) => id === state.activeExpansion?.parentPlanetId); const child = state.planets.find(({ id }) => id === state.activeExpansion?.childPlanetId);
    if (parent) parent.lifecycleState = "stable"; if (child) { child.lifecycleState = "stable"; child.maturity = Math.max(child.maturity, .5); }
    state.activeExpansion = null; state.universe.expansionInProgress = false;
    if (state.camera.mode === "migration-cinematic" || state.camera.mode === "launch-cinematic") state.camera.mode = "star-system-focus";
  }

  for (let index = state.activeSignals.length - 1; index >= 0; index -= 1) {
    const signal = state.activeSignals[index]; signal.progress = Math.max(0, Math.min(1, (now - Date.parse(signal.startedAt)) / signal.durationMs)); if (signal.progress >= 1) state.activeSignals.splice(index, 1);
  }
  const dormantBefore = now - UNIVERSE_CONFIG.starSystems.dormantAfterDays * 86_400_000;
  for (const system of state.starSystems) if (system.id !== CORE_SYSTEM_ID && system.lifecycleState === "stable" && Date.parse(system.lastActiveAt) < dormantBefore) { system.lifecycleState = "dormant"; system.lastNonRemovedLifecycleState = "dormant"; }
}

export function addSatellite(state: UniverseState, satellite: Omit<UniverseSatellite, "planetId" | "previousPlanetId" | "migrationState" | "orbitSlot" | "transferHistory">, project?: ProjectIdentityInput | null, now = Date.now()) {
  if (state.satellites.some(({ id }) => id === satellite.id)) return null;
  const system = resolveProjectSystem(state, project, now);
  system.pendingActivityCount += 1; system.totalTasksProcessed += 1; system.lastActiveAt = iso(now); system.maturity = Math.min(1, system.totalTasksProcessed / 200);
  if (system.lifecycleState === "dormant") { system.lifecycleState = "stable"; system.lastNonRemovedLifecycleState = "stable"; }
  beginStarFormation(state, system, now);
  const destinationSystem = system.lifecycleState === "nebula" || system.lifecycleState === "black-hole" ? state.starSystems.find(({ id }) => id === CORE_SYSTEM_ID)! : system;
  const stable = state.planets.filter((planet) => planet.starSystemId === destinationSystem.id && !["forming", "stabilizing", "launching"].includes(planet.lifecycleState));
  const planet = stable.sort((a, b) => planetPopulation(state, a.id) - planetPopulation(state, b.id))[0] ?? state.planets.find(({ id }) => id === destinationSystem.planetIds[0]) ?? state.planets[0];
  const stored = { ...satellite, planetId: planet.id, previousPlanetId: null, migrationState: "none" as const, orbitSlot: planetPopulation(state, planet.id), transferHistory: [] };
  state.satellites.push(stored); planet.lastActiveAt = iso(now); planet.totalTasksProcessed += 1; planet.maturity = Math.min(1, Math.max(planet.maturity, .35 + planet.totalTasksProcessed / 200)); state.universe.totalTasks += 1;
  evaluateExpansion(state, now);
  return stored;
}

function addSignal(state: UniverseState, source: Planet, destination: Planet, taskKey: TaskKey, now: number, crossSystem: boolean) {
  const duration = { think: 2_800, search: 1_500, tool: 1_200, write: 1_900, verify: 2_100 }[taskKey] + (crossSystem ? 1_800 : 0);
  const signal: UniverseSignal = { id: `signal_${state.universe.totalSignals + 1}`, sourcePlanetId: source.id, destinationPlanetId: destination.id, sourceSystemId: source.starSystemId, destinationSystemId: destination.starSystemId, crossSystem, taskKey, startedAt: iso(now), durationMs: duration, progress: 0, response: taskKey !== "write" };
  state.activeSignals.push(signal);
  const localLimit = UNIVERSE_CONFIG.communication.maximumConcurrentSignals; const crossLimit = UNIVERSE_CONFIG.crossSystemCommunication.maximumConcurrentSignals;
  const excess = state.activeSignals.filter(({ crossSystem: cross }) => cross === crossSystem).length - (crossSystem ? crossLimit : localLimit);
  if (excess > 0) { const index = state.activeSignals.findIndex(({ crossSystem: cross }) => cross === crossSystem); state.activeSignals.splice(index, excess); }
  source.totalSignalsSent += 1; destination.totalSignalsReceived += 1; source.lifecycleState = "communicating"; destination.lifecycleState = "communicating"; state.universe.totalSignals += 1;
  const sourceSystem = state.starSystems.find(({ id }) => id === source.starSystemId); const destinationSystem = state.starSystems.find(({ id }) => id === destination.starSystemId);
  if (sourceSystem) sourceSystem.totalSignalsSent += 1;
  if (destinationSystem) destinationSystem.totalSignalsReceived += 1;
  if (crossSystem) { state.universe.totalCrossSystemSignals += 1; if (sourceSystem) sourceSystem.totalCrossSystemSignals += 1; if (destinationSystem) destinationSystem.totalCrossSystemSignals += 1; }
  return signal;
}

export function routeSignal(state: UniverseState, taskKey: TaskKey, now = Date.now()): UniverseSignal | null {
  const source = state.planets.find(({ id }) => id === (state.universe.selectedPlanetId ?? state.universe.focusedPlanetId)) ?? state.planets[0];
  const destinations = state.planets.filter(({ id, starSystemId, lifecycleState }) => id !== source.id && starSystemId === source.starSystemId && lifecycleState !== "forming");
  if (!destinations.length) return null;
  const score = (planet: Planet) => state.satellites.reduce((total, satellite) => total + Number(satellite.planetId === planet.id && satellite.taskKey === taskKey), 0) - planetPopulation(state, planet.id) * .02;
  return addSignal(state, source, destinations.sort((a, b) => score(b) - score(a))[0], taskKey, now, false);
}

export function routeCrossSystemSignal(state: UniverseState, sourceSystemId: string, destinationSystemId: string, taskKey: TaskKey, now = Date.now()) {
  if (!UNIVERSE_CONFIG.crossSystemCommunication.enabled || sourceSystemId === destinationSystemId) return null;
  const source = state.planets.find(({ starSystemId, lifecycleState }) => starSystemId === sourceSystemId && lifecycleState !== "forming");
  const destination = state.planets.find(({ starSystemId, lifecycleState }) => starSystemId === destinationSystemId && lifecycleState !== "forming");
  return source && destination ? addSignal(state, source, destination, taskKey, now, true) : null;
}

function systemSummary(state: UniverseState, system: StarSystem): StarSystemSummary {
  const planetIds = new Set(system.planetIds);
  const counts = new Map<TaskKey, number>();
  for (const satellite of state.satellites) if (planetIds.has(satellite.planetId)) counts.set(satellite.taskKey, (counts.get(satellite.taskKey) ?? 0) + 1);
  return { ...system, satelliteCount: systemPopulation(state, system.id), asteroidCount: state.asteroidBelts.filter(({ systemId }) => systemId === system.id).length, stationCount: state.spaceStations.filter(({ systemId }) => systemId === system.id).length, pulsarCount: state.pulsars.filter(({ systemId }) => systemId === system.id).length, dominantActivityTypes: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([key]) => key) };
}

export function summarizeUniverse(state: UniverseState): UniverseSummary {
  const systems = state.starSystems.map((system) => systemSummary(state, system));
  const selectedSystemId = state.universe.selectedSystemId ?? state.universe.focusedSystemId;
  const selectedSystem = systems.find(({ id }) => id === selectedSystemId) ?? systems[0] ?? null;
  const selectedSystemPlanets = selectedSystem ? state.planets.filter(({ starSystemId }) => starSystemId === selectedSystem.id) : [];
  const selectedPlanet = state.planets.find(({ id }) => id === state.universe.selectedPlanetId) ?? null;
  return { systemCount: systems.length, planetCount: state.planets.length, satelliteCount: state.satellites.length, activeSignals: state.activeSignals.length, activeMigrations: state.activeMigrations.length, systems, selectedSystem, selectedSystemPlanets, selectedSystemPopulation: selectedSystem?.satelliteCount ?? 0, selectedPlanet, selectedPlanetSystem: selectedPlanet ? state.starSystems.find(({ id }) => id === selectedPlanet.starSystemId) ?? null : null, selectedPopulation: selectedPlanet ? planetPopulation(state, selectedPlanet.id) : 0, formation: state.activeStarFormation, expansion: state.activeExpansion, cameraMode: state.camera.mode, asteroidCount: state.asteroidBelts.length, stationCount: state.spaceStations.length, pulsarCount: state.pulsars.length };
}

export function assertUniverseIntegrity(state: UniverseState) {
  const systemIds = new Set(state.starSystems.map(({ id }) => id));
  if (systemIds.size !== state.starSystems.length || state.starSystems.filter(({ id }) => id === CORE_SYSTEM_ID).length !== 1) throw new Error("Invalid star-system registry");
  const core = state.starSystems.find(({ id }) => id === CORE_SYSTEM_ID)!;
  if (core.lifecycleState !== "stable" || core.removedAt) throw new Error("Codex Core cannot collapse");
  const planetIds = new Set(state.planets.map(({ id }) => id));
  if (planetIds.size !== state.planets.length) throw new Error("Duplicate planet ID");
  for (const planet of state.planets) if (!systemIds.has(planet.starSystemId) || state.starSystems.filter(({ planetIds: ids }) => ids.includes(planet.id)).length !== 1) throw new Error("Planet has no unique star-system owner");
  const aliases = new Set<string>();
  for (const system of state.starSystems) {
    for (const alias of [system.projectKey, ...system.identityAliases]) { if (aliases.has(alias)) throw new Error("Project identity has multiple owners"); aliases.add(alias); }
    if (system.lifecycleState === "black-hole" && !system.lastNonRemovedLifecycleState) throw new Error("Black hole has no recovery state");
  }
  const satelliteIds = new Set<string>();
  for (const satellite of state.satellites) { if (satelliteIds.has(satellite.id)) throw new Error("Duplicate satellite ID"); if (!planetIds.has(satellite.planetId)) throw new Error("Satellite has no planet owner"); satelliteIds.add(satellite.id); }
  for (const [kind, items] of [["asteroid", state.asteroidBelts.map((item) => ({ ...item, source: item.sourceId }))], ["station", state.spaceStations.map((item) => ({ ...item, source: item.integrationId }))], ["pulsar", state.pulsars.map((item) => ({ ...item, source: item.automationId }))]] as const) {
    const keys = new Set<string>();
    for (const item of items) {
      if (!systemIds.has(item.systemId)) throw new Error(`${kind} has no system owner`);
      const key = `${item.systemId}:${item.source}`;
      if (keys.has(key)) throw new Error(`Duplicate ${kind} source ID`);
      keys.add(key);
    }
  }
  for (const transition of state.activeSystemTransitions) if (!systemIds.has(transition.systemId)) throw new Error("Transition has no system owner");
}

import type { SatelliteNameMetadata } from "./satellite-naming";

export type TaskKey = "think" | "search" | "tool" | "write" | "verify";
export type Point3D = { x: number; y: number; z: number };
export type PlanetState = "forming" | "stabilizing" | "stable" | "active" | "communicating" | "preparing-expansion" | "launching" | "redistributing" | "dormant";
export type StarSystemState = "latent" | "forming" | "stabilizing" | "stable" | "active" | "communicating" | "dormant";
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
  version: 3;
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
  activeStarFormation: StarFormation | null;
  activeExpansion: Expansion | null;
  activeMigrations: Migration[];
  activeSignals: UniverseSignal[];
  camera: { mode: CameraMode; focusedSystemId: string; focusedPlanetId: string | null; panX: number; panY: number; zoom: number; rotation: number; pitch: number };
};

export type StarSystemSummary = StarSystem & { satelliteCount: number; dominantActivityTypes: TaskKey[] };
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
};

export const UNIVERSE_STORAGE_KEY = "codex-lb-living-universe-v3";
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
  planetOrbits: { baseRadius: 3.4, bandSpacing: 2.4, verticalAmplitude: 0.35, minimumSpeed: 0.008, maximumSpeed: 0.024 },
  crossSystemCommunication: { enabled: true, maximumConcurrentSignals: 24, idleTrafficEnabled: false },
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

function makeCore(now: number): StarSystem {
  return { id: CORE_SYSTEM_ID, projectKey: "codex:core", identitySource: "core", identityAliases: [], displayName: UNIVERSE_CONFIG.starSystems.coreSystemName, lifecycleState: "stable", visualFlags: [], position: systemPosition(0), radius: .32, color: SYSTEM_COLORS[0], intensity: .85, maturity: 1, planetIds: [], pendingActivityCount: 0, createdAt: iso(now), lastActiveAt: iso(now), totalTasksProcessed: 0, totalSignalsSent: 0, totalSignalsReceived: 0, totalCrossSystemSignals: 0 };
}

function makeOrbit(systemPlanetIndex: number, planetId: string, systemId: string): PlanetOrbit {
  const seed = Number.parseInt(hash(`${systemId}:${planetId}`), 16);
  const band = systemPlanetIndex;
  return {
    band,
    radius: UNIVERSE_CONFIG.planetOrbits.baseRadius + band * UNIVERSE_CONFIG.planetOrbits.bandSpacing,
    inclination: ((seed % 1_000) / 1_000 - .5) * .28,
    phase: (seed % 6_283) / 1_000,
    speed: UNIVERSE_CONFIG.planetOrbits.minimumSpeed + (seed % 1_000) / 1_000 * (UNIVERSE_CONFIG.planetOrbits.maximumSpeed - UNIVERSE_CONFIG.planetOrbits.minimumSpeed),
    direction: seed % 2 ? 1 : -1,
  };
}

function makePlanet(index: number, parent: Planet | null, system: StarSystem, now: number): Planet {
  const id = `planet_${String(index + 1).padStart(4, "0")}`;
  const systemPlanetIndex = system.planetIds.length;
  return {
    id,
    starSystemId: system.id,
    orbit: makeOrbit(systemPlanetIndex, id, system.id),
    name: index ? PLANET_NAMES[(index - 1) % PLANET_NAMES.length] + (index > PLANET_NAMES.length ? ` ${Math.floor(index / PLANET_NAMES.length) + 1}` : "") : "Codex Prime",
    generation: parent ? parent.generation + 1 : 1,
    parentPlanetId: parent?.id ?? null,
    childPlanetIds: [],
    position: system.position,
    radius: 1,
    maturity: index ? .16 : 1,
    lifecycleState: index ? "forming" : "stable",
    createdAt: iso(now),
    lastActiveAt: iso(now),
    totalTasksProcessed: 0,
    totalSignalsSent: 0,
    totalSignalsReceived: 0,
  };
}

export function planetPositionAt(planet: Planet, system: StarSystem, now = Date.now()): Point3D {
  const elapsed = Math.max(0, now - Date.parse(planet.createdAt)) / 1_000;
  const angle = planet.orbit.phase + elapsed * planet.orbit.speed * planet.orbit.direction;
  return {
    x: system.position.x + Math.cos(angle) * planet.orbit.radius,
    y: system.position.y + Math.sin(angle) * Math.sin(planet.orbit.inclination) * planet.orbit.radius + Math.sin(angle * .7) * UNIVERSE_CONFIG.planetOrbits.verticalAmplitude,
    z: system.position.z + Math.sin(angle) * planet.orbit.radius,
  };
}

export function createUniverse(satellites: Omit<UniverseSatellite, "planetId" | "previousPlanetId" | "migrationState" | "orbitSlot" | "transferHistory">[] = [], now = Date.now()): UniverseState {
  const core = makeCore(now);
  const prime = makePlanet(0, null, core, now);
  core.planetIds.push(prime.id);
  return {
    version: 3,
    universe: { id: "codex_universe", seed: "codex-living-balancer-v3", createdAt: iso(now), totalProjects: 1, totalTasks: satellites.length, totalSignals: 0, totalCrossSystemSignals: 0, totalExpansions: 0, focusedSystemId: core.id, focusedPlanetId: prime.id, selectedSystemId: core.id, selectedPlanetId: prime.id, expansionInProgress: false, paused: false },
    starSystems: [core],
    planets: [prime],
    satellites: satellites.map((satellite, orbitSlot) => ({ ...satellite, planetId: prime.id, previousPlanetId: null, migrationState: "none", orbitSlot, transferHistory: [] })),
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
    version: 3,
    universe: { id: "codex_universe", seed: "codex-living-balancer-v3", createdAt: typeof oldUniverse.createdAt === "string" ? oldUniverse.createdAt : iso(now), totalProjects: 1, totalTasks: Number(oldUniverse.totalTasks) || satellites.length, totalSignals: Number(oldUniverse.totalSignals) || 0, totalCrossSystemSignals: 0, totalExpansions: Number(oldUniverse.totalExpansions) || 0, focusedSystemId: core.id, focusedPlanetId, selectedSystemId: core.id, selectedPlanetId, expansionInProgress: Boolean(oldUniverse.expansionInProgress), paused: Boolean(oldUniverse.paused) },
    starSystems: [core], planets, satellites, activeStarFormation: null,
    activeExpansion: isRecord(value.activeExpansion) ? value.activeExpansion as unknown as Expansion : null,
    activeMigrations: Array.isArray(value.activeMigrations) ? value.activeMigrations as Migration[] : [],
    activeSignals: [],
    camera: { mode: value.camera.mode === "universe-overview" ? "star-system-focus" : value.camera.mode === "planet-focus" ? "planet-focus" : "free-navigation", focusedSystemId: core.id, focusedPlanetId, panX: Number(value.camera.panX) || 0, panY: Number(value.camera.panY) || 0, zoom: Number(value.camera.zoom) || 1, rotation: Number(value.camera.rotation) || 0, pitch: Number(value.camera.pitch) || 0 },
  }, now);
}

function validTaskKey(value: unknown): value is TaskKey { return typeof value === "string" && ["think", "search", "tool", "write", "verify"].includes(value); }

function repairUniverse(state: UniverseState, now: number) {
  const seenSystems = new Set<string>();
  state.starSystems = state.starSystems.filter((system) => system?.id && !seenSystems.has(system.id) && seenSystems.add(system.id));
  let core = state.starSystems.find(({ id }) => id === CORE_SYSTEM_ID);
  if (!core) { core = makeCore(now); state.starSystems.unshift(core); }
  core.projectKey = "codex:core"; core.identitySource = "core"; core.displayName = UNIVERSE_CONFIG.starSystems.coreSystemName;
  const owners = new Map<string, StarSystem>();
  const redirects = new Map<string, string>();
  for (const system of state.starSystems) {
    if (system.id === CORE_SYSTEM_ID) continue;
    system.identityAliases ??= [];
    const identityKeys = [system.projectKey, ...system.identityAliases].filter(Boolean).map((key) => `identity:${key}`);
    const name = canonicalProjectName(system.displayName);
    const existing = identityKeys.map((key) => owners.get(key)).find(Boolean) ?? (name ? owners.get(`name:${name}`) : undefined);
    if (!existing) {
      for (const key of identityKeys) owners.set(key, system);
      if (name) owners.set(`name:${name}`, system);
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
    if (existing.lifecycleState === "latent" && system.lifecycleState !== "latent") existing.lifecycleState = system.lifecycleState;
    for (const key of identityKeys) owners.set(key, existing);
  }
  if (redirects.size) {
    const canonicalSystemId = (id: string) => redirects.get(id) ?? id;
    state.starSystems = state.starSystems.filter(({ id }) => !redirects.has(id));
    for (const planet of state.planets) planet.starSystemId = canonicalSystemId(planet.starSystemId);
    if (state.activeStarFormation) state.activeStarFormation.systemId = canonicalSystemId(state.activeStarFormation.systemId);
    for (const signal of state.activeSignals ?? []) { signal.sourceSystemId = canonicalSystemId(signal.sourceSystemId); signal.destinationSystemId = canonicalSystemId(signal.destinationSystemId); }
    state.universe.focusedSystemId = canonicalSystemId(state.universe.focusedSystemId);
    if (state.universe.selectedSystemId) state.universe.selectedSystemId = canonicalSystemId(state.universe.selectedSystemId);
    state.camera.focusedSystemId = canonicalSystemId(state.camera.focusedSystemId);
  }
  const systemIds = new Set(state.starSystems.map(({ id }) => id));
  const planetIds = new Set<string>();
  state.planets = state.planets.filter((planet) => planet?.id && !planetIds.has(planet.id) && planetIds.add(planet.id));
  state.planets.forEach((planet, index) => {
    if (!systemIds.has(planet.starSystemId)) planet.starSystemId = CORE_SYSTEM_ID;
    planet.orbit = planet.orbit && Number.isFinite(planet.orbit.radius) ? planet.orbit : makeOrbit(index, planet.id, planet.starSystemId);
  });
  for (const system of state.starSystems) system.planetIds = state.planets.filter(({ starSystemId }) => starSystemId === system.id).map(({ id }) => id);
  if (!core.planetIds.length) { const prime = makePlanet(state.planets.length, null, core, now); prime.name = "Codex Prime"; state.planets.unshift(prime); core.planetIds.push(prime.id); planetIds.add(prime.id); }
  const satelliteIds = new Set<string>();
  state.satellites = state.satellites.filter((satellite) => satellite?.id && !satelliteIds.has(satellite.id) && planetIds.has(satellite.planetId) && validTaskKey(satellite.taskKey) && satelliteIds.add(satellite.id));
  const aliasOwners = new Map<string, number>();
  for (const system of state.starSystems) for (const alias of new Set(system.identityAliases ?? [])) aliasOwners.set(alias, (aliasOwners.get(alias) ?? 0) + 1);
  for (const system of state.starSystems) system.identityAliases = [...new Set(system.identityAliases ?? [])].filter((alias) => aliasOwners.get(alias) === 1).slice(-UNIVERSE_CONFIG.starSystems.maximumIdentityAliases);
  state.activeMigrations = (state.activeMigrations ?? []).filter(({ satelliteId, sourcePlanetId, destinationPlanetId }) => satelliteIds.has(satelliteId) && planetIds.has(sourcePlanetId) && planetIds.has(destinationPlanetId));
  state.activeSignals = (state.activeSignals ?? []).filter(({ sourcePlanetId, destinationPlanetId }) => planetIds.has(sourcePlanetId) && planetIds.has(destinationPlanetId));
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
  if (value.version !== 3 || !Array.isArray(value.starSystems) || !Array.isArray(value.planets) || !Array.isArray(value.satellites) || !isRecord(value.universe) || !isRecord(value.camera)) return null;
  const state = repairUniverse(value as unknown as UniverseState, now);
  advanceUniverse(state, now);
  return state;
}

export function resolveProjectSystem(state: UniverseState, input?: ProjectIdentityInput | null, now = Date.now()) {
  const identity = normalizeProjectIdentity(input);
  if (identity.source === "core") return state.starSystems.find(({ id }) => id === CORE_SYSTEM_ID)!;
  const keys = [identity.projectKey, ...identity.aliases];
  const existing = state.starSystems.find((system) => keys.includes(system.projectKey) || system.identityAliases.some((alias) => keys.includes(alias)))
    ?? state.starSystems.find((system) => system.id !== CORE_SYSTEM_ID && canonicalProjectName(system.displayName) === canonicalProjectName(identity.displayName));
  if (existing) {
    existing.identityAliases = [...new Set([...existing.identityAliases, ...keys.filter((key) => key !== existing.projectKey)])].slice(-UNIVERSE_CONFIG.starSystems.maximumIdentityAliases);
    existing.lastActiveAt = iso(now);
    return existing;
  }
  const id = `system_${hash(identity.projectKey)}`;
  const system: StarSystem = { id, projectKey: identity.projectKey, identitySource: identity.source, identityAliases: identity.aliases.slice(-UNIVERSE_CONFIG.starSystems.maximumIdentityAliases), displayName: identity.displayName, lifecycleState: "latent", visualFlags: [], position: systemPosition(state.starSystems.length), radius: .28, color: SYSTEM_COLORS[state.starSystems.length % SYSTEM_COLORS.length], intensity: .76, maturity: 0, planetIds: [], pendingActivityCount: 0, createdAt: iso(now), lastActiveAt: iso(now), totalTasksProcessed: 0, totalSignalsSent: 0, totalSignalsReceived: 0, totalCrossSystemSignals: 0 };
  state.starSystems.push(system); state.universe.totalProjects = state.starSystems.length;
  return system;
}

function beginStarFormation(state: UniverseState, system: StarSystem, now: number) {
  if (system.lifecycleState !== "latent" || system.pendingActivityCount < UNIVERSE_CONFIG.starSystems.minimumActivitiesToMaterialize) return;
  system.lifecycleState = "forming";
  if (!system.planetIds.length) { const planet = makePlanet(state.planets.length, null, system, now); state.planets.push(planet); system.planetIds.push(planet.id); }
  if (state.activeStarFormation) {
    system.lifecycleState = "stable";
    for (const planet of state.planets.filter(({ starSystemId }) => starSystemId === system.id)) { planet.lifecycleState = "stable"; planet.maturity = Math.max(.35, planet.maturity); }
    return;
  }
  state.activeStarFormation = { id: `formation_${system.id}_${now}`, systemId: system.id, phase: "spark", startedAt: iso(now), durationMs: UNIVERSE_CONFIG.starSystems.formationDurationMs, progress: 0 };
}

export function beginExpansion(state: UniverseState, parentPlanetId: string, now = Date.now()): Planet | null {
  if (state.universe.expansionInProgress || state.universe.paused || state.planets.length >= 100) return null;
  const parent = state.planets.find(({ id }) => id === parentPlanetId);
  const system = parent && state.starSystems.find(({ id }) => id === parent.starSystemId);
  if (!parent || !system || !["stable", "preparing-expansion", "active", "communicating"].includes(parent.lifecycleState) || planetPopulation(state, parent.id) < UNIVERSE_CONFIG.planetCapacity.expansionThreshold) return null;
  const child = makePlanet(state.planets.length, parent, system, now);
  parent.childPlanetIds.push(child.id); parent.lifecycleState = "launching"; system.planetIds.push(child.id); state.planets.push(child);
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
      for (const planet of state.planets.filter(({ starSystemId }) => starSystemId === system.id)) { planet.lifecycleState = "stable"; planet.maturity = Math.max(.35, planet.maturity); }
      state.activeStarFormation = null;
    } else if (formation.progress >= .72) system.lifecycleState = "stabilizing";
  } else {
    const ready = state.starSystems.find((system) => system.lifecycleState === "latent" && system.pendingActivityCount >= UNIVERSE_CONFIG.starSystems.minimumActivitiesToMaterialize);
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
  for (const system of state.starSystems) if (system.lifecycleState === "communicating" && !state.activeSignals.some((signal) => signal.sourceSystemId === system.id || signal.destinationSystemId === system.id)) system.lifecycleState = "active";
  const dormantBefore = now - UNIVERSE_CONFIG.starSystems.dormantAfterDays * 86_400_000;
  for (const system of state.starSystems) if (system.id !== CORE_SYSTEM_ID && !["latent", "forming", "stabilizing"].includes(system.lifecycleState) && Date.parse(system.lastActiveAt) < dormantBefore) system.lifecycleState = "dormant";
}

export function addSatellite(state: UniverseState, satellite: Omit<UniverseSatellite, "planetId" | "previousPlanetId" | "migrationState" | "orbitSlot" | "transferHistory">, project?: ProjectIdentityInput | null, now = Date.now()) {
  if (state.satellites.some(({ id }) => id === satellite.id)) return null;
  const system = resolveProjectSystem(state, project, now);
  system.pendingActivityCount += 1; system.totalTasksProcessed += 1; system.lastActiveAt = iso(now); system.maturity = Math.min(1, system.totalTasksProcessed / 200);
  if (system.lifecycleState === "stable" || system.lifecycleState === "dormant") system.lifecycleState = "active";
  beginStarFormation(state, system, now);
  const destinationSystem = system.lifecycleState === "latent" ? state.starSystems.find(({ id }) => id === CORE_SYSTEM_ID)! : system;
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
  if (sourceSystem) { sourceSystem.totalSignalsSent += 1; sourceSystem.lifecycleState = "communicating"; }
  if (destinationSystem) { destinationSystem.totalSignalsReceived += 1; destinationSystem.lifecycleState = "communicating"; }
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
  return { ...system, satelliteCount: systemPopulation(state, system.id), dominantActivityTypes: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([key]) => key) };
}

export function summarizeUniverse(state: UniverseState): UniverseSummary {
  const systems = state.starSystems.filter(({ lifecycleState }) => lifecycleState !== "latent").map((system) => systemSummary(state, system));
  const selectedSystemId = state.universe.selectedSystemId ?? state.universe.focusedSystemId;
  const selectedSystem = systems.find(({ id }) => id === selectedSystemId) ?? systems[0] ?? null;
  const selectedSystemPlanets = selectedSystem ? state.planets.filter(({ starSystemId }) => starSystemId === selectedSystem.id) : [];
  const selectedPlanet = state.planets.find(({ id }) => id === state.universe.selectedPlanetId) ?? null;
  return { systemCount: systems.length, planetCount: state.planets.length, satelliteCount: state.satellites.length, activeSignals: state.activeSignals.length, activeMigrations: state.activeMigrations.length, systems, selectedSystem, selectedSystemPlanets, selectedSystemPopulation: selectedSystem?.satelliteCount ?? 0, selectedPlanet, selectedPlanetSystem: selectedPlanet ? state.starSystems.find(({ id }) => id === selectedPlanet.starSystemId) ?? null : null, selectedPopulation: selectedPlanet ? planetPopulation(state, selectedPlanet.id) : 0, formation: state.activeStarFormation, expansion: state.activeExpansion, cameraMode: state.camera.mode };
}

export function assertUniverseIntegrity(state: UniverseState) {
  const systemIds = new Set(state.starSystems.map(({ id }) => id));
  if (systemIds.size !== state.starSystems.length || state.starSystems.filter(({ id }) => id === CORE_SYSTEM_ID).length !== 1) throw new Error("Invalid star-system registry");
  const planetIds = new Set(state.planets.map(({ id }) => id));
  if (planetIds.size !== state.planets.length) throw new Error("Duplicate planet ID");
  for (const planet of state.planets) if (!systemIds.has(planet.starSystemId) || state.starSystems.filter(({ planetIds: ids }) => ids.includes(planet.id)).length !== 1) throw new Error("Planet has no unique star-system owner");
  const aliases = new Set<string>();
  for (const system of state.starSystems) for (const alias of system.identityAliases) { if (aliases.has(alias)) throw new Error("Identity alias has multiple owners"); aliases.add(alias); }
  const satelliteIds = new Set<string>();
  for (const satellite of state.satellites) { if (satelliteIds.has(satellite.id)) throw new Error("Duplicate satellite ID"); if (!planetIds.has(satellite.planetId)) throw new Error("Satellite has no planet owner"); satelliteIds.add(satellite.id); }
}

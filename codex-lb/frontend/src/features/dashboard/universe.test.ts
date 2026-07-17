import { describe, expect, it } from "vitest";

import { generateSatelliteNameMetadata } from "./satellite-naming";
import {
  CORE_SYSTEM_ID,
  UNIVERSE_CONFIG,
  addSatellite,
  advanceUniverse,
  assertUniverseIntegrity,
  createUniverse,
  evaluateExpansion,
  normalizeProjectIdentity,
  planetPositionAt,
  planetPositionOnOrbit,
  reconcileUniverseSnapshot,
  resolveProjectSystem,
  restoreUniverse,
  routeCrossSystemSignal,
  routeSignal,
  summarizeUniverse,
  type ProjectIdentityInput,
  type TaskKey,
} from "./universe";

const makeSatellite = (index: number, taskKey: TaskKey = "search") => ({
  id: `sat_${String(index).padStart(6, "0")}`,
  taskKey,
  naming: { ...generateSatelliteNameMetadata({ type: taskKey === "tool" ? "tools" : taskKey === "think" ? "thinking" : taskKey === "verify" ? "verification" : taskKey === "write" ? "communication" : "search", index, taskSeed: `task-${index}` }), displayName: `TEST-${String(index).padStart(6, "0")}` },
  color: "#37d7ff",
  createdAtIso: new Date(index * 1_000).toISOString(),
});

const project = (path: string, extra: Partial<ProjectIdentityInput> = {}): ProjectIdentityInput => ({ workspaceRoot: path, ...extra });

describe("living project universe", () => {
  it("starts in exactly one Codex Core system with unique ownership", () => {
    const state = createUniverse(Array.from({ length: 79 }, (_, index) => makeSatellite(index + 1)), 0);
    expect(state.version).toBe(4);
    expect(state.starSystems.map(({ id }) => id)).toEqual([CORE_SYSTEM_ID]);
    expect(state.planets[0]).toMatchObject({ name: "Codex Prime", starSystemId: CORE_SYSTEM_ID });
    addSatellite(state, makeSatellite(80), null, 2);
    expect(state.planets[0].lifecycleState).toBe("preparing-expansion");
    assertUniverseIntegrity(state);
  });

  it("normalizes trusted identity without merging display-name collisions", () => {
    const windowsA = normalizeProjectIdentity(project("C:\\Users\\Zach\\LivingBalancer\\"));
    const windowsB = normalizeProjectIdentity(project("c:/users/zach/livingbalancer"));
    expect(windowsA.projectKey).toBe(windowsB.projectKey);

    const state = createUniverse([], 0);
    const first = resolveProjectSystem(state, project("C:/one/shared", { displayName: "Shared" }), 1);
    const second = resolveProjectSystem(state, project("C:/two/shared", { displayName: "Shared" }), 2);
    expect(second.id).not.toBe(first.id);

    const moved = resolveProjectSystem(state, { repositoryId: "repo-42", workspaceRoot: "C:/old/name", displayName: "Old" }, 3);
    const restored = resolveProjectSystem(state, { repositoryId: "repo-42", workspaceRoot: "D:/new/name", displayName: "New" }, 4);
    expect(restored.id).toBe(moved.id);
    expect(restored.identityAliases).toContain("workspace:d:/new/name");
    expect(normalizeProjectIdentity({ ...project("C:/trusted"), prompt: "invented project" } as ProjectIdentityInput).projectKey).toBe("workspace:c:/trusted");
  });

  it("repairs existing duplicate project systems without losing their planets", () => {
    const state = createUniverse([], 0);
    addSatellite(state, makeSatellite(1), project("C:/one", { displayName: "LivingBalancer" }), 1);
    addSatellite(state, makeSatellite(2), project("C:/two", { displayName: "Other" }), 2);
    const projects = state.starSystems.filter(({ id }) => id !== CORE_SYSTEM_ID);
    projects[1].identityAliases.push(projects[0].projectKey);

    const restored = restoreUniverse(structuredClone(state), 3)!;
    const livingSystems = restored.starSystems.filter(({ id }) => id !== CORE_SYSTEM_ID);
    expect(livingSystems).toHaveLength(1);
    expect(restored.planets.filter(({ starSystemId }) => starSystemId === livingSystems[0].id)).toHaveLength(2);
    expect(restored.satellites).toHaveLength(2);
    assertUniverseIntegrity(restored);
  });

  it("reconciles observed projects, removal, and exact-identity recovery idempotently", () => {
    const state = createUniverse([], 0);
    const identity = { repositoryId: "repo-observed", displayName: "Observed" };
    const snapshot = { source: "codex-project-registry", revision: "2", observedAt: new Date(2_000).toISOString(), projects: [{ identity }] };
    reconcileUniverseSnapshot(state, snapshot, 2_000);
    reconcileUniverseSnapshot(state, snapshot, 2_000);
    const system = state.starSystems.find(({ projectKey }) => projectKey === "repo:repo-observed")!;
    expect(system).toMatchObject({ lifecycleState: "nebula", planetIds: [], observationSource: "codex-project-registry" });
    const position = system.position;

    addSatellite(state, makeSatellite(1), identity, 3_000);
    advanceUniverse(state, 9_000);
    expect(system.lifecycleState).toBe("stable");
    reconcileUniverseSnapshot(state, { ...snapshot, revision: "3", observedAt: new Date(10_000).toISOString(), projects: [{ identity, removed: true, removalAuthoritative: true }] }, 10_000);
    expect(system).toMatchObject({ lifecycleState: "black-hole", position, removedAt: new Date(10_000).toISOString() });
    expect(system.planetIds).toHaveLength(1);
    reconcileUniverseSnapshot(state, snapshot, 11_000);
    expect(system.lifecycleState).toBe("black-hole");
    reconcileUniverseSnapshot(state, { ...snapshot, revision: "4", observedAt: new Date(12_000).toISOString() }, 12_000);
    expect(system).toMatchObject({ lifecycleState: "stable", position, removedAt: null });
    assertUniverseIntegrity(state);
  });

  it("reconciles chats, stations, and pulsars without duplicates or private content", () => {
    const state = createUniverse([], 0);
    const identity = { repositoryId: "repo-infra", displayName: "Infra" };
    addSatellite(state, { ...makeSatellite(1), sourceId: "chat-1" }, identity, 1_000);
    const observation = { source: "codex-registry", revision: "1", observedAt: new Date(2_000).toISOString(), chats: [{ sourceId: "chat-1", project: identity, state: "archived" as const, title: "Safe title" }], stations: [{ integrationId: "github", project: identity, kind: "ci" as const, displayName: "GitHub Actions", status: "healthy" as const }], pulsars: [{ automationId: "auto-1", project: identity, displayName: "Nightly", schedule: "daily", status: "healthy" as const }] };
    reconcileUniverseSnapshot(state, observation, 2_000);
    reconcileUniverseSnapshot(state, observation, 2_000);
    expect(state.asteroidBelts).toHaveLength(1);
    expect(state.satellites).toHaveLength(0);
    expect(state.spaceStations).toHaveLength(1);
    expect(state.pulsars).toHaveLength(1);
    expect(JSON.stringify(state)).not.toContain("prompt");
    reconcileUniverseSnapshot(state, { source: observation.source, revision: "2", observedAt: new Date(3_000).toISOString(), chats: [{ sourceId: "chat-1", project: identity, state: "active" }] }, 3_000);
    expect(state.asteroidBelts).toHaveLength(0);
    expect(state.satellites.map(({ sourceId }) => sourceId)).toEqual(["chat-1"]);
    assertUniverseIntegrity(state);
  });

  it("migrates version 3 infrastructure-free state to version 4", () => {
    const current = createUniverse([], 0);
    addSatellite(current, makeSatellite(99), { workspaceRoot: "C:/legacy/project", displayName: "Legacy Project" }, 1);
    const legacySystemId = current.starSystems.find(({ id }) => id !== CORE_SYSTEM_ID)!.id;
    const v3 = structuredClone(current) as unknown as Record<string, unknown>;
    v3.version = 3;
    delete v3.asteroidBelts; delete v3.spaceStations; delete v3.pulsars; delete v3.activeSystemTransitions;
    for (const system of v3.starSystems as Array<Record<string, unknown>>) {
      system.lifecycleState = system.id === CORE_SYSTEM_ID ? "stable" : "latent";
      delete system.lastNonRemovedLifecycleState; delete system.observedAt; delete system.lastObservedAt; delete system.removedAt; delete system.observationSource; delete system.lastSourceRevision;
    }
    const restored = restoreUniverse(v3, 1)!;
    expect(restored).toMatchObject({ version: 4, asteroidBelts: [], spaceStations: [], pulsars: [], activeSystemTransitions: [] });
    expect(restored.starSystems[0]).toMatchObject({ id: CORE_SYSTEM_ID, lifecycleState: "stable" });
    reconcileUniverseSnapshot(restored, { source: "codex-project-registry", observedAt: new Date(2).toISOString(), projects: [{ identity: { repositoryId: "stable-project-id", displayName: "Legacy Project" } }] }, 2);
    expect(restored.starSystems.filter(({ id }) => id !== CORE_SYSTEM_ID).map(({ id }) => id)).toEqual([legacySystemId]);
    expect(restored.starSystems.find(({ id }) => id === legacySystemId)?.identityAliases).toContain("repo:stable-project-id");
    assertUniverseIntegrity(restored);
  });

  it("creates a project star and its first planet on the first activity", () => {
    const state = createUniverse([], 0);
    const identity = project("C:/work/LivingBalancer");
    addSatellite(state, makeSatellite(1), identity, 1_000);
    const system = state.starSystems.find(({ id }) => id !== CORE_SYSTEM_ID)!;
    expect(summarizeUniverse(state).systemCount).toBe(2);
    expect(system.lifecycleState).toBe("forming");
    expect(system.planetIds).toHaveLength(1);
    expect(state.planets.find(({ id }) => id === system.planetIds[0])?.starSystemId).toBe(system.id);
    expect(state.satellites[0].planetId).toBe(system.planetIds[0]);
    advanceUniverse(state, 1_000 + UNIVERSE_CONFIG.starSystems.formationDurationMs + 1);
    expect(system.lifecycleState).toBe("stable");
    expect(resolveProjectSystem(state, identity, 10_000).id).toBe(system.id);
    expect(state.starSystems.filter(({ id }) => id === system.id)).toHaveLength(1);
    assertUniverseIntegrity(state);
  });

  it("migrates version 2 without changing planets, satellites, or active sequences", () => {
    const current = createUniverse(Array.from({ length: 100 }, (_, index) => makeSatellite(index + 1)), 0);
    evaluateExpansion(current, 1_000);
    advanceUniverse(current, 20_000);
    const v2 = {
      version: 2,
      universe: { ...current.universe, focusedPlanetId: "planet_0001", selectedPlanetId: "planet_0001" },
      planets: current.planets.map((planet) => { const legacy: Partial<typeof planet> = { ...planet }; delete legacy.starSystemId; delete legacy.orbit; return legacy; }),
      satellites: current.satellites,
      activeExpansion: current.activeExpansion,
      activeMigrations: current.activeMigrations,
      activeSignals: current.activeSignals,
      camera: { mode: "universe-overview", panX: 4, panY: 5, zoom: 1.2, rotation: .3 },
    };
    const restored = restoreUniverse(structuredClone(v2), 20_001)!;
    expect(restored.starSystems.map(({ id }) => id)).toEqual([CORE_SYSTEM_ID]);
    expect(restored.planets.map(({ id, name }) => ({ id, name }))).toEqual(current.planets.map(({ id, name }) => ({ id, name })));
    expect(restored.planets.every(({ starSystemId }) => starSystemId === CORE_SYSTEM_ID)).toBe(true);
    expect(restored.satellites.map(({ id, planetId }) => ({ id, planetId }))).toEqual(current.satellites.map(({ id, planetId }) => ({ id, planetId })));
    expect(restored.activeExpansion?.id).toBe(current.activeExpansion?.id);
    expect(restored.activeMigrations.map(({ id }) => id)).toEqual(current.activeMigrations.map(({ id }) => id));
    expect(restored.camera.pitch).toBe(0);
    expect(restoreUniverse(structuredClone(restored), 20_002)?.starSystems.filter(({ id }) => id === CORE_SYSTEM_ID)).toHaveLength(1);
    assertUniverseIntegrity(restored);
  });

  it("keeps deterministic orbits bounded and expansion inside its project system", () => {
    const state = createUniverse([], 0);
    const identity = project("C:/work/orbits");
    for (let index = 1; index <= 3; index += 1) addSatellite(state, makeSatellite(index), identity, index * 1_000);
    advanceUniverse(state, 10_000);
    const system = state.starSystems.find(({ id }) => id !== CORE_SYSTEM_ID)!;
    const first = state.planets.find(({ starSystemId }) => starSystemId === system.id)!;
    const position = planetPositionAt(first, system, 50_000);
    expect(planetPositionAt(first, system, 50_000)).toEqual(position);
    expect(Math.hypot(position.x - system.position.x, position.y - system.position.y, position.z - system.position.z)).toBeCloseTo(first.orbit.radius, 8);
    const ringStart = planetPositionOnOrbit(first, system, 0);
    const ringEnd = planetPositionOnOrbit(first, system, Math.PI * 2);
    expect(ringEnd.x).toBeCloseTo(ringStart.x, 8);
    expect(ringEnd.y).toBeCloseTo(ringStart.y, 8);
    expect(ringEnd.z).toBeCloseTo(ringStart.z, 8);
    const restored = restoreUniverse(structuredClone(state), 50_000)!;
    expect(planetPositionAt(restored.planets.find(({ id }) => id === first.id)!, restored.starSystems.find(({ id }) => id === system.id)!, 50_000)).toEqual(position);

    for (let index = 4; index <= 102; index += 1) addSatellite(state, makeSatellite(index), identity, 20_000 + index);
    const child = state.activeExpansion && state.planets.find(({ id }) => id === state.activeExpansion?.childPlanetId);
    expect(child?.starSystemId).toBe(system.id);
    advanceUniverse(state, 40_000);
    advanceUniverse(state, 100_000);
    expect(state.activeMigrations.every((migration) => state.planets.find(({ id }) => id === migration.sourcePlanetId)?.starSystemId === state.planets.find(({ id }) => id === migration.destinationPlanetId)?.starSystemId)).toBe(true);
    assertUniverseIntegrity(state);
  });

  it("repairs planets into varied, coplanar, collision-safe orbits", () => {
    const state = createUniverse([], 0);
    const system = state.starSystems[0];
    const first = state.planets[0];
    for (let index = 1; index < 20; index += 1) state.planets.push({ ...structuredClone(first), id: `unsafe_${index}`, name: `Unsafe ${index}`, radius: 1, orbit: { ...first.orbit, band: index, radius: first.orbit.radius + index * .1, inclination: index } });

    const repaired = restoreUniverse(structuredClone(state), 1)!;
    const planets = repaired.planets.filter(({ starSystemId }) => starSystemId === system.id).sort((a, b) => a.orbit.radius - b.orbit.radius);
    expect(new Set(planets.map(({ radius }) => radius.toFixed(4))).size).toBeGreaterThan(1);
    expect(new Set(planets.map(({ orbit }) => orbit.inclination)).size).toBe(1);
    expect(new Set(planets.map(({ hasRings }) => hasRings))).toEqual(new Set([true, false]));
    expect(planets.some(({ moonCount }) => moonCount === 0)).toBe(true);
    expect(planets.some(({ moonCount }) => moonCount > 0)).toBe(true);
    for (let index = 1; index < planets.length; index += 1) {
      const inner = planets[index - 1];
      const outer = planets[index];
      expect(outer.orbit.radius - inner.orbit.radius - inner.radius - outer.radius).toBeGreaterThanOrEqual(UNIVERSE_CONFIG.planetOrbits.minimumSurfaceClearance);
    }
  });

  it("moves growing star systems far enough apart to contain their planets", () => {
    const state = createUniverse([], 0);
    for (const [offset, path] of [[0, "C:/one"], [10, "C:/two"]] as const) for (let index = 1; index <= 3; index += 1) addSatellite(state, makeSatellite(offset + index), project(path), offset + index);
    const restored = restoreUniverse(structuredClone(state), 10)!;
    for (let index = 0; index < restored.starSystems.length; index += 1) for (let candidate = index + 1; candidate < restored.starSystems.length; candidate += 1) {
      const first = restored.starSystems[index];
      const second = restored.starSystems[candidate];
      const extent = (systemId: string) => Math.max(...restored.planets.filter(({ starSystemId }) => starSystemId === systemId).map((planet) => planet.orbit.radius + planet.radius * 2.2));
      expect(Math.hypot(first.position.x - second.position.x, first.position.z - second.position.z)).toBeGreaterThanOrEqual(extent(first.id) + extent(second.id) + UNIVERSE_CONFIG.systemPlacement.safetyMargin);
    }
  });

  it("separates local and explicitly triggered cross-system signals", () => {
    const state = createUniverse([], 0);
    for (const [offset, path] of [[0, "C:/one"], [10, "C:/two"]] as const) {
      for (let index = 1; index <= 3; index += 1) addSatellite(state, makeSatellite(offset + index), project(path), offset * 1_000 + index);
      advanceUniverse(state, offset * 1_000 + 10_000);
    }
    const systems = state.starSystems.filter(({ id }) => id !== CORE_SYSTEM_ID);
    const sourcePlanet = state.planets.find(({ starSystemId }) => starSystemId === systems[0].id)!;
    state.universe.selectedPlanetId = sourcePlanet.id;
    expect(routeSignal(state, "search", 30_000)).toBeNull();
    const cross = routeCrossSystemSignal(state, systems[0].id, systems[1].id, "tool", 30_001);
    expect(cross).toMatchObject({ crossSystem: true, sourceSystemId: systems[0].id, destinationSystemId: systems[1].id });
    expect(routeCrossSystemSignal(state, systems[0].id, systems[0].id, "tool", 30_002)).toBeNull();
  });

  it("retains integrity at the required bounded scale state", () => {
    const state = createUniverse([], 0);
    let nextSatellite = 1;
    for (let index = 1; index < 50; index += 1) {
      const identity = project(`C:/scale/project-${index}`);
      for (let activity = 0; activity < 3; activity += 1) addSatellite(state, makeSatellite(nextSatellite++), identity, index * 10_000 + activity);
      advanceUniverse(state, index * 10_000 + UNIVERSE_CONFIG.starSystems.formationDurationMs + 3);
    }
    while (state.planets.length < 100) {
      const source = state.planets[(state.planets.length - 1) % state.planets.length];
      const system = state.starSystems.find(({ id }) => id === source.starSystemId)!;
      const id = `planet_${String(state.planets.length + 1).padStart(4, "0")}`;
      const planet = { ...source, id, name: `Scale ${state.planets.length + 1}`, parentPlanetId: source.id, childPlanetIds: [], orbit: { ...source.orbit, band: system.planetIds.length, radius: UNIVERSE_CONFIG.planetOrbits.baseRadius + system.planetIds.length * UNIVERSE_CONFIG.planetOrbits.bandSpacing, phase: source.orbit.phase + system.planetIds.length * .7 } };
      source.childPlanetIds.push(id); system.planetIds.push(id); state.planets.push(planet);
    }
    while (state.satellites.length < 10_000) {
      const satellite = makeSatellite(nextSatellite++);
      state.satellites.push({ ...satellite, planetId: state.planets[state.satellites.length % state.planets.length].id, previousPlanetId: null, migrationState: "none", orbitSlot: state.satellites.length, transferHistory: [] });
    }
    const observedAt = new Date(1_000_000).toISOString();
    const inactive = Array.from({ length: 50 }, (_, index) => ({ identity: { repositoryId: `inactive-${index}`, displayName: `Inactive ${index}` } }));
    reconcileUniverseSnapshot(state, { source: "codex-project-registry", revision: "1", observedAt, projects: inactive }, 1_000_000);
    reconcileUniverseSnapshot(state, { source: "codex-project-registry", revision: "2", observedAt: new Date(1_000_001).toISOString(), projects: inactive.slice(0, 10).map(({ identity }) => ({ identity, removed: true, removalAuthoritative: true })) }, 1_000_001);
    const projectSystems = state.starSystems.filter(({ id }) => id !== CORE_SYSTEM_ID);
    for (let index = 0; index < 20_000; index += 1) state.asteroidBelts.push({ id: `asteroid_scale_${index}`, sourceId: `chat-${index}`, systemId: projectSystems[index % projectSystems.length].id, state: index % 5 ? "archived" : "deleted", title: `Chat ${index}`, lastActiveAt: observedAt, changedAt: observedAt, recoverable: index % 5 !== 0 });
    for (let index = 0; index < 500; index += 1) {
      const systemId = projectSystems[index % projectSystems.length].id;
      state.spaceStations.push({ id: `station_scale_${index}`, systemId, kind: "tool", integrationId: `tool-${index}`, displayName: `Tool ${index}`, status: "healthy", firstObservedAt: observedAt, lastObservedAt: observedAt, lastUsedAt: null });
      state.pulsars.push({ id: `pulsar_scale_${index}`, systemId, automationId: `auto-${index}`, displayName: `Automation ${index}`, schedule: "daily", status: "healthy", firstObservedAt: observedAt, lastObservedAt: observedAt, lastRunAt: null });
    }
    expect(summarizeUniverse(state)).toMatchObject({ systemCount: 100, planetCount: 100, satelliteCount: 10_000, asteroidCount: 20_000, stationCount: 500, pulsarCount: 500 });
    expect(state.starSystems.filter(({ lifecycleState }) => lifecycleState === "nebula")).toHaveLength(40);
    expect(state.starSystems.filter(({ lifecycleState }) => lifecycleState === "black-hole")).toHaveLength(10);
    expect(UNIVERSE_CONFIG.universeObjects.maximumRenderedAsteroidsPerSystem).toBe(160);
    expect(JSON.stringify(state).length).toBeLessThan(10_000_000);
    assertUniverseIntegrity(state);
  });
});

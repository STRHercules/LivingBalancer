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
    expect(state.version).toBe(3);
    expect(state.starSystems.map(({ id }) => id)).toEqual([CORE_SYSTEM_ID]);
    expect(state.planets[0]).toMatchObject({ name: "Codex Prime", starSystemId: CORE_SYSTEM_ID });
    addSatellite(state, makeSatellite(80), null, 2);
    expect(state.planets[0].lifecycleState).toBe("preparing-expansion");
    assertUniverseIntegrity(state);
  });

  it("normalizes trusted identity and never duplicates a named project", () => {
    const windowsA = normalizeProjectIdentity(project("C:\\Users\\Zach\\LivingBalancer\\"));
    const windowsB = normalizeProjectIdentity(project("c:/users/zach/livingbalancer"));
    expect(windowsA.projectKey).toBe(windowsB.projectKey);

    const state = createUniverse([], 0);
    const first = resolveProjectSystem(state, project("C:/one/shared", { displayName: "Shared" }), 1);
    const second = resolveProjectSystem(state, project("C:/two/shared", { displayName: "Shared" }), 2);
    expect(second.id).toBe(first.id);
    expect(second.identityAliases).toContain("workspace:c:/two/shared");

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
    projects[1].displayName = "living balancer";

    const restored = restoreUniverse(structuredClone(state), 3)!;
    const livingSystems = restored.starSystems.filter(({ id }) => id !== CORE_SYSTEM_ID);
    expect(livingSystems).toHaveLength(1);
    expect(restored.planets.filter(({ starSystemId }) => starSystemId === livingSystems[0].id)).toHaveLength(2);
    expect(restored.satellites).toHaveLength(2);
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

  it("retains integrity at 50 systems, 100 planets, and 10,000 satellites", () => {
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
    expect(summarizeUniverse(state)).toMatchObject({ systemCount: 50, planetCount: 100, satelliteCount: 10_000 });
    assertUniverseIntegrity(state);
  });
});

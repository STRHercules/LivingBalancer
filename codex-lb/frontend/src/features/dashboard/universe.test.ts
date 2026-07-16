import { describe, expect, it } from "vitest";

import { generateSatelliteNameMetadata } from "./satellite-naming";
import { addSatellite, advanceUniverse, assertUniverseIntegrity, createUniverse, evaluateExpansion, restoreUniverse, routeSignal, UNIVERSE_CONFIG, type TaskKey } from "./universe";

const makeSatellite = (index: number, taskKey: TaskKey = "search") => ({
  id: `sat_${String(index).padStart(6, "0")}`,
  taskKey,
  naming: { ...generateSatelliteNameMetadata({ type: taskKey === "tool" ? "tools" : taskKey === "think" ? "thinking" : taskKey === "verify" ? "verification" : taskKey === "write" ? "communication" : "search", index, taskSeed: `task-${index}` }), displayName: `TEST-${String(index).padStart(6, "0")}` },
  color: "#37d7ff",
  createdAtIso: new Date(index * 1_000).toISOString(),
});

describe("living universe", () => {
  it("starts with Codex Prime and preserves unique ownership", () => {
    const state = createUniverse(Array.from({ length: 79 }, (_, index) => makeSatellite(index + 1)), 0);
    expect(state.planets).toHaveLength(1);
    expect(state.planets[0].name).toBe("Codex Prime");
    expect(evaluateExpansion(state, 1)).toBeNull();
    addSatellite(state, makeSatellite(80), 2);
    expect(state.planets[0].lifecycleState).toBe("preparing-expansion");
    assertUniverseIntegrity(state);
  });

  it("launches once at capacity, forms a child, and resumes staged migration", () => {
    const state = createUniverse(Array.from({ length: 100 }, (_, index) => makeSatellite(index + 1)), 0);
    const child = evaluateExpansion(state, 1_000);
    expect(child?.parentPlanetId).toBe("planet_0001");
    expect(evaluateExpansion(state, 1_001)).toBeNull();
    advanceUniverse(state, 1_000 + UNIVERSE_CONFIG.expansion.launchDurationMs + 1);
    expect(state.activeExpansion?.phase).toBe("forming");
    advanceUniverse(state, 1_000 + UNIVERSE_CONFIG.expansion.launchDurationMs + UNIVERSE_CONFIG.expansion.formationDurationMs + 1);
    expect(state.activeMigrations.length).toBeGreaterThan(0);

    const restored = restoreUniverse(structuredClone(state), 20_000);
    expect(restored).not.toBeNull();
    advanceUniverse(restored!, 90_000);
    expect(restored!.activeExpansion).toBeNull();
    expect(restored!.satellites.filter(({ planetId }) => planetId === child?.id)).toHaveLength(35);
    assertUniverseIntegrity(restored!);
  });

  it("routes bounded task-specific signals between valid planets", () => {
    const state = createUniverse(Array.from({ length: 100 }, (_, index) => makeSatellite(index + 1, index % 2 ? "search" : "tool")), 0);
    evaluateExpansion(state, 1_000);
    advanceUniverse(state, 20_000);
    advanceUniverse(state, 90_000);
    const signal = routeSignal(state, "search", 91_000);
    expect(signal?.sourcePlanetId).not.toBe(signal?.destinationPlanetId);
    for (let index = 0; index < 150; index += 1) routeSignal(state, "tool", 91_001 + index);
    expect(state.activeSignals).toHaveLength(UNIVERSE_CONFIG.communication.maximumConcurrentSignals);
    advanceUniverse(state, 100_000);
    expect(state.activeSignals).toHaveLength(0);
  });

  it("retains 10,000 satellites while scaling to 25 deterministic non-overlapping planets", () => {
    const state = createUniverse(Array.from({ length: 10_000 }, (_, index) => makeSatellite(index + 1)), 0);
    let now = 1_000;
    while (state.planets.length < 25) {
      expect(evaluateExpansion(state, now)).not.toBeNull();
      advanceUniverse(state, now + 20_000);
      advanceUniverse(state, now + 600_000);
      now += 700_000;
    }
    const ids = new Set(state.planets.map(({ id }) => id));
    expect(ids.size).toBe(25);
    for (let left = 0; left < state.planets.length; left += 1) {
      for (let right = left + 1; right < state.planets.length; right += 1) {
        const a = state.planets[left].position;
        const b = state.planets[right].position;
        expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeGreaterThan(2);
      }
    }
    expect(state.satellites).toHaveLength(10_000);
    assertUniverseIntegrity(state);
  });
});

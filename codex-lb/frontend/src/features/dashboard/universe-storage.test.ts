import { beforeEach, describe, expect, it } from "vitest";

import { UNIVERSE_STORAGE_KEY, VERSION_2_UNIVERSE_STORAGE_KEY, addSatellite, createUniverse } from "./universe";
import { listUniverseBackups, loadUniverseFromStorage, restoreLatestAutomaticBackup, saveUniverseToStorage } from "./universe-storage";
import { generateSatelliteNameMetadata } from "./satellite-naming";

const satellite = {
  id: "sat_backup",
  taskKey: "tool" as const,
  naming: generateSatelliteNameMetadata({ type: "tools", index: 1, taskSeed: "backup" }),
  color: "#52f6ad",
  createdAtIso: new Date(1_000).toISOString(),
};

describe("Living Codex storage", () => {
  beforeEach(() => localStorage.clear());

  it("falls back to older valid data and keeps a restorable copy before topology changes", () => {
    const legacy = createUniverse([satellite], 0);
    const v2 = { ...legacy, version: 2, universe: { ...legacy.universe }, planets: legacy.planets.map((planet) => Object.fromEntries(Object.entries(planet).filter(([key]) => key !== "starSystemId" && key !== "orbit"))), camera: { ...legacy.camera } };
    localStorage.setItem(UNIVERSE_STORAGE_KEY, "{broken");
    localStorage.setItem(VERSION_2_UNIVERSE_STORAGE_KEY, JSON.stringify(v2));
    expect(loadUniverseFromStorage(localStorage, 1)?.satellites).toHaveLength(1);

    localStorage.clear();
    const project = createUniverse([], 0);
    addSatellite(project, satellite, { repositoryId: "living-balancer", displayName: "LivingBalancer" }, 1_000);
    saveUniverseToStorage(localStorage, project, 2_000);
    saveUniverseToStorage(localStorage, createUniverse([], 3_000), 3_000);
    expect(listUniverseBackups(localStorage)[0]).toMatchObject({ systemCount: 2, planetCount: 2, satelliteCount: 1 });
    restoreLatestAutomaticBackup(localStorage, 4_000);
    expect(loadUniverseFromStorage(localStorage, 4_001)?.starSystems).toHaveLength(2);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import { UNIVERSE_STORAGE_KEY, VERSION_2_UNIVERSE_STORAGE_KEY, VERSION_3_UNIVERSE_STORAGE_KEY, addSatellite, createUniverse } from "./universe";
import { listUniverseBackups, listUniverseRecoveryCandidates, loadUniverseFromServer, loadUniverseFromStorage, restoreLatestAutomaticBackup, restoreUniverseRecoveryCandidate, saveUniverseToServerNow, saveUniverseToStorage } from "./universe-storage";
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

  it("hydrates from the durable server and saves against its revision", async () => {
    const universe = createUniverse([satellite], 0);
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ current: { savedAt: new Date(1_000).toISOString(), revision: "revision-1", universe }, backups: Array.from({ length: 10 }, (_, index) => ({ id: `backup-${index}.json`, savedAt: new Date(index).toISOString(), revision: `backup-${index}`, systemCount: 1, planetCount: 1, satelliteCount: 1 })), minimumBackups: 10, recovered: false }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ savedAt: new Date(2_000).toISOString(), revision: "revision-2", universe }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetch);

    expect((await loadUniverseFromServer(1_000))?.satellites).toHaveLength(1);
    await saveUniverseToServerNow(universe);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ base_revision: "revision-1", force: false });
    vi.unstubAllGlobals();
  });

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

    localStorage.clear();
    localStorage.setItem(UNIVERSE_STORAGE_KEY, JSON.stringify(createUniverse([], 5_000)));
    localStorage.setItem(VERSION_3_UNIVERSE_STORAGE_KEY, JSON.stringify({ ...project, version: 3 }));
    const previousVersion = listUniverseRecoveryCandidates(localStorage, 6_000).find(({ source }) => source === "previous-version")!;
    expect(previousVersion).toMatchObject({ systemCount: 2, satelliteCount: 1 });
    restoreUniverseRecoveryCandidate(localStorage, previousVersion.id, 7_000);
    expect(loadUniverseFromStorage(localStorage, 7_001)?.satellites).toHaveLength(1);
  });
});

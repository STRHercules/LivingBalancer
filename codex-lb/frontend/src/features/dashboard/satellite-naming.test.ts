import { describe, expect, it } from "vitest";

import {
  NAMING_PATTERNS,
  SATELLITE_TYPES,
  formatSatelliteName,
  generateSatelliteName,
  generateSatelliteNameMetadata,
  generateUniqueSatelliteNameMetadata,
} from "./satellite-naming";

const base = { globalSeed: "codex-globe-names-v1", type: "search", index: 427, taskSeed: "web-query", generation: 1 };

describe("satellite naming", () => {
  it("is deterministic and includes every seed input", () => {
    expect(generateSatelliteName(base)).toBe(generateSatelliteName(base));
    const variations = [
      Array.from({ length: 20 }, (_, index) => ({ ...base, type: Object.keys(SATELLITE_TYPES)[index % 10] })),
      Array.from({ length: 20 }, (_, index) => ({ ...base, index: index + 1 })),
      Array.from({ length: 20 }, (_, index) => ({ ...base, taskSeed: `task-${index}` })),
      Array.from({ length: 20 }, (_, index) => ({ ...base, generation: index + 1 })),
      Array.from({ length: 20 }, (_, collision) => ({ ...base, collision })),
      Array.from({ length: 20 }, (_, index) => ({ ...base, globalSeed: `codex-globe-names-v${index + 1}` })),
    ];
    for (const options of variations) expect(new Set(options.map(generateSatelliteName)).size).toBeGreaterThan(1);
  });

  it("formats all seven patterns with fixed-width numbers", () => {
    expect(NAMING_PATTERNS.map(({ id }) => formatSatelliteName(id, "ARCHIVE", "MEM", 6, 3, 7))).toEqual([
      "ARCHIVE-07",
      "ARCHIVE-0007",
      "Archive Node 007",
      "ARCHIVE III-6",
      "MEM-007",
      "ARCHIVE-MEM-07",
      "MEM III-07",
    ]);
  });

  it("keeps activity configuration valid and extensible", () => {
    const codes = new Set<string>();
    for (const [key, config] of Object.entries(SATELLITE_TYPES)) {
      expect(key).toBeTruthy();
      expect(config.code).toMatch(/^[A-Z]{3}$/);
      expect(config.names.length).toBeGreaterThan(0);
      expect(codes.has(config.code)).toBe(false);
      codes.add(config.code);
    }
  });

  it("normalizes bounds and rejects invalid collision counters", () => {
    expect(generateSatelliteNameMetadata({ index: -2.4, generation: 99 })).toMatchObject({ index: 1, generation: 6, type: "thinking" });
    expect(generateSatelliteNameMetadata({ type: "unknown" }).type).toBe("thinking");
    expect(() => generateSatelliteName({ collision: -1 })).toThrow("non-negative integer");
  });

  it("resolves collisions through the collision seed", () => {
    const first = generateSatelliteName(base);
    const names = new Set([first]);
    const second = generateUniqueSatelliteNameMetadata(base, names);
    expect(second.displayName).not.toBe(first);
    expect(names.has(second.displayName)).toBe(true);
  });

  it("generates 10,000 valid unique names within the performance budget", () => {
    const names = new Set<string>();
    const patterns = new Set<string>();
    const families = new Set<string>();
    const types = Object.keys(SATELLITE_TYPES);
    const startedAt = performance.now();
    for (let index = 1; index <= 10_000; index += 1) {
      const result = generateUniqueSatelliteNameMetadata({ type: types[index % types.length], index, taskSeed: `task-${index}`, generation: index % 8 }, names);
      patterns.add(result.pattern);
      families.add(result.family);
      expect(result.displayName).toMatch(/^(?!.*(?:undefined|null| {2,}|[- ]$)).{4,40}$/);
    }
    expect(performance.now() - startedAt).toBeLessThan(250);
    expect(names.size).toBe(10_000);
    expect(patterns.size).toBeGreaterThan(1);
    expect(families.size).toBeGreaterThan(1);
  });

  it("keeps version-one snapshots stable", () => {
    expect([
      generateSatelliteName({ type: "thinking", index: 1, taskSeed: "alpha" }),
      generateSatelliteName({ type: "search", index: 427, taskSeed: "web-query", generation: 1 }),
      generateSatelliteName({ type: "coding", index: 91, taskSeed: "edit", generation: 4 }),
    ]).toEqual(["Synapse Node 950", "HORIZON-06", "DEV IV-92"]);
  });
});

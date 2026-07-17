import {
  UNIVERSE_STORAGE_KEY,
  VERSION_2_UNIVERSE_STORAGE_KEY,
  VERSION_3_UNIVERSE_STORAGE_KEY,
  restoreUniverse,
  type UniverseState,
} from "./universe";

export const UNIVERSE_BACKUPS_STORAGE_KEY = "codex-lb-living-universe-backups-v1";
const UNIVERSE_TOPOLOGY_STORAGE_KEY = "codex-lb-living-universe-topology-v1";
const UNIVERSE_BACKUP_TIME_STORAGE_KEY = "codex-lb-living-universe-backup-time-v1";
const BACKUP_INTERVAL_MS = 15 * 60 * 1_000;
const MAX_BACKUPS = 10;

type StoredBackup = { createdAt: string; universe: UniverseState };
export type UniverseBackupSummary = { createdAt: string; systemCount: number; planetCount: number; satelliteCount: number };

const topology = (state: UniverseState) => `${state.starSystems.length}:${state.planets.length}:${state.asteroidBelts.length}:${state.spaceStations.length}:${state.pulsars.length}`;

function parseUniverse(raw: string | null, now = Date.now()) {
  if (!raw) return null;
  try {
    return restoreUniverse(JSON.parse(raw), now);
  } catch {
    return null;
  }
}

function readBackups(storage: Storage, now = Date.now()): StoredBackup[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(UNIVERSE_BACKUPS_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const record = entry as Partial<StoredBackup>;
      const universe = restoreUniverse(record.universe, now);
      return universe && typeof record.createdAt === "string" ? [{ createdAt: record.createdAt, universe }] : [];
    }).slice(0, MAX_BACKUPS);
  } catch {
    return [];
  }
}

function archiveRawUniverse(storage: Storage, raw: string | null, now = Date.now()) {
  const universe = parseUniverse(raw, now);
  if (!universe) return;
  const backups = readBackups(storage, now);
  const serialized = JSON.stringify(universe);
  const unique = backups.filter((backup) => JSON.stringify(backup.universe) !== serialized);
  storage.setItem(UNIVERSE_BACKUPS_STORAGE_KEY, JSON.stringify([{ createdAt: new Date(now).toISOString(), universe }, ...unique].slice(0, MAX_BACKUPS)));
  storage.setItem(UNIVERSE_BACKUP_TIME_STORAGE_KEY, String(now));
}

export function loadUniverseFromStorage(storage: Storage, now = Date.now()) {
  for (const key of [UNIVERSE_STORAGE_KEY, VERSION_3_UNIVERSE_STORAGE_KEY, VERSION_2_UNIVERSE_STORAGE_KEY]) {
    const universe = parseUniverse(storage.getItem(key), now);
    if (universe) return universe;
  }
  return readBackups(storage, now)[0]?.universe ?? null;
}

export function saveUniverseToStorage(storage: Storage, universe: UniverseState, now = Date.now()) {
  const serialized = JSON.stringify(universe);
  const current = storage.getItem(UNIVERSE_STORAGE_KEY);
  const lastBackupAt = Number(storage.getItem(UNIVERSE_BACKUP_TIME_STORAGE_KEY)) || 0;
  const previousTopology = storage.getItem(UNIVERSE_TOPOLOGY_STORAGE_KEY);
  if (current && current !== serialized && (!previousTopology || previousTopology !== topology(universe) || now - lastBackupAt >= BACKUP_INTERVAL_MS)) archiveRawUniverse(storage, current, now);
  storage.setItem(UNIVERSE_STORAGE_KEY, serialized);
  storage.setItem(UNIVERSE_TOPOLOGY_STORAGE_KEY, topology(universe));
}

export function listUniverseBackups(storage: Storage): UniverseBackupSummary[] {
  return readBackups(storage).map(({ createdAt, universe }) => ({ createdAt, systemCount: universe.starSystems.length, planetCount: universe.planets.length, satelliteCount: universe.satellites.length }));
}

export function exportUniverseBackup(storage: Storage) {
  const universe = loadUniverseFromStorage(storage);
  if (!universe) throw new Error("No Living Codex data is available to back up.");
  return { format: "codex-lb-living-codex", exportedAt: new Date().toISOString(), universe };
}

export function restoreUniverseBackup(storage: Storage, value: unknown, now = Date.now()) {
  const candidate = value && typeof value === "object" && (value as { format?: unknown }).format === "codex-lb-living-codex" ? (value as { universe: unknown }).universe : value;
  const universe = restoreUniverse(candidate, now);
  if (!universe) throw new Error("This file does not contain valid Living Codex data.");
  archiveRawUniverse(storage, storage.getItem(UNIVERSE_STORAGE_KEY), now);
  saveUniverseToStorage(storage, universe, now);
  return universe;
}

export function restoreLatestAutomaticBackup(storage: Storage, now = Date.now()) {
  const latest = readBackups(storage, now)[0];
  if (!latest) throw new Error("No automatic Living Codex backup is available.");
  return restoreUniverseBackup(storage, latest.universe, now);
}

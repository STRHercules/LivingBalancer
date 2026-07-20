import {
  UNIVERSE_STORAGE_KEY,
  VERSION_2_UNIVERSE_STORAGE_KEY,
  VERSION_3_UNIVERSE_STORAGE_KEY,
  restoreUniverse,
  type UniverseState,
} from "./universe";
import { ApiError, get, post, put } from "@/lib/api-client";
import { z } from "zod";

export const UNIVERSE_BACKUPS_STORAGE_KEY = "codex-lb-living-universe-backups-v1";
const UNIVERSE_TOPOLOGY_STORAGE_KEY = "codex-lb-living-universe-topology-v1";
const UNIVERSE_BACKUP_TIME_STORAGE_KEY = "codex-lb-living-universe-backup-time-v1";
const BACKUP_INTERVAL_MS = 15 * 60 * 1_000;
const MAX_BACKUPS = 10;
const SERVER_SAVE_DELAY_MS = 750;

const serverEnvelopeSchema = z.object({ savedAt: z.string(), revision: z.string(), universe: z.unknown() });
const serverBackupSchema = z.object({ id: z.string(), savedAt: z.string(), revision: z.string(), systemCount: z.number(), planetCount: z.number(), satelliteCount: z.number() });
const serverStateSchema = z.object({ current: serverEnvelopeSchema.nullable(), backups: z.array(serverBackupSchema), minimumBackups: z.number(), recovered: z.boolean() });
export type UniverseServerBackup = z.infer<typeof serverBackupSchema>;
let serverRevision: string | null = null;
let queuedServerUniverse: string | null = null;
let serverSaveTimer: ReturnType<typeof setTimeout> | undefined;
let serverSaveInFlight = false;
let serverSyncBlocked = false;

type StoredBackup = { createdAt: string; universe: UniverseState };
export type UniverseBackupSummary = { createdAt: string; systemCount: number; planetCount: number; satelliteCount: number };
export type UniverseRecoveryCandidate = UniverseBackupSummary & { id: string; source: "automatic" | "previous-version" };

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

export async function loadUniverseFromServer(now = Date.now()) {
  const state = await get("/api/local-usage/universe", serverStateSchema);
  serverRevision = state.current?.revision ?? null;
  serverSyncBlocked = false;
  return state.current ? restoreUniverse(state.current.universe, now) : null;
}

export async function listUniverseServerBackups() {
  const state = await get("/api/local-usage/universe", serverStateSchema);
  serverRevision = state.current?.revision ?? null;
  return state.backups;
}

export async function restoreUniverseServerBackup(id: string, now = Date.now()) {
  const saved = await post("/api/local-usage/universe/restore", serverEnvelopeSchema, { body: { backup_id: id } });
  const universe = restoreUniverse(saved.universe, now);
  if (!universe) throw new Error("The durable Living Codex backup is invalid.");
  serverRevision = saved.revision;
  return universe;
}

async function flushServerUniverse(force = false) {
  if (serverSaveInFlight || (!queuedServerUniverse && !force) || serverSyncBlocked) return;
  const serialized = queuedServerUniverse;
  if (!serialized) return;
  queuedServerUniverse = null;
  serverSaveInFlight = true;
  try {
    const saved = await put("/api/local-usage/universe", serverEnvelopeSchema, { body: { universe: JSON.parse(serialized), base_revision: serverRevision, force } });
    serverRevision = saved.revision;
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) serverSyncBlocked = true;
    else {
      queuedServerUniverse ??= serialized;
      serverSaveTimer = setTimeout(() => void flushServerUniverse(), 5_000);
    }
  } finally {
    serverSaveInFlight = false;
    if (queuedServerUniverse && !serverSyncBlocked && !serverSaveTimer) serverSaveTimer = setTimeout(() => void flushServerUniverse(), SERVER_SAVE_DELAY_MS);
  }
}

export function queueUniverseServerSave(universe: UniverseState) {
  if (serverSyncBlocked) return;
  queuedServerUniverse = JSON.stringify(universe);
  clearTimeout(serverSaveTimer);
  serverSaveTimer = setTimeout(() => { serverSaveTimer = undefined; void flushServerUniverse(); }, SERVER_SAVE_DELAY_MS);
}

export async function saveUniverseToServerNow(universe: UniverseState, force = false) {
  queuedServerUniverse = JSON.stringify(universe);
  clearTimeout(serverSaveTimer);
  serverSaveTimer = undefined;
  while (serverSaveInFlight) await new Promise((resolve) => setTimeout(resolve, 50));
  serverSyncBlocked = false;
  await flushServerUniverse(force);
  if (queuedServerUniverse || serverSyncBlocked) throw new Error("Living Codex server backup could not be saved.");
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

export function listUniverseRecoveryCandidates(storage: Storage, now = Date.now()): UniverseRecoveryCandidate[] {
  const candidates: Array<UniverseRecoveryCandidate & { universe: UniverseState }> = readBackups(storage, now).map(({ createdAt, universe }) => ({ id: `automatic:${createdAt}`, source: "automatic", createdAt, systemCount: universe.starSystems.length, planetCount: universe.planets.length, satelliteCount: universe.satellites.length, universe }));
  const seen = new Set(candidates.map(({ universe }) => JSON.stringify(universe)));
  for (const key of [VERSION_3_UNIVERSE_STORAGE_KEY, VERSION_2_UNIVERSE_STORAGE_KEY]) {
    const universe = parseUniverse(storage.getItem(key), now);
    if (!universe) continue;
    const serialized = JSON.stringify(universe);
    if (seen.has(serialized)) continue;
    seen.add(serialized);
    candidates.push({ id: `previous-version:${key}`, source: "previous-version", createdAt: universe.universe.createdAt, systemCount: universe.starSystems.length, planetCount: universe.planets.length, satelliteCount: universe.satellites.length, universe });
  }
  return candidates.map(({ universe: _universe, ...candidate }) => candidate);
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

export function restoreUniverseRecoveryCandidate(storage: Storage, id: string, now = Date.now()) {
  const divider = id.indexOf(":");
  const source = id.slice(0, divider);
  const value = id.slice(divider + 1);
  const universe = source === "automatic"
    ? readBackups(storage, now).find(({ createdAt }) => createdAt === value)?.universe
    : source === "previous-version" ? parseUniverse(storage.getItem(value), now) : null;
  if (!universe) throw new Error("That Living Codex recovery point is no longer available.");
  return restoreUniverseBackup(storage, universe, now);
}

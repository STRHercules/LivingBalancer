import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const port = Number(process.env.LIVING_CODEX_OBSERVER_PORT || 2460);
const codexHome = process.env.CODEX_HOME || join(homedir(), ".codex");
const projectsFile = join(codexHome, "living-codex-projects.json");
const tombstonesFile = join(codexHome, "living-codex-thread-tombstones.json");
const pending = new Map();
const knownThreads = new Map();
let nextId = 1;
let codex;
let initialized = false;
let snapshot = { revision: "starting", observedAt: new Date().toISOString(), projects: [], threads: [], stations: [], pulsars: [], connected: false };

const readJson = (path, fallback) => {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return fallback; }
};
const safeDate = (seconds) => new Date(Number(seconds || 0) * 1000).toISOString();
const send = (message) => codex?.stdin?.writable && codex.stdin.write(`${JSON.stringify(message)}\n`);
const rpc = (method, params = {}) => new Promise((resolve, reject) => {
  if (!initialized) return reject(new Error("Codex app-server is not connected"));
  const id = nextId++;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); }, 15_000);
  pending.set(id, { resolve, reject, timer });
  send({ id, method, params });
});

async function listAll(method, params) {
  const data = [];
  let cursor = null;
  do {
    const result = await rpc(method, { ...params, cursor });
    data.push(...(result.data || []));
    cursor = result.nextCursor || null;
  } while (cursor);
  return data;
}

function readAutomations() {
  const root = join(codexHome, "automations");
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).flatMap((entry) => {
    const path = join(root, entry.name, "automation.toml");
    if (!existsSync(path)) return [];
    const fields = {};
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*(id|name|status|rrule|project_id|workspace_root)\s*=\s*["']([^"']*)["']/i);
      if (match) fields[match[1].toLowerCase()] = match[2];
    }
    return fields.id ? [{ automationId: fields.id, displayName: fields.name || entry.name, schedule: fields.rrule || "recurring", status: fields.status === "PAUSED" ? "paused" : "healthy", projectId: fields.project_id || null, workspaceRoot: fields.workspace_root || null }] : [];
  });
}

async function refresh() {
  if (!initialized) return;
  try {
    const [active, archived, mcp, plugins] = await Promise.all([
      listAll("thread/list", { archived: false, limit: 100, useStateDbOnly: true }),
      listAll("thread/list", { archived: true, limit: 100, useStateDbOnly: true }),
      listAll("mcpServerStatus/list", { limit: 100, detail: "toolsAndAuthOnly" }).catch(() => []),
      rpc("plugin/installed", { cwds: [] }).catch(() => ({ marketplaces: [] })),
    ]);
    const clean = (thread, state) => ({ id: thread.id, cwd: thread.cwd, title: thread.name || "Codex thread", state, createdAt: safeDate(thread.createdAt), updatedAt: safeDate(thread.updatedAt) });
    const threads = [...active.map((thread) => clean(thread, "active")), ...archived.map((thread) => clean(thread, "archived"))];
    for (const thread of threads) knownThreads.set(thread.id, thread);
    const tombstones = readJson(tombstonesFile, []);
    const stations = [
      ...mcp.map((server) => ({ integrationId: server.name, kind: "mcp", displayName: server.serverInfo?.title || server.serverInfo?.name || server.name, status: server.authStatus === "notLoggedIn" ? "degraded" : "healthy" })),
      ...(plugins.marketplaces || []).flatMap((marketplace) => (marketplace.plugins || []).filter((plugin) => plugin.installed && plugin.enabled).map((plugin) => ({ integrationId: plugin.id, kind: "plugin", displayName: plugin.interface?.displayName || plugin.name, status: "configured" }))),
    ];
    const projects = readJson(projectsFile, []);
    const pulsars = readAutomations();
    const allThreads = [...threads, ...tombstones];
    const observedAt = new Date().toISOString();
    const revision = createHash("sha256").update(JSON.stringify([projects, allThreads, stations, pulsars])).digest("hex").slice(0, 16);
    snapshot = { revision, observedAt, projects, threads: allThreads, stations, pulsars, connected: true };
  } catch (error) {
    snapshot = { ...snapshot, observedAt: new Date().toISOString(), connected: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function handleMessage(message) {
  if (message.id != null && pending.has(message.id)) {
    const request = pending.get(message.id); pending.delete(message.id); clearTimeout(request.timer);
    if (message.error) request.reject(new Error(message.error.message || "Codex app-server request failed")); else request.resolve(message.result || {});
    return;
  }
  if (message.method === "thread/deleted" && message.params?.threadId) {
    const thread = knownThreads.get(message.params.threadId);
    if (thread) {
      const tombstones = readJson(tombstonesFile, []).filter((item) => item.id !== thread.id);
      tombstones.push({ ...thread, state: "deleted", updatedAt: new Date().toISOString() });
      writeFileSync(tombstonesFile, JSON.stringify(tombstones, null, 2));
    }
  }
  if (["thread/archived", "thread/unarchived", "thread/deleted"].includes(message.method)) setTimeout(refresh, 100);
}

function connect(args = ["app-server", "proxy"]) {
  initialized = false;
  codex = spawn("codex", args, { stdio: ["pipe", "pipe", "ignore"], shell: process.platform === "win32", windowsHide: true });
  const lines = createInterface({ input: codex.stdout });
  lines.on("line", (line) => { try { handleMessage(JSON.parse(line)); } catch { /* app-server diagnostics are not protocol messages */ } });
  codex.once("spawn", () => {
    send({ id: 0, method: "initialize", params: { clientInfo: { name: "living-codex-observer", title: "Living Codex Observer", version: "1.0.0" }, capabilities: { experimentalApi: true } } });
    const timer = setTimeout(() => { if (!initialized) codex.kill(); }, 4_000);
    pending.set(0, { timer, reject: () => {}, resolve: () => { clearTimeout(timer); initialized = true; send({ method: "initialized", params: {} }); void refresh(); } });
  });
  codex.once("exit", () => setTimeout(() => connect(args[1] === "proxy" ? ["app-server", "--stdio"] : args), 1_000));
}

createServer((request, response) => {
  const origin = request.headers.origin || "";
  if (/^http:\/\/(localhost|127\.0\.0\.1):5173$/.test(origin)) response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Content-Type", "application/json");
  if (request.method === "GET" && request.url === "/snapshot") return response.end(JSON.stringify(snapshot));
  if (request.method === "POST" && request.url === "/projects") {
    let body = "";
    request.on("data", (chunk) => { if (body.length < 1_000_000) body += chunk; });
    request.on("end", () => {
      try {
        const projects = JSON.parse(body);
        if (!Array.isArray(projects) || projects.some((project) => !project || typeof project.projectId !== "string" || typeof project.path !== "string" || typeof project.label !== "string")) throw new Error("Invalid project snapshot");
        const previous = readJson(projectsFile, []);
        const present = projects.map(({ projectId, path, label }) => ({ projectId, path, label, removed: false }));
        const presentIds = new Set(present.map(({ projectId }) => projectId));
        const removed = previous.filter(({ projectId }) => !presentIds.has(projectId)).map(({ projectId, path, label }) => ({ projectId, path, label, removed: true, removalAuthoritative: true }));
        writeFileSync(projectsFile, JSON.stringify([...present, ...removed], null, 2));
        void refresh(); response.end(JSON.stringify({ ok: true, count: projects.length }));
      } catch (error) { response.statusCode = 400; response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) })); }
    });
    return;
  }
  response.statusCode = 404; response.end(JSON.stringify({ error: "Not found" }));
}).listen(port, "127.0.0.1", () => connect());

setInterval(() => void refresh(), 3_000).unref();

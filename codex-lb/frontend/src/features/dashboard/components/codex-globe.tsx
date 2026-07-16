import { useEffect, useRef } from "react";
import { generateUniqueSatelliteNameMetadata, hashTaskSeed, type SatelliteNameMetadata, type SatelliteType } from "../satellite-naming";

type ActivityKind = "idle" | "thinking" | "workflow" | "tool" | "search";
type TaskKey = "think" | "search" | "tool" | "write" | "verify";
type Point3D = { x: number; y: number; z: number };
type ScreenPoint = { x: number; y: number; z: number; perspective: number };
type GlobePoint = Point3D & { size: number; alpha: number; warm: boolean; phase: number };
type RenderedGlobePoint = { source: GlobePoint; x: number; y: number; z: number; perspective: number };
type Dust = Point3D & { size: number; alpha: number };
type Satellite = {
  id: string;
  taskKey: TaskKey;
  naming: SatelliteNameMetadata;
  color: string;
  createdAtIso: string;
  createdAt: number;
  angle: number;
  incline: number;
  precession: number;
  speed: number;
  phase: number;
  orbit: number;
  screenX?: number;
  screenY?: number;
};
type Packet = { source: Point3D; color: string; startedAt: number; duration: number; curveX: number; curveY: number; size: number };
type Pulse = { x: number; y: number; color: string; startedAt: number; duration: number };
type TaskConfig = { label: string; title: string; detail: string; color: string; duration: number; packets: number };
type ActiveTask = { key: TaskKey; config: TaskConfig; startedAt: number; duration: number; nextPacketAt: number };
type QueuedTask = { taskKey: TaskKey; label?: string; taskSeed?: string };
type StoredSatellite = Pick<Satellite, "id" | "taskKey" | "naming" | "color" | "createdAtIso">;
export type SatelliteSummary = { id: string; label: string; type: string; color: string };

const TASKS: Record<TaskKey, TaskConfig> = {
  think: { label: "Reasoning", title: "Mapping possible solutions", detail: "Evaluating branches, constraints, and likely outcomes", color: "#ffac5c", duration: 4200, packets: 16 },
  search: { label: "Search", title: "Retrieving distant knowledge", detail: "Scanning sources and drawing relevant context into orbit", color: "#b080ff", duration: 4700, packets: 20 },
  tool: { label: "Tool use", title: "Executing an external capability", detail: "Sending an instruction outward and receiving structured results", color: "#52f6ad", duration: 3900, packets: 18 },
  write: { label: "Synthesis", title: "Converting knowledge into an answer", detail: "Compressing active context into a clear, useful response", color: "#37d7ff", duration: 4300, packets: 22 },
  verify: { label: "Verification", title: "Inspecting the result for weak points", detail: "Checking assumptions, consistency, and factual support", color: "#ff6f87", duration: 4100, packets: 17 },
};

const TASK_FOR_ACTIVITY: Record<ActivityKind, TaskKey> = { idle: "write", thinking: "think", workflow: "verify", tool: "tool", search: "search" };
const SATELLITE_TYPE_FOR_TASK: Record<TaskKey, SatelliteType> = { think: "thinking", search: "search", tool: "tools", write: "communication", verify: "verification" };
const TASK_BUTTONS: Record<TaskKey, [string, string]> = { think: ["Think", "reason"], search: ["Search", "retrieve"], tool: ["Use tool", "execute"], write: ["Write", "synthesize"], verify: ["Verify", "inspect"] };
const SATELLITE_STORAGE_KEY = "codex-lb-living-satellites-v1";
const SHOW_SIMULATOR_CONTROLS = false;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
const random = (min: number, max: number) => min + Math.random() * (max - min);
const easeInOut = (value: number) => value < 0.5 ? 2 * value * value : 1 - (-2 * value + 2) ** 2 / 2;

function rgba(hex: string, alpha: number) {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${value >> 16},${value >> 8 & 255},${value & 255},${alpha})`;
}

function seededNoise(value: number) {
  const noise = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return noise - Math.floor(noise);
}

function loadStoredSatellites(): StoredSatellite[] | null {
  try {
    const stored = window.localStorage.getItem(SATELLITE_STORAGE_KEY);
    if (stored === null) return null;
    const value: unknown = JSON.parse(stored);
    if (!Array.isArray(value)) return [];
    const names = new Set<string>();
    return value.filter((satellite): satellite is StoredSatellite => {
      if (!satellite || typeof satellite !== "object") return false;
      const record = satellite as Partial<StoredSatellite>;
      const name = record.naming?.displayName;
      if (typeof record.id !== "string" || !(record.taskKey && record.taskKey in TASKS) || typeof record.color !== "string" || typeof record.createdAtIso !== "string" || typeof name !== "string" || name.length < 4 || name.length > 40 || names.has(name)) return false;
      names.add(name);
      return true;
    });
  } catch {
    return null;
  }
}

export function CodexGlobe({ activity = 0, eventId, activityKind = "idle", eventLabel, model = "Waiting for traffic", context = "living-codex / globe", onSatellitesChange }: {
  activity?: number;
  eventId?: string;
  activityKind?: ActivityKind;
  eventLabel?: string;
  model?: string;
  context?: string;
  onSatellitesChange?: (satellites: SatelliteSummary[]) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const labelTypeRef = useRef<HTMLElement>(null);
  const labelNameRef = useRef<HTMLElement>(null);
  const statusRef = useRef<HTMLElement>(null);
  const activityValueRef = useRef<HTMLElement>(null);
  const activityTimeRef = useRef<HTMLElement>(null);
  const workflowRef = useRef<HTMLElement>(null);
  const knowledgeRef = useRef<HTMLElement>(null);
  const packetRef = useRef<HTMLElement>(null);
  const queueValueRef = useRef<HTMLElement>(null);
  const queueCountRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const autoRef = useRef<HTMLButtonElement>(null);
  const signalRef = useRef({ activity, eventId, activityKind, eventLabel });

  useEffect(() => {
    signalRef.current = { activity, eventId, activityKind, eventLabel };
  }, [activity, eventId, activityKind, eventLabel]);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true, desynchronized: true });
    if (!stage || !canvas || !ctx) return;

    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const globePoints: GlobePoint[] = [];
    const renderedGlobePoints: RenderedGlobePoint[] = [];
    const atmosphereDust: Dust[] = [];
    const knowledge: Satellite[] = [];
    const packets: Packet[] = [];
    const pulses: Pulse[] = [];
    const queue: QueuedTask[] = [];
    const assignedNames = new Set<string>();
    const storedState = loadStoredSatellites();
    const storedSatellites = storedState ?? [];
    let nextCreationIndex = Math.max(0, ...storedSatellites.map((satellite) => satellite.naming.index || 0)) + 1;
    let width = 1;
    let height = 1;
    let radius = 180;
    let centerX = 0;
    let centerY = 0;
    let rotation = 0;
    let cosineYaw = 1;
    let sineYaw = 0;
    let cosinePitch = 1;
    let sinePitch = 0;
    let pointerX = 0;
    let pointerY = 0;
    let targetPointerX = 0;
    let targetPointerY = 0;
    let hoverX = -1000;
    let hoverY = -1000;
    let activeTask: ActiveTask | null = null;
    let activeSatellite: Satellite | null = null;
    let lastEventId: string | undefined;
    let packetTotal = 0;
    let progress = 0;
    let auto = false;
    let autoAt = performance.now() + 1800;
    let lastFrame = performance.now();
    let isVisible = true;
    let frame = 0;

    const syncSatellites = () => onSatellitesChange?.(knowledge.map((satellite) => ({ id: satellite.id, label: satellite.naming.displayName, type: TASKS[satellite.taskKey].label, color: satellite.color })));
    const persistSatellites = () => {
      try {
        window.localStorage.setItem(SATELLITE_STORAGE_KEY, JSON.stringify(knowledge.map(({ id, taskKey, naming, color, createdAtIso }) => ({ id, taskKey, naming, color, createdAtIso }))));
      } catch {
        // Storage may be unavailable in private or policy-restricted browser contexts.
      }
    };

    const makeGlobe = () => {
      globePoints.length = 0;
      const count = Math.round(clamp(radius * 9, 1500, 2700));
      const golden = Math.PI * (3 - Math.sqrt(5));
      for (let index = 0; index < count; index += 1) {
        const y = 1 - index / (count - 1) * 2;
        const shell = Math.sqrt(1 - y * y);
        const theta = golden * index;
        const x = Math.cos(theta) * shell;
        const z = Math.sin(theta) * shell;
        const continental = Math.sin(x * 6.7 + Math.cos(y * 4.2) * 1.7) + Math.cos(z * 7.9 - y * 3.4) + Math.sin((x + z) * 9.2) * 0.46 + Math.cos((x - z) * 13.1) * 0.25;
        const land = continental > 0.45 || continental > 0.08 && seededNoise(index) > 0.72;
        if (land || seededNoise(index + 20000) > 0.83) {
          globePoints.push({ x, y, z, size: land ? random(0.75, 1.75) : random(0.35, 0.75), alpha: land ? random(0.54, 1) : random(0.14, 0.38), warm: land && seededNoise(index + 10000) > 0.89, phase: Math.random() * Math.PI * 2 });
        }
      }
      atmosphereDust.length = 0;
      for (let index = 0; index < 260; index += 1) {
        const phi = Math.acos(random(-1, 1));
        const theta = random(0, Math.PI * 2);
        const distance = random(1.05, 1.34);
        atmosphereDust.push({ x: Math.sin(phi) * Math.cos(theta) * distance, y: Math.cos(phi) * distance, z: Math.sin(phi) * Math.sin(theta) * distance, alpha: random(0.04, 0.18), size: random(0.25, 0.8) });
      }
      renderedGlobePoints.length = 0;
      for (const source of globePoints) renderedGlobePoints.push({ source, x: 0, y: 0, z: 0, perspective: 1 });
    };

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      const dpr = clamp(devicePixelRatio || 1, 1, 2);
      const pixelWidth = Math.floor(rect.width * dpr);
      const pixelHeight = Math.floor(rect.height * dpr);
      if (width === rect.width && height === rect.height && canvas.width === pixelWidth && canvas.height === pixelHeight) return;
      const nextRadius = clamp(Math.min(rect.width * 0.24, rect.height * 0.36), 128, 260);
      const radiusChanged = radius !== nextRadius;
      width = rect.width;
      height = rect.height;
      centerX = width * 0.5;
      centerY = height * 0.45;
      radius = nextRadius;
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (radiusChanged || !globePoints.length) makeGlobe();
    };

    const rotatePoint = (point: Point3D, extraRotation = 0): Point3D => {
      const extraCosine = extraRotation ? Math.cos(extraRotation) : 1;
      const extraSine = extraRotation ? Math.sin(extraRotation) : 0;
      const yawCosine = cosineYaw * extraCosine - sineYaw * extraSine;
      const yawSine = sineYaw * extraCosine + cosineYaw * extraSine;
      const x = point.x * yawCosine - point.z * yawSine;
      const z = point.x * yawSine + point.z * yawCosine;
      return { x, y: point.y * cosinePitch - z * sinePitch, z: point.y * sinePitch + z * cosinePitch };
    };

    const project = (point: Point3D, scale = 1): ScreenPoint => {
      const perspective = 3.2 / (3.2 - point.z * 0.52);
      return { x: centerX + point.x * radius * scale * perspective, y: centerY + point.y * radius * scale * perspective, z: point.z, perspective };
    };

    const makeSatellite = (taskKey: TaskKey, taskSeed: string, color: string, active = true, stored?: StoredSatellite): Satellite => {
      const naming = stored?.naming ?? generateUniqueSatelliteNameMetadata({
        type: SATELLITE_TYPE_FOR_TASK[taskKey],
        index: nextCreationIndex++,
        taskSeed: hashTaskSeed(taskSeed),
        generation: 1,
      }, assignedNames);
      assignedNames.add(naming.displayName);
      return {
        id: stored?.id ?? `sat_${String(naming.index).padStart(6, "0")}`,
        taskKey,
        naming,
        color,
        createdAtIso: stored?.createdAtIso ?? new Date().toISOString(),
        createdAt: performance.now(),
        angle: random(0, Math.PI * 2),
        incline: random(-0.72, 0.72),
        precession: random(-1.2, 1.2),
        speed: random(0.16, 0.3) * (Math.random() > 0.5 ? 1 : -1),
        phase: random(0, Math.PI * 2),
        orbit: active ? random(1.22, 1.42) : 1.18 + knowledge.length % 5 * 0.045,
      };
    };

    const satellitePosition = (satellite: Satellite, time: number) => {
      const age = (time - satellite.createdAt) * 0.001;
      const angle = satellite.angle + age * satellite.speed;
      const bob = Math.sin(age * 1.7 + satellite.phase) * 0.05;
      return project(rotatePoint({ x: Math.cos(angle) * Math.cos(satellite.incline), y: Math.sin(satellite.incline + bob) * 0.7, z: Math.sin(angle) * Math.cos(satellite.incline) }, satellite.precession + age * 0.035), satellite.orbit);
    };

    const randomSurfacePoint = (): Point3D => {
      const y = random(-0.8, 0.8);
      const angle = random(0, Math.PI * 2);
      const shell = Math.sqrt(1 - y * y);
      return { x: Math.cos(angle) * shell, y, z: Math.sin(angle) * shell };
    };

    const emitPacket = (color: string, delay = 0) => {
      packets.push({ source: randomSurfacePoint(), color, startedAt: performance.now() + delay, duration: random(950, 1600), curveX: random(-60, 60), curveY: random(-70, 35), size: random(0.15, 0.75) });
      packetTotal += 1;
      if (packetRef.current) packetRef.current.textContent = String(packetTotal);
    };

    const syncQueue = () => {
      if (queueValueRef.current) queueValueRef.current.textContent = queue.length ? TASKS[queue[0].taskKey].label : "—";
      if (queueCountRef.current) queueCountRef.current.textContent = String(queue.length);
    };

    const updateTaskUI = (taskKey: TaskKey, config: TaskConfig) => {
      if (statusRef.current) statusRef.current.textContent = config.label.toLowerCase();
      if (workflowRef.current) workflowRef.current.textContent = taskKey;
      if (activityValueRef.current) activityValueRef.current.textContent = config.title;
      if (activityTimeRef.current) activityTimeRef.current.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      if (eyebrowRef.current) eyebrowRef.current.textContent = config.label;
      if (titleRef.current) titleRef.current.textContent = config.title;
      if (detailRef.current) detailRef.current.textContent = config.detail;
      progressRef.current?.style.setProperty("--active-color", config.color);
    };

    const startTask = (taskKey: TaskKey, label?: string, taskSeed = `${taskKey}-${nextCreationIndex}`) => {
      if (activeTask) {
        queue.push({ taskKey, label, taskSeed });
        if (queue.length > 24) queue.shift();
        syncQueue();
        return;
      }
      const config = { ...TASKS[taskKey], ...(label ? { title: label } : {}) };
      activeTask = { key: taskKey, config, startedAt: performance.now(), duration: reducedMotion ? Math.max(2100, config.duration * 0.7) : config.duration, nextPacketAt: performance.now() };
      activeSatellite = makeSatellite(taskKey, taskSeed, config.color);
      progress = 0;
      updateTaskUI(taskKey, config);
      for (let index = 0; index < 4; index += 1) emitPacket(config.color, index * 110);
    };

    const finishTask = () => {
      if (!activeTask || !activeSatellite) return;
      knowledge.push({ ...activeSatellite, createdAt: performance.now() - random(2000, 7000), orbit: 1.17 + knowledge.length % 6 * 0.038, speed: random(0.035, 0.085) * (Math.random() > 0.5 ? 1 : -1) });
      if (knowledge.length > 84) knowledge.shift();
      persistSatellites();
      syncSatellites();
      if (knowledgeRef.current) knowledgeRef.current.textContent = String(knowledge.length);
      if (activityValueRef.current) activityValueRef.current.textContent = "Task completed";
      if (eyebrowRef.current) eyebrowRef.current.textContent = "Knowledge integrated";
      if (titleRef.current) titleRef.current.textContent = activeSatellite.naming.displayName;
      if (detailRef.current) detailRef.current.textContent = "A new satellite has joined the Codex knowledge lattice";
      if (statusRef.current) statusRef.current.textContent = "standing by";
      if (workflowRef.current) workflowRef.current.textContent = "idle";
      progressRef.current?.style.setProperty("--progress", "0%");
      activeTask = null;
      activeSatellite = null;
      progress = 0;
      if (queue.length) {
        const next = queue.shift()!;
        syncQueue();
        window.setTimeout(() => startTask(next.taskKey, next.label, next.taskSeed), 500);
      } else if (auto) {
        autoAt = performance.now() + random(900, 2100);
      }
    };

    const drawBackgroundAura = (time: number) => {
      const color = activeTask?.config.color ?? "#37d7ff";
      const pulse = activeTask ? 0.08 + Math.sin(time * 0.006) * 0.02 : 0.03;
      const aura = ctx.createRadialGradient(centerX, centerY, radius * 0.15, centerX, centerY, radius * 1.45);
      aura.addColorStop(0, rgba(color, pulse));
      aura.addColorStop(0.52, "rgba(9,85,130,.045)");
      aura.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, width, height);
    };

    const drawOrbitRings = (time: number) => {
      const rings = [{ x: 1.32, y: 0.72, angle: -0.12, alpha: 0.19 }, { x: 1.1, y: 1.04, angle: 0.44, alpha: 0.14 }, { x: 1.45, y: 0.44, angle: -0.56, alpha: 0.08 }];
      ctx.save();
      ctx.translate(centerX, centerY);
      for (const ring of rings) {
        ctx.save();
        ctx.rotate(ring.angle + Math.sin(time * 0.00016) * 0.035);
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * ring.x, radius * ring.y, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(55,158,220,${ring.alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      }
      ctx.setLineDash([2, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.27, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(44,138,198,.1)";
      ctx.stroke();
      ctx.restore();
      ctx.setLineDash([]);
    };

    const drawAtmosphere = (time: number) => {
      const angle = time * 0.000018;
      const extraCosine = Math.cos(angle);
      const extraSine = Math.sin(angle);
      const yawCosine = cosineYaw * extraCosine - sineYaw * extraSine;
      const yawSine = sineYaw * extraCosine + cosineYaw * extraSine;
      ctx.save();
      for (const dust of atmosphereDust) {
        const x = dust.x * yawCosine - dust.z * yawSine;
        const z = dust.x * yawSine + dust.z * yawCosine;
        const y = dust.y * cosinePitch - z * sinePitch;
        const rotatedZ = dust.y * sinePitch + z * cosinePitch;
        const perspective = 3.2 / (3.2 - rotatedZ * 0.52);
        ctx.globalAlpha = dust.alpha * clamp((rotatedZ + 1.5) / 2.5, 0, 1);
        ctx.fillStyle = "#39bfff";
        ctx.fillRect(centerX + x * radius * perspective, centerY + y * radius * perspective, dust.size, dust.size);
      }
      ctx.restore();
    };

    const drawGlobeShell = () => {
      const shell = ctx.createRadialGradient(centerX - radius * 0.28, centerY - radius * 0.26, radius * 0.05, centerX, centerY, radius * 1.08);
      shell.addColorStop(0, "rgba(17,112,165,.13)");
      shell.addColorStop(0.62, "rgba(3,37,62,.16)");
      shell.addColorStop(0.9, "rgba(1,14,25,.16)");
      shell.addColorStop(1, "rgba(35,162,230,.075)");
      ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fillStyle = shell; ctx.fill();
      ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.strokeStyle = "rgba(61,180,243,.34)"; ctx.lineWidth = 1; ctx.shadowColor = "rgba(55,215,255,.45)"; ctx.shadowBlur = 15; ctx.stroke(); ctx.shadowBlur = 0;
      const terminator = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
      terminator.addColorStop(0, "rgba(0,0,0,.57)"); terminator.addColorStop(0.42, "rgba(0,0,0,.02)"); terminator.addColorStop(1, "rgba(35,172,234,.04)");
      ctx.save(); ctx.beginPath(); ctx.arc(centerX, centerY, radius - 1, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = terminator; ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2); ctx.restore();
      ctx.save(); ctx.strokeStyle = "rgba(39,130,186,.075)"; ctx.lineWidth = 0.7;
      for (let index = 1; index < 7; index += 1) {
        const y = lerp(-radius, radius, index / 7);
        const x = Math.sqrt(Math.max(0, radius * radius - y * y));
        ctx.beginPath(); ctx.ellipse(centerX, centerY + y, x, x * 0.12, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    };

    const drawGlobePoints = (time: number) => {
      for (const point of renderedGlobePoints) {
        const source = point.source;
        point.x = source.x * cosineYaw - source.z * sineYaw;
        const z = source.x * sineYaw + source.z * cosineYaw;
        point.y = source.y * cosinePitch - z * sinePitch;
        point.z = source.y * sinePitch + z * cosinePitch;
        point.perspective = 3.2 / (3.2 - point.z * 0.52);
      }
      renderedGlobePoints.sort((a, b) => a.z - b.z);
      ctx.save();
      for (const point of renderedGlobePoints) {
        const source = point.source;
        const front = clamp((point.z + 1) / 2, 0, 1);
        const alpha = source.alpha * (0.18 + front * 0.82) * clamp(1 - Math.abs(point.z) * 0.12, 0.5, 1) * (0.72 + Math.sin(time * 0.003 + source.phase) * 0.28);
        const color = source.warm ? "#ffb160" : front > 0.67 ? "#45ddff" : "#198fc7";
        const size = source.size * (0.58 + front * 0.78) * point.perspective;
        ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = size > 1.2 && front > 0.45 ? 6 + size * 2 : 0;
        ctx.beginPath(); ctx.arc(centerX + point.x * radius * point.perspective, centerY + point.y * radius * point.perspective, Math.max(0.35, size), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    };

    const drawCore = (time: number) => {
      const color = activeTask?.config.color ?? "#37d7ff";
      const coreRadius = radius * 0.16 * (1 + Math.sin(time * 0.0024) * 0.035);
      const halo = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius * 2.5);
      halo.addColorStop(0, rgba(color, 0.26)); halo.addColorStop(0.48, rgba(color, 0.08)); halo.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(centerX, centerY, coreRadius * 2.5, 0, Math.PI * 2); ctx.fill();
      const fill = ctx.createRadialGradient(centerX - coreRadius * 0.25, centerY - coreRadius * 0.3, coreRadius * 0.05, centerX, centerY, coreRadius);
      fill.addColorStop(0, rgba(color, 0.2)); fill.addColorStop(0.62, "rgba(4,24,38,.94)"); fill.addColorStop(1, "rgba(1,8,14,.97)");
      ctx.beginPath(); ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = rgba(color, 0.88); ctx.shadowColor = color; ctx.shadowBlur = activeTask ? 18 : 9; ctx.stroke(); ctx.shadowBlur = 0;
      const spin = time * (activeTask ? 0.0014 : 0.00055);
      for (let index = 0; index < 3; index += 1) {
        ctx.save(); ctx.translate(centerX, centerY); ctx.rotate(spin * (index % 2 ? -1 : 1) + index * 2.09); ctx.beginPath(); ctx.arc(0, 0, coreRadius * (0.38 + index * 0.13), -0.38, 0.38); ctx.strokeStyle = rgba(color, 0.88 - index * 0.19); ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
      }
      ctx.beginPath(); ctx.arc(centerX, centerY, 3.2, 0, Math.PI * 2); ctx.fillStyle = "#eaffff"; ctx.shadowColor = color; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0;
    };

    const drawKnowledge = (time: number) => {
      const rendered = knowledge.map((satellite) => ({ satellite, point: satellitePosition(satellite, time) }));
      ctx.save();
      for (let index = 0; index < rendered.length; index += 1) {
        const source = rendered[index];
        let nearestIndex = -1;
        let secondIndex = -1;
        let nearestDistance = Infinity;
        let secondDistance = Infinity;
        for (let candidate = 0; candidate < rendered.length; candidate += 1) {
          if (candidate === index) continue;
          const target = rendered[candidate];
          const distance = Math.hypot(source.point.x - target.point.x, source.point.y - target.point.y);
          if (distance >= radius * 0.72) continue;
          if (distance < nearestDistance) {
            secondIndex = nearestIndex; secondDistance = nearestDistance;
            nearestIndex = candidate; nearestDistance = distance;
          } else if (distance < secondDistance) {
            secondIndex = candidate; secondDistance = distance;
          }
        }
        for (let nearest = 0; nearest < 2; nearest += 1) {
          const candidate = nearest ? secondIndex : nearestIndex;
          if (candidate < 0) continue;
          const distance = nearest ? secondDistance : nearestDistance;
          const target = rendered[candidate];
          if (target.satellite.id < source.satellite.id) continue;
          ctx.beginPath(); ctx.moveTo(source.point.x, source.point.y); ctx.lineTo(target.point.x, target.point.y); ctx.strokeStyle = `rgba(67,176,230,${0.025 + (1 - distance / (radius * 0.72)) * 0.1})`; ctx.lineWidth = 0.55; ctx.stroke();
        }
      }
      for (const { satellite, point } of rendered.sort((a, b) => a.point.z - b.point.z)) {
        satellite.screenX = point.x; satellite.screenY = point.y;
        const front = clamp((point.z + 1) / 2, 0.2, 1); const dot = 1.1 + front * 1.25;
        ctx.beginPath(); ctx.arc(point.x, point.y, dot * 2.7, 0, Math.PI * 2); ctx.fillStyle = rgba(satellite.color, 0.045 * front); ctx.fill();
        ctx.beginPath(); ctx.arc(point.x, point.y, dot, 0, Math.PI * 2); ctx.fillStyle = satellite.color; ctx.globalAlpha = 0.34 + front * 0.66; ctx.shadowColor = satellite.color; ctx.shadowBlur = 9; ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
      ctx.restore();
    };

    const showSatelliteLabel = (satellite: Satellite, point: { x: number; y: number }) => {
      const label = labelRef.current;
      if (!label) return;
      label.style.left = `${point.x}px`; label.style.top = `${point.y - 36}px`; label.style.setProperty("--sat-color", satellite.color); label.classList.add("visible");
      if (labelTypeRef.current) labelTypeRef.current.textContent = `${TASKS[satellite.taskKey].label} satellite`;
      if (labelNameRef.current) labelNameRef.current.textContent = satellite.naming.displayName;
    };

    const drawActiveSatellite = (time: number) => {
      if (!activeSatellite) return null;
      const point = satellitePosition(activeSatellite, time);
      activeSatellite.screenX = point.x; activeSatellite.screenY = point.y;
      const pulse = 1 + Math.sin(time * 0.008) * 0.18;
      ctx.save(); ctx.beginPath(); ctx.arc(point.x, point.y, 20 * pulse, 0, Math.PI * 2); ctx.fillStyle = rgba(activeSatellite.color, 0.045); ctx.fill();
      ctx.beginPath(); ctx.arc(point.x, point.y, 10 * pulse, 0, Math.PI * 2); ctx.strokeStyle = rgba(activeSatellite.color, 0.34); ctx.lineWidth = 0.8; ctx.stroke();
      ctx.save(); ctx.translate(point.x, point.y); ctx.rotate(time * 0.0018); ctx.beginPath(); ctx.arc(0, 0, 15, -0.55, 0.55); ctx.arc(0, 0, 15, Math.PI - 0.55, Math.PI + 0.55); ctx.strokeStyle = rgba(activeSatellite.color, 0.72); ctx.stroke(); ctx.restore();
      ctx.beginPath(); ctx.arc(point.x, point.y, 3.1, 0, Math.PI * 2); ctx.fillStyle = "#f7ffff"; ctx.shadowColor = activeSatellite.color; ctx.shadowBlur = 20; ctx.fill(); ctx.restore(); ctx.shadowBlur = 0;
      return point;
    };

    const drawPackets = (time: number) => {
      if (!activeSatellite) return;
      const target = satellitePosition(activeSatellite, time);
      ctx.save();
      for (let index = packets.length - 1; index >= 0; index -= 1) {
        const packet = packets[index];
        if (time < packet.startedAt) continue;
        const elapsed = clamp((time - packet.startedAt) / packet.duration, 0, 1);
        const eased = easeInOut(elapsed);
        const source = project(rotatePoint(packet.source), 0.94);
        const bend = { x: lerp(source.x, target.x, 0.48) + packet.curveX, y: lerp(source.y, target.y, 0.48) + packet.curveY };
        const pointAt = (amount: number) => ({ x: (1 - amount) ** 2 * source.x + 2 * (1 - amount) * amount * bend.x + amount ** 2 * target.x, y: (1 - amount) ** 2 * source.y + 2 * (1 - amount) * amount * bend.y + amount ** 2 * target.y });
        const point = pointAt(eased); const tail = pointAt(clamp(eased - 0.045, 0, 1));
        ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(point.x, point.y); ctx.strokeStyle = rgba(packet.color, 0.36 * Math.sin(Math.PI * elapsed)); ctx.lineWidth = 0.75; ctx.stroke();
        ctx.beginPath(); ctx.arc(point.x, point.y, 1.2 + packet.size, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.shadowColor = packet.color; ctx.shadowBlur = 13; ctx.globalAlpha = Math.sin(Math.PI * elapsed); ctx.fill();
        if (elapsed >= 1) { packets.splice(index, 1); pulses.push({ x: target.x, y: target.y, color: packet.color, startedAt: time, duration: 540 }); }
      }
      ctx.restore(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    };

    const drawPulses = (time: number) => {
      ctx.save();
      for (let index = pulses.length - 1; index >= 0; index -= 1) {
        const pulse = pulses[index]; const elapsed = clamp((time - pulse.startedAt) / pulse.duration, 0, 1);
        ctx.beginPath(); ctx.arc(pulse.x, pulse.y, 3 + elapsed * 22, 0, Math.PI * 2); ctx.strokeStyle = rgba(pulse.color, (1 - elapsed) * 0.5); ctx.lineWidth = 0.8; ctx.stroke();
        if (elapsed >= 1) pulses.splice(index, 1);
      }
      ctx.restore();
    };

    const updateHoverLabel = (activePoint: ScreenPoint | null) => {
      let hovered: Satellite | null = null;
      let nearestDistance = Infinity;
      for (const satellite of knowledge) {
        const distance = Math.hypot((satellite.screenX ?? -1000) - hoverX, (satellite.screenY ?? -1000) - hoverY);
        if (distance < nearestDistance) { hovered = satellite; nearestDistance = distance; }
      }
      if (activeSatellite) {
        const distance = Math.hypot((activeSatellite.screenX ?? -1000) - hoverX, (activeSatellite.screenY ?? -1000) - hoverY);
        if (distance < nearestDistance) { hovered = activeSatellite; nearestDistance = distance; }
      }
      if (hovered && nearestDistance <= 14) showSatelliteLabel(hovered, { x: hovered.screenX!, y: hovered.screenY! });
      else if (activeSatellite && activePoint) showSatelliteLabel(activeSatellite, activePoint);
      else labelRef.current?.classList.remove("visible");
    };

    const updateTask = (time: number) => {
      if (!activeTask) return;
      progress = clamp((time - activeTask.startedAt) / activeTask.duration, 0, 1);
      progressRef.current?.style.setProperty("--progress", `${progress * 100}%`);
      const interval = activeTask.duration / activeTask.config.packets;
      if (time >= activeTask.nextPacketAt && progress < 0.93) {
        const burst = Math.random() > 0.78 ? 2 : 1;
        for (let index = 0; index < burst; index += 1) emitPacket(activeTask.config.color, index * 90);
        activeTask.nextPacketAt = time + interval * random(0.65, 1.25);
      }
      if (progress >= 1) finishTask();
    };

    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (!isVisible || document.hidden) return;
      const signal = signalRef.current;
      if (signal.eventId && signal.eventId !== lastEventId) {
        startTask(TASK_FOR_ACTIVITY[signal.activityKind], signal.eventLabel, signal.eventId);
        lastEventId = signal.eventId;
      }
      const delta = Math.min(40, time - lastFrame); lastFrame = time;
      const pointerEase = 1 - (1 - 0.035) ** (delta / (1000 / 30));
      pointerX = lerp(pointerX, targetPointerX, pointerEase); pointerY = lerp(pointerY, targetPointerY, pointerEase);
      rotation += reducedMotion ? 0 : delta * (activeTask ? 0.00017 : 0.000085);
      const yaw = rotation + pointerX * 0.15;
      const pitch = -0.16 + pointerY * 0.08;
      cosineYaw = Math.cos(yaw); sineYaw = Math.sin(yaw); cosinePitch = Math.cos(pitch); sinePitch = Math.sin(pitch);
      ctx.clearRect(0, 0, width, height);
      drawBackgroundAura(time); drawOrbitRings(time); drawAtmosphere(time); drawKnowledge(time); drawGlobeShell(); drawGlobePoints(time); drawPackets(time); drawPulses(time); drawCore(time);
      const activePoint = drawActiveSatellite(time);
      updateHoverLabel(activePoint);
      updateTask(time);
      if (auto && !activeTask && !queue.length && time >= autoAt) {
        const keys = Object.keys(TASKS) as TaskKey[];
        const taskKey = keys[Math.floor(Math.random() * keys.length)];
        startTask(taskKey, undefined, `auto-${taskKey}-${nextCreationIndex}`);
      }
    };

    const move = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      hoverX = event.clientX - rect.left; hoverY = event.clientY - rect.top;
      targetPointerX = clamp(hoverX / rect.width * 2 - 1, -1, 1); targetPointerY = clamp(hoverY / rect.height * 2 - 1, -1, 1);
    };
    const leave = () => { targetPointerX = 0; targetPointerY = 0; hoverX = -1000; hoverY = -1000; };
    const runManual = (event: Event) => { const taskKey = (event as CustomEvent<TaskKey>).detail; startTask(taskKey); };
    const toggleAuto = () => { auto = !auto; autoRef.current?.setAttribute("aria-pressed", String(auto)); if (auto && !activeTask) autoAt = performance.now() + 700; };
    const clear = () => { knowledge.length = 0; assignedNames.clear(); packets.length = 0; pulses.length = 0; packetTotal = 0; persistSatellites(); syncSatellites(); if (knowledgeRef.current) knowledgeRef.current.textContent = "0"; if (packetRef.current) packetRef.current.textContent = "0"; };

    const observer = new ResizeObserver(resize);
    const visibilityObserver = new IntersectionObserver(([entry]) => { isVisible = entry.isIntersecting; });
    observer.observe(stage);
    visibilityObserver.observe(stage);
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerleave", leave);
    stage.addEventListener("living-task", runManual);
    stage.addEventListener("living-auto", toggleAuto);
    stage.addEventListener("living-clear", clear);
    window.addEventListener("resize", resize);
    resize();
    const initialSatellites = storedState ? storedSatellites : (["think", "search", "tool", "write", "verify", "search", "think", "tool"] as TaskKey[]).map((taskKey, index) => ({ taskKey, index }));
    initialSatellites.forEach((entry, index) => {
      const taskKey = entry.taskKey;
      const stored = "naming" in entry ? entry : undefined;
      const satellite = makeSatellite(taskKey, `bootstrap-${index + 1}`, stored?.color ?? TASKS[taskKey].color, false, stored);
      satellite.createdAt -= index * 830; satellite.angle += index * 0.74; knowledge.push(satellite);
    });
    if (!storedState) persistSatellites();
    syncSatellites();
    if (knowledgeRef.current) knowledgeRef.current.textContent = String(knowledge.length);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); visibilityObserver.disconnect(); window.removeEventListener("resize", resize); stage.removeEventListener("pointermove", move); stage.removeEventListener("pointerleave", leave); stage.removeEventListener("living-task", runManual); stage.removeEventListener("living-auto", toggleAuto); stage.removeEventListener("living-clear", clear);
    };
  }, [onSatellitesChange]);

  const dispatch = (name: string, detail?: TaskKey) => stageRef.current?.dispatchEvent(new CustomEvent(name, { detail }));

  return (
    <div ref={stageRef} className={`living-globe-runtime${SHOW_SIMULATOR_CONTROLS ? " has-controls" : ""}`}>
      <canvas ref={canvasRef} className="living-globe-canvas" aria-label="Animated Codex knowledge globe" />
      <div className="living-globe-scan" />
      <aside className="living-globe-hud living-globe-hud-left">
        <article style={{ "--card-color": "#37bfff" } as React.CSSProperties}><strong>Model</strong><span>{model}</span><small>reasoning core</small></article>
        <article style={{ "--card-color": "#5ecbff" } as React.CSSProperties}><strong>Context</strong><span>{context}</span><small>visual runtime</small></article>
        <article style={{ "--card-color": "#37bfff" } as React.CSSProperties}><strong>Activity</strong><span ref={activityValueRef}>Awaiting task</span><small ref={activityTimeRef}>ready</small></article>
      </aside>
      <aside className="living-globe-hud living-globe-hud-right">
        <article style={{ "--card-color": "#ffad5f" } as React.CSSProperties}><strong>Workflow</strong><span ref={workflowRef}>idle</span><small ref={statusRef}>standing by</small></article>
        <article style={{ "--card-color": "#56f2ad" } as React.CSSProperties}><strong>Knowledge</strong><span><i ref={knowledgeRef}>0</i> satellites</span><small><i ref={packetRef}>0</i> light packets</small></article>
        <article style={{ "--card-color": "#b080ff" } as React.CSSProperties}><strong>Queue</strong><span ref={queueValueRef}>—</span><small><i ref={queueCountRef}>0</i> waiting</small></article>
      </aside>
      <div className="living-globe-caption" aria-live="polite"><strong ref={eyebrowRef}>Codex core online</strong><span ref={titleRef}>A living map of accumulated knowledge</span><small ref={detailRef}>Live Codex activity will animate the globe</small></div>
      <div className="living-globe-legend"><span><i style={{ "--legend": "#37d7ff" } as React.CSSProperties} />knowledge</span><span><i style={{ "--legend": "#ffac5c" } as React.CSSProperties} />reasoning</span><span><i style={{ "--legend": "#52f6ad" } as React.CSSProperties} />tools</span><span><i style={{ "--legend": "#b080ff" } as React.CSSProperties} />search</span></div>
      <div ref={progressRef} className="living-globe-progress" />
      {SHOW_SIMULATOR_CONTROLS ? <nav className="living-globe-controls" aria-label="Codex process simulator">
        <div>{(Object.keys(TASKS) as TaskKey[]).map((taskKey) => <button key={taskKey} type="button" style={{ "--accent": TASKS[taskKey].color } as React.CSSProperties} onClick={() => dispatch("living-task", taskKey)}><strong>{TASK_BUTTONS[taskKey][0]}</strong><small>{TASK_BUTTONS[taskKey][1]}</small></button>)}</div>
        <div><button ref={autoRef} type="button" aria-label="Toggle automatic simulation" aria-pressed="true" onClick={() => dispatch("living-auto")}>∞</button><button type="button" aria-label="Clear knowledge satellites" onClick={() => dispatch("living-clear")}>×</button></div>
      </nav> : null}
      <div ref={labelRef} className="living-globe-satellite-label"><strong ref={labelTypeRef}>task</strong><small ref={labelNameRef}>working…</small></div>
      <div className="living-globe-grain" />
    </div>
  );
}

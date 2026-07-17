import { useEffect, useRef } from "react";
import { generateUniqueSatelliteNameMetadata, hashTaskSeed, type SatelliteType } from "../satellite-naming";
import {
  LEGACY_SATELLITE_STORAGE_KEY,
  UNIVERSE_CONFIG,
  addSatellite,
  advanceUniverse,
  createUniverse,
  evaluateExpansion,
  planetPositionAt,
  planetPositionOnOrbit,
  reconcileUniverseSnapshot,
  resolveProjectSystem,
  routeCrossSystemSignal,
  routeSignal,
  starSystemExtent,
  summarizeUniverse,
  type Planet,
  type ProjectIdentityInput,
  type StarSystem,
  type TaskKey,
  type UniverseSatellite,
  type UniverseState,
  type UniverseObservationSnapshot,
  type UniverseSummary,
} from "../universe";
import { loadUniverseFromStorage, saveUniverseToStorage } from "../universe-storage";

type ActivityKind = "idle" | "thinking" | "workflow" | "tool" | "search";
type Point3D = { x: number; y: number; z: number };
type ScreenPoint = { x: number; y: number; z: number; perspective: number };
type GlobePoint = Point3D & { size: number; alpha: number; warm: boolean; phase: number };
type RenderedGlobePoint = { source: GlobePoint; x: number; y: number; z: number; perspective: number; alpha: number; size: number };
type Dust = Point3D & { size: number; alpha: number };
type RenderedDust = Dust & { renderedX: number; renderedY: number; renderedAlpha: number };
type Satellite = UniverseSatellite & {
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
type ActiveTask = { key: TaskKey; config: TaskConfig; startedAt: number; duration: number; nextPacketAt: number; projectIdentity?: ProjectIdentityInput | null; sourceId?: string };
type QueuedTask = { taskKey: TaskKey; label?: string; taskSeed?: string; projectIdentity?: ProjectIdentityInput | null; sourceId?: string };
export type ChatActivitySignal = { sessionId: string; eventId?: string; activityKind: ActivityKind; eventLabel?: string; projectIdentity?: ProjectIdentityInput | null };
export type PulsarObservation = { automationId: string; displayName: string; schedule: string; status: "healthy" | "running" | "failed" | "paused" | "removed"; lastRunAt?: string | null };
type ActiveChat = ChatActivitySignal & { systemId: string };
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
const SHOW_SIMULATOR_CONTROLS = false;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
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

type LegacySatellite = Pick<Satellite, "id" | "taskKey" | "naming" | "color" | "createdAtIso">;

function loadLegacySatellites(): LegacySatellite[] | null {
  try {
    const stored = window.localStorage.getItem(LEGACY_SATELLITE_STORAGE_KEY);
    if (stored === null) return null;
    const value: unknown = JSON.parse(stored);
    if (!Array.isArray(value)) return [];
    const names = new Set<string>();
    return value.filter((satellite): satellite is LegacySatellite => {
      if (!satellite || typeof satellite !== "object") return false;
      const record = satellite as Partial<LegacySatellite>;
      const name = record.naming?.displayName;
      if (typeof record.id !== "string" || !(record.taskKey && record.taskKey in TASKS) || typeof record.color !== "string" || typeof record.createdAtIso !== "string" || typeof name !== "string" || name.length < 4 || name.length > 40 || names.has(name)) return false;
      names.add(name);
      return true;
    });
  } catch {
    return null;
  }
}

function loadUniverse(): UniverseState {
  try {
    const restored = loadUniverseFromStorage(window.localStorage);
    if (restored) { evaluateExpansion(restored); return restored; }
  } catch {
    // Fall through to legacy migration or a fresh universe.
  }
  const legacy = loadLegacySatellites();
  const initial = legacy ?? (() => {
    const names = new Set<string>();
    return (["think", "search", "tool", "write", "verify", "search", "think", "tool"] as TaskKey[]).map((taskKey, index) => ({
      id: `sat_${String(index + 1).padStart(6, "0")}`,
      taskKey,
      naming: generateUniqueSatelliteNameMetadata({ type: SATELLITE_TYPE_FOR_TASK[taskKey], index: index + 1, taskSeed: hashTaskSeed(`bootstrap-${index + 1}`), generation: 1 }, names),
      color: TASKS[taskKey].color,
      createdAtIso: new Date().toISOString(),
    }));
  })();
  const universe = createUniverse(initial);
  evaluateExpansion(universe);
  return universe;
}

export function CodexGlobe({ activity = 0, eventId, activityKind = "idle", eventLabel, projectIdentity, observedProjects = [], observation = null, chatActivities = [], pulsars = [], model = "Waiting for traffic", context = "living-codex / globe", onSatellitesChange, onUniverseChange }: {
  activity?: number;
  eventId?: string;
  activityKind?: ActivityKind;
  eventLabel?: string;
  projectIdentity?: ProjectIdentityInput | null;
  observedProjects?: ProjectIdentityInput[];
  observation?: UniverseObservationSnapshot | null;
  chatActivities?: ChatActivitySignal[];
  pulsars?: PulsarObservation[];
  model?: string;
  context?: string;
  onSatellitesChange?: (satellites: SatelliteSummary[]) => void;
  onUniverseChange?: (summary: UniverseSummary) => void;
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
  const signalRef = useRef({ activity, eventId, activityKind, eventLabel, projectIdentity, observedProjects, observation, chatActivities, pulsars });

  useEffect(() => {
    signalRef.current = { activity, eventId, activityKind, eventLabel, projectIdentity, observedProjects, observation, chatActivities, pulsars };
  }, [activity, eventId, activityKind, eventLabel, projectIdentity, observedProjects, observation, chatActivities, pulsars]);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true, desynchronized: true });
    if (!stage || !canvas || !ctx) return;

    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const globePoints: GlobePoint[] = [];
    const renderedGlobePoints: RenderedGlobePoint[] = [];
    const atmosphereDust: Dust[] = [];
    const renderedAtmosphereDust: RenderedDust[] = [];
    const lightSprites = new Map<string, { image: HTMLCanvasElement; center: number }>();
    const ringSprites = new Map<string, { image: HTMLCanvasElement; center: number; radius: number }>();
    const trailSprites = new Map<string, { image: HTMLCanvasElement; padding: number; length: number }>();
    const rocketSprites = new Map<number, HTMLCanvasElement>();
    const nebulaSprites = new Map<string, HTMLCanvasElement>();
    const blackHoleSprites = new Map<number, HTMLCanvasElement>();
    const asteroidSprites = new Map<string, HTMLCanvasElement>();
    const stationSprites = new Map<string, HTMLCanvasElement>();
    const knowledge: Satellite[] = [];
    const packets: Packet[] = [];
    const pulses: Pulse[] = [];
    const queue: QueuedTask[] = [];
    const assignedNames = new Set<string>();
    const knowledgeByPlanet = new Map<string, Satellite[]>();
    const universe = loadUniverse();
    const storedSatellites = universe.satellites;
    let nextCreationIndex = Math.max(0, ...storedSatellites.map((satellite) => satellite.naming.index || 0)) + 1;
    let width = 1;
    let height = 1;
    let radius = 180;
    let viewportRadius = 180;
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
    const lastEventIds = new Map<string, string>();
    const activeChats = new Map<string, ActiveChat>();
    let packetTotal = 0;
    let progress = 0;
    let auto = false;
    let autoAt = performance.now() + 1800;
    let lastFrame = performance.now();
    let isVisible = true;
    let frame = 0;
    let currentPlanetColor = "#37d7ff";
    let cameraPanX = universe.camera.panX;
    let cameraPanY = universe.camera.panY;
    let cameraZoom = universe.camera.zoom;
    let cameraRotation = universe.camera.rotation;
    let cameraPitch = universe.camera.pitch;
    let dragging = false;
    let dragButton = 0;
    let dragX = 0;
    let dragY = 0;
    let dragMoved = false;
    let lastUniverseSync = 0;
    let persistTimer: number | undefined;
    let lastObservationSignature = "";
    const planetScreens = new Map<string, { x: number; y: number; radius: number; z: number }>();
    const starScreens = new Map<string, { x: number; y: number; radius: number; z: number }>();
    const stationScreens = new Map<string, { x: number; y: number; radius: number; z: number; angle: number }>();
    const infrastructureScreens = new Map<string, { x: number; y: number; color: string; type: string; label: string }>();
    const planetPositions = new Map<string, Point3D>();
    const orbitScreens = new Map<string, Array<{ x: number; y: number }>>();
    const asteroidBeltsBySystem = new Map<string, UniverseState["asteroidBelts"]>();
    const stationsBySystem = new Map<string, UniverseState["spaceStations"]>();
    const pulsarsBySystem = new Map<string, UniverseState["pulsars"]>();

    const refreshInfrastructureIndex = () => {
      asteroidBeltsBySystem.clear(); stationsBySystem.clear(); pulsarsBySystem.clear();
      for (const asteroid of universe.asteroidBelts) { const items = asteroidBeltsBySystem.get(asteroid.systemId); if (items) items.push(asteroid); else asteroidBeltsBySystem.set(asteroid.systemId, [asteroid]); }
      for (const station of universe.spaceStations) { const items = stationsBySystem.get(station.systemId); if (items) items.push(station); else stationsBySystem.set(station.systemId, [station]); }
      for (const pulsar of universe.pulsars) { const items = pulsarsBySystem.get(pulsar.systemId); if (items) items.push(pulsar); else pulsarsBySystem.set(pulsar.systemId, [pulsar]); }
    };
    refreshInfrastructureIndex();

    const syncUniverse = () => {
      onSatellitesChange?.(universe.satellites.map((satellite) => ({ id: satellite.id, label: satellite.naming.displayName, type: TASKS[satellite.taskKey].label, color: satellite.color })));
      onUniverseChange?.(summarizeUniverse(universe));
    };
    const persistUniverse = () => {
      try {
        universe.camera = { ...universe.camera, panX: cameraPanX, panY: cameraPanY, zoom: cameraZoom, rotation: cameraRotation, pitch: cameraPitch };
        saveUniverseToStorage(window.localStorage, universe);
      } catch {
        // Storage may be unavailable in private or policy-restricted browser contexts.
      }
    };
    const schedulePersistUniverse = () => {
      window.clearTimeout(persistTimer);
      persistTimer = window.setTimeout(() => { persistTimer = undefined; persistUniverse(); }, 180);
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
      for (const source of globePoints) renderedGlobePoints.push({ source, x: 0, y: 0, z: 0, perspective: 1, alpha: 0, size: 0 });
      renderedAtmosphereDust.length = 0;
      for (const dust of atmosphereDust) renderedAtmosphereDust.push({ ...dust, renderedX: 0, renderedY: 0, renderedAlpha: 0 });
    };

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      const dpr = clamp(devicePixelRatio || 1, 1, 2);
      const pixelWidth = Math.floor(rect.width * dpr);
      const pixelHeight = Math.floor(rect.height * dpr);
      if (width === rect.width && height === rect.height && canvas.width === pixelWidth && canvas.height === pixelHeight) return;
      const nextRadius = clamp(Math.min(rect.width * 0.24, rect.height * 0.36), 128, 260);
      const radiusChanged = viewportRadius !== nextRadius;
      width = rect.width;
      height = rect.height;
      centerX = width * 0.5;
      centerY = height * 0.45;
      radius = nextRadius;
      viewportRadius = nextRadius;
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

    const drawCachedLight = (x: number, y: number, size: number, glowColor: string, blur: number, fillColor = glowColor, alpha = 1) => {
      const sizeKey = Math.max(1, Math.round(size * 4));
      const scale = clamp(devicePixelRatio || 1, 1, 2);
      const key = `${glowColor}:${fillColor}:${sizeKey}:${blur}:${scale}`;
      let sprite = lightSprites.get(key);
      if (!sprite) {
        const dotSize = sizeKey / 4;
        const center = Math.ceil(dotSize + blur * 1.5 + 2);
        const image = document.createElement("canvas");
        image.width = image.height = Math.ceil(center * 2 * scale);
        const spriteContext = image.getContext("2d");
        if (spriteContext) {
          spriteContext.setTransform(scale, 0, 0, scale, 0, 0);
          spriteContext.fillStyle = fillColor; spriteContext.shadowColor = glowColor; spriteContext.shadowBlur = blur;
          spriteContext.beginPath(); spriteContext.arc(center, center, dotSize, 0, Math.PI * 2); spriteContext.fill();
        }
        sprite = { image, center };
        lightSprites.set(key, sprite);
      }
      const previousAlpha = ctx.globalAlpha;
      ctx.globalAlpha *= alpha;
      ctx.drawImage(sprite.image, x - sprite.center, y - sprite.center, sprite.center * 2, sprite.center * 2);
      ctx.globalAlpha = previousAlpha;
    };

    const drawCachedRing = (x: number, y: number, radius: number, strokeColor: string, glowColor: string, lineWidth: number, blur: number) => {
      const radiusStep = radius >= 32 ? 4 : radius >= 12 ? 2 : .5;
      const ringRadius = Math.max(.5, Math.round(radius / radiusStep) * radiusStep);
      const radiusKey = Math.round(ringRadius * 2);
      const widthKey = Math.max(1, Math.round(lineWidth * 4));
      const scale = clamp(devicePixelRatio || 1, 1, 2);
      const key = `${strokeColor}:${glowColor}:${radiusKey}:${widthKey}:${blur}:${scale}`;
      let sprite = ringSprites.get(key);
      if (!sprite) {
        const center = Math.ceil(ringRadius + blur * 1.5 + lineWidth + 2);
        const image = document.createElement("canvas");
        image.width = image.height = Math.ceil(center * 2 * scale);
        const spriteContext = image.getContext("2d");
        if (spriteContext) {
          spriteContext.setTransform(scale, 0, 0, scale, 0, 0);
          spriteContext.beginPath(); spriteContext.arc(center, center, ringRadius, 0, Math.PI * 2);
          spriteContext.strokeStyle = strokeColor; spriteContext.lineWidth = widthKey / 4; spriteContext.shadowColor = glowColor; spriteContext.shadowBlur = blur; spriteContext.stroke();
        }
        sprite = { image, center, radius: ringRadius };
        ringSprites.set(key, sprite);
      }
      const extent = sprite.center * radius / sprite.radius;
      ctx.drawImage(sprite.image, x - extent, y - extent, extent * 2, extent * 2);
    };

    const drawCachedTrail = (start: { x: number; y: number }, end: { x: number; y: number }, color: string, lineWidth: number, blur: number, alpha: number) => {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      if (length < .5) return;
      const lengthStep = length >= 16 ? 4 : 1;
      const lengthKey = Math.max(1, Math.round(length / lengthStep) * lengthStep);
      const widthKey = Math.round(lineWidth * 4);
      const scale = clamp(devicePixelRatio || 1, 1, 2);
      const key = `${color}:${lengthKey}:${widthKey}:${blur}:${scale}`;
      let sprite = trailSprites.get(key);
      if (!sprite) {
        const padding = Math.ceil(blur * 1.5 + lineWidth + 2);
        const image = document.createElement("canvas");
        image.width = Math.ceil((lengthKey + padding * 2) * scale);
        image.height = Math.ceil(padding * 2 * scale);
        const spriteContext = image.getContext("2d");
        if (spriteContext) {
          spriteContext.setTransform(scale, 0, 0, scale, 0, 0);
          spriteContext.beginPath(); spriteContext.moveTo(padding, padding); spriteContext.lineTo(padding + lengthKey, padding);
          spriteContext.strokeStyle = color; spriteContext.lineWidth = widthKey / 4; spriteContext.lineCap = "round"; spriteContext.shadowColor = color; spriteContext.shadowBlur = blur; spriteContext.stroke();
        }
        sprite = { image, padding, length: lengthKey };
        trailSprites.set(key, sprite);
      }
      ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(start.x, start.y); ctx.rotate(Math.atan2(dy, dx));
      ctx.drawImage(sprite.image, -sprite.padding, -sprite.padding, length + sprite.padding * 2, sprite.padding * 2);
      ctx.restore();
    };

    const drawCachedRocket = () => {
      const scale = clamp(devicePixelRatio || 1, 1, 2);
      let image = rocketSprites.get(scale);
      if (!image) {
        image = document.createElement("canvas");
        image.width = Math.ceil(64 * scale); image.height = Math.ceil(48 * scale);
        const spriteContext = image.getContext("2d");
        if (spriteContext) {
          spriteContext.setTransform(scale, 0, 0, scale, 0, 0); spriteContext.translate(32, 24);
          spriteContext.beginPath(); spriteContext.moveTo(9, 0); spriteContext.lineTo(-7, -4); spriteContext.lineTo(-4, 0); spriteContext.lineTo(-7, 4); spriteContext.closePath();
          spriteContext.fillStyle = "#fff2d5"; spriteContext.shadowColor = "#ffac5c"; spriteContext.shadowBlur = 18; spriteContext.fill();
        }
        rocketSprites.set(scale, image);
      }
      ctx.drawImage(image, -32, -24, 64, 48);
    };

    const drawCachedNebula = (x: number, y: number, radius: number, color: string, angle: number) => {
      const scale = clamp(devicePixelRatio || 1, 1, 2);
      const key = `${color}:${scale}`;
      let image = nebulaSprites.get(key);
      if (!image) {
        image = document.createElement("canvas"); image.width = Math.ceil(128 * scale); image.height = Math.ceil(80 * scale);
        const spriteContext = image.getContext("2d");
        if (spriteContext) {
          spriteContext.setTransform(scale, 0, 0, scale, 0, 0);
          for (const [cloudX, cloudY, cloudRadius, alpha] of [[64, 40, 38, .19], [43, 36, 27, .13], [84, 44, 31, .11]] as const) {
            const cloud = spriteContext.createRadialGradient(cloudX, cloudY, 0, cloudX, cloudY, cloudRadius);
            cloud.addColorStop(0, rgba(color, alpha)); cloud.addColorStop(.52, rgba(color, alpha * .48)); cloud.addColorStop(1, rgba(color, 0));
            spriteContext.fillStyle = cloud; spriteContext.fillRect(cloudX - cloudRadius, cloudY - cloudRadius, cloudRadius * 2, cloudRadius * 2);
          }
        }
        nebulaSprites.set(key, image);
      }
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.drawImage(image, -radius * 4.8, -radius * 2.8, radius * 9.6, radius * 5.6); ctx.restore();
    };

    const drawCachedBlackHole = (x: number, y: number, radius: number, angle: number) => {
      const scale = clamp(devicePixelRatio || 1, 1, 2);
      let image = blackHoleSprites.get(scale);
      if (!image) {
        image = document.createElement("canvas"); image.width = Math.ceil(120 * scale); image.height = Math.ceil(72 * scale);
        const spriteContext = image.getContext("2d");
        if (spriteContext) {
          spriteContext.setTransform(scale, 0, 0, scale, 0, 0); spriteContext.translate(60, 36);
          for (const [width, alpha] of [[7, .12], [4, .24], [1.4, .68]] as const) { spriteContext.beginPath(); spriteContext.ellipse(0, 0, 48, 14, 0, 0, Math.PI * 2); spriteContext.strokeStyle = rgba("#ffac5c", alpha); spriteContext.lineWidth = width; spriteContext.stroke(); }
          const horizon = spriteContext.createRadialGradient(0, 0, 7, 0, 0, 19); horizon.addColorStop(0, "rgba(0,0,0,1)"); horizon.addColorStop(.58, "rgba(0,0,0,.99)"); horizon.addColorStop(1, "rgba(0,0,0,0)");
          spriteContext.fillStyle = horizon; spriteContext.beginPath(); spriteContext.arc(0, 0, 19, 0, Math.PI * 2); spriteContext.fill();
        }
        blackHoleSprites.set(scale, image);
      }
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.drawImage(image, -radius * 3.3, -radius * 2, radius * 6.6, radius * 4); ctx.restore();
    };

    const drawCachedAsteroidBelt = (x: number, y: number, radius: number, particles: number, alpha: number, angle: number) => {
      const scale = clamp(devicePixelRatio || 1, 1, 2);
      const key = `${particles}:${scale}`;
      let image = asteroidSprites.get(key);
      if (!image) {
        image = document.createElement("canvas"); image.width = Math.ceil(140 * scale); image.height = Math.ceil(52 * scale);
        const spriteContext = image.getContext("2d");
        if (spriteContext) {
          spriteContext.setTransform(scale, 0, 0, scale, 0, 0); spriteContext.translate(70, 26);
          spriteContext.strokeStyle = rgba("#9ca6ad", .55); spriteContext.beginPath(); spriteContext.ellipse(0, 0, 62, 19, 0, 0, Math.PI * 2); spriteContext.stroke();
          for (let index = 0; index < particles; index += 1) { const particleAngle = index / particles * Math.PI * 2; const jitter = (seededNoise(index + particles * 13) - .5) * 5; const size = 1 + seededNoise(index + 91) * 1.2; spriteContext.fillStyle = rgba("#c2ccd2", .45 + index % 3 * .14); spriteContext.fillRect(Math.cos(particleAngle) * (62 + jitter) - size / 2, Math.sin(particleAngle) * (19 + jitter * .25) - size / 2, size, size); }
        }
        asteroidSprites.set(key, image);
      }
      ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(angle); ctx.drawImage(image, -radius * 5.6, -radius * 2.1, radius * 11.2, radius * 4.2); ctx.restore();
    };

    const drawCachedStation = (x: number, y: number, radius: number, color: string, angle: number) => {
      const scale = clamp(devicePixelRatio || 1, 1, 2);
      const key = `${color}:${scale}`;
      let image = stationSprites.get(key);
      if (!image) {
        image = document.createElement("canvas"); image.width = Math.ceil(40 * scale); image.height = Math.ceil(28 * scale);
        const spriteContext = image.getContext("2d");
        if (spriteContext) {
          spriteContext.setTransform(scale, 0, 0, scale, 0, 0); spriteContext.translate(20, 14); spriteContext.strokeStyle = color; spriteContext.fillStyle = "rgba(8,12,15,.94)"; spriteContext.shadowColor = color; spriteContext.shadowBlur = 4;
          spriteContext.fillRect(-6, -4, 12, 8); spriteContext.strokeRect(-6, -4, 12, 8); spriteContext.shadowBlur = 0;
          spriteContext.strokeRect(-17, -5, 8, 10); spriteContext.strokeRect(9, -5, 8, 10); spriteContext.beginPath(); spriteContext.moveTo(-9, 0); spriteContext.lineTo(9, 0); spriteContext.moveTo(0, -4); spriteContext.lineTo(0, -10); spriteContext.lineTo(4, -12); spriteContext.stroke();
          spriteContext.fillStyle = color; spriteContext.fillRect(-1, -1, 2, 2);
        }
        stationSprites.set(key, image);
      }
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.drawImage(image, -radius * 2, -radius * 1.4, radius * 4, radius * 2.8); ctx.restore();
    };

    const makeSatellite = (taskKey: TaskKey, taskSeed: string, color: string, active = true, stored?: UniverseSatellite): Satellite => {
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
        planetId: stored?.planetId ?? universe.universe.focusedPlanetId ?? universe.planets[0].id,
        previousPlanetId: stored?.previousPlanetId ?? null,
        migrationState: stored?.migrationState ?? "none",
        orbitSlot: stored?.orbitSlot ?? knowledge.length,
        transferHistory: stored?.transferHistory ?? [],
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

    const startTask = (taskKey: TaskKey, label?: string, taskSeed = `${taskKey}-${nextCreationIndex}`, project?: ProjectIdentityInput | null, sourceId?: string) => {
      if (activeTask) {
        queue.push({ taskKey, label, taskSeed, projectIdentity: project, sourceId });
        if (queue.length > 24) queue.shift();
        syncQueue();
        return;
      }
      const config = { ...TASKS[taskKey], ...(label ? { title: label } : {}) };
      activeTask = { key: taskKey, config, startedAt: performance.now(), duration: reducedMotion ? Math.max(2100, config.duration * 0.7) : config.duration, nextPacketAt: performance.now(), projectIdentity: project, sourceId };
      activeSatellite = makeSatellite(taskKey, taskSeed, config.color);
      routeSignal(universe, taskKey);
      progress = 0;
      updateTaskUI(taskKey, config);
      for (let index = 0; index < 4; index += 1) emitPacket(config.color, index * 110);
    };

    const finishTask = () => {
      if (!activeTask || !activeSatellite) return;
      const sourceSystemId = universe.universe.selectedSystemId ?? universe.universe.focusedSystemId;
      const added = addSatellite(universe, { id: activeSatellite.id, taskKey: activeSatellite.taskKey, naming: activeSatellite.naming, color: activeSatellite.color, createdAtIso: activeSatellite.createdAtIso, sourceId: activeTask.sourceId }, activeTask.projectIdentity);
      const stored = universe.satellites.find(({ id }) => id === activeSatellite?.id);
      if (stored) Object.assign(activeSatellite, stored);
      const destinationSystemId = added ? universe.planets.find(({ id }) => id === added.planetId)?.starSystemId : null;
      if (destinationSystemId && destinationSystemId !== sourceSystemId) routeCrossSystemSignal(universe, sourceSystemId, destinationSystemId, activeSatellite.taskKey);
      knowledge.push({ ...activeSatellite, createdAt: performance.now() - random(2000, 7000), orbit: 1.17 + knowledge.length % 6 * 0.038, speed: random(0.035, 0.085) * (Math.random() > 0.5 ? 1 : -1) });
      persistUniverse();
      syncUniverse();
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
        window.setTimeout(() => startTask(next.taskKey, next.label, next.taskSeed, next.projectIdentity, next.sourceId), 500);
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

    const drawPlanetRings = (planet: Planet, front: boolean) => {
      if (!planet.hasRings || radius < 4) return;
      ctx.save(); ctx.translate(centerX, centerY); ctx.rotate(-.18 + planet.orbit.phase * .04);
      for (let band = 0; band < 3; band += 1) {
        ctx.beginPath(); ctx.ellipse(0, 0, radius * (1.38 + band * .13), radius * (.3 + band * .025), 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
        ctx.strokeStyle = rgba(band === 1 ? "#ffd9a0" : currentPlanetColor, front ? .5 - band * .09 : .25 - band * .05); ctx.lineWidth = Math.max(.65, radius * .018); ctx.stroke();
      }
      ctx.restore();
    };

    const drawPlanetMoons = (time: number, planet: Planet, front: boolean) => {
      if (!planet.moonCount || radius < 5) return;
      ctx.save(); ctx.translate(centerX, centerY);
      for (let index = 0; index < planet.moonCount; index += 1) {
        const moonOrbit = radius * (1.62 + index * .36);
        const orbitHeight = moonOrbit * (.24 + index * .025);
        if (!front) { ctx.beginPath(); ctx.ellipse(0, 0, moonOrbit, orbitHeight, -.12, 0, Math.PI * 2); ctx.strokeStyle = "rgba(180,199,207,.12)"; ctx.lineWidth = .6; ctx.stroke(); }
        const angle = planet.orbit.phase * (index + 1) + index * GOLDEN_ANGLE + time * .00008 / (index + 1);
        if ((Math.sin(angle) >= 0) !== front) continue;
        const x = Math.cos(angle) * moonOrbit;
        const y = Math.sin(angle) * orbitHeight;
        const moonRadius = clamp(radius * (.065 + index * .008), 1, 3.5);
        drawCachedLight(x, y, moonRadius, "#a9bdc6", front ? 5 : 2, front ? "#e7e1ce" : "#7d8d95", front ? 1 : .65);
      }
      ctx.restore();
    };

    const updateAtmosphere = (time: number) => {
      const angle = time * 0.000018;
      const extraCosine = Math.cos(angle);
      const extraSine = Math.sin(angle);
      const yawCosine = cosineYaw * extraCosine - sineYaw * extraSine;
      const yawSine = sineYaw * extraCosine + cosineYaw * extraSine;
      for (const dust of renderedAtmosphereDust) {
        const x = dust.x * yawCosine - dust.z * yawSine;
        const z = dust.x * yawSine + dust.z * yawCosine;
        const y = dust.y * cosinePitch - z * sinePitch;
        const rotatedZ = dust.y * sinePitch + z * cosinePitch;
        const perspective = 3.2 / (3.2 - rotatedZ * 0.52);
        dust.renderedX = x * perspective;
        dust.renderedY = y * perspective;
        dust.renderedAlpha = dust.alpha * clamp((rotatedZ + 1.5) / 2.5, 0, 1);
      }
    };

    const drawAtmosphere = () => {
      ctx.save();
      for (const dust of renderedAtmosphereDust) {
        ctx.globalAlpha = dust.renderedAlpha;
        ctx.fillStyle = "#39bfff";
        ctx.fillRect(centerX + dust.renderedX * radius, centerY + dust.renderedY * radius, dust.size, dust.size);
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
      drawCachedRing(centerX, centerY, radius, rgba(currentPlanetColor, .42), rgba(currentPlanetColor, .55), 1, 15);
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

    const updateGlobePoints = (time: number) => {
      for (const point of renderedGlobePoints) {
        const source = point.source;
        point.x = source.x * cosineYaw - source.z * sineYaw;
        const z = source.x * sineYaw + source.z * cosineYaw;
        point.y = source.y * cosinePitch - z * sinePitch;
        point.z = source.y * sinePitch + z * cosinePitch;
        point.perspective = 3.2 / (3.2 - point.z * 0.52);
        const front = clamp((point.z + 1) / 2, 0, 1);
        point.alpha = source.alpha * (0.18 + front * 0.82) * clamp(1 - Math.abs(point.z) * 0.12, 0.5, 1) * (0.72 + Math.sin(time * 0.003 + source.phase) * 0.28);
        point.size = source.size * (0.58 + front * 0.78) * point.perspective;
      }
      renderedGlobePoints.sort((a, b) => a.z - b.z);
    };

    const drawGlobePoints = () => {
      ctx.save();
      for (const point of renderedGlobePoints) {
        const source = point.source;
        const front = clamp((point.z + 1) / 2, 0, 1);
        const color = source.warm ? "#ffb160" : currentPlanetColor;
        const x = centerX + point.x * radius * point.perspective;
        const y = centerY + point.y * radius * point.perspective;
        const size = Math.max(0.35, point.size);
        const blur = point.size > 1.2 && front > 0.45 ? Math.round(6 + point.size * 2) : 0;
        ctx.globalAlpha = point.alpha;
        if (!blur) {
          ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
          continue;
        }
        drawCachedLight(x, y, size, color, blur);
      }
      ctx.restore(); ctx.globalAlpha = 1;
    };

    const drawCore = (time: number) => {
      const color = activeTask?.config.color ?? currentPlanetColor;
      const coreRadius = radius * 0.16 * (1 + Math.sin(time * 0.0024) * 0.035);
      const halo = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius * 2.5);
      halo.addColorStop(0, rgba(color, 0.26)); halo.addColorStop(0.48, rgba(color, 0.08)); halo.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(centerX, centerY, coreRadius * 2.5, 0, Math.PI * 2); ctx.fill();
      const fill = ctx.createRadialGradient(centerX - coreRadius * 0.25, centerY - coreRadius * 0.3, coreRadius * 0.05, centerX, centerY, coreRadius);
      fill.addColorStop(0, rgba(color, 0.2)); fill.addColorStop(0.62, "rgba(4,24,38,.94)"); fill.addColorStop(1, "rgba(1,8,14,.97)");
      ctx.beginPath(); ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
      drawCachedRing(centerX, centerY, coreRadius, rgba(color, .88), color, 1, activeTask ? 18 : 9);
      const spin = time * (activeTask ? 0.0014 : 0.00055);
      for (let index = 0; index < 3; index += 1) {
        ctx.save(); ctx.translate(centerX, centerY); ctx.rotate(spin * (index % 2 ? -1 : 1) + index * 2.09); ctx.beginPath(); ctx.arc(0, 0, coreRadius * (0.38 + index * 0.13), -0.38, 0.38); ctx.strokeStyle = rgba(color, 0.88 - index * 0.19); ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
      }
      drawCachedLight(centerX, centerY, 3.2, color, 14, "#eaffff");
    };

    const drawKnowledge = (time: number, planetId: string, detail: number, showAll = false) => {
      if (detail === 2 && !showAll) return;
      const owned = knowledgeByPlanet.get(planetId) ?? [];
      const limit = showAll ? 0 : detail === 0 ? 260 : detail === 1 ? 90 : 0;
      const step = limit ? Math.max(1, Math.ceil(owned.length / limit)) : owned.length + 1;
      const rendered = (showAll ? owned : owned.filter((_, index) => index % step === 0)).map((satellite) => ({ satellite, point: satellitePosition(satellite, time) }));
      if (owned.length > rendered.length) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radius * 1.34, radius * .48, -.32, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(currentPlanetColor, Math.min(.34, .08 + owned.length / 4_000));
        ctx.lineWidth = Math.min(5, 1 + owned.length / 2_500);
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      const linkPaths = Array.from({ length: 16 }, () => new Path2D());
      const usedLinkPaths = new Uint8Array(linkPaths.length);
      const maximumLinkDistance = radius * .72;
      const maximumLinkDistanceSquared = maximumLinkDistance * maximumLinkDistance;
      for (let index = 0; index < rendered.length; index += 1) {
        const source = rendered[index];
        let nearestIndex = -1;
        let secondIndex = -1;
        let nearestDistanceSquared = Infinity;
        let secondDistanceSquared = Infinity;
        for (let candidate = 0; candidate < rendered.length; candidate += 1) {
          if (candidate === index) continue;
          const target = rendered[candidate];
          const dx = source.point.x - target.point.x;
          const dy = source.point.y - target.point.y;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared >= maximumLinkDistanceSquared) continue;
          if (distanceSquared < nearestDistanceSquared) {
            secondIndex = nearestIndex; secondDistanceSquared = nearestDistanceSquared;
            nearestIndex = candidate; nearestDistanceSquared = distanceSquared;
          } else if (distanceSquared < secondDistanceSquared) {
            secondIndex = candidate; secondDistanceSquared = distanceSquared;
          }
        }
        for (let nearest = 0; nearest < 2; nearest += 1) {
          const candidate = nearest ? secondIndex : nearestIndex;
          if (candidate < 0) continue;
          const distanceSquared = nearest ? secondDistanceSquared : nearestDistanceSquared;
          const target = rendered[candidate];
          if (target.satellite.id < source.satellite.id) continue;
          const strength = 1 - Math.sqrt(distanceSquared) / maximumLinkDistance;
          const bucket = Math.min(linkPaths.length - 1, Math.floor(strength * linkPaths.length));
          linkPaths[bucket].moveTo(source.point.x, source.point.y); linkPaths[bucket].lineTo(target.point.x, target.point.y); usedLinkPaths[bucket] = 1;
        }
      }
      ctx.lineWidth = .55;
      for (let bucket = 0; bucket < linkPaths.length; bucket += 1) if (usedLinkPaths[bucket]) {
        ctx.strokeStyle = `rgba(67,176,230,${.025 + (bucket + .5) / linkPaths.length * .1})`; ctx.stroke(linkPaths[bucket]);
      }
      for (const { satellite, point } of rendered.sort((a, b) => a.point.z - b.point.z)) {
        satellite.screenX = point.x; satellite.screenY = point.y;
        const front = clamp((point.z + 1) / 2, 0.2, 1); const dot = 1.1 + front * 1.25;
        ctx.beginPath(); ctx.arc(point.x, point.y, dot * 2.7, 0, Math.PI * 2); ctx.fillStyle = rgba(satellite.color, 0.045 * front); ctx.fill();
        drawCachedLight(point.x, point.y, dot, satellite.color, 9, satellite.color, .34 + front * .66);
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

    const showSystemLabel = (system: StarSystem, point: { x: number; y: number }) => {
      const label = labelRef.current;
      if (!label) return;
      const satellites = universe.satellites.filter((satellite) => system.planetIds.includes(satellite.planetId)).length;
      label.style.left = `${point.x}px`; label.style.top = `${point.y - 38}px`; label.style.setProperty("--sat-color", system.color); label.classList.add("visible");
      if (labelTypeRef.current) labelTypeRef.current.textContent = `Project system · ${system.planetIds.length} planets · ${satellites} satellites`;
      if (labelNameRef.current) labelNameRef.current.textContent = system.displayName;
    };

    const showInfrastructureLabel = (item: { x: number; y: number; color: string; type: string; label: string }) => {
      const label = labelRef.current;
      if (!label) return;
      label.style.left = `${item.x}px`; label.style.top = `${item.y - 32}px`; label.style.setProperty("--sat-color", item.color); label.classList.add("visible");
      if (labelTypeRef.current) labelTypeRef.current.textContent = item.type;
      if (labelNameRef.current) labelNameRef.current.textContent = item.label;
    };

    const drawActiveSatellite = (time: number, planetId: string) => {
      if (!activeSatellite || activeSatellite.planetId !== planetId) return null;
      const point = satellitePosition(activeSatellite, time);
      activeSatellite.screenX = point.x; activeSatellite.screenY = point.y;
      const pulse = 1 + Math.sin(time * 0.008) * 0.18;
      ctx.save(); ctx.beginPath(); ctx.arc(point.x, point.y, 20 * pulse, 0, Math.PI * 2); ctx.fillStyle = rgba(activeSatellite.color, 0.045); ctx.fill();
      ctx.beginPath(); ctx.arc(point.x, point.y, 10 * pulse, 0, Math.PI * 2); ctx.strokeStyle = rgba(activeSatellite.color, 0.34); ctx.lineWidth = 0.8; ctx.stroke();
      ctx.save(); ctx.translate(point.x, point.y); ctx.rotate(time * 0.0018); ctx.beginPath(); ctx.arc(0, 0, 15, -0.55, 0.55); ctx.arc(0, 0, 15, Math.PI - 0.55, Math.PI + 0.55); ctx.strokeStyle = rgba(activeSatellite.color, 0.72); ctx.stroke(); ctx.restore();
      drawCachedLight(point.x, point.y, 3.1, activeSatellite.color, 20, "#f7ffff"); ctx.restore();
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
        drawCachedLight(point.x, point.y, 1.2 + packet.size, packet.color, 13, "#fff", Math.sin(Math.PI * elapsed));
        if (elapsed >= 1) { packets.splice(index, 1); pulses.push({ x: target.x, y: target.y, color: packet.color, startedAt: time, duration: 540 }); }
      }
      ctx.restore();
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
      const infrastructure = [...infrastructureScreens.values()].map((item) => ({ item, distance: Math.hypot(item.x - hoverX, item.y - hoverY) })).filter(({ distance }) => distance <= 12).sort((a, b) => a.distance - b.distance)[0]?.item;
      if (infrastructure) { showInfrastructureLabel(infrastructure); return; }
      if (universe.camera.mode === "universe-overview") {
        const system = [...starScreens.entries()].map(([id, point]) => ({ system: universe.starSystems.find((candidate) => candidate.id === id), point, distance: Math.hypot(point.x - hoverX, point.y - hoverY) })).filter(({ system, distance }) => system && distance <= 16).sort((a, b) => a.distance - b.distance)[0];
        if (system?.system) showSystemLabel(system.system, system.point); else labelRef.current?.classList.remove("visible");
        return;
      }
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
      else {
        const system = [...starScreens.entries()].map(([id, point]) => ({ system: universe.starSystems.find((candidate) => candidate.id === id), point, distance: Math.hypot(point.x - hoverX, point.y - hoverY) })).filter(({ system, distance }) => system && distance <= 16).sort((a, b) => a.distance - b.distance)[0];
        if (system?.system) showSystemLabel(system.system, system.point); else labelRef.current?.classList.remove("visible");
      }
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

    const PLANET_COLORS = ["#37d7ff", "#b080ff", "#ffac5c", "#52f6ad", "#ff6f87"];
    const placeSystems = (now: number) => {
      planetScreens.clear();
      starScreens.clear();
      stationScreens.clear();
      planetPositions.clear();
      orbitScreens.clear();
      const systems = universe.starSystems;
      const focusedSystem = universe.starSystems.find(({ id }) => id === universe.universe.focusedSystemId) ?? systems[0];
      const focusedPlanet = universe.planets.find(({ id }) => id === universe.universe.focusedPlanetId);
      for (const planet of universe.planets) {
        const system = universe.starSystems.find(({ id }) => id === planet.starSystemId);
        if (system) planetPositions.set(planet.id, planetPositionAt(planet, system, now));
      }
      const overview = universe.camera.mode === "universe-overview" || universe.camera.mode === "free-navigation";
      const planetFocus = universe.camera.mode === "planet-focus" && focusedPlanet;
      const centroid = planetFocus ? planetPositions.get(focusedPlanet.id)! : overview ? systems.reduce((point, system) => ({ x: point.x + system.position.x / systems.length, y: point.y + system.position.y / systems.length, z: point.z + system.position.z / systems.length }), { x: 0, y: 0, z: 0 }) : focusedSystem.position;
      const maxDistance = overview ? Math.max(8, ...systems.map((system) => Math.hypot(system.position.x - centroid.x, system.position.z - centroid.z) + starSystemExtent(universe, system.id))) + UNIVERSE_CONFIG.systemPlacement.safetyMargin : Math.max(8, ...universe.planets.filter(({ starSystemId }) => starSystemId === focusedSystem.id).map(({ orbit }) => orbit.radius + 2));
      const scale = planetFocus ? viewportRadius * 1.7 * cameraZoom : Math.min(width, height) * .38 / maxDistance * cameraZoom;
      const cos = Math.cos(cameraRotation);
      const sin = Math.sin(cameraRotation);
      const pitchCos = Math.cos(cameraPitch);
      const pitchSin = Math.sin(cameraPitch);
      const projectUniversePoint = (point: Point3D) => {
        const dx = point.x - centroid.x;
        const dy = point.y - centroid.y;
        const dz = point.z - centroid.z;
        const x = dx * cos - dz * sin;
        const yawDepth = dx * sin + dz * cos;
        const y = dy * pitchCos - yawDepth * pitchSin;
        const depth = dy * pitchSin + yawDepth * pitchCos;
        return { x: width * .5 + cameraPanX + x * scale, y: height * .45 + cameraPanY + y * scale, z: depth };
      };
      for (const system of systems) {
        const point = projectUniversePoint(system.position);
        const selected = system.id === (universe.universe.selectedSystemId ?? universe.universe.focusedSystemId);
        starScreens.set(system.id, { ...point, radius: overview ? (selected ? 7 : 4.5) : system.id === focusedSystem.id ? 10 : 4 });
      }
      for (const planet of universe.planets) {
        const position = planetPositions.get(planet.id);
        if (!position) continue;
        const point = projectUniversePoint(position);
        const sameSystem = planet.starSystemId === focusedSystem.id;
        let planetRadius = planetFocus ? planet.id === focusedPlanet.id ? viewportRadius : sameSystem ? 26 * planet.radius : 0 : overview ? clamp(scale * .42 * planet.radius, 3, 18) : sameSystem ? clamp(scale * .72 * planet.radius, 11, 76) : 0;
        const expansion = universe.activeExpansion;
        if (expansion?.childPlanetId === planet.id) planetRadius *= expansion.phase === "launching" ? 0 : expansion.phase === "forming" ? Math.max(.08, expansion.progress) : 1;
        planetScreens.set(planet.id, { ...point, radius: planetRadius });
        const system = universe.starSystems.find(({ id }) => id === planet.starSystemId);
        if (system && planetRadius > 0) orbitScreens.set(planet.id, Array.from({ length: 65 }, (_, index) => projectUniversePoint(planetPositionOnOrbit(planet, system, index / 64 * Math.PI * 2))));
      }
      for (const system of systems) {
        const systemPlanets = universe.planets.filter((planet) => planet.starSystemId === system.id);
        if (!systemPlanets.length) continue;
        const stations = stationsBySystem.get(system.id)?.slice(0, UNIVERSE_CONFIG.universeObjects.maximumRenderedStationsPerSystem) ?? [];
        for (const [index, station] of stations.entries()) {
          const planet = systemPlanets[index % systemPlanets.length];
          const elapsed = Math.max(0, now - Date.parse(planet.createdAt)) / 1_000;
          const angle = planet.orbit.phase + elapsed * planet.orbit.speed * planet.orbit.direction + GOLDEN_ANGLE * (Math.floor(index / systemPlanets.length) + 1);
          const point = projectUniversePoint(planetPositionOnOrbit(planet, system, angle));
          const visible = universe.camera.mode === "star-system-focus" && system.id === focusedSystem.id;
          const stationRadius = visible ? clamp(scale * .17, 5, 18) : 0;
          stationScreens.set(station.id, { ...point, radius: stationRadius, angle });
        }
      }
    };

    const curvePoint = (source: { x: number; y: number }, destination: { x: number; y: number }, amount: number, bend = -70) => {
      const control = { x: (source.x + destination.x) * .5, y: (source.y + destination.y) * .5 + bend };
      return { x: (1 - amount) ** 2 * source.x + 2 * (1 - amount) * amount * control.x + amount ** 2 * destination.x, y: (1 - amount) ** 2 * source.y + 2 * (1 - amount) * amount * control.y + amount ** 2 * destination.y };
    };

    const drawStarSystems = (time: number) => {
      infrastructureScreens.clear();
      const visibleSystems = universe.starSystems;
      const selectedId = universe.universe.selectedSystemId ?? universe.universe.focusedSystemId;
      const labeledSystems = new Set([...visibleSystems].sort((a, b) => Number(b.id === selectedId) - Number(a.id === selectedId) || Number(a.lifecycleState === "dormant") - Number(b.lifecycleState === "dormant") || Date.parse(b.lastActiveAt) - Date.parse(a.lastActiveAt)).slice(0, UNIVERSE_CONFIG.starSystems.maximumVisibleSystemLabels).map(({ id }) => id));
      const drawnLabels: Array<{ x: number; y: number }> = [];
      for (const system of visibleSystems) {
        const screen = starScreens.get(system.id);
        if (!screen) continue;
        const forming = universe.activeStarFormation?.systemId === system.id ? universe.activeStarFormation.progress : 1;
        const dormant = system.lifecycleState === "dormant";
        const nebula = system.lifecycleState === "nebula";
        const blackHole = system.lifecycleState === "black-hole";
        const selected = system.id === selectedId;
        const visiblePlanets = universe.planets.filter((planet) => planet.starSystemId === system.id && (universe.camera.mode !== "universe-overview" || selected));
        ctx.save();
        ctx.beginPath();
        for (const planet of visiblePlanets) {
          const planetScreen = planetScreens.get(planet.id);
          if (!planetScreen || planetScreen.radius <= 0) continue;
          const orbit = orbitScreens.get(planet.id);
          if (!orbit?.length) continue;
          ctx.moveTo(orbit[0].x, orbit[0].y); for (let index = 1; index < orbit.length; index += 1) ctx.lineTo(orbit[index].x, orbit[index].y);
        }
        ctx.strokeStyle = rgba(system.color, selected ? .16 : .07); ctx.lineWidth = .7; ctx.stroke();
        const pulse = 1 + Math.sin(time * .002 + system.position.x) * .07;
        const coreRadius = Math.max(1.2, screen.radius * Math.max(.18, forming) * pulse);
        if (nebula) {
          drawCachedNebula(screen.x, screen.y, coreRadius, system.color, time * .00003);
        } else if (blackHole) {
          drawCachedBlackHole(screen.x, screen.y, coreRadius, -.28 + time * .000015);
        } else {
          const halo = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, coreRadius * (selected ? 4.2 : 3.2));
          halo.addColorStop(0, rgba(system.color, dormant ? .42 : .88)); halo.addColorStop(.24, rgba(system.color, dormant ? .18 : .38)); halo.addColorStop(1, rgba(system.color, 0));
          ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(screen.x, screen.y, coreRadius * (selected ? 4.2 : 3.2), 0, Math.PI * 2); ctx.fill();
          drawCachedLight(screen.x, screen.y, coreRadius, system.color, dormant ? 4 : selected ? 18 : 10, forming < .25 ? system.color : "#fff4d4", forming < .25 ? forming * 3 : 1);
        }
        if (forming > .42 && labeledSystems.has(system.id) && screen.x > 40 && screen.x < width - 40 && screen.y > 20 && screen.y < height - 20 && (selected || drawnLabels.every((label) => Math.hypot(label.x - screen.x, label.y - screen.y) > 74))) {
          ctx.font = `${selected ? 10 : 8}px JetBrains Mono`; ctx.textAlign = "center"; ctx.fillStyle = selected ? "rgba(255,239,205,.92)" : "rgba(205,195,168,.68)"; ctx.fillText(system.displayName.toUpperCase(), screen.x, screen.y - coreRadius - 13);
          drawnLabels.push(screen);
        }
        ctx.restore();
        const asteroids = asteroidBeltsBySystem.get(system.id)?.length ?? 0;
        if (asteroids) {
          const particles = Math.min(UNIVERSE_CONFIG.universeObjects.maximumRenderedAsteroidsPerSystem, Math.max(8, Math.ceil(Math.sqrt(asteroids) * 5)));
          drawCachedAsteroidBelt(screen.x, screen.y, coreRadius, particles, selected ? .55 : .25, .22 + time * .00002);
        }
        const stations = stationsBySystem.get(system.id)?.slice(0, UNIVERSE_CONFIG.universeObjects.maximumRenderedStationsPerSystem) ?? [];
        const systemPulsars = pulsarsBySystem.get(system.id)?.slice(0, UNIVERSE_CONFIG.universeObjects.maximumRenderedPulsarsPerSystem) ?? [];
        for (const station of stations) { const stationScreen = stationScreens.get(station.id); if (!stationScreen || stationScreen.radius <= 0) continue; const color = station.status === "offline" ? "#68747b" : station.status === "degraded" ? "#ffac5c" : "#52f6ad"; infrastructureScreens.set(station.id, { x: stationScreen.x, y: stationScreen.y, color, type: `${station.kind.toUpperCase()} station · ${station.status}`, label: station.displayName }); drawCachedStation(stationScreen.x, stationScreen.y, stationScreen.radius, color, stationScreen.angle + Math.PI * .5); }
        for (const [index, pulsar] of systemPulsars.entries()) { const angle = index * GOLDEN_ANGLE + 2.2; const x = screen.x + Math.cos(angle) * coreRadius * 7.5; const y = screen.y + Math.sin(angle) * coreRadius * 2.7; const dayCount = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].filter((day) => pulsar.schedule.toLowerCase().includes(day)).length; const cadence = .0015 + (dayCount || 7) / 7 * .0015; const color = pulsar.status === "failed" ? "#ff6f87" : "#37d7ff"; const flashing = pulsar.status === "paused" ? .25 : .45 + Math.sin(time * (pulsar.status === "running" ? .008 : cadence) + index) * .35; infrastructureScreens.set(pulsar.id, { x, y, color, type: `Automation pulsar · ${pulsar.status}`, label: pulsar.displayName }); drawCachedLight(x, y, 1.2 + flashing, color, 5); }
      }
    };

    const drawUniverseEffects = (time: number) => {
      const expansion = universe.activeExpansion;
      if (expansion) {
        const source = planetScreens.get(expansion.parentPlanetId);
        const destination = planetScreens.get(expansion.childPlanetId);
        if (source && destination) {
          ctx.save();
          ctx.setLineDash([3, 8]);
          ctx.beginPath(); ctx.moveTo(source.x, source.y); const control = curvePoint(source, destination, .5, -90); ctx.quadraticCurveTo(control.x, control.y - 45, destination.x, destination.y); ctx.strokeStyle = "rgba(255,172,92,.28)"; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
          if (expansion.phase === "launching") {
            const point = curvePoint(source, destination, easeInOut(expansion.progress), -90);
            const ahead = curvePoint(source, destination, Math.min(1, easeInOut(expansion.progress) + .015), -90);
            ctx.translate(point.x, point.y); ctx.rotate(Math.atan2(ahead.y - point.y, ahead.x - point.x));
            drawCachedRocket();
          }
          ctx.restore();
        }
      }
      for (const signal of universe.activeSignals) {
        const source = planetScreens.get(signal.sourcePlanetId);
        const destination = planetScreens.get(signal.destinationPlanetId);
        if (!source || !destination) continue;
        const color = TASKS[signal.taskKey].color;
        if (signal.crossSystem) {
          const sourceStar = starScreens.get(signal.sourceSystemId);
          const destinationStar = starScreens.get(signal.destinationSystemId);
          if (!sourceStar || !destinationStar) continue;
          const route = [source, sourceStar, destinationStar, destination];
          const scaled = easeInOut(signal.progress) * 3;
          const segment = Math.min(2, Math.floor(scaled));
          const amount = scaled - segment;
          const point = curvePoint(route[segment], route[segment + 1], amount, segment === 1 ? -120 : -28);
          const tailAmount = Math.max(0, amount - .12);
          const tail = curvePoint(route[segment], route[segment + 1], tailAmount, segment === 1 ? -120 : -28);
          ctx.save(); ctx.setLineDash([3, 7]); ctx.beginPath(); ctx.moveTo(source.x, source.y); ctx.lineTo(sourceStar.x, sourceStar.y); ctx.quadraticCurveTo((sourceStar.x + destinationStar.x) / 2, Math.min(sourceStar.y, destinationStar.y) - 120, destinationStar.x, destinationStar.y); ctx.lineTo(destination.x, destination.y); ctx.strokeStyle = rgba(color, .28); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
          drawCachedTrail(tail, point, color, 1.8, 12, .95);
          for (const star of [sourceStar, destinationStar]) { ctx.beginPath(); ctx.arc(star.x, star.y, 4 + Math.sin(signal.progress * Math.PI) * 5, 0, Math.PI * 2); ctx.strokeStyle = rgba(color, .5); ctx.stroke(); }
          ctx.restore();
          continue;
        }
        const bend = signal.taskKey === "think" ? -110 : signal.taskKey === "tool" ? -35 : -70;
        const point = curvePoint(source, destination, easeInOut(signal.progress), bend);
        const tail = curvePoint(source, destination, Math.max(0, easeInOut(signal.progress) - .08), bend);
        ctx.save(); ctx.beginPath(); ctx.moveTo(source.x, source.y); const control = curvePoint(source, destination, .5, bend); ctx.quadraticCurveTo(control.x, control.y, destination.x, destination.y); ctx.strokeStyle = rgba(color, .16); ctx.lineWidth = signal.taskKey === "tool" ? 1.5 : .75; ctx.stroke();
        drawCachedTrail(tail, point, color, 1.4, 10, .9); ctx.restore();
      }
      for (const migration of universe.activeMigrations) {
        if (migration.progress <= 0) continue;
        const source = planetScreens.get(migration.sourcePlanetId);
        const destination = planetScreens.get(migration.destinationPlanetId);
        if (!source || !destination) continue;
        const point = curvePoint(source, destination, easeInOut(migration.progress), 55 + (migration.satelliteId.charCodeAt(migration.satelliteId.length - 1) % 5) * 8);
        drawCachedLight(point.x, point.y, 1.8, "#52f6ad", 9, "#d7f8ff");
      }

      for (const system of universe.starSystems) {
        const screen = starScreens.get(system.id);
        if (screen && (screen.x + screen.radius < 0 || screen.x - screen.radius > width || screen.y + screen.radius < 0 || screen.y - screen.radius > height)) {
          const edgeX = clamp(screen.x, 22, width - 22);
          const edgeY = clamp(screen.y, 22, height - 22);
          ctx.save(); ctx.fillStyle = rgba(system.color, .72); ctx.font = "9px JetBrains Mono"; ctx.textAlign = edgeX < width / 2 ? "left" : "right"; ctx.fillText(system.displayName.toUpperCase(), edgeX, edgeY); ctx.restore();
        }
      }
      void time;
    };

    const drawActiveChats = (time: number) => {
      const chats = [...activeChats.values()];
      for (const [index, chat] of chats.entries()) {
        const system = universe.starSystems.find(({ id }) => id === chat.systemId);
        const planet = system?.planetIds.map((id) => planetScreens.get(id)).find((screen) => screen && screen.radius > 0);
        const anchor = planet ?? (system && starScreens.get(system.id)) ?? starScreens.get(universe.universe.focusedSystemId);
        if (!anchor) continue;
        const config = TASKS[TASK_FOR_ACTIVITY[chat.activityKind]];
        const lane = index % 4;
        const orbit = Math.max(anchor.radius, 8) + 14 + lane * 9;
        const angle = time * (reducedMotion ? .00008 : .00035) + index * GOLDEN_ANGLE;
        const x = anchor.x + Math.cos(angle) * orbit;
        const y = anchor.y + Math.sin(angle) * orbit * .42;
        ctx.save();
        ctx.beginPath(); ctx.ellipse(anchor.x, anchor.y, orbit, orbit * .42, 0, angle - 1.25, angle + .3); ctx.strokeStyle = rgba(config.color, .24); ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(anchor.x, anchor.y); ctx.lineTo(x, y); ctx.strokeStyle = rgba(config.color, .18); ctx.stroke();
        drawCachedLight(x, y, 3.2, config.color, 10);
        ctx.font = "8px JetBrains Mono"; ctx.textAlign = x < anchor.x ? "right" : "left"; ctx.fillStyle = rgba(config.color, .9); ctx.fillText(`CHAT ${chat.sessionId.slice(0, 6).toUpperCase()} · ${config.label.toUpperCase()}`, x + (x < anchor.x ? -7 : 7), y + 3);
        ctx.restore();
      }
    };

    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (!isVisible || document.hidden) return;
      const signal = signalRef.current;
      const observationSignature = signal.observation?.revision ?? JSON.stringify([signal.observedProjects, signal.pulsars]);
      if (observationSignature !== lastObservationSignature) {
        const observedAt = new Date().toISOString();
        reconcileUniverseSnapshot(universe, signal.observation ?? { source: "living-balancer-telemetry", revision: observationSignature, observedAt, projects: signal.observedProjects.map((identity) => ({ identity })), pulsars: signal.pulsars.map((item) => ({ ...item, project: null })) });
        refreshInfrastructureIndex();
        lastObservationSignature = observationSignature;
        persistUniverse(); syncUniverse();
      }
      const chats = signal.chatActivities.length ? signal.chatActivities : signal.eventId ? [{ sessionId: "current", eventId: signal.eventId, activityKind: signal.activityKind, eventLabel: signal.eventLabel, projectIdentity: signal.projectIdentity }] : [];
      const visibleChatIds = new Set(chats.filter(({ activityKind: kind }) => kind !== "idle").map(({ sessionId }) => sessionId));
      for (const sessionId of activeChats.keys()) if (!visibleChatIds.has(sessionId)) activeChats.delete(sessionId);
      for (const chat of chats) {
        if (!chat.eventId || chat.activityKind === "idle") continue;
        const existing = activeChats.get(chat.sessionId);
        if (lastEventIds.get(chat.sessionId) !== chat.eventId) {
          const system = resolveProjectSystem(universe, chat.projectIdentity);
          activeChats.set(chat.sessionId, { ...chat, systemId: system.id });
          startTask(TASK_FOR_ACTIVITY[chat.activityKind], chat.eventLabel, `${chat.sessionId}:${chat.eventId}`, chat.projectIdentity, chat.sessionId);
          lastEventIds.set(chat.sessionId, chat.eventId);
        } else if (existing) activeChats.set(chat.sessionId, { ...existing, ...chat });
      }
      const delta = Math.min(40, time - lastFrame); lastFrame = time;
      const pointerEase = 1 - (1 - 0.035) ** (delta / (1000 / 30));
      pointerX = lerp(pointerX, targetPointerX, pointerEase); pointerY = lerp(pointerY, targetPointerY, pointerEase);
      rotation += reducedMotion ? 0 : delta * (activeTask ? 0.00017 : 0.000085);
      const yaw = rotation + cameraRotation + pointerX * 0.15;
      const pitch = clamp(-0.16 + cameraPitch + pointerY * 0.08, -1.5, 1.5);
      cosineYaw = Math.cos(yaw); sineYaw = Math.sin(yaw); cosinePitch = Math.cos(pitch); sinePitch = Math.sin(pitch);
      advanceUniverse(universe);
      const storedById = new Map(universe.satellites.map((satellite) => [satellite.id, satellite]));
      for (const satellite of knowledge) {
        const stored = storedById.get(satellite.id);
        if (stored) Object.assign(satellite, stored);
      }
      if ((universe.activeExpansion || universe.activeMigrations.length || universe.activeSignals.length) && time - lastUniverseSync > 800) {
        persistUniverse(); syncUniverse(); lastUniverseSync = time;
      }
      ctx.clearRect(0, 0, width, height);
      centerX = width * .5; centerY = height * .45; radius = viewportRadius;
      if (universe.camera.mode === "planet-focus") drawBackgroundAura(time);
      placeSystems(Date.now());
      drawStarSystems(time);
      let activePoint: ScreenPoint | null = null;
      const selectedId = universe.universe.selectedPlanetId ?? universe.universe.focusedPlanetId;
      knowledgeByPlanet.clear();
      for (const satellite of knowledge) if (satellite.migrationState === "none") {
        const owned = knowledgeByPlanet.get(satellite.planetId);
        if (owned) owned.push(satellite); else knowledgeByPlanet.set(satellite.planetId, [satellite]);
      }
      const visiblePlanets = universe.planets.map((planet) => ({ planet, screen: planetScreens.get(planet.id)! })).filter(({ screen }) => screen.radius > 0 && screen.x + screen.radius * 1.6 >= 0 && screen.x - screen.radius * 1.6 <= width && screen.y + screen.radius * 1.6 >= 0 && screen.y - screen.radius * 1.6 <= height).sort((a, b) => a.screen.z - b.screen.z).map(({ planet, screen }) => ({ planet, screen, detail: planet.id === selectedId || screen.radius >= 72 ? 0 : universe.camera.mode === "star-system-focus" && planet.starSystemId === universe.universe.focusedSystemId || screen.radius >= 42 ? 1 : 2 }));
      if (visiblePlanets.some(({ detail }) => detail < 2)) updateGlobePoints(time);
      if (visiblePlanets.some(({ detail }) => detail === 0)) updateAtmosphere(time);
      for (const { planet, screen, detail } of visiblePlanets) {
        centerX = screen.x; centerY = screen.y; radius = screen.radius;
        currentPlanetColor = PLANET_COLORS[universe.planets.indexOf(planet) % PLANET_COLORS.length];
        if (detail < 2) drawOrbitRings(time);
        drawPlanetMoons(time, planet, false);
        drawPlanetRings(planet, false);
        if (detail === 0) drawAtmosphere();
        drawGlobeShell();
        if (detail < 2) drawGlobePoints();
        drawKnowledge(time, planet.id, detail, universe.camera.mode === "star-system-focus" && planet.starSystemId === universe.universe.focusedSystemId);
        drawCore(time);
        drawPlanetRings(planet, true);
        drawPlanetMoons(time, planet, true);
        const point = drawActiveSatellite(time, planet.id);
        if (point) { activePoint = point; drawPackets(time); }
        if (planet.lifecycleState === "preparing-expansion") {
          const pulse = 1 + Math.sin(time * .004) * .035;
          ctx.beginPath(); ctx.arc(centerX, centerY, radius * 1.48 * pulse, 0, Math.PI * 2); ctx.strokeStyle = "rgba(255,172,92,.7)"; ctx.lineWidth = 1.2; ctx.stroke();
        }
        if (radius >= 30) {
          ctx.save(); ctx.font = `${planet.id === selectedId ? 10 : 8}px JetBrains Mono`; ctx.textAlign = "center"; ctx.fillStyle = planet.id === selectedId ? "rgba(225,246,255,.9)" : "rgba(151,190,211,.68)"; ctx.fillText(planet.name.toUpperCase(), centerX, centerY + radius + 19); ctx.restore();
        }
      }
      drawUniverseEffects(time);
      drawActiveChats(time);
      drawPulses(time);
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
      if (dragging) {
        event.preventDefault();
        event.stopPropagation();
        const dx = event.clientX - dragX;
        const dy = event.clientY - dragY;
        dragMoved ||= Math.abs(dx) + Math.abs(dy) > 2;
        if (dragButton === 0) cameraRotation += dx * .006;
        else if (dragButton === 2) cameraPitch = clamp(cameraPitch + dy * .006, -1.35, 1.35);
        else { cameraPanX += dx; cameraPanY += dy; }
        dragX = event.clientX; dragY = event.clientY;
        return;
      }
      targetPointerX = clamp(hoverX / rect.width * 2 - 1, -1, 1); targetPointerY = clamp(hoverY / rect.height * 2 - 1, -1, 1);
    };
    const leave = () => { targetPointerX = 0; targetPointerY = 0; hoverX = -1000; hoverY = -1000; };
    const down = (event: PointerEvent) => {
      if (event.button < 0 || event.button > 2) return;
      if (event.target instanceof Element && event.target.closest("button, summary, select, input, label")) return;
      event.preventDefault();
      event.stopPropagation();
      stage.focus({ preventScroll: true });
      dragging = true; dragMoved = false; dragButton = event.button; dragX = event.clientX; dragY = event.clientY; stage.setPointerCapture(event.pointerId);
    };
    const up = (event: PointerEvent) => {
      if (!dragging) return;
      event.preventDefault();
      event.stopPropagation();
      dragging = false;
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
      if (!dragMoved && dragButton === 0) {
        const rect = stage.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const selected = [...planetScreens.entries()].filter(([, screen]) => screen.radius > 0 && Math.hypot(screen.x - x, screen.y - y) <= Math.max(12, screen.radius)).sort((a, b) => a[1].z - b[1].z).at(-1)?.[0];
        if (selected) {
          universe.universe.selectedPlanetId = selected;
          universe.universe.selectedSystemId = universe.planets.find(({ id }) => id === selected)?.starSystemId ?? universe.universe.selectedSystemId;
          syncUniverse();
        } else {
          const selectedSystem = [...starScreens.entries()].filter(([, screen]) => Math.hypot(screen.x - x, screen.y - y) <= Math.max(14, screen.radius * 2)).sort((a, b) => a[1].z - b[1].z).at(-1)?.[0];
          if (selectedSystem) { universe.universe.selectedSystemId = selectedSystem; universe.universe.selectedPlanetId = null; syncUniverse(); }
        }
      }
      persistUniverse();
    };
    const blockNativeMouse = (event: MouseEvent) => { event.preventDefault(); event.stopPropagation(); };
    const wheel = (event: WheelEvent) => { event.preventDefault(); event.stopPropagation(); cameraZoom = clamp(cameraZoom * Math.exp(-event.deltaY * .001), .35, 4); schedulePersistUniverse(); };
    const focusSelected = () => {
      const planetId = universe.universe.selectedPlanetId;
      const systemId = planetId ? universe.planets.find(({ id }) => id === planetId)?.starSystemId : universe.universe.selectedSystemId;
      if (!systemId) return;
      universe.universe.focusedSystemId = systemId; universe.camera.focusedSystemId = systemId;
      if (planetId) { universe.universe.focusedPlanetId = planetId; universe.camera.focusedPlanetId = planetId; universe.camera.mode = "planet-focus"; }
      else { universe.universe.focusedPlanetId = null; universe.camera.focusedPlanetId = null; universe.camera.mode = "star-system-focus"; }
      cameraPanX = 0; cameraPanY = 0; cameraZoom = 1; persistUniverse(); syncUniverse();
    };
    const overview = () => { universe.camera.mode = "universe-overview"; cameraPanX = 0; cameraPanY = 0; cameraZoom = 1; persistUniverse(); syncUniverse(); };
    const resetCamera = () => { cameraPanX = 0; cameraPanY = 0; cameraZoom = 1; cameraRotation = 0; cameraPitch = 0; universe.camera.mode = universe.starSystems.length > 1 ? "universe-overview" : "star-system-focus"; persistUniverse(); syncUniverse(); };
    const doubleClick = () => focusSelected();
    const keydown = (event: KeyboardEvent) => {
      let handled = true;
      if (event.key === "Escape") {
        if (universe.camera.mode === "planet-focus" || universe.camera.mode.endsWith("cinematic")) { universe.camera.mode = "star-system-focus"; universe.universe.focusedPlanetId = null; universe.camera.focusedPlanetId = null; cameraPanX = 0; cameraPanY = 0; cameraZoom = 1; persistUniverse(); syncUniverse(); }
        else if (universe.camera.mode === "star-system-focus" || universe.camera.mode === "communication-focus" || universe.camera.mode === "task-focus") overview();
        else if (universe.camera.mode === "universe-overview" || universe.camera.mode === "free-navigation") window.dispatchEvent(new CustomEvent("living-universe-exit-fullscreen"));
        else handled = false;
      } else if (event.key === "Home") resetCamera(); else if (event.key === "+" || event.key === "=") cameraZoom = clamp(cameraZoom * 1.15, .35, 4); else if (event.key === "-") cameraZoom = clamp(cameraZoom / 1.15, .35, 4); else if (event.key === "ArrowLeft") cameraPanX += 24; else if (event.key === "ArrowRight") cameraPanX -= 24; else if (event.key === "ArrowUp") cameraPanY += 24; else if (event.key === "ArrowDown") cameraPanY -= 24; else handled = false;
      if (handled) { event.preventDefault(); event.stopPropagation(); }
    };
    const focusSystem = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (!universe.starSystems.some((system) => system.id === id)) return;
      universe.universe.selectedSystemId = id; universe.universe.selectedPlanetId = null; universe.universe.focusedSystemId = id; universe.universe.focusedPlanetId = null; universe.camera.focusedSystemId = id; universe.camera.focusedPlanetId = null; universe.camera.mode = "star-system-focus"; cameraPanX = 0; cameraPanY = 0; cameraZoom = 1; persistUniverse(); syncUniverse();
    };
    const focusPlanet = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      const planet = universe.planets.find((candidate) => candidate.id === id);
      if (!planet) return;
      universe.universe.selectedSystemId = planet.starSystemId; universe.universe.selectedPlanetId = id; universe.universe.focusedSystemId = planet.starSystemId; universe.universe.focusedPlanetId = id; universe.camera.focusedSystemId = planet.starSystemId; universe.camera.focusedPlanetId = id; universe.camera.mode = "planet-focus"; cameraPanX = 0; cameraPanY = 0; cameraZoom = 1; persistUniverse(); syncUniverse();
    };
    const runManual = (event: Event) => { const taskKey = (event as CustomEvent<TaskKey>).detail; startTask(taskKey); };
    const toggleAuto = () => { auto = !auto; autoRef.current?.setAttribute("aria-pressed", String(auto)); if (auto && !activeTask) autoAt = performance.now() + 700; };
    const clear = () => { knowledge.length = 0; assignedNames.clear(); packets.length = 0; pulses.length = 0; packetTotal = 0; Object.assign(universe, createUniverse()); persistUniverse(); syncUniverse(); if (knowledgeRef.current) knowledgeRef.current.textContent = "0"; if (packetRef.current) packetRef.current.textContent = "0"; };

    const observer = new ResizeObserver(resize);
    const visibilityObserver = new IntersectionObserver(([entry]) => { isVisible = entry.isIntersecting; });
    observer.observe(stage);
    visibilityObserver.observe(stage);
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerdown", down);
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointerleave", leave);
    stage.addEventListener("wheel", wheel, { passive: false });
    stage.addEventListener("contextmenu", blockNativeMouse);
    stage.addEventListener("auxclick", blockNativeMouse);
    stage.addEventListener("keydown", keydown);
    stage.addEventListener("dblclick", doubleClick);
    stage.addEventListener("living-task", runManual);
    stage.addEventListener("living-auto", toggleAuto);
    stage.addEventListener("living-clear", clear);
    stage.addEventListener("living-overview", overview);
    stage.addEventListener("living-focus", focusSelected);
    stage.addEventListener("living-reset", resetCamera);
    window.addEventListener("living-system-focus", focusSystem);
    window.addEventListener("living-planet-focus", focusPlanet);
    window.addEventListener("living-overview-request", overview);
    window.addEventListener("resize", resize);
    resize();
    storedSatellites.forEach((stored, index) => {
      const taskKey = stored.taskKey;
      const satellite = makeSatellite(taskKey, `bootstrap-${index + 1}`, stored.color, false, stored);
      satellite.createdAt -= index * 830; satellite.angle += index * 0.74; knowledge.push(satellite);
    });
    persistUniverse();
    syncUniverse();
    if (knowledgeRef.current) knowledgeRef.current.textContent = String(knowledge.length);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame); window.clearTimeout(persistTimer); if (persistTimer) persistUniverse(); observer.disconnect(); visibilityObserver.disconnect(); window.removeEventListener("resize", resize); window.removeEventListener("living-system-focus", focusSystem); window.removeEventListener("living-planet-focus", focusPlanet); window.removeEventListener("living-overview-request", overview); stage.removeEventListener("pointermove", move); stage.removeEventListener("pointerdown", down); stage.removeEventListener("pointerup", up); stage.removeEventListener("pointerleave", leave); stage.removeEventListener("wheel", wheel); stage.removeEventListener("contextmenu", blockNativeMouse); stage.removeEventListener("auxclick", blockNativeMouse); stage.removeEventListener("keydown", keydown); stage.removeEventListener("dblclick", doubleClick); stage.removeEventListener("living-task", runManual); stage.removeEventListener("living-auto", toggleAuto); stage.removeEventListener("living-clear", clear); stage.removeEventListener("living-overview", overview); stage.removeEventListener("living-focus", focusSelected); stage.removeEventListener("living-reset", resetCamera);
    };
  }, [onSatellitesChange, onUniverseChange]);

  const dispatch = (name: string, detail?: TaskKey) => stageRef.current?.dispatchEvent(new CustomEvent(name, { detail }));

  return (
    <div ref={stageRef} className={`living-globe-runtime${SHOW_SIMULATOR_CONTROLS ? " has-controls" : ""}`} tabIndex={0} title="Left-drag to rotate left or right. Right-drag to rotate up or down. Middle-drag to pan. Scroll to zoom.">
      <canvas ref={canvasRef} className="living-globe-canvas" aria-label="Animated Codex knowledge globe" />
      <div className="living-globe-scan" />
      <nav className="living-universe-controls" aria-label="Universe navigation">
        <button type="button" onClick={() => dispatch("living-overview")} title="Return to universe overview (Escape)">Overview</button>
        <button type="button" onClick={() => dispatch("living-focus")} title="Focus selected planet">Focus</button>
        <button type="button" onClick={() => dispatch("living-reset")} title="Reset camera (Home)">Reset</button>
      </nav>
      <aside className="living-globe-hud">
        <details open style={{ "--card-color": "#37bfff" } as React.CSSProperties}><summary>Model</summary><div><span>{model}</span><small>reasoning core</small></div></details>
        <details open style={{ "--card-color": "#5ecbff" } as React.CSSProperties}><summary>Context</summary><div><span>{context}</span><small>visual runtime</small></div></details>
        <details open style={{ "--card-color": "#37bfff" } as React.CSSProperties}><summary>Activity</summary><div><span ref={activityValueRef}>Awaiting task</span><small ref={activityTimeRef}>ready</small></div></details>
        <details open style={{ "--card-color": "#ffad5f" } as React.CSSProperties}><summary>Workflow</summary><div><span ref={workflowRef}>idle</span><small ref={statusRef}>standing by</small></div></details>
        <details open style={{ "--card-color": "#56f2ad" } as React.CSSProperties}><summary>Knowledge</summary><div><span><i ref={knowledgeRef}>0</i> satellites</span><small><i ref={packetRef}>0</i> light packets</small></div></details>
        <details open style={{ "--card-color": "#b080ff" } as React.CSSProperties}><summary>Queue</summary><div><span ref={queueValueRef}>—</span><small><i ref={queueCountRef}>0</i> waiting</small></div></details>
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

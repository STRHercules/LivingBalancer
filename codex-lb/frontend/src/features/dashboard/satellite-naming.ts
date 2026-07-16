export const SATELLITE_NAME_GENERATOR_VERSION = 1;
export const SATELLITE_NAME_GLOBAL_SEED = `codex-globe-names-v${SATELLITE_NAME_GENERATOR_VERSION}`;

export const SATELLITE_TYPES = {
  thinking: { code: "THK", names: ["SYNAPSE", "ORACLE", "CORTEX", "AXIOM", "INSIGHT", "LOGIC", "MUSE", "THEOREM"] },
  search: { code: "SRC", names: ["BEACON", "SEEKER", "SCOUT", "PATHFINDER", "LANTERN", "HORIZON", "QUEST", "TRACE"] },
  tools: { code: "TLS", names: ["ATLAS", "FORGE", "VECTOR", "RELAY", "ENGINE", "ANCHOR", "LEVER", "APERTURE"] },
  memory: { code: "MEM", names: ["ARCHIVE", "ECHO", "CHRONICLE", "VAULT", "MNEMOSYNE", "RECORD", "LEDGER", "RECALL"] },
  planning: { code: "PLN", names: ["COMPASS", "NAVIGATOR", "WAYPOINT", "ROUTE", "BLUEPRINT", "HELMSMAN", "ODYSSEY", "TRAJECTORY"] },
  execution: { code: "EXE", names: ["PULSE", "SPARK", "IGNITION", "MOTION", "DRIVE", "MOMENTUM", "THRUST", "KINETIC"] },
  verification: { code: "VRF", names: ["SENTINEL", "LENS", "WITNESS", "PROBE", "SPECTRUM", "PRISM", "CHECKPOINT", "WARDEN"] },
  communication: { code: "COM", names: ["SIGNAL", "RELAY", "HERALD", "COURIER", "TRANSMITTER", "BRIDGE", "CHORUS", "RESONANCE"] },
  coding: { code: "DEV", names: ["KERNEL", "CIPHER", "CIRCUIT", "RUNTIME", "COMPILER", "MATRIX", "STACK", "PROTOCOL"] },
  analysis: { code: "ANL", names: ["SPECTRUM", "PRISM", "AXIOM", "LENS", "VECTOR", "THEOREM", "PARALLAX", "INDEX"] },
} as const;

export const NAMING_PATTERNS = [
  { id: "short", weight: 25 },
  { id: "catalog", weight: 20 },
  { id: "node", weight: 15 },
  { id: "generation", weight: 15 },
  { id: "coded", weight: 10 },
  { id: "hybrid", weight: 10 },
  { id: "series", weight: 5 },
] as const;

export const ROMAN_SERIES = ["I", "II", "III", "IV", "V", "VI"] as const;

export type SatelliteType = keyof typeof SATELLITE_TYPES;
export type NamingPattern = (typeof NAMING_PATTERNS)[number]["id"];
export type SatelliteNameOptions = {
  globalSeed?: string;
  type?: string;
  index?: number;
  taskSeed?: string;
  generation?: number;
  collision?: number;
};
export type SatelliteNameMetadata = {
  displayName: string;
  family: string;
  type: SatelliteType;
  typeCode: string;
  pattern: NamingPattern;
  serial: number;
  index: number;
  generation: number;
  taskSeed: string;
  seed: string;
};

export function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function hashTaskSeed(value: string) {
  return hashSeed(value).toString(16).padStart(8, "0");
}

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function choose<T>(random: () => number, values: readonly T[]) {
  if (!values.length) throw new Error("Satellite family-name pool cannot be empty");
  return values[Math.floor(random() * values.length)];
}

export function chooseWeighted<T extends { weight: number }>(random: () => number, options: readonly T[]) {
  if (!options.length) throw new Error("Satellite naming patterns cannot be empty");
  const totalWeight = options.reduce((total, option) => total + option.weight, 0);
  if (totalWeight <= 0) throw new Error("Satellite naming pattern weights must total more than zero");
  let roll = random() * totalWeight;
  for (const option of options) {
    roll -= option.weight;
    if (roll < 0) return option;
  }
  return options[options.length - 1];
}

const positiveInteger = (value: number | undefined) => Number.isFinite(value) ? Math.max(1, Math.floor(value!)) : 1;
const padNumber = (value: number, length: number) => String(value).padStart(length, "0");
const titleCase = (value: string) => value.toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());

export function formatSatelliteName(pattern: NamingPattern, family: string, typeCode: string, index: number, generation: number, serial: number) {
  const roman = ROMAN_SERIES[Math.min(Math.max(1, generation), ROMAN_SERIES.length) - 1];
  switch (pattern) {
    case "short": return `${family}-${padNumber(serial, 2)}`;
    case "catalog": return `${family}-${padNumber(serial, 4)}`;
    case "node": return `${titleCase(family)} Node ${padNumber(serial, 3)}`;
    case "generation": return `${family} ${roman}-${index}`;
    case "coded": return `${typeCode}-${padNumber(serial, 3)}`;
    case "hybrid": return `${family}-${typeCode}-${padNumber(serial, 2)}`;
    case "series": return `${typeCode} ${roman}-${padNumber(serial, 2)}`;
  }
}

export function generateSatelliteNameMetadata({
  globalSeed = SATELLITE_NAME_GLOBAL_SEED,
  type = "thinking",
  index = 1,
  taskSeed = "",
  generation = 1,
  collision = 0,
}: SatelliteNameOptions = {}): SatelliteNameMetadata {
  if (!Number.isInteger(collision) || collision < 0) throw new Error("Satellite collision counter must be a non-negative integer");
  const resolvedType: SatelliteType = type in SATELLITE_TYPES ? type as SatelliteType : "thinking";
  const config = SATELLITE_TYPES[resolvedType];
  if (!config.names.length) throw new Error(`Satellite family-name pool for ${resolvedType} cannot be empty`);
  const normalizedIndex = positiveInteger(index);
  const normalizedGeneration = positiveInteger(generation);
  const completeSeed = [globalSeed, type, normalizedIndex, taskSeed, normalizedGeneration, collision].join(":");
  const random = createRandom(hashSeed(completeSeed));
  const family = choose(random, config.names);
  const pattern = chooseWeighted(random, NAMING_PATTERNS).id;
  const shortNumber = 1 + Math.floor(random() * 99);
  const catalogNumber = 1 + Math.floor(random() * 9999);
  const nodeNumber = 1 + Math.floor(random() * 999);
  const serial = pattern === "catalog" ? catalogNumber : pattern === "short" || pattern === "hybrid" || pattern === "series" ? shortNumber : nodeNumber;
  const displayName = formatSatelliteName(pattern, family, config.code, normalizedIndex, normalizedGeneration, serial);
  if (displayName.length < 4 || displayName.length > 40 || /undefined|null| {2,}|[- ]$/.test(displayName)) {
    throw new Error(`Generated invalid satellite name: ${displayName}`);
  }
  return { displayName, family, type: resolvedType, typeCode: config.code, pattern, serial, index: normalizedIndex, generation: Math.min(normalizedGeneration, ROMAN_SERIES.length), taskSeed, seed: completeSeed };
}

export function generateSatelliteName(options?: SatelliteNameOptions) {
  return generateSatelliteNameMetadata(options).displayName;
}

export function generateUniqueSatelliteNameMetadata(options: SatelliteNameOptions, existingNames: Set<string>) {
  for (let collision = 0; collision < 100; collision += 1) {
    const result = generateSatelliteNameMetadata({ ...options, collision });
    if (!existingNames.has(result.displayName)) {
      existingNames.add(result.displayName);
      return result;
    }
  }
  throw new Error("Unable to generate a unique satellite name after 100 collision attempts");
}

export function generateUniqueSatelliteName(options: SatelliteNameOptions, existingNames: Set<string>) {
  return generateUniqueSatelliteNameMetadata(options, existingNames).displayName;
}

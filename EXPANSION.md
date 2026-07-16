# TASK: Expand CodexLivingBalancer into a growing living universe

## Objective

Expand CodexLivingBalancer from a single Codex planet into a persistent, evolving simulated cosmos.

The system begins with one central Codex planet. All current globe, satellite, task, animation, and interaction systems must continue to work.

As Codex is used and the planet accumulates satellites, the system should gradually expand into a multi-planet universe. A full planet launches a rocket toward a newly created planet, satellites redistribute across the growing network, and the planets begin communicating with one another whenever Codex performs work.

The result should feel like Codex is growing a visual brain across space.

The more the user works with Codex, the larger, more active, and more alive the universe becomes.

---

## Core concept

The universe represents the cumulative activity and knowledge of Codex.

```text
Codex task activity
        ↓
satellites are created
        ↓
planet capacity increases
        ↓
planet reaches expansion threshold
        ↓
rocket launches toward a new planet
        ↓
new planet forms nearby
        ↓
satellites redistribute between planets
        ↓
planets communicate during future tasks
        ↓
the universe becomes a larger visual brain
```

Each planet acts as a major knowledge node.

Each satellite acts as a smaller task, memory, tool, process, or knowledge node.

Communication between planets represents information moving through the larger Codex system.

---

## Product goals

The expanded system must:

- preserve all current single-planet behavior
- begin with one planet
- create new planets only after meaningful growth
- visually communicate when expansion is about to occur
- launch a rocket from a full planet to seed a new planet
- redistribute satellites gradually rather than instantly
- allow satellites to move between planets
- show communication between planets during Codex tasks
- automatically zoom out as the universe expands
- allow the user to pan and inspect the larger space
- persist the full universe across application restarts
- remain performant as the number of planets and satellites increases
- make increased Codex usage feel like visible cosmic growth

---

## Non-destructive integration requirement

All current CodexLivingBalancer features must remain functional unless explicitly changed by this task.

Existing behavior that must remain intact includes:

- Codex planet rendering
- globe rotation
- particle or drone-light planet construction
- satellite creation
- satellite orbiting
- satellite naming
- task-based animation states
- tool-use animations
- search animations
- thinking animations
- completion animations
- hover and selection behavior
- any existing HUD, inspector, prompt, or status interfaces
- current theme, lighting, atmosphere, and visual identity

The multi-planet system must extend the current architecture rather than replace it.

---

# 1. Universe lifecycle

## Phase 1: Singular planet

The application begins focused on one Codex planet.

```text
Universe state: singular
Planet count: 1
Camera mode: planet focus
Primary planet: Codex Prime
```

During this phase:

- the camera remains centered on the original planet
- satellites are created normally
- current task animations continue to operate around the planet
- the larger universe remains visually minimal
- no unused empty planets should exist
- background stars and atmospheric effects may imply a larger space without showing additional Codex worlds

The first planet should feel important and central.

Recommended default name:

```text
Codex Prime
```

The planet naming system should remain configurable.

---

## Phase 2: Expansion warning

When the active planet approaches its satellite capacity threshold, it enters an expansion preparation state.

Example threshold model:

```text
planet soft capacity: 80 satellites
planet hard capacity: 100 satellites
expansion warning: 85 percent capacity
expansion trigger: 100 percent capacity
```

These values must be configurable.

During the warning phase:

- the planet emits more frequent surface pulses
- satellites may tighten or reorganize their orbital pattern
- a launch site, energy ring, or construction point begins forming
- a faint trajectory line may appear toward empty space
- the UI may show a subtle expansion status
- no new planet is created yet

Example status:

```text
PLANETARY CAPACITY: 87%
EXPANSION SEQUENCE PREPARING
```

The warning should feel like anticipation, not an error state.

---

## Phase 3: Rocket launch

When the planet reaches the configured expansion threshold, it launches a rocket or seed vessel.

The launch must be a visible event.

Recommended sequence:

1. Planet reaches expansion capacity.
2. A launch site brightens.
3. Nearby satellites transmit energy toward the launch site.
4. A rocket or seed vessel forms.
5. The camera subtly reframes to include the destination region.
6. A glowing trajectory appears.
7. The rocket launches from the parent planet.
8. The rocket travels toward a newly selected location.
9. The rocket slows and begins creating the new planet.
10. The new planet enters a formation state.

The rocket may be:

- a literal stylized rocket
- a glowing Codex seed vessel
- a concentrated swarm of particles
- a geometric probe
- a small satellite cluster wrapped in an energy shell

The implementation should support replacing the launch visual later.

---

## Phase 4: Planet formation

The destination planet should not appear instantly at full size.

It should form gradually.

Suggested formation sequence:

```text
arrival spark
    ↓
energy core
    ↓
particle sphere
    ↓
surface grid
    ↓
atmospheric glow
    ↓
stable planet
```

During formation:

- the planet begins as a small bright core
- particles gather around the core
- the sphere grows to its final radius
- surface lights establish a stable pattern
- an orbital field appears
- the planet receives its first satellites
- the planet is assigned a unique identity and name

The new planet should initially appear less mature than the parent planet.

Possible differences:

- dimmer surface
- fewer active lights
- smaller atmospheric glow
- fewer orbital layers
- lower communication traffic
- unfinished grid lines
- visible construction pulses

Over time, the new planet should visually mature.

---

## Phase 5: Satellite redistribution

After a new planet stabilizes, satellites should gradually redistribute from existing full planets.

This must not happen as an instant teleportation of half the population.

Redistribution should be visible and staged.

Suggested sequence:

1. The system calculates target satellite populations.
2. Candidate satellites are selected for transfer.
3. Transfer satellites enter a departure orbit.
4. Communication beams synchronize the planets.
5. Satellites leave the parent planet in small groups.
6. Satellites travel along curved transfer paths.
7. Satellites arrive at the new planet.
8. Satellites enter temporary capture orbit.
9. Satellites settle into permanent orbital positions.
10. Planet population counts update.

The user should be able to watch the migration.

---

# 2. Planet capacity and expansion rules

## Configurable planet capacity

Each planet must have configurable population limits.

Recommended configuration:

```js
const PLANET_CAPACITY = {
  softLimit: 80,
  expansionThreshold: 100,
  maximumOperationalCapacity: 120,
  targetFillRatioAfterSplit: 0.65
};
```

Definitions:

```text
softLimit
The point where the planet begins preparing for expansion.

expansionThreshold
The point where a new planet should be created.

maximumOperationalCapacity
A temporary emergency ceiling while expansion is in progress.

targetFillRatioAfterSplit
The preferred fill percentage after redistribution.
```

---

## Expansion trigger

A planet is eligible to create a new planet when:

```text
satellite count >= expansion threshold
AND no expansion is currently in progress
AND universe is not paused
AND planet is stable
AND no conflicting cinematic sequence is active
```

Only one expansion sequence should run at a time by default.

Support a future configuration for concurrent expansions.

---

## Redistribution target

When a new planet is created, calculate a balanced target across eligible planets.

Example:

```text
Before expansion:
Planet A: 100 satellites

After expansion:
Planet A: 65 satellites
Planet B: 35 satellites
```

As the universe grows:

```text
Before expansion:
Planet A: 102
Planet B: 72
Planet C: 61

New planet created:
Planet D

Balanced target:
Planet A: 64
Planet B: 61
Planet C: 58
Planet D: 52
```

Do not require exact equality.

The system should preserve some natural variation so the universe does not look mechanically uniform.

Recommended variance:

```text
plus or minus 5 to 12 percent from the calculated target
```

---

## Redistribution strategy

Use weighted balancing rather than simply moving half of one planet.

Suggested rules:

- prioritize moving satellites from the fullest planet
- allow nearby planets to contribute satellites
- avoid draining any planet below its minimum stable population
- keep task-related satellite clusters together when appropriate
- prefer moving older inactive satellites before active task satellites
- do not move satellites currently participating in a live animation
- avoid moving selected satellites until user interaction ends
- avoid moving satellites marked as anchored or permanent

Recommended minimum stable population:

```text
20 satellites per mature planet
```

This value must be configurable.

---

# 3. Planet identity

Each planet must have a persistent identity.

Recommended data structure:

```js
{
  id: "planet_0001",
  name: "Codex Prime",
  generation: 1,
  parentPlanetId: null,
  childPlanetIds: ["planet_0002"],
  position: { x: 0, y: 0, z: 0 },
  radius: 1,
  maturity: 1,
  state: "stable",
  satelliteIds: [],
  capacity: {
    softLimit: 80,
    expansionThreshold: 100,
    maximumOperationalCapacity: 120
  },
  createdAt: "2026-07-15T00:00:00.000Z",
  lastActiveAt: "2026-07-15T00:00:00.000Z",
  totalTasksProcessed: 0,
  totalSignalsSent: 0,
  totalSignalsReceived: 0
}
```

---

## Planet states

Support the following planet states:

```text
forming
stabilizing
stable
active
communicating
preparing-expansion
launching
redistributing
dormant
selected
```

A planet may have one primary lifecycle state and multiple visual activity flags.

Example:

```js
{
  lifecycleState: "stable",
  visualFlags: [
    "selected",
    "communicating",
    "receiving-transfer"
  ]
}
```

---

## Planet naming

Planet names should be generated deterministically and persist after creation.

Possible naming styles:

```text
Codex Prime
Codex II
Axiom Reach
Beacon Meridian
Atlas Node
Synapse Haven
Archive World
Vector Crown
Cortex Minor
Theorem Station
```

Recommended naming formula:

```text
planet family pool
+ generation
+ lineage
+ seeded modifier
```

Possible planet family pools:

```js
const PLANET_NAME_FAMILIES = [
  "CODEX",
  "AXIOM",
  "ATLAS",
  "BEACON",
  "CORTEX",
  "SYNAPSE",
  "ARCHIVE",
  "VECTOR",
  "THEOREM",
  "ORACLE",
  "NEXUS",
  "PARALLAX"
];

const PLANET_NAME_MODIFIERS = [
  "PRIME",
  "REACH",
  "MERIDIAN",
  "HAVEN",
  "CROWN",
  "ASCENT",
  "HORIZON",
  "VAULT",
  "NODE",
  "MINOR",
  "MAJOR",
  "TERMINUS"
];
```

The first planet should remain specially named unless configured otherwise.

---

# 4. Planet placement

## Spatial layout goals

New planets should appear near the existing universe without overlapping it.

The layout must:

- preserve readable spacing
- avoid planets spawning behind one another from the default camera
- allow curved communication paths between planets
- leave room for future expansion
- avoid a rigid rectangular grid
- feel organic and cosmic
- remain navigable as the universe grows

---

## Recommended placement model

Use a seeded radial or spiral distribution.

Example:

```text
planet 1: center
planet 2: first orbital ring
planet 3: first orbital ring
planet 4: second orbital ring
planet 5: second orbital ring
planet 6: second orbital ring
```

Recommended position calculation:

```js
angle = seededAngle(index)
ring = calculateRing(index)
distance = baseSpacing + ring * ringSpacing
heightOffset = seededRange(-verticalVariance, verticalVariance)

position = {
  x: Math.cos(angle) * distance,
  y: heightOffset,
  z: Math.sin(angle) * distance
}
```

Apply collision checks before accepting a location.

---

## Minimum spacing

Planet spacing must account for:

```text
planet radius
satellite orbit radius
communication effects
camera readability
future neighboring planets
```

Recommended minimum center-to-center distance:

```text
largest planet visual radius
+ largest orbital radius
+ safety margin
```

The safety margin must be configurable.

---

## Spatial hierarchy

The universe should remain centered around its collective mass rather than always around Codex Prime.

Calculate a universe focus point from:

```text
planet positions
planet maturity
planet activity
satellite population
current selection
```

The camera system may bias toward active planets while still keeping the overall layout understandable.

---

# 5. Satellite ownership and migration

## Satellite ownership

Every satellite must belong to exactly one planet at a time.

Recommended fields:

```js
{
  id: "sat_000427",
  name: "BEACON-3421",
  planetId: "planet_0001",
  previousPlanetId: null,
  migrationState: "none",
  orbitSlot: 42,
  position: {},
  activityType: "search",
  createdAt: "...",
  lastActiveAt: "...",
  transferHistory: []
}
```

---

## Migration states

Support:

```text
none
queued
departing
in-transit
arriving
captured
settling
complete
```

Migration state must be persisted if the application closes during a transfer.

On load, the system may:

- resume the transfer
- safely complete the transfer
- return the satellite to its previous planet

Choose one recovery strategy and test it.

Recommended default:

```text
resume from normalized transfer progress
```

---

## Transfer paths

Satellites should travel along curved 3D paths.

Use:

- quadratic Bezier curves
- cubic Bezier curves
- Catmull-Rom splines
- orbital transfer arcs

Avoid straight-line movement unless deliberately used for a specific signal style.

Each transfer path should include:

```js
{
  sourcePlanetId,
  destinationPlanetId,
  startPosition,
  endPosition,
  controlPoints,
  startTime,
  duration,
  progress
}
```

---

## Transfer batching

Do not move all satellites simultaneously.

Recommended transfer groups:

```text
2 to 8 satellites per wave
```

Recommended delay between waves:

```text
300 to 1200 milliseconds
```

Use deterministic or configurable variation.

Large redistributions should feel like organized migration traffic.

---

# 6. Interplanetary communication

## Communication purpose

Planets should visibly communicate whenever Codex performs tasks.

The universe should resemble a distributed brain passing signals between major nodes.

Examples:

```text
thinking planet sends request to search planet
search planet returns results
tool planet activates
verification planet checks output
memory planet stores completion
```

The communication animation does not need to imply the real internal architecture of Codex.

It is a visual representation of coordinated activity.

---

## Communication visual sequence

Suggested signal flow:

1. Source planet enters an active state.
2. One or more source satellites brighten.
3. A signal pulse travels from a satellite toward the planet.
4. The planet core flashes or ripples.
5. An interplanetary beam or particle packet launches.
6. The signal travels along a curved route.
7. The destination planet receives the signal.
8. Destination satellites activate.
9. A response signal may return.
10. Both planets settle to idle activity.

---

## Communication types

Support different communication styles for task categories.

| Communication | Suggested style |
|---|---|
| Thinking | slow layered pulses |
| Search | fast scanning packets |
| Tool use | sharp directional beams |
| Memory | soft archival waves |
| Planning | branching route lines |
| Execution | high-energy bursts |
| Verification | ping and response pattern |
| Coding | structured digital packet trains |
| Completion | synchronized network pulse |

These must be data-driven.

Example:

```js
const COMMUNICATION_STYLES = {
  thinking: {
    speed: 0.55,
    packetCount: 3,
    pulseWidth: 0.8,
    responseExpected: true
  },
  search: {
    speed: 1.4,
    packetCount: 6,
    pulseWidth: 0.35,
    responseExpected: true
  },
  tools: {
    speed: 1.8,
    packetCount: 2,
    pulseWidth: 0.25,
    responseExpected: true
  }
};
```

Visual colors should remain controlled by the current CodexLivingBalancer theme system.

---

## Communication routing

When multiple planets exist, task signals should choose plausible routes.

Possible routing strategies:

```text
direct source to destination
nearest-neighbor relay
activity-specialized destination
load-balanced destination
lineage-based routing
random seeded routing
```

Recommended initial implementation:

1. Select an origin planet based on current focus or recent activity.
2. Select a destination planet using activity weighting and load balancing.
3. Use direct communication when the destination is nearby.
4. Use one relay planet when the destination is far away.
5. Limit routes to a maximum of two hops initially.

---

## Activity specialization

Planets may gradually develop visual or behavioral specialization based on their satellite population.

Examples:

```text
planet with many search satellites becomes search-heavy
planet with many memory satellites becomes archive-heavy
planet with many coding satellites becomes development-heavy
```

This specialization should initially affect:

- planet accent patterns
- communication behavior
- satellite distribution
- tooltip statistics
- destination weighting

Do not hard-lock a planet to one task type.

Each planet remains part of the same Codex system.

---

# 7. Camera behavior

## Single-planet camera mode

When only one planet exists:

- retain the current camera framing
- keep the planet prominent
- do not show excessive empty space
- allow existing zoom and orbit behavior
- maintain current visual scale

---

## Expansion camera transition

When the first new planet forms:

1. Camera pulls back gradually.
2. Original planet remains visible.
3. Rocket destination enters frame.
4. Both planets become visible.
5. Camera settles into a two-planet overview.
6. The user retains control after the cinematic completes.

The transition must not snap.

Allow cinematic interruption if the user begins interacting.

---

## Multi-planet overview mode

When more than one planet exists:

- automatically calculate a framing distance that includes all active planets
- preserve readable planet scale where possible
- allow the user to pan
- allow the user to zoom
- allow orbiting or rotation around the universe center
- allow selecting and focusing an individual planet
- allow returning to an overview

---

## User navigation

Required controls:

```text
pan left, right, up, and down
zoom in and out
orbit or rotate the view
select a planet
focus selected planet
return to universe overview
reset camera
```

Support mouse and keyboard at minimum.

Recommended controls:

```text
left drag: orbit or rotate
right drag: pan
middle drag: pan
mouse wheel: zoom
double click planet: focus
Escape: return to overview
Home: reset universe view
```

Controls must be configurable.

---

## Overflow behavior

Once the universe becomes too large to fit comfortably:

- do not continuously shrink planets into unreadable dots
- allow the user to pan through the space
- maintain a minimum visible planet size
- use smooth culling and level of detail
- show directional hints for off-screen planets
- provide an overview or minimap if needed
- allow search or selection by planet name

Possible off-screen indicator:

```text
ATLAS REACH
3.2 sectors east
42 satellites
active
```

---

## Focus modes

Support:

```text
planet focus
universe overview
task focus
communication focus
launch cinematic
migration cinematic
free navigation
```

The current mode should be explicit in camera state.

---

# 8. Universe activity and liveliness

## Idle activity

The universe should never feel completely frozen.

Idle behaviors may include:

- slow planet rotation
- surface light drift
- satellite orbit movement
- faint atmospheric pulses
- occasional local satellite-to-satellite signals
- subtle planet core breathing
- rare distant signal flashes
- low-intensity communication echoes
- tiny orbital corrections

Idle activity must remain subtle enough that task activity still feels important.

---

## Usage-based growth

The visual universe should reflect long-term Codex usage.

Possible growth metrics:

```text
total tasks
total satellites created
total tools used
total searches performed
total completed sessions
total active days
total communication events
total accumulated task duration
```

Planet creation should primarily depend on satellite population, but maturity and visual richness may use these additional metrics.

---

## Planet maturity

Each planet should mature over time.

Suggested maturity levels:

```text
seed
forming
young
established
mature
ancient
```

Maturity may affect:

- surface detail density
- brightness complexity
- number of orbital layers
- atmospheric depth
- signal traffic
- core animation
- communication range
- visual stability
- label styling

Maturity should not make older planets overwhelmingly bright.

---

## Universe-wide events

Future-compatible event hooks should support:

```text
network synchronization
large task completion
major search operation
large code generation
long reasoning session
memory consolidation
planetary expansion
satellite migration
system error
idle sleep state
application wake state
```

Initial implementation only needs to support the events already available in CodexLivingBalancer.

---

# 9. Simulation state architecture

## Universe manager

Create a central universe manager responsible for:

```text
planet creation
planet registry
satellite ownership
capacity checks
expansion scheduling
planet placement
redistribution
communication routing
camera bounds
persistence
simulation pause and resume
```

Recommended interface:

```js
class UniverseManager {
  initialize(state) {}
  update(deltaTime) {}
  createPlanet(options) {}
  evaluateExpansion() {}
  beginExpansion(parentPlanetId) {}
  redistributeSatellites(newPlanetId) {}
  routeCommunication(event) {}
  getUniverseBounds() {}
  serialize() {}
  restore(state) {}
}
```

---

## Planet controller

Each planet should have its own controller.

```js
class PlanetController {
  update(deltaTime) {}
  addSatellite(satelliteId) {}
  removeSatellite(satelliteId) {}
  getCapacityRatio() {}
  setLifecycleState(state) {}
  triggerActivity(activityType) {}
  beginLaunchSequence() {}
  receiveSignal(signal) {}
  sendSignal(signal) {}
}
```

---

## Migration manager

Use a dedicated migration manager.

```js
class SatelliteMigrationManager {
  createMigrationPlan(options) {}
  queueSatellite(satelliteId, destinationPlanetId) {}
  beginWave() {}
  update(deltaTime) {}
  completeTransfer(satelliteId) {}
  cancelTransfer(satelliteId) {}
  serialize() {}
}
```

---

## Communication manager

Use a dedicated communication manager.

```js
class CommunicationManager {
  routeTaskEvent(event) {}
  createSignal(options) {}
  sendSignal(signal) {}
  receiveSignal(signalId) {}
  update(deltaTime) {}
  serialize() {}
}
```

---

# 10. Recommended state model

```js
{
  version: 1,

  universe: {
    id: "codex_universe",
    seed: "codex-living-balancer-v1",
    createdAt: "...",
    totalTasks: 0,
    totalSignals: 0,
    totalExpansions: 0,
    currentCameraMode: "planet-focus",
    focusedPlanetId: "planet_0001",
    selectedPlanetId: null,
    expansionInProgress: false
  },

  planets: {
    "planet_0001": {
      id: "planet_0001",
      name: "Codex Prime",
      parentPlanetId: null,
      childPlanetIds: [],
      lifecycleState: "stable",
      visualFlags: [],
      position: { x: 0, y: 0, z: 0 },
      radius: 1,
      maturity: 1,
      satelliteIds: [],
      createdAt: "...",
      lastActiveAt: "...",
      totalTasksProcessed: 0,
      totalSignalsSent: 0,
      totalSignalsReceived: 0
    }
  },

  satellites: {},

  activeMigrations: [],

  activeSignals: [],

  camera: {
    mode: "planet-focus",
    target: { x: 0, y: 0, z: 0 },
    position: { x: 0, y: 0, z: 8 },
    zoom: 1
  }
}
```

---

# 11. Persistence

The entire universe must persist between sessions.

Persist:

- universe seed
- planet identities
- planet names
- planet positions
- planet lineage
- planet maturity
- satellite ownership
- satellite positions or normalized orbit slots
- active migrations
- active expansion sequence
- communication statistics
- camera focus
- user navigation preferences
- total task and growth metrics

Recommended storage options:

```text
prototype: localStorage or IndexedDB
desktop app: local JSON or application data store
larger implementation: versioned local database
```

Do not regenerate the universe from scratch on every launch.

---

## Recovery behavior

If the application closes during:

```text
rocket launch
planet formation
satellite migration
communication animation
camera cinematic
```

The next launch must recover safely.

Recommended behavior:

- resume major lifecycle events
- discard non-essential communication particles
- restore authoritative planet and satellite ownership
- normalize cinematic progress
- avoid duplicate planet creation
- avoid duplicate satellite transfers

Every long-running sequence must have an ID and progress value.

---

# 12. Performance and scalability

## Initial scale target

The system should support at least:

```text
25 planets
10,000 satellites
100 simultaneous signal particles
50 simultaneous migrating satellites
```

The architecture should not assume that all objects are rendered at full detail.

---

## Level of detail

Use planet and satellite level of detail.

Suggested levels:

```text
LOD 0: selected or close
full planet detail
full satellite models
full labels
full communication effects

LOD 1: nearby
reduced surface detail
simplified satellites
limited labels

LOD 2: distant
planet impostor or simplified sphere
satellites represented as orbital glow
communication represented as single curves

LOD 3: very distant
single point or icon
no individual satellites
aggregate activity pulse
```

---

## Satellite aggregation

When a planet is far from the camera:

- do not render every satellite individually
- render orbital density bands
- render clustered light fields
- preserve approximate population
- show individual satellites again when the camera approaches

The data model must still retain each satellite.

Only rendering should be aggregated.

---

## Culling

Implement:

- frustum culling
- distance-based satellite culling
- label culling
- communication particle limits
- hidden planet update throttling
- pooled particle systems
- pooled transfer effects

Do not recreate large geometry buffers every frame.

---

## Update scheduling

Not every planet needs full simulation updates every frame.

Recommended schedule:

```text
selected planet: every frame
visible nearby planets: every frame or every second frame
distant planets: reduced frequency
off-screen dormant planets: low-frequency logical updates
```

---

# 13. UI and inspection

## Planet tooltip

Example:

```text
CODEX PRIME
Generation I
82 satellites
Primary activity: Thinking
Capacity: 82%
Signals today: 147
```

---

## Planet inspector

The selected planet view should include:

- planet name
- generation
- parent planet
- child planets
- creation date
- satellite count
- capacity percentage
- dominant activity types
- maturity
- total tasks processed
- signals sent
- signals received
- current state
- focus button
- return to overview button

---

## Universe overview HUD

Suggested information:

```text
CODEX UNIVERSE
4 planets
238 satellites
12 active signals
1 migration in progress
```

Keep the HUD subtle and consistent with the current visual style.

---

## Expansion status

During expansion:

```text
PLANETARY EXPANSION
Codex Prime → Axiom Reach
Formation: 63%
Satellite transfer queued: 28
```

---

## Optional minimap

A minimap is optional for the first implementation.

The architecture should leave room for one.

Possible minimap content:

- planet positions
- selected planet
- camera viewport
- active communication paths
- active migration
- off-screen planets

---

# 14. Visual direction

The expanded universe should preserve the visual language of the existing Codex planet.

Key qualities:

- dark cosmic environment
- glowing technical particles
- drone-show-like planet surfaces
- clean orbital geometry
- cinematic but readable motion
- restrained bloom
- soft atmospheric depth
- high contrast task signals
- elegant technical labels
- no cluttered science-fiction dashboard overload

The universe should feel intelligent rather than militaristic.

It should feel alive rather than chaotic.

---

## Visual brain metaphor

The larger composition should resemble:

```text
planets = major brain regions
satellites = neurons or knowledge nodes
communication beams = neural signals
rocket launches = cognitive growth
new planets = new distributed capacity
satellite migration = reorganization and learning
```

This metaphor should guide animation timing and composition without becoming literal anatomy.

---

# 15. Task event integration

Map existing Codex events into the multi-planet universe.

Example:

```js
handleCodexEvent({
  type: "search",
  taskId: "task_0427",
  source: "codex",
  status: "started"
});
```

Possible behavior:

```text
search started
    ↓
active planet brightens
    ↓
search satellite activates
    ↓
signal sent to search-heavy planet
    ↓
destination satellites scan
    ↓
response signal returns
    ↓
new satellite may be created
```

---

## Suggested event mapping

| Codex event | Universe behavior |
|---|---|
| Thinking started | local planet pulse |
| Thinking extended | multi-planet reasoning loop |
| Search started | outbound scanning signal |
| Search completed | response signal and satellite creation |
| Tool started | activation beam to tool-heavy planet |
| Tool completed | return pulse |
| Code generation | structured packet stream |
| Verification | ping-response signal |
| Memory store | archival pulse |
| Task completed | synchronized network ripple |
| Error | interrupted signal and recovery pulse |

Do not block real Codex operation while animations run.

Animations must respond asynchronously to event data.

---

# 16. Configuration

Create a centralized universe configuration.

```js
const UNIVERSE_CONFIG = {
  enabled: true,

  planetCapacity: {
    softLimit: 80,
    expansionThreshold: 100,
    maximumOperationalCapacity: 120,
    targetFillRatioAfterSplit: 0.65,
    minimumStablePopulation: 20
  },

  expansion: {
    warningEnabled: true,
    launchDurationMs: 6000,
    formationDurationMs: 8000,
    redistributionDelayMs: 1200,
    allowConcurrentExpansions: false
  },

  placement: {
    baseSpacing: 12,
    ringSpacing: 10,
    verticalVariance: 3,
    safetyMargin: 4,
    layout: "seeded-spiral"
  },

  migration: {
    minimumWaveSize: 2,
    maximumWaveSize: 8,
    minimumWaveDelayMs: 300,
    maximumWaveDelayMs: 1200,
    maximumConcurrentTransfers: 50
  },

  communication: {
    enabled: true,
    maximumConcurrentSignals: 100,
    maximumRouteHops: 2,
    idleTrafficEnabled: true
  },

  camera: {
    autoZoomOnExpansion: true,
    allowCinematicInterruption: true,
    minimumPlanetScreenSize: 24,
    overviewPadding: 1.25
  },

  rendering: {
    planetLodEnabled: true,
    satelliteAggregationEnabled: true,
    labelCullingEnabled: true,
    distantUpdateThrottlingEnabled: true
  }
};
```

Do not scatter these values across unrelated files.

---

# 17. Recommended file structure

```text
src/
  universe/
    UniverseManager.js
    UniverseState.js
    UniverseConfig.js
    UniversePersistence.js

    planets/
      PlanetController.js
      PlanetFactory.js
      PlanetPlacement.js
      PlanetNaming.js
      PlanetRenderer.js
      PlanetLOD.js

    satellites/
      SatelliteOwnership.js
      SatelliteBalancer.js
      SatelliteMigrationManager.js
      SatelliteTransferPath.js

    communication/
      CommunicationManager.js
      CommunicationRouter.js
      CommunicationStyles.js
      SignalRenderer.js

    expansion/
      ExpansionManager.js
      RocketLaunchSequence.js
      PlanetFormationSequence.js
      RedistributionSequence.js

    camera/
      UniverseCameraController.js
      UniverseBounds.js
      CameraModes.js

    ui/
      PlanetTooltip.js
      PlanetInspector.js
      UniverseOverviewHUD.js
      OffscreenPlanetIndicator.js

    tests/
      UniverseManager.test.js
      PlanetExpansion.test.js
      SatelliteBalancing.test.js
      CommunicationRouting.test.js
      UniversePersistence.test.js
      UniversePerformance.test.js
```

Adapt this structure to the current project architecture.

---

# 18. Implementation phases

## Phase 1: Multi-planet foundation

Implement:

- universe state
- planet registry
- planet identity
- planet placement
- multiple planet rendering
- camera overview mode
- planet selection
- persistence

No automatic expansion required yet.

---

## Phase 2: Capacity and expansion

Implement:

- capacity monitoring
- warning state
- rocket launch sequence
- new planet creation
- planet formation
- camera pullback

---

## Phase 3: Satellite redistribution

Implement:

- ownership tracking
- balancing calculations
- migration queues
- transfer paths
- arrival and orbit settlement
- transfer recovery

---

## Phase 4: Interplanetary communication

Implement:

- task event routing
- source and destination selection
- signal paths
- response signals
- activity-specific communication styles
- communication statistics

---

## Phase 5: Scale and polish

Implement:

- level of detail
- satellite aggregation
- off-screen indicators
- distant update throttling
- improved camera behavior
- planet maturity
- idle network activity
- visual polish

---

# 19. Testing requirements

## Planet creation

Test:

- first planet is created correctly
- first planet is named Codex Prime
- planet IDs remain unique
- new planet positions do not overlap existing planets
- lineage is stored correctly
- creation remains deterministic when seeded

---

## Capacity checks

Test:

- no expansion below threshold
- warning state begins at soft limit
- expansion begins at threshold
- only one expansion begins when concurrency is disabled
- temporary overflow does not lose satellites
- expansion does not repeat for the same threshold event

---

## Redistribution

Test:

- satellites remain owned by exactly one planet
- no satellite disappears during transfer
- no satellite is duplicated
- active satellites are not migrated
- selected satellites are deferred
- minimum stable population is preserved
- balancing produces expected approximate targets
- large redistributions complete safely

---

## Communication

Test:

- task events produce signals
- signals have valid source and destination planets
- routing respects maximum hops
- communication does not create infinite loops
- response signals complete
- signal limits are enforced
- missing destinations fall back safely

---

## Camera

Test:

- single planet retains original framing
- first expansion triggers zoom-out
- all planets fit in overview when practical
- minimum visible size is respected
- pan and zoom work after cinematic events
- user input cancels or overrides cinematic movement
- focus and overview modes transition correctly

---

## Persistence

Test:

- universe restores with the same planets
- names do not change
- positions do not change
- satellite ownership does not change
- active migrations recover
- expansion does not duplicate planets after reload
- version migrations preserve valid state

---

## Scale test

Create a simulation containing:

```text
25 planets
10,000 satellites
100 active communication signals
50 active transfers
```

Verify:

- stable frame timing
- no memory leak during repeated expansions
- no duplicate object IDs
- no duplicate satellite ownership
- no unbounded particle growth
- level of detail activates correctly
- off-screen planets remain logically active

---

# 20. Acceptance criteria

The task is complete when:

- [ ] CodexLivingBalancer begins with one planet.
- [ ] All current single-planet functionality still works.
- [ ] Planets track satellite capacity.
- [ ] A planet visibly prepares for expansion near capacity.
- [ ] Reaching the expansion threshold launches a visible rocket or seed vessel.
- [ ] A new planet forms at a valid nearby location.
- [ ] The camera zooms out to reveal the new planet.
- [ ] Satellites redistribute gradually across planets.
- [ ] Satellite transfers are visually animated.
- [ ] Every satellite belongs to exactly one planet.
- [ ] Planets communicate visually during Codex tasks.
- [ ] Communication behavior varies by task type.
- [ ] The user can pan, zoom, orbit, select, and focus planets.
- [ ] The user can return to a full-universe overview.
- [ ] Off-screen or distant planets remain discoverable.
- [ ] The complete universe persists across restarts.
- [ ] Interrupted expansion and migration sequences recover safely.
- [ ] Level of detail prevents distant systems from rendering at full cost.
- [ ] The system supports at least 25 planets and 10,000 satellites.
- [ ] Increased Codex usage visibly increases universe activity and growth.
- [ ] The final result reads visually as a distributed cosmic brain.

---

# 21. Out of scope

Do not include the following unless already required by the existing project:

- multiplayer universes
- online synchronization
- real astronomical simulation
- physically accurate orbital mechanics
- user-controlled rocket piloting
- planet combat
- resource harvesting
- procedural civilization simulation
- destructible planets
- cryptocurrency or token systems
- literal mapping of private prompt content onto planets
- cloud-hosted universe persistence
- VR controls

The purpose is to visualize Codex growth, activity, communication, and accumulated knowledge.

---

# Final experience statement

A new user should first see one living Codex planet surrounded by its growing network of satellites.

As the user continues working with Codex, the planet becomes denser and more active. Eventually it reaches capacity, gathers energy, and launches a seed vessel into nearby space.

A second planet forms.

Satellites begin crossing the gap between worlds. Signals move between planets whenever Codex thinks, searches, uses tools, writes code, verifies information, or completes work.

Over time, the camera reveals a larger constellation of Codex planets, each alive with orbiting knowledge and connected by streams of communication.

The universe should feel like a giant visual brain spreading across the stars.
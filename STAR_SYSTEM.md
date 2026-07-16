# TASK: Organize the living Codex universe into project star systems

## Objective

Extend the persistent multi-planet universe defined by `EXPANSION.md` so each Codex project becomes a recognizable star system.

The current universe remains the foundation:

```text
Codex project
    ↓
project star
    ↓
one or more orbiting knowledge planets
    ↓
task, tool, search, memory, and process satellites
```

Stars provide the missing semantic hierarchy.

```text
stars       = projects or workspaces
planets     = major knowledge and capacity nodes within a project
satellites  = tasks, memories, tools, searches, and processes
signals     = information moving within or between projects
```

The result should look like a collection of coherent solar systems rather than unrelated planets scattered through space.

The user should be able to recognize a project spatially, inspect its growth, focus its system, and see when Codex work crosses project boundaries.

---

## Relationship to `EXPANSION.md`

`EXPANSION.md` remains authoritative for:

- planet capacity
- planet expansion warnings
- rocket launches
- planet formation
- satellite ownership
- satellite redistribution
- communication animation
- camera controls
- persistence and recovery
- level of detail
- performance targets

This task adds a project and star-system layer above those systems.

Do not replace the existing universe implementation.

Current implementation surfaces that must be extended in place:

```text
codex-lb/frontend/src/features/dashboard/universe.ts
codex-lb/frontend/src/features/dashboard/components/codex-globe.tsx
codex-lb/frontend/src/features/dashboard/components/living-dashboard.tsx
codex-lb/frontend/src/features/dashboard/components/living-dashboard.css
codex-lb/frontend/src/features/dashboard/universe.test.ts
```

Do not create a new rendering stack, physics engine, database, or manager hierarchy unless the current files measurably cannot support the requirement.

---

# 1. Core product model

## Project star

Each persistent Codex project is represented by one star.

A project star owns a star system, not individual satellites.

```text
Project: LivingBalancer
Star: LivingBalancer
Planets: Codex Prime, Axiom Reach
Satellites: tasks completed inside LivingBalancer
```

A star must have:

- persistent ID
- stable project identity
- user-readable name
- position in universe space
- visual color and intensity
- creation and activity timestamps
- lifecycle state
- owned planet IDs
- aggregate task and signal statistics

## Planet role

Planets remain capacity and knowledge nodes.

Every planet belongs to exactly one star system.

Planets orbit their project star using stylized deterministic motion. Their existing local rotation, surface construction, satellites, capacity, expansion, and communication behavior must continue.

Planet expansion occurs inside the parent planet's star system by default.

## Satellite role

Every satellite still belongs to exactly one planet.

Its project association is derived from its owning planet's star system. Do not maintain a second conflicting project owner unless required for migration recovery.

## Codex Core

Create one permanent fallback system:

```text
System ID: system_codex_core
Star name: Codex Core
Purpose: global, unknown, unassigned, or cross-project work
```

Codex Core prevents missing or ambiguous project metadata from creating corrupt, duplicate, or meaningless project systems.

It must never be deleted.

---

# 2. Product goals

The star-system expansion must:

- preserve all behavior delivered by `EXPANSION.md`
- represent reliable Codex projects as stars
- group each project's planets around its star
- begin without empty decorative project systems
- preserve the existing universe during state migration
- route new activity into the correct project system
- visually distinguish local and cross-project communication
- allow project-system selection and focus
- allow returning to the complete universe overview
- persist project identity without storing prompt contents
- tolerate renamed or moved project folders
- avoid duplicate systems for the same project
- remain readable with many dormant projects
- remain performant at the existing satellite scale target
- make spatial layout useful as long-term project memory

---

# 3. Non-destructive requirements

The following current behavior must remain functional:

- Codex Prime and existing planet identities
- planet rendering and rotation
- planet capacity warnings
- rocket launch and formation sequences
- satellite names and ownership
- satellite orbit and migration animation
- activity-specific signals
- hover and selection
- right-drag and middle-drag navigation
- contained scroll-wheel zoom
- universe overview, planet focus, and reset controls
- fullscreen living-universe view
- local persistence and interrupted-sequence recovery
- dashboard telemetry, activity feed, and existing detail sections
- current visual language, colors, lighting, and restrained bloom

Existing planets and satellites must not disappear, duplicate, or receive new names during migration to star systems.

---

# 4. Project identity

## Trusted project signals

Resolve project identity from the strongest available signal in this order:

1. stable repository or workspace ID supplied by Codex activity data
2. normalized Git repository root
3. normalized Codex workspace root
4. normalized session project path
5. Codex Core fallback

Do not derive project identity from:

- prompt text
- generated response text
- filenames mentioned casually in conversation
- model guesses
- window titles alone
- transient terminal working directories outside the active workspace

## Project key

Create a deterministic internal project key from a normalized identity source.

Recommended shape:

```text
projectKey = sourceType + normalizedStableValue
systemId = deterministicHash(projectKey)
```

Requirements:

- comparison is case-insensitive on Windows
- path separators are normalized
- trailing separators are removed
- symlink or alternate-path resolution is used only when already available safely
- raw absolute paths are not shown in the default UI
- the same project restores to the same system
- two unrelated projects with the same folder name remain distinct

Use built-in platform and existing application helpers before adding new identity dependencies.

## Display name

Project display name priority:

1. explicit workspace or repository display name
2. Git repository directory name
3. workspace directory name
4. deterministic generated system name
5. `Codex Core`

Display names may be edited later without changing system identity.

## Rename and move handling

Project moves and renames must not silently create duplicate systems when a stronger stable repository identity proves they are the same project.

Maintain bounded identity aliases:

```js
identityAliases: [
  "workspace:old-normalized-value",
  "workspace:new-normalized-value"
]
```

Requirements:

- aliases are deduplicated
- aliases are bounded to a configurable maximum
- an alias cannot belong to two systems
- conflicting identity evidence falls back safely to Codex Core
- automatic merges require strong identity evidence
- no system is destructively merged from a matching display name alone

## Privacy

Persist only identity data required to restore project grouping.

Do not persist:

- private prompt content
- response content
- file contents
- command output
- credentials
- branch secrets
- arbitrary environment variables

The normal inspector should show a project name, not its full absolute path. A future explicit diagnostics surface may reveal the normalized source separately.

---

# 5. Star-system lifecycle

## Phase 1: Codex Core baseline

Existing universe state migrates into Codex Core without visual loss.

```text
Star systems: 1
Star: Codex Core
Existing planets: preserved
Existing satellites: preserved
Camera: preserve current mode where valid
```

No existing planet is reassigned to a newly detected project based on weak inference.

## Phase 2: Project discovery

When reliable project activity appears:

1. normalize project identity
2. find an exact system or identity alias
3. create a logical project-system record if none exists
4. accumulate project activity
5. keep the star visually latent until materialization requirements are met

Logical discovery and visual materialization are separate. This avoids filling the universe with stars created by one accidental or temporary directory.

## Phase 3: Star materialization

A project star becomes visible when:

```text
reliable project identity exists
AND completed project activity >= configured threshold
AND project is not ignored
AND no star formation for that system is active
```

Recommended default threshold:

```text
3 completed project activities
```

Materialization sequence:

```text
distant spark
    ↓
small energy core
    ↓
project-name signal
    ↓
stable star glow
    ↓
first project planet seed
    ↓
stable orbital system
```

Star formation should be visible but shorter and quieter than planet expansion.

Recommended duration:

```text
4 to 6 seconds
```

## Phase 4: First project planet

Every materialized project system must have at least one planet.

The first planet may be created by:

- moving eligible project-owned activity from Codex Core into a newly seeded planet
- creating a new empty seed planet and assigning future project activity to it

Preferred behavior:

1. create a seed planet in the project system
2. migrate only satellites with reliable matching project provenance
3. leave ambiguous or global satellites in Codex Core
4. animate eligible transfers in small waves
5. never infer ownership from satellite names

## Phase 5: Mature project system

After stabilization:

- new project tasks create satellites around planets in that system
- the least-loaded eligible planet receives new satellites by default
- existing capacity and expansion rules apply within the system
- a full planet launches a new planet into another orbit around the same star
- local project signals travel between planets in that system

## Phase 6: Dormancy

A project system becomes dormant after a configurable inactivity period.

Dormancy affects rendering, not persistence.

Dormant systems:

- dim their star slightly
- reduce idle signal traffic
- aggregate satellites sooner
- update logical simulation less often
- remain selectable and searchable
- wake immediately when matching Codex work resumes

Recommended default dormancy:

```text
30 inactive days
```

Do not delete dormant systems automatically.

---

# 6. Star identity and state

Recommended star-system structure:

```js
{
  id: "system_7a92c4e1",
  projectKey: "git:<stable-normalized-identity>",
  identitySource: "git",
  identityAliases: [],
  displayName: "LivingBalancer",
  lifecycleState: "stable",
  visualFlags: [],
  position: { x: 0, y: 0, z: 0 },
  radius: 0.28,
  color: "#ffd27a",
  intensity: 0.8,
  maturity: 0.42,
  planetIds: ["planet_0002"],
  pendingActivityCount: 0,
  createdAt: "...",
  lastActiveAt: "...",
  totalTasksProcessed: 0,
  totalSignalsSent: 0,
  totalSignalsReceived: 0,
  totalCrossSystemSignals: 0
}
```

## Star-system states

Support:

```text
latent
forming
stabilizing
stable
active
communicating
dormant
selected
```

Use one lifecycle state plus visual flags where simultaneous presentation states are needed.

## Star maturity

Star maturity represents accumulated project activity, not astronomical age.

Suggested maturity levels:

```text
seed
young
established
mature
legacy
```

Maturity may affect:

- corona detail
- subtle surface turbulence
- orbital guide visibility
- signal frequency
- label weight
- LOD transition distance

Maturity must not make active old systems overwhelmingly bright.

---

# 7. Planet membership and orbital layout

## Planet membership

Add a persistent star-system owner to each planet:

```js
{
  starSystemId: "system_7a92c4e1",
  orbit: {
    band: 1,
    radius: 3.4,
    inclination: 0.12,
    phase: 1.7,
    speed: 0.018,
    direction: 1
  }
}
```

Every planet must belong to exactly one star system.

## Stylized orbit model

Use deterministic stylized orbits, not physical astronomy.

Orbit requirements:

- stable between restarts
- seeded by planet and system identity
- readable from the default camera
- slow enough for inspection
- non-overlapping at normal zoom
- compatible with planet focus
- pause-independent through elapsed-time calculation

Recommended position calculation:

```text
angle = persistedPhase + elapsedTime * orbitSpeed * direction
x = star.x + cos(angle) * orbitRadius
z = star.z + sin(angle) * orbitRadius
y = star.y + sin(angle + inclination) * verticalAmplitude
```

Persist normalized orbit parameters. Do not persist a new position every frame.

## Orbital bands

Use bounded bands around a star:

```text
band 0: seed or selected planet
band 1: normal project planets
band 2: mature overflow planets
band 3: distant project archive planets
```

Assign the nearest safe band and apply seeded phase separation.

Do not build a full orbital solver.

## Planet expansion inside a system

When a planet reaches capacity:

1. retain existing expansion warning
2. form launch site
3. launch seed vessel
4. choose a free orbit in the same star system
5. form the new planet along that orbit
6. redistribute eligible satellites within the system
7. preserve inter-system ownership boundaries

Other systems must not donate satellites during ordinary planet splitting.

---

# 8. Star placement in universe space

Project stars must not orbit a central super-star.

Place systems using a deterministic seeded spiral or clustered radial layout.

Goals:

- no overlapping star systems
- room for each system's maximum visible orbit
- readable communication curves
- stable positions across restarts
- organic composition
- bounded universe expansion
- clear Codex Core prominence without forcing it to remain screen center

Recommended system spacing must account for:

```text
star radius
outer planet orbit radius
planet satellite orbit radius
labels
communication paths
safety margin
```

Before accepting a new position, test its complete system bounds against existing system bounds.

If no position fits after a bounded number of attempts, place the system on the next seeded spiral ring.

---

# 9. Activity assignment

## Activity routing

Each observable Codex activity event should carry or resolve:

```js
{
  eventId: "...",
  type: "tool",
  projectIdentity: {
    source: "workspace",
    value: "...",
    displayName: "LivingBalancer"
  }
}
```

Routing sequence:

1. resolve project system
2. wake dormant system if required
3. choose active eligible planet inside that system
4. run existing task animation
5. create satellite on completion when current behavior requires it
6. update system and planet activity statistics

Missing or conflicting identity routes to Codex Core.

## Project switching

When Codex work switches projects:

- do not snap the camera automatically during user interaction
- mark the new system active
- optionally show a subtle off-screen indicator
- route task signals to the correct system
- preserve the user's current focus until they select task focus or enable auto-follow

Recommended default:

```text
auto-follow project activity: off
```

## Concurrent projects

Concurrent activities may animate in different systems.

Requirements:

- event IDs remain unique
- each event resolves independently
- no global camera thrashing
- signal and particle limits remain enforced
- simultaneous task completion cannot duplicate satellites

---

# 10. Communication model

## Intra-system communication

Communication between planets under one project star represents work within the same project.

Reuse current task-specific styles:

- thinking: layered pulses
- search: fast packets
- tool use: sharp beams
- synthesis: structured streams
- verification: ping and response

Local signals may curve around or visually pass through the project star.

## Inter-system communication

Communication between project stars represents cross-project knowledge transfer or shared Codex activity.

Inter-system signals must be rarer and visually distinct.

Recommended sequence:

```text
source planet
    ↓
source project star
    ↓
interstellar route
    ↓
destination project star
    ↓
destination planet
```

Use a two-stage curve or a visually continuous route with star pulses at both endpoints.

Do not create inter-system traffic randomly at a frequency that implies false real architecture.

Valid triggers:

- an event explicitly references two known projects
- shared memory or tool activity has reliable source and destination metadata
- an existing Codex event already represents cross-project work
- subtle configured idle traffic used only as visual atmosphere

## Codex Core communication

Codex Core may communicate with any project system for:

- global activity
- unresolved work becoming project-associated
- memory consolidation
- system materialization

Codex Core must not become a mandatory relay for every local project signal.

---

# 11. Camera and navigation

## Camera hierarchy

Support these focus levels:

```text
planet focus
star-system focus
universe overview
task focus
communication focus
free navigation
formation cinematic
```

## Star-system focus

System focus frames:

- project star
- all planets in that system where practical
- active satellite migration
- local communication paths

Other systems should fade or move to lower LOD without disappearing from logical state.

## Universe overview

Overview frames project stars and system bounds rather than every individual satellite.

At large scale:

- stars remain visible
- planet groups become orbital clusters
- satellites aggregate completely
- inter-system signals remain readable
- dormant labels cull before active labels

## Input behavior

Preserve current contained controls:

```text
left drag: rotate or orbit view
right drag: pan without browser context menu
middle drag: pan without browser autoscroll
wheel: zoom universe without scrolling page
single click: select planet or star
double click: focus selection
Escape: step outward one focus level
Home: reset universe overview
```

Keyboard navigation must remain scoped to a focused universe panel.

## Escape behavior

Escape should step outward predictably:

```text
planet focus → star-system focus
star-system focus → universe overview
cinematic → previous user-controlled view
universe overview → no change
```

---

# 12. Selection and inspection

## Star tooltip

Example:

```text
LIVINGBALANCER
Project system
2 planets
143 satellites
Active now
Last task: Tool use
```

## Star inspector

Selected star inspector must include:

- project display name
- system state
- creation date
- last active date
- planet count
- satellite count
- dominant activity types
- total tasks processed
- local signals
- cross-system signals
- maturity
- focus button
- return to universe button

Do not show a raw absolute path by default.

## Planet inspector additions

Add:

- project/star-system name
- orbital band
- system-relative activity
- focus system action

Keep current planet capacity, lineage, maturity, ownership, and signal information.

## Project-system list

Provide a compact discoverability surface when systems no longer fit onscreen.

Minimum behavior:

- list or search by project display name
- indicate active and dormant states
- select a system
- focus a system

Do not add a permanent large sidebar solely for this feature. Reuse the existing living-dashboard space or a compact overlay.

---

# 13. Persistence and version migration

## State version

Advance universe state from version 2 to version 3.

Version 3 must add:

- star-system registry
- project identity aliases
- system positions
- planet star-system ownership
- planet orbit parameters
- active star-formation sequence
- system camera focus
- system activity statistics

## Version 2 migration

Migration must be deterministic and non-destructive.

Required sequence:

1. validate version 2 state
2. create `system_codex_core`
3. preserve all planet IDs, names, timestamps, lineage, and statistics
4. assign all existing planets to Codex Core
5. generate deterministic orbit slots from existing planet order and position
6. preserve every satellite owner
7. preserve active planet expansion and migrations
8. convert camera focus where possible
9. persist version 3 only after integrity validation succeeds

Do not immediately repartition existing satellites based on current session metadata.

## Recovery

If the app closes during:

- star formation
- first planet seeding
- project satellite migration
- planet expansion
- inter-system communication
- camera cinematic

Recovery must:

- retain authoritative ownership
- resume or safely complete major formation and migration
- avoid duplicate stars
- avoid duplicate planets
- avoid duplicate satellites
- discard non-essential particles
- respect user-interrupted camera state

Every long-running star-system sequence needs a stable ID, start time, duration, phase, and normalized progress.

## Integrity rules

After load and before save:

```text
every planet belongs to exactly one system
every satellite belongs to exactly one planet
every planet ID in a system exists
every system ID referenced by a planet exists
every identity alias belongs to at most one system
every active migration references valid owners
Codex Core exists exactly once
```

Invalid records fall back safely. Do not discard the entire universe because one optional alias or visual field is invalid.

---

# 14. Recommended state model

```js
{
  version: 3,

  universe: {
    id: "codex_universe",
    seed: "codex-living-balancer-v3",
    createdAt: "...",
    focusedSystemId: "system_codex_core",
    focusedPlanetId: "planet_0001",
    selectedSystemId: null,
    selectedPlanetId: null,
    totalProjects: 1,
    totalTasks: 0,
    totalSignals: 0,
    totalCrossSystemSignals: 0
  },

  starSystems: [
    {
      id: "system_codex_core",
      projectKey: "codex:core",
      identitySource: "core",
      identityAliases: [],
      displayName: "Codex Core",
      lifecycleState: "stable",
      position: { x: 0, y: 0, z: 0 },
      radius: 0.32,
      color: "#ffd27a",
      intensity: 0.85,
      maturity: 1,
      planetIds: ["planet_0001"],
      createdAt: "...",
      lastActiveAt: "...",
      totalTasksProcessed: 0,
      totalSignalsSent: 0,
      totalSignalsReceived: 0,
      totalCrossSystemSignals: 0
    }
  ],

  planets: [
    {
      id: "planet_0001",
      starSystemId: "system_codex_core",
      name: "Codex Prime",
      orbit: {
        band: 0,
        radius: 3.4,
        inclination: 0.08,
        phase: 0,
        speed: 0.018,
        direction: 1
      }
    }
  ],

  satellites: [],
  activeStarFormation: null,
  activeExpansion: null,
  activeMigrations: [],
  activeSignals: [],

  camera: {
    mode: "star-system-focus",
    focusedSystemId: "system_codex_core",
    focusedPlanetId: null,
    panX: 0,
    panY: 0,
    zoom: 1,
    rotation: 0
  }
}
```

Adapt this model to current TypeScript types. Avoid storing duplicated derived counts when they can be calculated cheaply and safely.

---

# 15. Configuration

Add star-system values to the existing centralized universe configuration.

```js
starSystems: {
  enabled: true,
  coreSystemName: "Codex Core",
  minimumActivitiesToMaterialize: 3,
  formationDurationMs: 5000,
  dormantAfterDays: 30,
  maximumIdentityAliases: 8,
  maximumVisibleSystemLabels: 24,
  autoFollowActiveProject: false
},

systemPlacement: {
  baseSpacing: 18,
  ringSpacing: 14,
  verticalVariance: 4,
  safetyMargin: 6,
  layout: "seeded-spiral"
},

planetOrbits: {
  baseRadius: 3.4,
  bandSpacing: 2.4,
  verticalAmplitude: 0.35,
  minimumSpeed: 0.008,
  maximumSpeed: 0.024
},

crossSystemCommunication: {
  enabled: true,
  maximumConcurrentSignals: 24,
  idleTrafficEnabled: false
}
```

Do not scatter star-system thresholds, durations, or spacing across render and UI files.

---

# 16. Rendering and performance

## Scale target

Support at least:

```text
50 project star systems
100 planets total
10,000 satellites
100 active local signal particles
24 active inter-system signals
50 active satellite transfers
```

Logical state retains all objects. Rendering uses LOD and aggregation.

## Star-system LOD

```text
LOD 0: selected system
full star, planets, eligible satellites, labels, local signals

LOD 1: nearby system
full star, simplified planets, aggregate satellite bands

LOD 2: distant system
star, orbital arcs, planet points, one system label

LOD 3: very distant or off-screen
single star point, activity pulse, directional indicator
```

## Culling

Implement or preserve:

- viewport culling
- star label culling
- planet LOD
- satellite aggregation
- signal particle caps
- off-screen system update throttling
- dormant system low-frequency updates
- reusable geometry and particle buffers

Do not render every satellite for every visible system.

## Update scheduling

```text
selected system: every frame
visible active systems: every frame or every second frame
visible dormant systems: reduced cadence
off-screen systems: low-frequency logical update
```

Persist orbit parameters and derive current positions. Do not save the universe every animation frame.

---

# 17. Visual direction

The project-star layer must preserve the current intelligent cosmic-brain identity.

Stars should feel like organizing centers, not realistic suns.

Desired qualities:

- restrained warm or activity-derived cores
- clean coronas
- subtle technical orbit guides
- project systems readable as grouped structures
- planets retain stronger authored detail
- cross-system paths resemble long neural connections
- dormant systems remain present without visual noise
- no militaristic fleet-map styling
- no cluttered science-fiction control panels
- no excessive bloom that hides planet silhouettes

Visual hierarchy:

```text
selected planet detail
    ↓
selected project star and system
    ↓
active neighboring systems
    ↓
dormant distant systems
    ↓
background stars
```

Project stars must be visually distinguishable from decorative background stars at every interactive LOD.

---

# 18. Implementation phases

## Phase 1: State foundation and migration

Implement:

- version 3 state
- Codex Core system
- version 2 migration
- star-system identity
- planet system ownership
- deterministic orbit parameters
- integrity validation
- persistence and recovery tests

No project star discovery required until migration is proven safe.

## Phase 2: Star and orbit rendering

Implement:

- star renderer in existing canvas
- planet positions relative to stars
- orbit guides
- system bounds
- system LOD
- star hover and selection
- preserved single-planet detail

## Phase 3: Project discovery

Implement:

- project identity normalization
- exact and alias lookup
- Codex Core fallback
- latent system records
- materialization threshold
- star formation
- first project planet

## Phase 4: Activity and communication

Implement:

- project-aware activity routing
- system wake behavior
- intra-system signals
- reliable cross-system signals
- system statistics
- concurrent project activity limits

## Phase 5: Navigation and inspection

Implement:

- star-system focus
- hierarchical Escape behavior
- star tooltip
- star inspector
- compact project-system discovery/search
- off-screen system indicators
- focus and overview controls

## Phase 6: Scale and polish

Implement:

- dormant system rendering
- distant update throttling
- label priority
- 50-system/100-planet/10,000-satellite test
- animation timing polish
- live dashboard QA

Each phase must leave the dashboard runnable and preserve completed behavior.

---

# 19. Testing requirements

## Project identity

Test:

- the same normalized project restores to the same system
- Windows path case does not create duplicates
- path separators normalize consistently
- projects with the same display name remain distinct
- strong repository identity survives a folder rename
- weak matching names do not auto-merge
- conflicting aliases fall back safely
- prompt text never creates project identity

## State migration

Test:

- version 2 creates exactly one Codex Core system
- all existing planet IDs and names remain unchanged
- every existing planet belongs to Codex Core
- every satellite owner remains unchanged
- active expansion survives migration
- active satellite migration survives migration
- camera restores to a valid focus
- repeated restore does not duplicate Codex Core

## Star creation

Test:

- no visible star below materialization threshold
- one star forms at threshold
- repeated events do not duplicate the star
- deterministic placement does not overlap existing systems
- first planet belongs to the new system
- star names persist

## Planet orbits

Test:

- orbit parameters are deterministic
- orbit positions remain bounded
- planets in one system receive distinct safe phases
- reload does not visibly jump normalized orbit state
- selected planet remains focusable while orbiting
- planet expansion creates a planet in the same system

## Ownership

Test:

- every planet has exactly one star-system owner
- every satellite has exactly one planet owner
- ordinary redistribution never crosses system boundaries
- project seeding migrates only reliably associated satellites
- ambiguous satellites remain in Codex Core
- interrupted system migration does not duplicate satellites

## Communication

Test:

- local project events stay within the correct system
- cross-system signals require a valid trigger
- source and destination systems exist
- signal limits are enforced
- no infinite relay loops
- Codex Core is not forced into unrelated local routes

## Camera and input

Test:

- planet focus frames the planet
- system focus frames its star and planets
- overview frames active systems where practical
- Escape steps outward correctly
- user input interrupts cinematics
- right-click does not open browser context menu inside the panel
- middle drag does not activate browser autoscroll
- wheel zoom does not scroll the dashboard
- keyboard controls do not affect the page while the panel is unfocused

## Persistence and recovery

Test:

- project systems restore with the same IDs and names
- planet system ownership restores
- orbit parameters restore
- dormant state restores
- star formation resumes without duplication
- active migration resumes safely
- invalid optional fields do not erase valid universe state

## Scale test

Create:

```text
50 star systems
100 planets
10,000 satellites
100 local signal particles
24 cross-system signals
50 active transfers
```

Verify:

- stable frame timing at normal overview LOD
- no duplicate IDs or ownership
- bounded particle counts
- distant aggregation activates
- off-screen systems remain logically active
- no unbounded save growth from derived positions
- no memory growth during repeated focus and overview transitions

---

# 20. Live validation requirements

After implementation:

1. run focused unit tests
2. run TypeScript typecheck
3. run ESLint on changed files
4. run production frontend build
5. rebuild the live Docker frontend
6. open `http://localhost:5173/dashboard`
7. verify the normal dashboard panel
8. verify fullscreen universe view
9. verify one-project system focus
10. verify at least two project systems with a controlled test state
11. verify local and cross-system communication
12. verify right, middle, wheel, keyboard, focus, and overview navigation
13. verify zero browser console errors

Do not report the feature live until the Docker frontend has been rebuilt and the served bundle is verified.

---

# 21. Acceptance criteria

The task is complete when:

- [ ] Existing universe state migrates without lost or renamed planets or satellites.
- [ ] Codex Core exists exactly once.
- [ ] Every planet belongs to exactly one star system.
- [ ] Reliable Codex projects resolve to stable project systems.
- [ ] Temporary or ambiguous work does not create decorative project clutter.
- [ ] A project star visibly forms after the configured activity threshold.
- [ ] Every materialized project system has at least one planet.
- [ ] Planets visibly orbit their project star.
- [ ] Planet orbits restore deterministically across restarts.
- [ ] Planet expansion remains inside its project system.
- [ ] Satellite redistribution does not cross project boundaries during ordinary splits.
- [ ] New task activity routes to the correct project system.
- [ ] Missing project metadata routes safely to Codex Core.
- [ ] Intra-system communication remains activity-specific.
- [ ] Reliable cross-project work produces distinct inter-system signals.
- [ ] The user can select and inspect stars.
- [ ] The user can focus a star system.
- [ ] The user can focus an individual planet.
- [ ] Escape steps outward through planet, system, and universe views.
- [ ] The user can return to full-universe overview.
- [ ] Off-screen and dormant systems remain discoverable.
- [ ] Wheel, right-drag, middle-drag, and keyboard controls remain contained to the universe panel.
- [ ] Interrupted star formation and migration recover without duplication.
- [ ] Star-system, planet, and satellite state persists across restarts.
- [ ] LOD prevents distant systems from rendering full planet and satellite detail.
- [ ] The system supports at least 50 project systems, 100 planets, and 10,000 satellites.
- [ ] The live Docker dashboard serves the completed implementation.
- [ ] The final universe reads clearly as projects containing growing knowledge worlds.

---

# 22. Out of scope

Do not include unless separately requested:

- remote project synchronization
- multiplayer universes
- GitHub organization or account stars
- one star per Git branch
- realistic orbital mechanics
- binary stars
- black holes or destructive star events
- project deletion that destroys history
- cloud persistence
- project content indexing solely for visualization
- prompt-content classification to infer project identity
- manual planet piloting
- resource economies
- combat
- literal astronomy simulation

---

# Final experience statement

A new or migrated user begins with Codex Core preserving the current living universe.

As Codex works inside a reliable project, a distant point gathers light and becomes that project's star. A first planet forms around it. Future work creates satellites around the project's planets, and full planets launch new worlds into open orbital bands around the same star.

Switching projects activates another system without destroying the user's current view. Work inside one project creates local neural traffic. Reliable cross-project activity sends rarer signals across the space between stars.

Over time, the universe becomes a spatial map of the user's Codex work:

```text
projects become stars
knowledge grows into planets
tasks gather as satellites
shared work connects systems
```

The user should be able to look at the universe and recognize where their work lives.

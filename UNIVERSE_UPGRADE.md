# TASK: Upgrade the living Codex universe with observable cosmic infrastructure

## Objective

Extend the persistent project star systems defined by `STAR_SYSTEM.md` with five meaningful object types:

```text
nebulae        = observed Codex projects with no qualifying Codex activity yet
black holes    = recoverable records of projects removed from Codex
asteroid belts = archived or deleted Codex chats and threads
space stations = MCP servers, plugins, CI systems, and similar integrations
pulsars        = recurring automations associated with a project
```

These objects must represent authoritative state. Do not add decorative instances, infer them from prompt text, or read private conversation content merely to animate the universe.

The required project lifecycle is:

```text
observe project in Codex
    -> create persistent nebula
    -> wait for qualifying Codex activity
    -> ignite the project star and create its first planet
    -> continue the existing planet, satellite, capacity, and expansion logic
    -> project removed from Codex
    -> collapse the system into a recoverable black hole
    -> same project re-added
    -> restore the original system and history
```

---

## Relationship to existing tasks

`EXPANSION.md` remains authoritative for planets, satellites, capacity, expansion, communication, camera behavior, persistence, recovery, LOD, and performance.

`STAR_SYSTEM.md` remains authoritative for project identity, star systems, Codex Core, project-aware routing, system placement, and project focus.

This task changes the earlier star-materialization rule in one deliberate way:

- every reliably observed Codex project receives a visible nebula immediately
- the first qualifying project activity replaces the nebula with a star and first planet
- no multi-activity threshold is required after an authoritative project import
- projects discovered only from activity may still use the existing confidence and identity safeguards

Extend the current implementation in place:

```text
codex-lb/frontend/src/features/dashboard/universe.ts
codex-lb/frontend/src/features/dashboard/universe-storage.ts
codex-lb/frontend/src/features/dashboard/components/codex-globe.tsx
codex-lb/frontend/src/features/dashboard/components/living-dashboard.tsx
codex-lb/frontend/src/features/dashboard/components/living-dashboard.css
codex-lb/frontend/src/features/dashboard/universe.test.ts
codex-lb/frontend/src/features/dashboard/universe-storage.test.ts
```

Do not create a second universe store, renderer, simulation loop, database, or manager hierarchy.

---

# 1. Authoritative observation boundary

## Supported evidence order

Use the strongest available evidence in this order:

1. supported Codex event or API carrying a stable object ID
2. supported Codex project, chat, automation, plugin, or MCP registry snapshot
3. existing LivingBalancer telemetry with stable Codex provenance
4. explicit user action inside Living Codex
5. safe fallback to unknown state or Codex Core

Private Codex or ChatGPT databases and undocumented internal files are not stable integration contracts. Do not depend on them by default.

## Reconciliation

Treat imported state as snapshots that may be delivered repeatedly or out of order.

Every reconciliation must be:

- idempotent
- keyed by stable identity
- safe after interruption
- non-destructive when evidence is ambiguous
- able to restore an object previously marked absent

Persist the observation source, last observed timestamp, and last source revision when available. Do not persist prompt text, response text, file contents, command output, credentials, tokens, or environment secrets.

## Missing is not removed

A missing or inaccessible folder does not prove that a project was removed from Codex.

Folder failures may indicate:

- renamed or moved folders
- disconnected drives
- unavailable network shares
- permission changes
- temporary filesystem errors

These conditions may dim or mark a system unavailable, but they must not create a black hole.

Only an authoritative Codex removal signal, confirmed registry absence under a documented reconciliation contract, or an explicit user action may transition a project to a black hole.

---

# 2. Nebulae: observed projects awaiting activity

## Creation

Import every project that Codex can authoritatively enumerate.

For each project:

1. normalize identity using `STAR_SYSTEM.md`
2. resolve an exact system or identity alias
3. restore an existing black hole when identity matches
4. otherwise create one persistent project-system record
5. assign a deterministic universe position
6. render a nebula at that position
7. wait for qualifying project activity

Repeated imports must not duplicate nebulae or systems.

## Nebula state

A nebula is the pre-star visual state of a real project system, not a separate owner of planets or satellites.

Minimum state:

```ts
{
  lifecycleState: "nebula",
  observedAt: "...",
  lastObservedAt: "...",
  activityCount: 0,
  formation: null
}
```

Nebulae must:

- use the stable project-system ID and position
- show the project display name on hover or selection
- remain smaller and dimmer than active stars
- contain no planet until qualifying activity occurs
- remain searchable and selectable
- survive restart without changing position
- use LOD and label culling at scale

## Qualifying activity

Qualifying activity is an authoritative Codex task or chat associated with the project that reaches the existing committed/completed activity boundary.

Do not ignite a nebula from:

- merely opening or selecting the project
- filesystem polling
- editor focus
- prompt-text classification
- a transient working directory
- a failed identity match

## Ignition and first planet

On the first qualifying activity:

1. create one recoverable formation sequence
2. condense the nebula into the project star
3. create the first project planet
4. route the qualifying task to that planet using existing satellite logic
5. preserve the system ID, project identity, name, and position
6. continue all existing star-system behavior

The transition must be restart-safe and must never create two stars, planets, or task satellites for one activity.

---

# 3. Black holes: recoverable removed projects

## Collapse trigger

Transition a project system to `black-hole` only when project removal is authoritative under Section 1.

Codex Core must never become a black hole.

## Non-destructive collapse

Black-hole conversion changes presentation and activity routing, not historical ownership.

Preserve:

- system ID and deterministic position
- project identity and bounded aliases
- display name
- planet IDs and planet ownership
- satellite IDs and satellite ownership
- archive metadata
- integration associations
- automation associations
- activity statistics and timestamps

While collapsed:

- do not route new ambiguous activity into the system
- exclude it from ordinary active-system simulation work
- keep it selectable and searchable
- show removal time and recovery status in the inspector
- render retained planets and satellites only through a restrained black-hole accretion treatment or inspector summary
- do not delete project files, Codex records, chats, or universe history

## Recovery

When Codex observes the same project again through its stable identity or a proven alias:

1. cancel any incomplete collapse sequence
2. reuse the original system ID and position
3. restore the previous star, planets, satellites, stations, and pulsars
4. preserve all historical statistics
5. route new activity normally

If the removed system had never progressed beyond a nebula, restore it as a nebula. Otherwise restore its last non-removed lifecycle state.

Display-name equality alone must never recover or merge a black hole.

## Explicit forgetting

Do not add destructive history deletion as part of this task. A future explicit `Forget permanently` action requires a separate confirmation, retention, and data-loss contract.

---

# 4. Asteroid belts: archived and deleted chats

## Meaning

Each project system may have an asteroid belt representing chats or threads that are no longer active.

```text
archived chat -> recoverable asteroid
unarchived chat -> restore the original active satellite representation
deleted chat -> historical tombstone asteroid when authoritative metadata exists
```

An asteroid is a lightweight historical marker. It must not contain conversation content.

## Identity and ownership

Use the stable Codex chat or thread ID when available.

Each asteroid belongs to exactly one belt and one project system. Unknown or cross-project chats belong to Codex Core rather than being guessed into a project.

Minimum asteroid metadata:

```ts
{
  id: "asteroid_<stable-chat-id>",
  sourceId: "<stable-chat-id>",
  systemId: "system_...",
  state: "archived" | "deleted",
  title: "safe user-visible title",
  lastActiveAt: "...",
  changedAt: "..."
}
```

Titles may be retained only when already provided as safe Codex metadata. Do not generate titles by reading prompt content.

## Archive and restore

Archiving a represented chat must move or transform its existing satellite into one asteroid without changing its stable source identity.

Unarchiving must:

- remove the archived asteroid representation
- restore the original satellite identity and ownership where valid
- avoid duplicate satellites
- preserve historical timestamps and statistics

## Deleted chats

Deleted chat detection requires authoritative evidence. Absence from a filtered, paginated, or incomplete chat list is not deletion proof.

Living Codex may preserve a metadata tombstone for visualization, but it must not claim that the original deleted Codex conversation is recoverable unless Codex actually supports restoration.

## Rendering

Use one belt per system with aggregation:

- nearby selected system: limited individual asteroids plus aggregate belt particles
- distant system: one thin aggregate belt
- large archives: fixed particle budget with count represented by density or inspector totals
- black hole: belt becomes part of the accretion treatment without losing logical records

Do not render one permanent particle per archived chat at large scale.

---

# 5. Space stations: integrations used by a system

## Supported station kinds

Represent integrations only when they are authoritatively configured for, invoked by, or associated with a project:

- MCP servers
- Codex plugins
- CI systems and workflows
- connected developer tools with stable identity

Do not create stations merely because an executable, manifest, or configuration filename exists somewhere on disk.

## Association

A station orbits each project system that uses it. Unknown global integrations orbit Codex Core until reliable project use is observed.

Recommended stable key:

```text
stationKey = integrationKind + normalizedStableIntegrationId + systemId
```

This intentionally creates a project-local station representation when the same integration serves multiple systems. Do not build cross-system ownership or station travel for this task.

Minimum state:

```ts
{
  id: "station_...",
  systemId: "system_...",
  kind: "mcp" | "plugin" | "ci" | "tool",
  integrationId: "...",
  displayName: "...",
  status: "configured" | "active" | "healthy" | "degraded" | "offline",
  firstObservedAt: "...",
  lastObservedAt: "...",
  lastUsedAt: "..."
}
```

## Behavior

- configured but unused stations remain quiet
- tool invocation sends an existing-style signal between the active planet and station
- status changes alter restrained station lighting, not system ownership
- removal from configuration marks the station offline before any optional retention cleanup
- reappearance with the same identity restores the same station
- secrets, endpoint credentials, and raw tool payloads are never persisted or displayed

CI status may show success, running, or failure only when supplied by an authoritative integration. Do not infer CI health from repository files.

---

# 6. Pulsars: project automations

## Creation and ownership

Create one pulsar for each recurring automation with reliable project association.

Association priority:

1. explicit stable project or workspace ID
2. normalized configured workspace root
3. proven project identity alias
4. Codex Core fallback

Do not infer automation ownership from its natural-language prompt.

One-time reminders or tasks do not become pulsars unless the existing automation model treats them as recurring.

## Pulse behavior

The pulse period reflects the automation schedule within readable visual bounds. Do not simulate literal schedule duration when that would be invisible or visually frantic.

Required states:

```text
enabled and healthy -> regular pulse
currently running   -> brighter active pulse and signal to the target planet
failed              -> interrupted or warning-colored pulse
paused              -> visible but not pulsing
removed             -> fade out after bounded retention
```

Use authoritative schedule and run status. A missed local observation must not be presented as a failed automation.

Pulsars must preserve stable identity across schedule edits and restart. Editing frequency changes the pulse cadence without creating a new pulsar.

---

# 7. Unified lifecycle and precedence

Use one project-system record with these mutually exclusive primary lifecycle states:

```text
nebula
forming
stable
dormant
black-hole
```

Precedence:

1. Codex Core remains stable and permanent
2. authoritative removal produces `black-hole`
3. restored identity exits `black-hole`
4. observed project without qualifying activity is `nebula`
5. first qualifying activity moves `nebula -> forming -> stable`
6. existing dormancy rules apply only after materialization

Asteroid belts, stations, and pulsars are owned infrastructure and do not replace the system lifecycle state.

---

# 8. State and migration

Advance the persisted universe state from version 3 to version 4.

Version 4 adds only fields that cannot be derived safely:

```ts
{
  version: 4,
  starSystems: [{
    lifecycleState: "nebula" | "forming" | "stable" | "dormant" | "black-hole",
    lastNonRemovedLifecycleState: "nebula" | "stable" | "dormant" | null,
    observedAt: "...",
    lastObservedAt: "...",
    removedAt: null,
    observationSource: "..."
  }],
  asteroidBelts: [],
  spaceStations: [],
  pulsars: [],
  activeSystemTransitions: []
}
```

Adapt this shape to the existing TypeScript model. Do not duplicate counts, positions, health summaries, or visual parameters that are cheap and safe to derive.

## Version 3 migration

1. validate version 3 state
2. preserve every system, planet, satellite, identity, and position
3. map existing latent systems to `nebula`
4. preserve existing materialized lifecycle states
5. initialize empty asteroid, station, and pulsar collections
6. persist version 4 only after integrity validation

Migration must not reinterpret historical satellites as archived chats, integrations, or automations without authoritative provenance.

## Integrity rules

Add these checks to the existing integrity contract:

```text
each observed project identity resolves to at most one system
each black hole retains a valid prior lifecycle state
each asteroid belongs to exactly one valid system
each station belongs to exactly one valid system
each pulsar belongs to exactly one valid system
each stable source ID is unique within its object kind and system
Codex Core is never a nebula or black hole
active transitions reference valid owners and stable IDs
```

One invalid optional object must not erase the valid universe.

---

# 9. Configuration

Add the minimum centralized controls to the existing universe configuration:

```ts
universeObjects: {
  importObservedProjects: true,
  blackHoleRetention: "indefinite",
  deletedChatTombstonesEnabled: true,
  stationOfflineRetentionDays: 30,
  maximumRenderedAsteroidsPerSystem: 160,
  maximumRenderedStationsPerSystem: 12,
  maximumRenderedPulsarsPerSystem: 12
}
```

Reuse existing animation durations, LOD thresholds, colors, orbit helpers, and particle limits where they already fit. Add a new setting only when behavior must be user-tunable or bounded centrally.

---

# 10. Rendering and interaction

Preserve the existing intelligent cosmic-brain visual language. All new objects must remain subordinate to project stars and planets.

## Required visual distinction

- nebula: diffuse, quiet, pre-formation cloud
- black hole: dark center, restrained lensing/accretion treatment, unmistakably recoverable rather than destroyed
- asteroid belt: thin orbital aggregate with density tied to archived/deleted count
- space station: compact constructed silhouette with state lights
- pulsar: small stellar object with rhythmic directional pulse

Each object must have a distinct hover target, tooltip label, keyboard-accessible selection path, and inspector summary where the existing interaction model supports it.

Do not add a new permanent sidebar. Extend the existing inspector and compact system discovery UI.

## Camera hierarchy

Preserve the existing hierarchy:

```text
object focus -> planet or system focus -> universe overview
```

Escape must move outward one level. User input must interrupt non-essential cinematics.

## LOD and budgets

At overview distance:

- nebulae collapse to bounded textured points or simple clouds
- black holes retain a recognizable silhouette without full particle simulation
- asteroid belts aggregate
- stations aggregate or hide behind a count
- pulsars preserve only a bounded pulse indicator

No new object type may allocate an unbounded animation loop, timer, particle set, or DOM node per persisted record.

---

# 11. Implementation phases

## Phase 1: Observation and state foundation

- add version 4 migration
- add normalized observation records and snapshot reconciliation
- add lifecycle precedence and integrity validation
- prove repeated and out-of-order snapshots are idempotent

## Phase 2: Nebulae and ignition

- import authoritative Codex projects as nebulae
- render, select, inspect, and persist nebulae
- ignite on first qualifying activity
- create the first planet and route the triggering task exactly once

## Phase 3: Recoverable black holes

- distinguish unavailable folders from authoritative Codex removal
- implement collapse state and rendering
- preserve all owned history
- restore the original system when the same project returns

## Phase 4: Asteroid belts

- reconcile authoritative archive, unarchive, and deletion state
- preserve stable source identity
- aggregate rendering at scale
- clearly distinguish metadata recovery from actual Codex chat recovery

## Phase 5: Stations and pulsars

- reconcile MCP, plugin, CI, tool, and recurring automation metadata
- associate only through reliable project identity
- render bounded orbiting representations
- connect tool use and automation runs to existing signal behavior

## Phase 6: Scale, accessibility, and live polish

- finish LOD and particle budgets
- verify keyboard and pointer behavior
- verify inspectors and system search
- run the full scale state and live Docker validation

Each phase must leave the dashboard runnable and all earlier universe behavior intact.

---

# 12. Testing requirements

## Observation and reconciliation

- repeated identical snapshots create no duplicates
- older snapshots do not overwrite newer authoritative state
- incomplete or paginated lists do not imply deletion
- unsupported private app storage is not required
- no prompt or response content is persisted

## Nebulae

- every authoritatively observed project creates exactly one nebula
- nebula identity and position survive restart
- opening a project without activity does not ignite it
- first qualifying activity creates exactly one star, first planet, and task satellite
- interrupted ignition resumes without duplication

## Black holes

- missing folder alone does not create a black hole
- authoritative removal creates exactly one black hole
- collapse preserves system, planet, satellite, station, belt, and pulsar identity
- same stable project identity restores the original system
- display-name collision does not restore the wrong system
- Codex Core cannot collapse

## Asteroid belts

- archive creates one asteroid representation
- repeated archive events are idempotent
- unarchive restores one original satellite representation
- incomplete chat listing does not imply deletion
- deleted tombstone does not claim original-chat recoverability
- large belts obey fixed render budgets

## Space stations

- authoritative project use creates one project-local station
- repository filenames alone do not create a station
- repeated tool use does not duplicate a station
- shared integration use creates one association per system
- credentials and raw payloads are never persisted
- offline and restored state preserve station identity

## Pulsars

- recurring project automation creates one pulsar
- prompt text does not determine ownership
- schedule edit preserves pulsar identity and changes cadence
- paused automation stops pulsing without disappearing
- observed failure and missed observation remain distinct
- unknown automation ownership routes to Codex Core

## Migration and recovery

- version 3 migrates to version 4 without changing existing IDs or ownership
- reload preserves every new object type
- interrupted transition resumes or safely completes
- corrupt optional infrastructure does not erase valid universe state

## Scale state

Create at least:

```text
100 project systems
40 nebulae
10 black holes
100 planets
10,000 active satellites
20,000 archived/deleted chat records
500 logical space stations
500 logical pulsars
```

Verify bounded rendered objects, stable frame timing at overview LOD, bounded save growth, deterministic restore, and no memory growth during repeated focus transitions.

---

# 13. Live validation

After implementation:

1. run focused universe and storage tests
2. run frontend TypeScript typecheck
3. run ESLint on changed files
4. run the production frontend build
5. rebuild the live Docker frontend
6. open `http://localhost:5173/dashboard`
7. verify the normal dashboard and fullscreen universe
8. import a controlled inactive project and verify a nebula
9. complete one controlled Codex task and verify ignition plus first planet
10. remove and re-add that project through Codex and verify black-hole recovery
11. archive and restore a controlled chat and verify asteroid conversion
12. verify one MCP/plugin/CI station and one automation pulsar with authoritative data
13. verify pointer, keyboard, Escape, zoom, drag, focus, and overview behavior
14. verify zero browser console errors

Do not report the upgrade complete until the rebuilt Docker frontend serves the verified bundle.

---

# 14. Acceptance criteria

The task is complete when:

- [ ] Every project authoritatively visible to Codex imports as exactly one persistent nebula.
- [ ] Imported nebulae do not create planets before qualifying Codex activity.
- [ ] First qualifying activity creates one star, one first planet, and one correctly routed task representation.
- [ ] Nebula ignition survives interruption without duplication.
- [ ] Project removal is distinguished from missing or inaccessible folders.
- [ ] Authoritative removal creates a recoverable black hole without deleting history.
- [ ] Re-adding the same stable project restores the original system, position, planets, and history.
- [ ] Codex Core can never be removed or collapsed.
- [ ] Archived chats become asteroid-belt records and restore without duplication when unarchived.
- [ ] Deleted-chat tombstones never falsely promise recovery of deleted Codex content.
- [ ] Asteroid rendering remains bounded regardless of archive size.
- [ ] MCP servers, plugins, CI systems, and supported tools create stations only from authoritative configuration or use.
- [ ] Shared integrations associate safely with every system that uses them.
- [ ] Recurring automations create pulsars in the correct systems without prompt-text inference.
- [ ] Pulsar cadence and status reflect authoritative schedules and runs.
- [ ] No new object persists prompt text, response text, secrets, raw tool payloads, or file contents.
- [ ] Version 3 state migrates to version 4 without lost or changed existing IDs and ownership.
- [ ] All new objects persist and recover deterministically across restarts.
- [ ] Existing universe navigation, rendering, activity routing, capacity, expansion, communication, and dashboard behavior remain functional.
- [ ] LOD and aggregation keep the required scale state responsive.
- [ ] The live Docker dashboard serves the completed and verified implementation.

---

# 15. Out of scope

Do not include unless separately requested:

- scraping private Codex or ChatGPT databases
- reading conversation content to classify projects or objects
- automatic detection of unrelated ChatGPT Quick chats
- claiming restoration of a deleted Codex chat without supported recovery
- permanent project-history deletion
- literal gravitational simulation
- resource economies or combat
- movable stations or inter-system station ownership
- decorative nebulae, black holes, belts, stations, or pulsars without real state
- a second universe renderer or persistence system

---

# Final experience statement

Living Codex begins by observing the same project universe the user sees in Codex. Untouched projects wait as quiet nebulae. The first real work ignites a star and seeds its first knowledge planet. Archived work settles into asteroid belts, integrations operate as stations, and recurring automations pulse with recognizable rhythm. Removing a project collapses its system into a black hole without erasing its history; returning to that project restores the same place in the universe.

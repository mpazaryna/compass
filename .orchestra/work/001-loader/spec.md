---
ticket: 001-loader
status: closed
created_on: 2026-07-20
approved_on: 2026-07-20
---

# Loader — Compass Owns the Bearing Schema

> PRD: `.orchestra/work/001-loader/prd.md`

## Objective

Move the bearing loader and types into this repository as schema v2 — Savvy
coupling removed, SAV-121's two validation gaps closed, optional fields
validated, and validation callable from build tooling — so Compass is the single
owner every other consumer pins against.

## Constraints

- **TypeScript.** No JavaScript source. The one exception is build tooling, which
  follows Orchestra's precedent (`build-skills.mjs`) and lands in M2, not here.
- **Test-driven.** Every behaviour below is a failing test first, then the code
  that passes it. The loader is pure functions over parsed YAML with no I/O in
  the hot path — there is no excuse for writing it any other way, and the
  existing 119-line test file is the starting point, not an afterthought.
- Strict compiler settings. `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes` — the last one matters here, because the
  serialization guarantee depends on the difference between an absent key and a
  key set to `undefined`.

## Approach

### Step 1: Workspace skeleton

pnpm workspace mirroring Orchestra's shape, so M2 can add `apps/mcp-compass`
beside it without restructuring.

```
package.json          # workspace root, private
pnpm-workspace.yaml   # packages/*, apps/*
tsconfig.base.json
packages/core/
  package.json        # @compass/core, type: module
  tsconfig.json
  src/
```

`@compass/core` depends on `yaml` and nothing else. Dev dependencies: `vitest`,
`typescript`, `@types/node`.

**Zod was considered and rejected.** It would replace ~200 lines of hand-rolled
validation with schema declarations, which is genuinely attractive. Rejected for
this work item on three grounds: it turns a move into a rewrite, contradicting
"copy, verify, then delete"; the current error messages are specific and
positional (`bearing "x" stages[2].gate: "rule" must be a non-empty string`) and
are the loader's main affordance for someone authoring a bearing by hand; and
Zod's output types interact awkwardly with `exactOptionalPropertyTypes` and the
JSON round-trip guarantee. Revisit as its own work item if bearing authoring
grows a UI.

### Step 2: Split the module so `fs` is structurally unreachable

Savvy's `loader.ts` contains both the pure parser and the filesystem reader, and
keeps them apart by discipline. Workers have no `fs`, so discipline is the wrong
mechanism — split the files:

| Module | Contents | Imports `node:fs` |
|---|---|---|
| `src/types.ts` | All types, no runtime code | No |
| `src/parse.ts` | `parseBearing(yamlText)`, validators, `BearingValidationError` | No |
| `src/load.ts` | `loadBearing(filePath)` — reads, delegates to `parseBearing` | Yes |
| `src/index.ts` | Re-exports all three | Transitively |

The Worker imports `parse.js` directly and never touches `index.js`. A test
asserts `parse.ts` has no `node:` import, so the guarantee is enforced by the
build rather than by remembering.

**Tests first:** `parseBearing` importable and callable with no Node globals
present; `parse.ts` source contains no `node:` specifier.

### Step 3: Envelope — v2

Port the existing envelope validation, then change it:

- `audience` — remove from `ENVELOPE_KEYS`. No other code is needed: the strict
  allow-list already rejects anything it does not name, so a v1 bearing fails
  with a message naming the offending key.
- `source` — remains an array of non-empty strings when present, but is no
  longer required.
- `client` — new, optional, non-empty string when present. Absent means universal
  methodology. Nothing in this work item consumes it; M2's key-scoped serving
  does.

**Tests first:** minimal valid journey and standing bearings parse; each missing
required envelope key fails with a message naming it; non-integer `version`
fails; unknown top-level key fails; a bearing carrying `audience` fails; a
bearing omitting `source` parses; `client` round-trips.

### Step 4: Construct, don't cast

The current validators check a few fields then cast the raw object
(`return s as unknown as JourneyStage`), which is what lets `artifact`,
`unlocks`, and `scoring` through unvalidated. Replace every cast with explicit
construction from validated values.

Two rules the construction must follow, both load-bearing for Step 7:

1. An absent optional field is an **omitted key**, never a key set to
   `undefined`. `exactOptionalPropertyTypes` makes the compiler enforce this.
2. No class instances, `Map`, `Set`, or `Date` in the returned value. Plain
   objects, arrays, strings, numbers, booleans.

**Tests first:** a stage with a malformed `unlocks` (not an array of strings)
fails; `scoring.dimensions` must be a non-empty array of strings; `artifact`
must be a string; a parsed bearing has no own key whose value is `undefined`.

### Step 5: Journey profile

Port stage validation, then extend it to the optional fields: `artifact`,
`unlocks`, `scoring`. `mode` stays an optional array of strings.

Stage `id` uniqueness within a bearing is now validated — duplicate ids make
`unlocks` ambiguous, and the gating graph is about to become the primary
mechanism rather than a documented intention.

`unlocks` referential integrity is **not** validated here. The settled schema
lets a stage unlock ids that are not stages in the same bearing, and resolving
that requires knowing the whole bearing set, which is M2's concern. Recorded as
a known gap rather than silently assumed.

**Tests first:** the Brand Builder fixture parses; duplicate stage ids fail;
empty `stages` fails; a stage missing `gate.rule` fails; `requires_signoff` must
be boolean when present.

### Step 6: Standing profile, with SAV-121's two fixes

Port targets, rhythms, and initiatives, then:

- **`direction`** — optional on a target, `gte | lte`, defaulting to `gte`. The
  default is materialised into the parsed output rather than left absent, so
  consumers never re-implement the default and disagree about it. This is a
  deliberate exception to Step 4's omit-absent-keys rule, and the only one.
- **`daily` cadence** — added to `RhythmCadence`. Its reset anchor is
  `local-day`; the loader validates that `weekly` pairs with `monday`, `monthly`
  with `first`, and `daily` with `local-day`, rather than accepting any string
  as it does today. All anchors are documented as local to the consumer.

**Tests first:** a target without `direction` parses with `gte` materialised; an
invalid `direction` fails; `cadence: daily` with `reset: local-day` parses;
`cadence: daily` with `reset: monday` fails; each cadence/anchor mismatch fails;
the existing tier and `confirmed` rules still hold.

### Step 7: Serialization guarantee

The M2 bake script will embed parsed bearings in a generated TypeScript module,
so the parser's output must survive that trip unchanged.

**Tests first:** for both fixtures,
`JSON.parse(JSON.stringify(parseBearing(yaml)))` deep-equals
`parseBearing(yaml)`; and the parsed value contains no own key with an
`undefined` value at any depth.

### Step 8: Fixtures and the owned schema spec

- `fixtures/journey-example.yaml` — ported, `audience` removed, `client` added.
- `fixtures/standing-example.yaml` — new. Savvy's `business-plan.yaml` is the
  only authored standing bearing and it is client data; the fixture is a small
  synthetic one exercising all three facets, both comparator directions, and all
  three cadences.
- `.orchestra/work/compass-bearing-schema/spec.md` — the settled schema carried
  across and amended to v2: `audience` gone, `source` optional, `client` added,
  `direction` and `daily` documented, anchors declared consumer-local, and a
  version history recording what changed from v1 and why.

## Testing Strategy

### Unit
Every validation rule above, positive and negative. Negative cases assert on the
message, not just the throw — the messages are the authoring interface and a
regression that keeps the throw but loses the path is a real regression.

### Integration
Both fixtures parse end to end through `loadBearing` (filesystem path), and
through `parseBearing` (string path) with identical results.

### E2E
Deferred to M2, where a bearing travels through the bake script and out over the
protocol. There is no end-to-end surface in this work item — an honest gap, not
an omission.

## Deliverables

| File | Purpose | Status |
|------|---------|--------|
| `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json` | Workspace root | Delivered |
| `packages/core/package.json`, `tsconfig.json` | `@compass/core` | Delivered |
| `packages/core/src/types.ts` | Schema types, v2 | Delivered |
| `packages/core/src/parse.ts` | Pure parser + validators | Delivered |
| `packages/core/src/load.ts` | Filesystem reader (Node only) | Delivered |
| `packages/core/src/index.ts` | Re-exports | Delivered |
| `packages/core/src/parse.test.ts` | Unit + serialization tests | Delivered |
| `packages/core/src/load.test.ts` | Integration tests | Delivered |
| `packages/core/src/fixtures/journey-example.yaml` | Journey fixture, v2 | Delivered |
| `packages/core/src/fixtures/standing-example.yaml` | Standing fixture, v2 | Delivered |
| `.orchestra/work/compass-bearing-schema/spec.md` | Owned schema spec, v2 | Delivered |

## Acceptance Criteria

### Functional
- A v2 journey bearing and a v2 standing bearing both parse
- A bearing carrying `audience` is rejected, naming the key
- A bearing omitting `source` parses
- Targets carry `direction`, defaulting to `gte` in the output
- `cadence: daily` parses with `reset: local-day`, and cadence/anchor mismatches fail

### Unit
- Every optional field the types declare has both an accepting and a rejecting test
- No `as unknown as` cast remains in `parse.ts`
- Negative tests assert on message content, including the positional path

### Integration
- `parseBearing(text)` and `loadBearing(path)` produce deep-equal results for both fixtures
- `parse.ts` contains no `node:` import
- `parseBearing` runs under plain Node with no bundler or Worker context

### E2E
- None in scope; M2 owns the protocol surface

## Dependencies

- `yaml` (runtime), `vitest`, `typescript`, `@types/node` (dev)
- Source material: `os/web/packages/compass/src/` in savvy — read-only until this
  ships, then deleted under SAV-155
- No dependency on Orchestra. ADR-001's inheritance is by citation

## Risks

| Risk | Mitigation |
|------|-----------|
| Two copies of the schema exist while this is in flight, and savvy's is still editable | The window is short and savvy's copy has no importers. SAV-155 gates its deletion on this shipping |
| "Port then change" drifts into "rewrite," and the tests end up asserting the new implementation rather than the settled schema | Port and get green against the existing 119-line test file *before* any v2 change. Each subsequent step starts red on a new test |
| `direction`'s materialised default contradicts the omit-absent-keys rule and invites more exceptions | It is named as the single exception here and in the schema spec. Any second one needs a reason written down |
| `unlocks` referential integrity is unvalidated, so a typo'd id silently locks a stage forever | Recorded as a known gap for M2, where the full bearing set is available. Not silently assumed |
| Removing `audience` breaks a consumer nobody remembered | Verified: only two v1 bearings exist — savvy's `business-plan.yaml` (deleted by SAV-155) and the journey fixture (ported here). iOS decodes `audience` from its own JSON, not from a bearing |

## Notes

Copy, verify, then delete. Nothing is removed from savvy until these tests pass
here — the risk is losing the 335 lines, not breaking a build, since savvy has no
importers to break.

Gherkin is the next gate artifact after this spec is approved.

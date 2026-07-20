---
ticket: 001-loader
status: approved
created_on: 2026-07-20
approved_on: 2026-07-20
---

# Loader — Compass Owns the Bearing Schema

## Problem

The bearing schema has been implemented four times and drifted four times
(ADR-001). The fourth implementation — `@savvy/compass` — is the only one that
is current, tested, and matches the settled spec, and it is sitting in a client
product repository where it has no consumers at all: nothing in savvy imports
it, and the iOS app decodes a separately hand-maintained JSON file instead.

So the schema today has an owner by accident rather than by decision, and one of
its two authored bearings (`business-plan.yaml`) is a second hand-maintained copy
of a file the app already carries. Until the loader lives somewhere that owns it,
every consumer is one convenience away from writing a fifth version.

Nothing in savvy can be deleted until it lives here. This work item blocks the
deletion tracked in SAV-155, and everything downstream of M2 blocks on it.

## Objective

Move the bearing loader and types into this repository as schema v2 — Savvy
coupling removed, the two known validation gaps closed, optional fields actually
validated, and validation callable from build tooling — so that Compass is the
single owner every other consumer pins against.

## Success Criteria

- [ ] `parseBearing` and `loadBearing` live here with their tests passing
- [ ] No `node:fs` reachable from the Worker entry path — `parseBearing(string)`
      is pure, `loadBearing(path)` is build-time only
- [ ] No dependency on `@savvy/llm`, React, or any savvy package
- [ ] A journey bearing and a standing bearing both round-trip through validation
- [ ] A bearing carrying `audience` is **rejected** by the allow-list (v2)
- [ ] A malformed `unlocks`, `scoring`, or `artifact` fails validation rather
      than reaching a consumer as a type lie
- [ ] A target declares a comparator direction; a `daily` rhythm validates
- [ ] `parseBearing` runs under plain Node with no Worker or bundler context,
      and its output survives a `JSON.parse(JSON.stringify(…))` round-trip
      unchanged
- [ ] Savvy's deletion in SAV-155 is unblocked and the schema spec has one home

## Context

Serves M1. The loader is the asset — 335 lines of `loader.ts` and `types.ts`
plus 119 lines of tests. Everything else in M2 is plumbing that ADR-001 already
settled by copying Orchestra's working skeleton, so this is the only piece with
real design content in it.

Compass owns **both** profiles, `journey` and `standing`, even though the server
will initially serve only journeys. Ownership and serving are separate questions:
Compass owns the schema; what it serves over MCP is M2's scope.

## What moves, and what changes

### Moves as-is

`loader.ts`, `types.ts`, `loader.test.ts`, and `fixtures/journey-example.yaml`.
The `parseBearing` / `loadBearing` split already matches what a Worker needs and
must be preserved deliberately rather than by luck.

The strict top-level allow-list is the best thing in the current loader and stays
exactly as it is: any key that is neither in the envelope nor allowed for the
declared profile is a validation error, so a `gate` in a standing bearing or a
`cadence` in a journey bearing fails loudly instead of being silently ignored.
It is also the mechanism that enforces the envelope change below — no extra code
is needed to reject `audience`, because the allow-list already rejects anything
it does not name.

### Envelope — strip the Savvy coupling

| Key | v1 | v2 |
|---|---|---|
| `audience` | Required string. Mirrors Savvy's CEO Hub visibility gate (`ceo` / `owner`) | **Removed.** A product's in-app permission model, not a property of a methodology |
| `source` | Required non-empty array. Authoring provenance | Kept, **optional**. Provenance is useful; requiring it is friction when authoring |
| `client` | — | **Added, optional.** Names the engagement a bearing belongs to; absent means universal methodology. This is what ADR-001's key-scoped serving filters on |

Client scoping needs a field to filter on and `audience` is not it — one is
"which of this product's screens may show this", the other is "whose engagement
is this". Conflating them is how the coupling got there.

### Validate the optional fields

The stage validator checks `id`, `title`, `prompt`, and `gate`, then casts:
`return s as unknown as JourneyStage`. `artifact`, `unlocks`, and `scoring` are
never checked, so a malformed `unlocks` reaches consumers as a type lie. The same
pattern repeats in the standing validators. Journeys are about to become the
primary profile and `unlocks` is the gating graph, so a silent type lie there is
a locked or unlocked stage that nobody can explain.

v2 validates every optional field it declares: `artifact` a string, `unlocks` an
array of strings, `scoring.dimensions` a non-empty array of strings, and the
standing profile's `count`, `period`, `goal_tool`, and `actual_tool` likewise.

### Close the two known gaps

Both were recorded on the canceled SAV-121 and both are still live:

1. **Targets have no comparator direction.** `revenue` and `retention` are
   "higher is better"; a wait-time target is "lower is better". With no
   direction, a 25-minute and a 4-minute wait score identically. Add optional
   `direction: gte | lte`, defaulting to `gte`.
2. **`cadence: daily` is a hard failure.** `validateRhythms` accepts only
   `weekly | monthly` and *throws*, rejecting the whole bearing rather than
   skipping the entry — so authoring a daily rhythm breaks the file. Add
   `daily`, with the reset anchor decided below.

### Validation runs at build time

Orchestra bakes raw file content and parses on demand. Compass bakes *parsed and
validated* bearings instead: `build-bearings.mjs` (M2) parses the YAML, runs
`parseBearing`, and writes plain objects into the generated module. A malformed
bearing then fails the build rather than a client's session, and the Worker ships
no YAML parser at all.

The bake script belongs to M2, but the seam it needs belongs here, which is why
two of the success criteria are about it: `parseBearing` must run under plain
Node with no bundler context, and its output must be JSON-serializable — no
class instances, no `Map`, no `undefined`-valued keys that vanish asymmetrically
on a round-trip. Both are true of the current implementation and both are easy
to break later without noticing, so they are pinned by tests now.

## Decisions

Recorded here rather than deferred; each changes the types, so none of them can
wait for the spec.

**1. `standing` stays in the schema.** Compass will own a profile it does not
serve, for one consumer that reads a hand-written JSON file — which looks like
dead weight. It stays anyway: the validator already exists and costs nothing to
carry, SAV-121's two fixes need a home, and ADR-001's "one vocabulary" claim is
the reason savvy can pin a version instead of forking a fifth implementation.
Retiring it would hand savvy its own format and re-open exactly the drift this
work item exists to close. Revisit only if a second product consumer never
appears.

**2. Removing `audience` is schema v2, and needs no migration path.** It is a
breaking change — the allow-list will reject any bearing carrying the key, which
would fail savvy's `business-plan.yaml` outright. That turns out to cost nothing,
because only two v1 bearings were ever authored: savvy's `business-plan.yaml`,
which SAV-155 deletes, and `fixtures/journey-example.yaml`, which moves here and
is updated as part of this work. The iOS app decodes `audience` from its own
JSON file, not from a bearing, and is untouched. So v2 ships without a
compatibility shim — but the spec records the version explicitly, because the
next consumer will not have the luxury of there being no data in the wild.

**3. `daily` resets on the client's local day.** A rhythm is lived by a person —
"post stories daily" resets when her day resets, not at UTC midnight, which would
land mid-afternoon for some clients and mid-evening for others. The schema
declares the anchor (`reset: local-day`) and the consumer resolves it against the
user's timezone; the loader validates the value and nothing more. This also makes
explicit something v1 left ambiguous for `weekly` and `monthly`, whose anchors
(`monday`, `first`) had the same unstated question — the spec now says all
cadence anchors are local to the consumer.

## Materials

| Deliverable | Location | Status |
|-------------|----------|--------|
| Bearing loader + validator | `packages/core/src/loader.ts` | Not started |
| Bearing types | `packages/core/src/types.ts` | Not started |
| Loader tests | `packages/core/src/loader.test.ts` | Not started |
| Serialization + Node-context tests | `packages/core/src/loader.test.ts` | Not started |
| Journey fixture (v2) | `packages/core/src/fixtures/journey-example.yaml` | Not started |
| Standing fixture (v2) | `packages/core/src/fixtures/standing-example.yaml` | Not started |
| Schema spec v2 (owned copy) | `.orchestra/work/compass-bearing-schema/spec.md` | Not started |

## References

- [ADR-001](../../adr/ADR-001-fork-the-orchestra-pattern.md) — the loader moves
  once; Compass owns the schema and consumers pin
- [ADR-002](../../adr/ADR-002-the-client-workspace-is-the-workspace.md) — what
  the server may and may not hold
- Source: `os/web/packages/compass/src/` in
  [savvy](https://github.com/mpazaryna/savvy), and
  `.orchestra/shared/work/compass-bearing-schema/spec.md` (the settled v1 schema)
- SAV-155 — savvy-side extraction; blocked until this ships
- SAV-121 (canceled) — the two validation gaps, recorded in its closing comment

## Notes

Copy, verify, then delete. Nothing is removed from savvy until the tests pass
here — the risk in this work item is losing the 335 lines, not breaking a build,
since savvy has no importers to break.

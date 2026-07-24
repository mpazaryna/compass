---
artifact: compass-bearing-schema
status: owned
schema_version: 2
owned_since: 2026-07-24
supersedes: SAV-77 (savvy os/web/packages/compass — deleted under SAV-155)
---

# The Bearing Schema (v2)

Compass owns this schema. Every other consumer — including savvy — pins a
version and consumes; schema changes happen here first (see repo `CLAUDE.md`,
"Ownership"). This document is the settled schema carried across from savvy's
SAV-77 and amended to v2. The authoritative implementation is
`packages/core/src/types.ts` (types) and `packages/core/src/parse.ts`
(validation); this document explains the intent and records what changed.

A bearing is **one vocabulary with two profiles**: a shared envelope plus a
`profile` discriminator (`journey | standing`).

## Shared envelope

| Key | Type | Required | Notes |
|-----|------|----------|-------|
| `bearing` | string | yes | slug id, unique, kebab-case |
| `name` | string | yes | human-facing name |
| `version` | integer | yes | consumers may pin; bump on breaking change |
| `profile` | `journey \| standing` | yes | discriminator |
| `source` | string[] | no | provenance; non-empty array of strings when present |
| `client` | string | no | client scope; absent means universal methodology |

**Strict allow-list.** Any top-level key that is neither in the envelope nor
allowed for the declared profile is a validation error naming the key — this is
what catches a `gate` in a standing bearing or a `cadence` in a journey bearing
instead of silently ignoring it. It is also how the removed v1 `audience` key is
rejected: it is simply no longer listed.

## Profile: `journey`

Compass runs it. Envelope plus:

- `mode?` — string[], e.g. `[build, extract]` (SAV-68's two postures).
- `stages` — non-empty array. Stage ids are **unique within a bearing**; a
  duplicate is an error, because a duplicate makes `unlocks` ambiguous.

Each stage:

| Key | Type | Required | Notes |
|-----|------|----------|-------|
| `id` | string | yes | unique within the bearing |
| `title` | string | yes | |
| `prompt` | string | yes | |
| `gate` | mapping | yes | `{ rule: string, requires_signoff?: boolean }` |
| `artifact` | string | no | |
| `unlocks` | string[] | no | gating dependency — listed ids stay locked until this passes |
| `scoring` | mapping | no | `{ dimensions: string[] }`, dimensions non-empty |

**Known gap (M2):** `unlocks` referential integrity — that a listed id names a
stage/bearing in the set — is not validated here, because resolving it requires
the whole bearing set, which is M2's concern.

## Profile: `standing`

The tracker holds it. Envelope plus `targets`, `rhythms`, `initiatives`.

**Target:**

| Key | Type | Required | Notes |
|-----|------|----------|-------|
| `id`, `label` | string | yes | |
| `target` | mapping | yes | `{ value: number, unit: string, period?: string }` |
| `actual` | mapping | yes | `{ source: string, goal_tool?: string, actual_tool?: string }` — `source: none` means no backend yet |
| `tier` | `A \| B \| C` | yes | |
| `direction` | `gte \| lte` | no in source | **materialised to `gte`** when absent |
| `confirmed` | boolean | yes | `false` while the value is unconfirmed |

**Rhythm:**

| Key | Type | Required | Notes |
|-----|------|----------|-------|
| `id`, `label` | string | yes | |
| `cadence` | `weekly \| monthly \| daily` | yes | |
| `reset` | string | yes | **paired with cadence**: weekly→`monday`, monthly→`first`, daily→`local-day` |
| `count` | number | no | target count per period |

All reset anchors are local to the consumer.

**Initiative:** `{ id, label, milestones: [{ id, label }] }`.

## Invariants

1. **Construct, don't cast.** Every parsed value is built field by field from
   validated values — an unvalidated field cannot ride through.
2. **Omit absent optionals.** An absent optional field is an omitted key, never
   `undefined`. The **single exception** is `direction`, whose default is
   materialised so consumers never re-implement it and disagree. Any second
   exception needs a reason written down.
3. **Plain data only.** No class instances, `Map`, `Set`, or `Date` in the
   output, so a parsed bearing survives `JSON.parse(JSON.stringify(...))`
   unchanged — M2 bakes parsed bearings into a generated module.

## Version history

### v2 (owned by Compass, 2026-07-24)

- **`audience` removed.** v1's visibility gate (mirrored the CEO-Hub
  `audience:` front-matter). A v2 bearing carrying it is rejected by the
  allow-list. iOS decodes `audience` from its own JSON, not from a bearing, so
  no bearing consumer depended on it.
- **`source` made optional** (still a non-empty array of strings when present).
- **`client` added** — optional client scope; consumed by M2's key-scoped
  serving. Absent means universal methodology.
- **`direction` added** to targets (SAV-121) — `gte | lte`, materialised to
  `gte` when absent.
- **`daily` cadence added** (SAV-121), and `reset` is now validated as the
  anchor paired with its cadence rather than accepting any string.
- **Stage id uniqueness** now validated within a journey bearing.

### v1 (SAV-77, in savvy — retired)

The original settled schema. Envelope required `audience` and `source`; targets
had no `direction`; cadences were `weekly | monthly` only and `reset` accepted
any string. Retired when the loader moved here; savvy's copy is deleted under
SAV-155.

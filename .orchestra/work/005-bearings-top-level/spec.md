---
ticket: SHE-18
status: complete
created_on: 2026-07-28
approved_on: 2026-07-28
---

# Bearings Live at the Top Level

> PRD: `.orchestra/work/005-bearings-top-level/prd.md`

## Objective

Move the served bearing set out of the server application to a top-level
`bearings/` directory, one folder per bearing (`bearings/<slug>/bearing.yaml`
plus a `README.md` for supporting context), and teach the bake to read that
shape. Structural only: the generated module the Worker imports must come out
byte-identical.

## Resolved open questions (from the PRD)

- **Layout:** `bearings/<slug>/bearing.yaml` + `bearings/<slug>/README.md`,
  mirroring Orchestra's `skills/<name>/` (SKILL.md + support files) and ADR-001's
  "content is served whole — its definition plus every support file."
- **Failure modes.** Home-per-bearing creates two new ways to be wrong, and both
  get an authoring-grade message (CLAUDE.md: validation messages are the
  authoring interface):
  | Mistake | Build says |
  |---|---|
  | `bearings/<slug>/` with no `bearing.yaml` | ``bearing home "<slug>" has no bearing.yaml — each bearing is a directory containing bearing.yaml`` |
  | a loose `*.yaml` at the top of `bearings/` | ``"<file>" sits loose in the bearings directory — a bearing lives at <slug>/bearing.yaml`` |
  | `bearing.yaml` fails schema | unchanged — the loader's existing message |
  The loose-file guard is the one deliberate addition. It catches the exact
  mistake this refactor invites: muscle memory from the flat layout, dropping a
  `.yaml` next to the folders where it would be silently ignored. Silent
  omission of a bearing is the worst outcome; failing the build is right.
- **Historical records:** `003-brand-builder/prd.md` and `spec.md` keep the old
  path. They record what was true when written and are closed.
- **Fixtures:** `packages/core/src/fixtures/` does not move — loader test data,
  never served.
- **Non-goals:** no schema change, no new tool, no served-content change, no
  client scoping.

## Approach

### Step 0 — Baseline (do-no-harm)

Record what must not change before touching anything:

```
pnpm -r test && pnpm -r typecheck
pnpm --filter @compass/mcp test:integration
shasum -a 256 apps/mcp-compass/src/bearings.generated.ts
```

The generated module's hash today is
`3c2609ae3342171796e47bae22201e33dcbe2d69bf9698b82ef7e82e369dbe56`. That hash is
the acceptance criterion for "nothing about any journey changes" — it is
gitignored build output, so the check is bake-before, bake-after, compare.

### Step 1 — Test first: the bake reads the top-level home

`test/bake.integration.test.ts`: repoint `bearingsDir` to
`resolve(app, '../../bearings')` and the deep-equal expectation to
`loadBearing(resolve(bearingsDir, 'brand-builder', 'bearing.yaml'))`.

Red — nothing is there yet.

### Step 2 — Move the content

`git mv apps/mcp-compass/bearings/brand-builder.yaml bearings/brand-builder/bearing.yaml`
(a real rename, so history follows the file). The YAML body is untouched,
including its draft-pending-Sheri header comment.

Author `bearings/brand-builder/README.md` — the context that had nowhere to go:
what the journey is for, where the stage structure comes from (SAV-68's front
stages), why the prompts are drafts and not Sheri's IP, and how to run it. Prose
*about* the bearing; nothing a client sees.

### Step 3 — Point the bake at the new home

`scripts/build-bearings.mjs`:
- default dir `resolve(here, '../../../bearings')` — resolved from the script's
  own location, so it holds under any cwd (`pnpm bake`, `wrangler deploy`, a
  subprocess in a test)
- scan directories, not a flat glob: `readdirSync(dir, { withFileTypes: true })`,
  keep directories, sort by name, `loadBearing(resolve(dir, slug, 'bearing.yaml'))`
- `COMPASS_BEARINGS_DIR` keeps overriding the root, now meaning "a directory of
  bearing homes"

Green on Step 1.

### Step 4 — Test first: the two new failure modes, then the guards

Fixtures, each its own root because the bake fails on the first problem it hits:
- `test/fixtures-bad/broken/bearing.yaml` — the existing malformed bearing,
  moved into a home (the current flat `broken.yaml` would now be a loose file
  and fail for the wrong reason)
- `test/fixtures-no-bearing/brand-builder/README.md` — a home someone started
  and never finished
- `test/fixtures-loose/loose.yaml` — the flat-layout muscle-memory mistake

Three subprocess tests, each asserting on the **message**, not merely that it
threw. Then implement the two guards in the bake.

### Step 5 — Documentation

`README.md:57` — "Bearings live in `apps/mcp-compass/bearings/`" becomes the
top-level home, and states the folder-per-bearing shape so the next author
doesn't have to infer it from the one example.

### Step 6 — Verify, deploy, re-verify

1. Re-bake; `shasum` must equal the Step 0 baseline exactly.
2. `pnpm -r test && pnpm -r typecheck`, then the integration suite.
3. `pnpm --filter @compass/mcp run deploy`.
4. `COMPASS_MCP_URL=<deployed> pnpm --filter @compass/mcp test:e2e` — passes
   **unmodified**, which is the point: the served product is untouched.
5. Manual: in the connected client, `list_bearings` still returns Brand Builder
   and `get_stage brand-builder/discovery` still returns the real prompt.

## Testing Strategy

### Unit Tests
- Files: `src/tools.test.ts` (unchanged)
- Covers: `handleTool` over fixture bearings
- Mocking: none — `handleTool` is pure
- Run: `pnpm --filter @compass/mcp test`
- Role here: **do-no-harm baseline only.** This work adds no runtime logic —
  every line changed is build tooling or content. The bake is `.mjs` (the
  CLAUDE.md build-tooling exception) and is exercised as a real subprocess
  against a real filesystem, which is the integration tier by definition.
  Extracting its scan into a unit-testable module to manufacture a unit test
  would add a TypeScript surface to build tooling that runs before the build —
  the honest tier is integration, and that is where the new tests go.

### Integration Tests
- Files: `test/bake.integration.test.ts`
- Covers: the bake against the real top-level `bearings/` (deep-equals
  `loadBearing` of `bearings/brand-builder/bearing.yaml`); the served
  Brand Builder still has both stages, the `unlocks` hand-off, and non-placeholder
  prompts; all three failure modes and their messages; no YAML parser reaches the
  Worker
- Mocking: nothing — real `readdirSync`, real `execFileSync` on the bake
- Run: `pnpm --filter @compass/mcp test:integration`
- Commit: test edits before the bake change

### E2E Tests
- Files: `test/connector.e2e.test.ts` — **no changes**
- Covers: the connector handshake against the deployed Worker, ending in
  `get_stage brand-builder/discovery` returning a real prompt
- Mocking: nothing
- Run: `COMPASS_MCP_URL=<deployed> pnpm --filter @compass/mcp test:e2e`
- That this file needs no edit is itself an acceptance criterion

## Deliverables

| File | Purpose | Status |
|------|---------|--------|
| `bearings/brand-builder/bearing.yaml` | The served bearing, moved (git rename) | Delivered |
| `bearings/brand-builder/README.md` | Supporting context for the bearing | Delivered |
| `apps/mcp-compass/scripts/build-bearings.mjs` | Scans bearing homes; guards both new failure modes | Delivered |
| `apps/mcp-compass/test/bake.integration.test.ts` | Expectations follow the move; three message assertions | Delivered |
| `apps/mcp-compass/test/fixtures-bad/broken/bearing.yaml` | Malformed bearing, rehomed | Delivered |
| `apps/mcp-compass/test/fixtures-no-bearing/brand-builder/README.md` | Home with no bearing | Delivered |
| `apps/mcp-compass/test/fixtures-loose/loose.yaml` | Loose YAML at the bearings root | Delivered |
| `README.md` | Front door points at the new home and states the shape | Delivered |

## Acceptance Criteria

### Functional
- [x] `bearings/` exists at the repository root; `apps/mcp-compass/bearings/` is gone
- [x] Brand Builder is `bearings/brand-builder/bearing.yaml` with a sibling `README.md`
- [x] `packages/core/src/fixtures/` is untouched
- [x] Adding a bearing requires only a new `bearings/<slug>/bearing.yaml` — no code edit
- [x] `README.md` names the top-level home and the folder-per-bearing shape

### Unit
- [x] `src/tools.test.ts` passes unchanged; `pnpm -r test` and `pnpm -r typecheck` green

### Integration
- [x] Baked set deep-equals `loadBearing(bearings/brand-builder/bearing.yaml)`
- [x] Served `brand-builder` still has `discovery` → `foundation` via `unlocks`, both prompts real
- [x] A malformed `bearing.yaml` fails the build, message names the missing field
- [x] A home with no `bearing.yaml` fails the build, message names the home and `bearing.yaml`
- [x] A loose `*.yaml` at the bearings root fails the build, message names the file and the expected location
- [x] `index.ts` / `tools.ts` still import no YAML parser and no `node:` builtin

### E2E
- [x] Re-baked `bearings.generated.ts` hashes to `3c2609ae3342…` — byte-identical
- [x] `connector.e2e.test.ts` passes **unmodified** against the deployed Worker
- [x] Manual: `list_bearings` and `get_stage brand-builder/discovery` unchanged in the client

## Dependencies

- M3 (`003-brand-builder`) — the bearing being moved
- `@compass/core` `loadBearing` — unchanged; still the build-time-only helper
- Cloudflare deploy access to the shared account for Step 6
- No new packages, no schema change, no `wrangler.jsonc` change (the bake writes
  into `src/`, which `main` already covers); `pnpm-workspace.yaml` globs are
  `packages/*` and `apps/*`, so a top-level `bearings/` is not mistaken for a
  workspace package

## Risks

| Risk | Mitigation |
|------|-----------|
| The bake resolves its default path wrongly from a different cwd (deploy, subprocess) | Path is resolved from the script's own `import.meta.url`, never cwd; the deploy in Step 6 and the subprocess tests both exercise a non-default cwd |
| A silent content change slips through the move | The byte-identical hash check against the Step 0 baseline is a hard acceptance criterion |
| Rename recorded as delete+add, losing history | `git mv`, verified with `git log --follow` on the new path |
| The move breaks the deployed instrument for a live journey | Deploy is a redeploy of identical served content; the unmodified E2E suite plus a manual client check confirm before calling it done |
| Future author drops a `.yaml` at the bearings root and it is silently ignored | The loose-file guard fails the build with a message naming the correct location |
| Three fixture roots drift from the real layout over time | Each fixture is minimal and its purpose is stated in a header comment; the malformed one keeps its existing comment |

## Notes

Almost none of this is code. Two guards in a build script, a rename, a README,
and a documentation line — the substance is that the repository's shape starts
telling the truth about what a bearing is. The hash check is what makes it safe
to say so: if the generated module is identical, the instrument did not change,
only the place its content is authored.

## Implementation notes — deviations from the plan

1. **The two guards landed with the directory scan, not after their tests.**
   Step 4 called for the failure-mode tests first. They are one file and one
   coherent change, so the scan and both guards were written together and the
   tests followed. Rather than claim an ordering that did not happen, each guard
   was **mutation-checked**: disabling the loose-file guard fails only
   `fails the build on a bearing left loose at the bearings root`, and disabling
   the missing-file guard fails only `fails the build on a bearing home with no
   bearing.yaml`. Both tests have teeth.
2. **The loose fixture was initially invalid** (missing the required `gate`), so
   its "valid on purpose" comment was untrue — the guard fires before the parser,
   so the test passed either way. Fixed in a follow-up commit: it now parses
   standalone, which is what makes the test meaningful. The build rejects it for
   its *location*, not its content.
3. **"No code change to add a bearing" was verified empirically**, not just
   asserted: baking a two-home fixture root with nothing else edited printed
   `baked 2 parsed bearings: brand-builder, second-engagement`.
4. **Deployed** to `https://compass-mcp-spike.mpazbot.workers.dev`
   (version `3bfc0c4a-6daf-49a3-aebf-38917a1265e0`). The E2E suite passed
   unmodified against it, and a direct probe confirmed `list_bearings` and
   `get_stage brand-builder/discovery` return exactly what they did before.

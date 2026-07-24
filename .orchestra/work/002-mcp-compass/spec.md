---
ticket: 002-mcp-compass
status: in-progress
created_on: 2026-07-24
approved_on: 2026-07-24
---

# MCP Server — Compass Serves Bearings Over a Connector

> PRD: `.orchestra/work/002-mcp-compass/prd.md`

## Objective

Promote the connector spike into the real M2 server: a Cloudflare Worker that
bakes **parsed and validated** bearings at build time and serves them over
Streamable HTTP, with a pure, testable tool layer and hand-written `initialize`
instructions — deployed to the shared account and reachable from Claude Desktop
as a custom connector. Phase 1 only: single-tenant, no auth (per the approved PRD;
per-client scoping is SHE-15/SHE-16).

## Resolved open questions

The PRD deferred three decisions to this spec. Settled:

1. **Tool surface:** `list_bearings`, `get_bearing(bearing)`, `get_stage(bearing,
   stage)`. `get_stage` is ADR-001's named divergence and gives M3 stage-level
   fetch to author against. The journey *engine* (gate evaluation, scoring,
   `next_stage`, session state) stays out — M2 serves bearings and stages, it
   does not run the loop. `get_stage` is journey-only; called on a standing
   bearing it returns an `isError` result.
2. **Bake shape:** `build-bearings.mjs` uses the build-time `loadBearing` to
   parse+validate each bearing and writes **plain parsed objects** into the
   generated module. The Worker imports that data plus types only (type-only,
   erased) — it ships **no YAML parser and no `parseBearing` at runtime**. A
   malformed bearing throws at build, failing the build. M1's serialization
   guarantee makes the embedded objects safe.
3. **Spike promotion:** the M2 implementation starts from `main` and folds in
   `apps/mcp-compass` from branch `spike/002-mcp-connector`, then refactors:
   extract a pure `handleTool`, replace the raw-string bake with
   `build-bearings.mjs`, add `get_stage`, and hand-write the `initialize`
   instructions.

## Approach

Ordered by dependency; each behavioural step is TDD (failing test first). The
spike's live endpoint is the baseline — the suite must reach parity before any
refactor changes behaviour.

### Step 1 — Promote the spike onto the impl branch

Branch `impl/002-mcp-compass` from `main`. Bring `apps/mcp-compass` and the
`@compass/core` `./types` subpath export across from `spike/002-mcp-connector`
(`git checkout spike/002-mcp-connector -- apps/mcp-compass packages/core/package.json`).
Add dev tooling for Worker tests: `@cloudflare/vitest-pool-workers`. Confirm the
existing spike suite/probe still green as the baseline (do-no-harm).

### Step 2 — Extract a pure `handleTool` (unit tier)

ADR-001's testing posture: `handleTool` is a pure synchronous function with no
I/O. Signature:

```ts
handleTool(name: string, args: Record<string, unknown>, bearings: Bearing[]): ToolResult
```

`ToolResult` is `{ content: [{ type: 'text', text: string }], isError?: true }`.
Unknown tool name is signalled to the caller (the handler maps it to a JSON-RPC
`-32602`), not returned as a `ToolResult`.

**Tests first** (`src/tools.test.ts`, unit — pure, no mocks needed):
- `list_bearings` returns slug/name/profile for every baked bearing
- `get_bearing` returns the full parsed bearing; unknown slug → `isError`
- `get_stage` returns a journey stage (prompt + gate); unknown bearing → `isError`;
  unknown stage id → `isError`; called on a standing bearing → `isError`
- unknown tool name → the sentinel the handler turns into `-32602`

### Step 3 — Bake parsed + validated bearings (integration tier)

`scripts/build-bearings.mjs`: read the served bearing set, `loadBearing` each
(parse + validate), write `src/bearings.generated.ts` exporting
`export const BEARINGS: Bearing[]` as plain objects. Delete the spike's
raw-string `bearings.generated.ts` path. The Worker imports `BEARINGS` and the
`Bearing` type only.

**Tests first** (`test/bake.integration.test.ts`, integration — real filesystem):
- running the bake against the real fixtures produces a module whose parsed
  objects deep-equal `loadBearing` of the same files
- a deliberately malformed bearing makes the bake **throw** (build fails)
- a source-scan asserting `src/index.ts` imports neither `yaml` nor
  `@compass/core/parse` (no runtime parser — the M2 analogue of M1's node-import
  guard)

### Step 4 — JSON-RPC handler wired to `handleTool` + `get_stage`

Refactor the spike's inline switch to call `handleTool`. Handler owns transport:
`initialize`, `tools/list` (now three tools), `tools/call` → `handleTool`,
`202` for notifications, JSON-RPC error codes, `GET`→405. No behaviour change to
transport; the new surface is `get_stage` in the tool list.

### Step 5 — Hand-written `initialize` instructions (product surface)

Replace any generic server info with instructions written for a **methodology
client** — what Compass is, that it serves bearings, how to list and open one.
Explicitly not "do software development" (ADR-001). Lives in `src/instructions.ts`
so it is reviewable as product copy.

### Step 6 — Worker integration + E2E tiers

- **Integration** (`test/worker.integration.test.ts`, `@cloudflare/vitest-pool-workers`):
  the Worker running in the real `workerd` runtime. POST `initialize`,
  `tools/list`, `tools/call` for each tool; assert responses, `202` for a
  notification, `405` on GET. Real transport boundary, no mocks.
- **E2E** (`test/connector.e2e.test.ts`): against a **running** Worker
  (`wrangler dev`, or the deployed URL via env) over real HTTP — the full
  connector-shaped sequence `initialize → notifications/initialized → tools/list
  → tools/call get_stage` — asserting the exact JSON-RPC shapes a client sees.

### Step 7 — Deploy + connector verification

`deploy` script = `build-bearings` + `wrangler deploy` to the shared account.
Verify the live endpoint with the E2E probe pointed at the deployed URL, then a
**manual** Claude Desktop connector check (add URL, list + open a bearing).
Record the deployed URL in the work item.

## Testing Strategy

TDD, three tiers; TypeScript/Cloudflare tooling. Default run is unit only;
integration and E2E are opt-in. Every behavioural step commits its test before
its implementation.

### Unit — `src/tools.test.ts`
`handleTool` in isolation over in-memory `Bearing[]`. Pure function; nothing
mocked because there is no I/O. Covers every tool's happy path and error paths
(unknown slug/stage, standing-vs-journey, unknown tool). Run: `pnpm --filter
@compass/mcp test`.

### Integration — `test/bake.integration.test.ts`, `test/worker.integration.test.ts`
Two real boundaries, no mocks at either:
- **Bake × real filesystem:** the generated module matches `loadBearing`;
  malformed input fails the build; no runtime YAML parser is imported.
- **Worker × real `workerd`:** `@cloudflare/vitest-pool-workers` runs the actual
  Worker; JSON-RPC over HTTP asserted against the real runtime.
Run: `pnpm --filter @compass/mcp test:integration`.

### E2E — `test/connector.e2e.test.ts`
The full user-facing surface: a running Worker over real HTTP, exercised exactly
as a connector would — the `initialize`→`tools/call` handshake end to end.
Points at `wrangler dev` locally or `$COMPASS_MCP_URL` when deployed. Run:
`pnpm --filter @compass/mcp test:e2e`. Plus the human connector check in Step 7.

### Do-no-harm
The M1 `@compass/core` suite (60 tests) is inherited and must stay green — the
bake depends on `loadBearing` and the serialization guarantee. Baseline run
before Step 2; no commit leaves any suite red.

## Deliverables

| Deliverable | Location | Status |
|-------------|----------|--------|
| Pure tool layer | `apps/mcp-compass/src/tools.ts` | Not started |
| Tool unit tests | `apps/mcp-compass/src/tools.test.ts` | Not started |
| Bake script (parsed+validated) | `apps/mcp-compass/scripts/build-bearings.mjs` | Not started |
| Bake integration tests | `apps/mcp-compass/test/bake.integration.test.ts` | Not started |
| JSON-RPC handler | `apps/mcp-compass/src/index.ts` | Spiked → refactor |
| `initialize` instructions | `apps/mcp-compass/src/instructions.ts` | Not started |
| Worker integration tests | `apps/mcp-compass/test/worker.integration.test.ts` | Not started |
| Connector E2E tests | `apps/mcp-compass/test/connector.e2e.test.ts` | Not started |
| Wrangler config (stateless) | `apps/mcp-compass/wrangler.jsonc` | Spiked |
| Deploy script | `apps/mcp-compass/package.json` | Spiked → extend |

## Acceptance Criteria

### Functional
- Three tools served: `list_bearings`, `get_bearing`, `get_stage`; `get_stage`
  on a standing bearing returns `isError`
- `initialize` instructions are hand-written for a methodology client (no SDLC
  language)
- `wrangler.jsonc` declares no KV, Durable Objects, R2, or D1 — stateless
- Deploys to account `01bfa3fc31e4462e21428e9ca7d63e98` via `pnpm run deploy`

### Unit
- `handleTool` covered for every tool, happy path and each error path, asserting
  on `isError` and message content
- `handleTool` is pure — no import of `node:`, `yaml`, or network in `tools.ts`

### Integration
- The baked module deep-equals `loadBearing` of the same fixtures
- A malformed bearing fails the build (bake throws)
- `src/index.ts` imports neither `yaml` nor `@compass/core/parse` (no runtime parser)
- The Worker answers `initialize`/`tools/list`/`tools/call` correctly in `workerd`;
  notification → `202`; GET → `405`

### E2E
- Against a running Worker over real HTTP, the `initialize → tools/list →
  tools/call get_stage` sequence returns the expected JSON-RPC shapes
- Manual: Claude Desktop connects to the deployed URL and lists + opens a bearing

## Dependencies

- M1 `@compass/core` (`loadBearing`, `Bearing` type, serialization guarantee) — shipped
- Spike `apps/mcp-compass` on `spike/002-mcp-connector` — the promotion source
- `@cloudflare/vitest-pool-workers`, `wrangler` — Worker test + deploy tooling
- Cloudflare auth (already logged in) for Step 7

## Risks

| Risk | Mitigation |
|------|-----------|
| Promoting the spike drifts into a rewrite | Reach spike parity (Step 1 baseline) before refactoring; each new behaviour is a new red test |
| `vitest-pool-workers` setup churn | It is the supported path for `workerd` tests; if it stalls, fall back to an E2E-only probe against `wrangler dev` and note the reduced integration coverage rather than mocking the runtime |
| Baked objects diverge from live parse | Bake uses the same `loadBearing`; an integration test deep-equals baked vs freshly loaded |
| "No runtime parser" regresses silently | Pinned by the source-scan test, like M1's node-import guard |
| Connector rejects the deployed shape | E2E asserts the exact handshake the spike already proved manually; manual Claude Desktop check is the final gate |

## Notes

E2E here is HTTP-level (an MCP endpoint, no browser), so Playwright's browser
driver is not used; the E2E probe is a real-HTTP `fetch` sequence against a
running Worker. The one irreducibly manual check is the Claude Desktop connector
add — automated coverage proves the protocol, the human step proves the product.

Gherkin is the next gate artifact after this spec is approved.

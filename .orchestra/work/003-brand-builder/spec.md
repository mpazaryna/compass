---
ticket: 003-brand-builder
status: approved
created_on: 2026-07-24
approved_on: 2026-07-24
---

# Brand Builder — A Bearing That Guides a Live Q&A

> PRD: `.orchestra/work/003-brand-builder/prd.md`

## Objective

Author a minimal two-stage Brand Builder journey bearing with real
question-set prompts, bake it into the M2 Worker as the served bearing, and
rewrite the `initialize` instructions so Claude Desktop *conducts* the journey —
proving live that Compass drives a person through a couple of Q&A rounds and a
gate.

## Resolved open questions (from the PRD)

- **Stages:** two — `discovery` → `foundation`. One gate passing + a hand-off.
- **Location:** the served bearing lives at `apps/mcp-compass/bearings/brand-builder.yaml`
  and is what the Worker bakes. The M1 `journey-example.yaml` / `standing-example.yaml`
  stay in `packages/core` as **schema-test fixtures only** (no longer served).
- **`mode` / `scoring`:** omitted — the proof needs neither.
- **Prompts:** drafted question sets, functional for a real exchange, labelled in
  a header comment as draft-pending-Sheri.

## The bearing

`apps/mcp-compass/bearings/brand-builder.yaml`, schema v2, `profile: journey`:

| Stage | id | Gate (`rule`, `requires_signoff`) | Artifact | `unlocks` |
|---|---|---|---|---|
| Four-Layer Discovery | `discovery` | all four layers answered and the owner confirms the synthesis; signoff | Discovery synthesis | `[foundation]` |
| Zone of Genius → Foundation | `foundation` | the owner accepts the foundation statement; signoff | Foundation statement | — |

Each `prompt` carries the **agent posture + a question set** the client asks the
person one exchange at a time — not a document generator. `discovery` walks four
short layers (what you do, who for, what makes you different, why it matters);
`foundation` surfaces the zone of genius and drafts a foundation statement.

## Approach

### Step 1 — Point the bake at the served bearing set
`build-bearings.mjs` default dir → `apps/mcp-compass/bearings/` (the
`COMPASS_BEARINGS_DIR` override stays for the malformed-fixture test). Update the
bake integration test's deep-equal expectation to the new served set.

**Test first:** `bake.integration.test.ts` — the baked set deep-equals
`loadBearing` of `apps/mcp-compass/bearings/*.yaml`.

### Step 2 — Author the bearing
Write `brand-builder.yaml` with the two stages above: real gates, `unlocks`,
artifacts, and drafted question-set prompts. It must validate (v2) and bake.

**Test first:** an integration assertion that the served `brand-builder` has two
stages, `discovery.unlocks` contains `foundation`, and every stage `prompt` is
real content — specifically **not** the placeholder ellipsis.

### Step 3 — Rewrite the `initialize` instructions to run the journey
This is the load-bearing change. The instructions must turn "here are tools" into
"run the journey with the person": choose a bearing, open the current stage with
`get_stage`, ask that stage's questions **one exchange at a time**, never answer
for the person, never skip ahead, and when the gate is satisfied confirm and move
on — producing the artifact only once the gate is met.

**Test first:** `worker.integration.test.ts` — the `initialize` instructions
mention running the journey / asking one question at a time and asking the person
(assert on the key phrases), and still avoid software-development language.

### Step 4 — Deploy and verify
`pnpm run deploy` to the shared account. E2E probe against the deployed URL:
`get_stage brand-builder/discovery` returns real content. Then the **manual**
proof: in Claude Desktop, start the bearing and confirm at least two Q&A
exchanges where Compass asks and the person answers, and the discovery gate is
reached before foundation opens.

## Testing Strategy

TDD three tiers; the human exchange is the one irreducibly manual check.

### Unit — `src/tools.test.ts`
Unchanged: `handleTool` is pure and tested over fixture bearings. No new unit
logic (M3 is content + copy, not new branching).

### Integration — `test/bake.integration.test.ts`, `test/worker.integration.test.ts`
Real boundaries: the bake against the real `apps/mcp-compass/bearings/` set; the
served `brand-builder` has two stages, the `unlocks` hand-off, and real (non
placeholder) prompts; the `initialize` instructions carry the run-the-journey
guidance. Run: `pnpm --filter @compass/mcp test:integration`.

### E2E — `test/connector.e2e.test.ts`
The handshake against a running Worker: `get_stage brand-builder/discovery`
returns a real prompt (asserted not to be the placeholder). Run:
`pnpm --filter @compass/mcp test:e2e`.

### Manual
In Claude Desktop, the actual Q&A — Compass asks the discovery questions one at a
time, the person answers, the gate is reached before `foundation`. The person's
answers cannot be automated; this is the real proof.

### Do-no-harm
M1 core 60 and the M2 unit/integration suites stay green; the only intentional
change is the served set (bake test updated to match) and the instructions
(worker test updated to match).

## Deliverables

| Deliverable | Location | Status |
|-------------|----------|--------|
| Brand Builder bearing (v2, 2 stages) | `apps/mcp-compass/bearings/brand-builder.yaml` | Not started |
| Bake reads the served bearing set | `apps/mcp-compass/scripts/build-bearings.mjs` | Not started |
| Journey-running `initialize` instructions | `apps/mcp-compass/src/instructions.ts` | Not started |
| Updated integration assertions | `apps/mcp-compass/test/*.integration.test.ts` | Not started |
| Updated E2E assertion (real prompt) | `apps/mcp-compass/test/connector.e2e.test.ts` | Not started |

## Acceptance Criteria

### Functional
- The served bearing set is `apps/mcp-compass/bearings/` (real `brand-builder`),
  not the `packages/core` fixtures
- `initialize` instructions direct the client to run the journey conversationally
  and contain no software-development language

### Unit
- Existing `handleTool` unit suite stays green (no new logic)

### Integration
- Baked set deep-equals `loadBearing` of the served bearing directory
- Served `brand-builder` has stages `discovery` and `foundation`;
  `discovery.unlocks` contains `foundation`
- No served stage `prompt` is the placeholder ellipsis
- `initialize` instructions assert on the run-the-journey phrasing

### E2E
- `get_stage brand-builder/discovery` over real HTTP returns a real prompt
- Manual: Claude Desktop runs ≥2 Q&A exchanges and reaches the discovery gate
  before `foundation` opens

## Dependencies

- M2 (`002-mcp-compass`) deployed — serves `get_stage` already
- Schema v2 / `@compass/core` — validates the bearing at bake time
- SAV-68 — the stage structure the drafted prompts follow

## Risks

| Risk | Mitigation |
|------|-----------|
| Drafted prompts get mistaken for Sheri's authored IP | Header comment marks them draft-pending-Sheri; PRD records the same |
| The client generates a document instead of running the Q&A | The instructions explicitly forbid answering for the person and skipping ahead; the manual check verifies real turn-taking |
| Changing the served set breaks M2 tests | The bake and worker integration tests are updated in the same steps; do-no-harm baseline run first |
| A person's answers can't be automated | The protocol is covered by E2E; the human turn-taking is the one manual gate, called out as such |

## Notes

M3 adds almost no new code — it is content (`brand-builder.yaml`) plus product
copy (`instructions.ts`) plus test assertions. The design lives in the prompts
and the instructions, which is the point: Compass is structured prompt delivery.

Gherkin is the next gate artifact after this spec is approved.

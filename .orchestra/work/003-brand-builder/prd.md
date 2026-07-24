---
ticket: 003-brand-builder
status: draft
created_on: 2026-07-24
---

# Brand Builder — Author the Real Bearing

## Problem

The `brand-builder` bearing Compass serves today is the M1 test fixture: two
stages, placeholder prompts (`"…agent posture / question set…"`). It proves the
schema and the server, but a client opening `get_stage discovery` gets a literal
ellipsis, not a discovery question. The real Brand Builder — SAV-68's eight gated
stages — has never been authored as a bearing; it lives only as a Linear
description. Until it does, M4 (Sheri runs a journey end to end and keeps the
artifacts) has nothing real to run.

## Objective

Author the real Brand Builder as a schema-v2 **journey bearing** — all eight
stages with SAV-68's gates, the gating graph that locks stages 5–8 until stage 4
signs off, and each stage's artifact — replacing the placeholder fixture and
served live through the M2 server.

## Success Criteria

- [ ] Eight stages, ids and titles matching SAV-68, each with its gate `rule` and
      `requires_signoff`
- [ ] The `unlocks` graph encodes SAV-68's core rule: no brand elements (stages
      5–8) until the stage-4 sign-off
- [ ] Each stage declares its artifact (the eight deliverables)
- [ ] The bearing validates against schema v2 and round-trips through the bake
- [ ] `get_stage` on the deployed server returns real stage content, not a
      placeholder, for every stage
- [ ] Stage ids are unique and every `unlocks` target names a real stage in the
      bearing (M1 left referential integrity to M2/here)

## Context

Serves **M3** (SHE-7) and unblocks **M4**. The runtime is done: M2 bakes and
serves journeys, `get_stage` is live. This work item is **authoring**, not
plumbing — the deliverable is content in the schema Compass owns.

**Source is SAV-68** (Savvy Linear, `tools-compass-1.0`). It provides the eight
stages, their gates, and the deliverables:

| # | Stage | Gate | Artifact |
|---|---|---|---|
| 1 | Four-Layer Discovery | all four layers answered + synthesis confirmed | Discovery synthesis |
| 2 | Zone of Genius → X Factors | foundation statement accepted | Foundation statement |
| 3 | Demographics + Psychographics | psychographic profile confirmed | Demo + psychographic profiles |
| 4 | Dream Client Profile + Brand Board | owner signs off, or loops back to 1–3 | Dream Client Profile + Brand Board |
| 5 | Brand Fusion | brand elements locked | Brand Fusion kit |
| 6 | Branded Pricing | pricing structure accepted | Branded pricing structure |
| 7 | Full Infusion | plan delivered | Activation plan |
| 8 | Social as Infusion | — (final) | — |

SAV-68's Durable-Object session model is **superseded** by ADR-001/ADR-002: the
bearing declares the methodology; the client holds the session. Nothing here
authors a state engine.

## The dependency this work item turns on

**The prompt bodies are Sheri's IP, and SAV-68 does not contain them.** Its own
open question reads: *"Voice & IP — Sheri's worksheets/language need to replace
v0 scaffolding. Where does source material live?"* So the eight stages'
*structure* (ids, titles, gates, unlocks, artifacts) can be authored faithfully
from SAV-68 now; the *prompt text* — the actual four-layer discovery questions,
the agent posture — cannot be, without her material.

This is a decision, not a detail, and it belongs to the human:

- **A — Author structure now, draft prompts from SAV-68's stage intent**, clearly
  marked as agent-drafted and pending Sheri's review. Unblocks M4 dogfooding
  immediately; the prompts get replaced with her voice later. *(Recommended: the
  structure is real and M4 needs something runnable; drafted prompts are honest
  scaffolding, not invented IP passed off as hers.)*
- **B — Block on Sheri's worksheets.** The bearing is authored only once her
  language exists, so every prompt is authentic from day one. Correct, but M4
  waits on material that has no known location yet.

Nothing about her voice should be fabricated and presented as authentic either
way — option A's prompts are labelled drafts.

## Materials

| Deliverable | Location | Status |
|-------------|----------|--------|
| Brand Builder bearing (v2, 8 stages) | `apps/mcp-compass/bearings/brand-builder.yaml` | Not started |
| Bake reads the served bearing set | `apps/mcp-compass/scripts/build-bearings.mjs` | Not started |
| Bearing validated + served (tests) | `apps/mcp-compass/test/` | Not started |

## References

- SAV-68 — Brand Builder v0 scaffold (Savvy Linear) — the eight-stage source
- [ADR-001](../../adr/ADR-001-fork-the-orchestra-pattern.md) — own `initialize`
  instructions; SAV-68 stays readable until authored here; DO session model retired
- [ADR-002](../../adr/ADR-002-the-client-workspace-is-the-workspace.md) — the
  client holds the session, not the server
- M2 (`002-mcp-compass`) — the deployed server that bakes and serves this
- Schema v2 — `.orchestra/work/compass-bearing-schema/spec.md`

## Notes — open questions for the spec

1. **Prompt sourcing (A vs B above).** The one decision that gates authoring.
2. **Where bearings live.** Proposed `apps/mcp-compass/bearings/`, baked into the
   Worker; the example fixtures stay in `packages/core` for schema tests. Confirm.
3. **Fixture vs real.** Does the real `brand-builder` replace the M1
   `journey-example.yaml`, or sit beside it (fixture kept for tests)?
4. **All eight now, or through the gate first.** Author all 8, or stages 1–4
   (through the sign-off gate) first and 5–8 after M4 validates the front half.
5. **`mode` and `scoring`.** SAV-68 doesn't specify Compass's `mode`
   (build/extract) or per-stage `scoring` dimensions — invent, omit, or defer.

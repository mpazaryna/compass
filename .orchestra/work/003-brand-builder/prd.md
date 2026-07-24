---
ticket: 003-brand-builder
status: draft
created_on: 2026-07-24
---

# Brand Builder — A Bearing That Guides a Live Q&A

## Problem

Compass serves bearings, but nothing has yet shown the point of a bearing: that
it can *drive a conversation*. The `brand-builder` fixture has placeholder
prompts, so opening it in Claude Desktop gives a client an ellipsis, not a
question. We do not yet know — end to end, in the real client — that Compass can
use a bearing to walk a person through a couple of question-and-answer rounds and
help them set their bearings.

## Objective

Author a **minimal** Brand Builder journey bearing — one or two stages whose
prompts actually pose questions — baked into the M2 Worker, and verify in Claude
Desktop that Compass uses it to guide a person through a couple of Q&A rounds.
The bearing drives the journey; the person does the answering; Compass plots the
course.

This is a proof of the *mechanism*, not the full methodology. SAV-68's eight
stages and Sheri's authentic voice stay future work.

## How it works — the loop runs in the client

The Q&A is conducted by **Claude Desktop's model, not the server** (ADR-001/002:
the server carries the method, the client carries the loop and its state):

1. The client connects and reads the `initialize` instructions.
2. It calls `get_bearing` / `get_stage` and reads a stage's `prompt`.
3. The prompt *is* the agent posture and question set — the client asks the
   person those questions, one exchange at a time, and holds the answers.
4. When the stage's gate is met, it moves on.

So **no new server capability is needed** — M2 already exposes `get_bearing` and
`get_stage`. M3 is authoring (the bearing content) plus tuning the `initialize`
instructions so the client knows to run the journey conversationally.

## Success Criteria

- [ ] A minimal `brand-builder` bearing (1–2 real stages) is baked into the
      Worker and served — `get_stage` returns real question-set prompts, no
      placeholder
- [ ] The `initialize` instructions tell the client to *run* the journey — ask
      the stage's questions, one exchange at a time, and check the gate
- [ ] In Claude Desktop, starting the bearing produces at least **two Q&A
      exchanges** where Compass asks and the person answers
- [ ] Compass guides rather than answers for the person — it poses the questions
      from the bearing, it does not fabricate the person's answers
- [ ] The bearing validates against schema v2 and round-trips through the bake

## Context

Serves **M3** (SHE-7), and is the first taste of **M4** (someone runs a journey).
The stage *structure* is grounded in SAV-68's front stages (Four-Layer Discovery,
then Zone of Genius → foundation), but the prompt bodies are drafted for function,
labelled as drafts pending Sheri — not passed off as her IP.

## Materials

| Deliverable | Location | Status |
|-------------|----------|--------|
| Minimal Brand Builder bearing (v2) | `apps/mcp-compass/bearings/brand-builder.yaml` | Not started |
| Bake reads the served bearing set | `apps/mcp-compass/scripts/build-bearings.mjs` | Not started |
| `initialize` instructions run the journey | `apps/mcp-compass/src/instructions.ts` | Not started |
| Bearing validated + served (tests) | `apps/mcp-compass/test/` | Not started |

## References

- SAV-68 — Brand Builder v0 scaffold (Savvy Linear) — stage structure source
- [ADR-001](../../adr/ADR-001-fork-the-orchestra-pattern.md) / [ADR-002](../../adr/ADR-002-the-client-workspace-is-the-workspace.md)
  — server carries the method, client carries the loop and state
- M2 (`002-mcp-compass`) — the deployed server; already exposes `get_stage`
- Schema v2 — `.orchestra/work/compass-bearing-schema/spec.md`

## Notes — open questions for the spec

1. **How many stages** — one is enough to prove a single Q&A; two proves a gate
   passing and a hand-off between stages. Proposed: **two** (Discovery, then
   Foundation).
2. **Fixture vs served bearing** — the real `brand-builder.yaml` lives in
   `apps/mcp-compass/bearings/` and is what the Worker bakes; the M1
   `journey-example.yaml` stays in `packages/core` as a schema test fixture only.
3. **`initialize` instructions** — this is the load-bearing change: they must
   turn "here are tools" into "run the journey with the person." Reviewed as copy.
4. **Prompt content** — drafted question sets, good enough to conduct a real
   exchange; explicitly labelled draft-pending-Sheri.

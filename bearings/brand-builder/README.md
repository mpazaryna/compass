# Brand Builder

A guided journey that takes a salon owner from a blank slate to a brand
foundation statement in their own voice.

`bearing.yaml` is the journey itself — what Compass serves. This README is
context *about* the journey, for whoever authors or revises it. Nothing here
reaches a client.

## What it does

Two gated stages, each one a question set the client's model asks **one question
at a time**:

| Stage | `id` | Gate | Artifact | Unlocks |
|---|---|---|---|---|
| Four-Layer Discovery | `discovery` | all four layers answered **and** the owner confirms the synthesis; sign-off required | Discovery synthesis | `foundation` |
| Zone of Genius to Foundation | `foundation` | the owner accepts the foundation statement; sign-off required | Foundation statement | — |

Discovery walks four short layers — Craft, Client, Difference, Why — and closes
by reflecting a synthesis back for confirmation. Foundation builds on that
synthesis to name the owner's zone of genius and draft a one-sentence promise in
their own words.

## Where the structure comes from

The stage structure follows SAV-68's front stages (Four-Layer Discovery, then
Zone of Genius → Foundation) — the first two of an eight-stage methodology.
Everything past `foundation` is future work.

## The prompts are drafts

**The prompt bodies are not Sheri's authored IP.** They were drafted for
function during M3 (`.orchestra/work/003-brand-builder/`) — good enough to
conduct a real exchange and prove the mechanism — pending her worksheets, which
is still an open question on SAV-68. The same warning sits in a header comment
on `bearing.yaml` so it travels with the file. Replace them with her language
when it lands; do not present them as hers in the meantime.

## How it runs

The server carries the method; the client carries the loop and the state
(ADR-001, ADR-002). Compass hands over a stage's prompt — it does not run a
model. The connected client reads that prompt as its posture and question set,
asks the owner those questions in turn, holds the answers in the owner's own
workspace, and only moves on once the gate is met. The order is the value: a
person who walks the stages earns the outcome.

## Editing this bearing

It validates against schema v2 (`.orchestra/work/compass-bearing-schema/spec.md`)
and is parsed at build time — a malformed change fails the build rather than a
client's session. After editing, `pnpm --filter @compass/mcp run deploy` bakes
and ships it. No code change is involved.

## References

- M3 work item — `.orchestra/work/003-brand-builder/` (PRD, spec, gherkin)
- Schema v2 — `.orchestra/work/compass-bearing-schema/spec.md`
- [ADR-001](../../.orchestra/adr/ADR-001-fork-the-orchestra-pattern.md) — content is served whole
- [ADR-002](../../.orchestra/adr/ADR-002-the-client-workspace-is-the-workspace.md) — the client's workspace holds the artifacts
- SAV-68 (Savvy Linear) — Brand Builder v0 scaffold, stage-structure source

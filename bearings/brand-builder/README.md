# Brand Builder

A guided journey that takes someone from a blank slate to a brand foundation
statement in their own words.

**Domain-neutral.** Brand foundation is the same method whatever the trade — a
salon, a software practice, a nonprofit. The bearing supplies the method; the
person supplies their world, from what they have already told the client about
their work. No prompt here names an industry, a workplace, or a role.

`bearing.yaml` is the journey itself — what Compass serves. This README is
context *about* the journey, for whoever authors or revises it. Nothing here
reaches a client.

## What it does

Two gated stages, each one a question set the client's model asks **one question
at a time**:

| Stage | `id` | Gate | Artifact | Unlocks |
|---|---|---|---|---|
| Four-Layer Discovery | `discovery` | all four layers — craft, client, difference, why — are answered, and the synthesis they accepted is the most recent version stated back to them; sign-off required | Discovery synthesis | `foundation` |
| Zone of Genius to Foundation | `foundation` | all three questions answered, and the foundation statement they accepted is the last one-sentence version they wrote themselves; sign-off required | Foundation statement | — |

Both gates state a condition that can be counted and leave the confirmation to
`requires_signoff`, per [ADR-004](../../.orchestra/adr/ADR-004-a-gate-states-a-countable-condition.md).
Both also require the **accepted version to be the latest** — a yes that arrives
with a correction attached does not close a stage. Two eval runs found the guide
closing discovery over an unapplied correction; the gate now has something to be
false about, and the prompt carries the matching revise-and-restate loop.

Discovery walks four short layers — Craft, Client, Difference, Why — and closes
by reflecting a synthesis back for confirmation. Foundation builds on that
synthesis to name their zone of genius and arrive at a one-sentence promise
**they write themselves** — the model asks, reflects it back as written, and
offers observations, but never drafts the sentence for them
(ADR-004's companion rule in `../AUTHORING.md`).

## Where the structure comes from

The stage structure follows SAV-68's front stages (Four-Layer Discovery, then
Zone of Genius → Foundation) — the first two of an eight-stage methodology.
Everything past `foundation` is future work.

## Where the prompts came from

**The prompt bodies are original and are nobody else's IP.** They were authored
here during M3 (`.orchestra/work/003-brand-builder/`) to conduct a real exchange
and prove the mechanism, and they have since been revised across seven rounds of
eval runs ([`EVAL-LOG.md`](EVAL-LOG.md)). Only the *stage structure* is borrowed,
from SAV-68's front stages.

They were originally labelled drafts pending a practitioner's worksheets. That
material is not coming — the engagement it belonged to is withdrawn — so these
are the prompts, not a placeholder for them. The one part of the old warning that
still binds: do not present them as any named practitioner's work. The same note
sits in a header comment on `bearing.yaml` so it travels with the file.

## How it runs

The server carries the method; the client carries the loop and the state
(ADR-001, ADR-002). Compass hands over a stage's prompt — it does not run a
model. The connected client reads that prompt as its posture and question set,
asks them those questions in turn, holds the answers in the person's own
workspace, and only moves on once the gate is met. The order is the value: a
person who walks the stages earns the outcome.

## Editing this bearing

It validates against schema v2 (`.orchestra/work/compass-bearing-schema/spec.md`)
and is parsed at build time — a malformed change fails the build rather than a
client's session. After editing, `pnpm --filter @compass/mcp run deploy` bakes
and ships it. No code change is involved.

The schema is all the build can check. Everything that makes the copy work — the
guards, the gates, the closing — is verified by running the bearing against both
personas (`pnpm --filter @compass/mcp run eval:journey`) and reading what comes
back. [`EVAL-LOG.md`](EVAL-LOG.md) records what each run found, what changed in
response, and what is still open; the house rules those runs produced live in
[`../AUTHORING.md`](../AUTHORING.md). Add an entry when you change the copy —
a run that is not written down is a lesson that has to be learned twice.

## References

- M3 work item — `.orchestra/work/003-brand-builder/` (PRD, spec, gherkin)
- Schema v2 — `.orchestra/work/compass-bearing-schema/spec.md`
- [ADR-001](../../.orchestra/adr/ADR-001-fork-the-orchestra-pattern.md) — content is served whole
- [ADR-002](../../.orchestra/adr/ADR-002-the-client-workspace-is-the-workspace.md) — the client's workspace holds the artifacts
- SAV-68 (Savvy Linear) — Brand Builder v0 scaffold, stage-structure source

---
id: ADR-004
status: accepted
created_on: 2026-08-04
---

# ADR-004: A Gate States a Countable Condition

## Context

ADR-002 settled how a gate operates: a stage is gated until its artifact's
frontmatter says `status: done`, and the human advances it by saying so in
conversation, with the agent writing the edit. It also named what that trades
away — a second reviewer, and an immutable record of who approved what — and
judged the trade acceptable "for a consulting engagement, where the client is the
sole stakeholder and the artifacts are hers."

That judgement was made while the consultant was still in the room. M4 removes
him. The user works alone, on their own device, on their own time, and the only
thing standing between them and a document they have not earned is a sentence of
prose in a YAML file.

The mechanics matter here. **Compass never evaluates a gate.** It hands over the
stage's `rule` as a string; the model in the client reads it and decides whether
it has been met. So a gate is only as strong as a model's willingness to hold it
against a person who wants to move on — and a model's disposition is to be
agreeable and to finish.

The bearing already in the catalog shows the failure mode. Brand Builder's gates
read *"all four layers answered AND the owner confirms the synthesis"* and *"the
owner accepts the foundation statement."* The first half of the first one is
sound: four layers is a count, and a model can verify it. Everything else is
self-attestation — satisfiable by agreement, which is exactly what an unattended
client and an accommodating model will produce. The same rule also duplicates
`requires_signoff: true`, which sits directly beneath it.

## Decision

**A gate's `rule` states a condition that can be counted or compared. The
`requires_signoff` flag carries the confirmation. Neither restates the other.**

A conforming `rule` demands at least one of:

- **A quantity**, with its unit — a figure from the user's own records.
- **An enumeration meeting a stated minimum** — three causes, four layers, one
  change per stage.
- **A commitment carrying a date** — an action with a deadline attached.
- **A comparison against a named external standard** — a rebooking rate against
  a published benchmark, or a sequence rule such as Goldratt's *exploit before
  elevate*.

A `rule` may not be satisfied by the client confirming, accepting, agreeing,
feeling ready, or understanding. Those are dispositions, not conditions. Where
confirmation is genuinely wanted, that is what `requires_signoff` is for.

The test to apply while authoring: *could a model verify this without asking the
user's opinion?* If not, it is not a gate.

## Consequences

- Some territory becomes harder to author, and that is the intended pressure.
  A stage whose completion cannot be counted is usually a stage whose question is
  too vague. The response is to find the countable proxy, not to soften the rule.
- Gate strings get longer and less elegant. Accepted. The capstone's gate — every
  scoreboard row carries a baseline, a target and a date; every checklist line
  carries a deadline — is verifiable by a model in one pass, and that is worth
  more than brevity.
- **Brand Builder's two gates do not conform.** They are content, so under
  ADR-003 bringing them into line is a copy edit and a re-review, not a work
  item. It should happen, and it does not block anything.
- `requires_signoff` gains a clear meaning it did not have. Previously it
  overlapped whatever the rule said; now it is the only place confirmation is
  expressed.
- This constrains the schema only by convention, not by validation. A malformed
  gate still parses. Enforcement is copy review against `bearings/AUTHORING.md` —
  which is a real limit, and the honest alternative (validating prose) is not
  available.
- The `initialize` instructions should say plainly that the gate is to be held,
  not negotiated. They currently say "hold the line," which is the right
  sentiment and worth strengthening now that there is a rule behind it.

## References

- [ADR-002](ADR-002-the-client-workspace-is-the-workspace.md) — the gate
  mechanism this constrains, and the trade it accepted
- [ADR-003](ADR-003-bearings-are-reviewed-as-copy.md) — why conformance is
  enforced by copy review rather than by a compiler
- `bearings/AUTHORING.md` — the admissible gate forms, with examples
- `.orchestra/work/004-engagement/` — the engagement that removes the consultant
  from the room, and the research supplying two external standards to gate
  against

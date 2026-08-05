---
id: ADR-003
status: proposed
created_on: 2026-08-04
---

# ADR-003: Bearings Are Reviewed as Copy, Not Built as Code

## Context

`CLAUDE.md` binds this repository to the Orchestra SDLC and its gates: every work
item has a PRD before a spec, a spec before implementation, and nothing advances
without explicit human approval at each gate. That is correct for the Worker, the
loader, the bake, and the schema. It has never been tested against the thing this
repository exists to produce.

A bearing is not code. It is a question set — prose addressed to a model, an
ordered set of questions, a gate rule, an artifact name. SHE-18 moved bearings to
the repository root precisely so that authoring one would be "visibly an act of
authoring content rather than of editing an application," and the roadmap's one
satisfied success criterion is that authoring an engagement is a bearing file,
not a code change. If it is not a code change, requiring the code workflow
contradicts the claim.

The cost is not hypothetical. M4 scopes six bearings. Six PRD → spec → gherkin
cycles for six prose documents would produce more process artifacts than content,
and the specs would say little beyond restating the prompts.

There is already a precedent in this repository for the other treatment.
`instructions.ts` carries a comment on its first line: *"product copy, not code…
Reviewed as copy, kept hand-written per instrument."* That file is the product
surface, it is hand-authored, and it is reviewed by reading it rather than by
specifying it. Bearings are the same kind of artifact, in larger quantity.

## Decision

**A bearing is authored content and is reviewed as copy.** It does not get a
spec or a gherkin spec. It gets a content brief and a copy review, and it must
pass the bake.

The line is the file system, which is what SHE-18 bought:

- **Anything under `bearings/`** — a `bearing.yaml`, its `README.md`, its support
  files — is content. Content brief → author → copy review → merge.
- **Anything else** — the Worker, the loader, the schema, the bake, the
  `initialize` instructions — is code and keeps the full Orchestra SDLC and its
  gates, unchanged.

A work item may contain both. M4 does: authentication and the curriculum
mechanism are code and get a spec; the six bearings are content and get briefs.
The two tracks share a PRD and diverge after it.

**Copy review is required, not optional.** It is a different review from a code
review, asking different questions — does the prompt address the model rather
than the client, does it ask one question at a time, does the gate state
something countable, does any stage start explaining instead of asking. Those
criteria live in `bearings/AUTHORING.md`, which is the reviewer's checklist as
much as the author's guide.

## Consequences

- The catalog can grow at the speed of writing rather than the speed of
  engineering. This is the point; it is also what makes a curriculum per client
  economically possible.
- A bearing still cannot ship broken. The bake validates every bearing at build
  time and a malformed one fails the build rather than a client's session —
  that guard is unchanged and is what makes the lighter path safe.
- What is given up is the gherkin-level record of intent for content. Accepted:
  the bearing *is* the specification of its own behaviour, and a spec restating
  it would be a second source of truth that drifts.
- The risk this introduces is unreviewed prose reaching a client, since no
  compiler catches a leading question or a soft gate. The mitigation is that copy
  review is a required step with a written checklist, not a glance.
- Whoever authors need not be an engineer. That was already the intent of SHE-18;
  this makes the workflow match it.
- A change that touches both tracks — for example, a schema field that only
  exists to serve new content — is code. When in doubt, it is code.

## References

- [ADR-001](ADR-001-fork-the-orchestra-pattern.md) — content is served whole
- [ADR-002](ADR-002-the-client-workspace-is-the-workspace.md) — the artifacts are
  the client's, and the bearing stays server-side
- [ADR-004](ADR-004-a-gate-states-a-countable-condition.md) — what copy review
  checks a gate against
- 005 (`.orchestra/work/005-bearings-top-level/`) — moved bearings out of the
  application, making this line drawable
- `apps/mcp-compass/src/instructions.ts` — the existing "reviewed as copy"
  precedent
- `bearings/AUTHORING.md` — the house style and the review checklist

---
id: ADR-002
status: accepted
created_on: 2026-07-20
---

# ADR-002: The Client's Workspace Is the Workspace

## Context

ADR-001 inherited Orchestra's ADR-003 by citation and then flagged the one place
the inheritance is not obvious. ADR-003 says the repository is the workspace, the
state store, and the gate surface, and it justifies that with a sentence about
artifacts: they "must live where they can be reviewed, diffed, and executed." It
was written after a Durable Object ran its own model loop and wrote source code
into DO-local SQLite — a workspace with no git, no test runner, and no repository.
That app was deleted the same day it was demoed.

Compass's first delivery target is a Claude Desktop / Cowork workspace belonging
to a salon owner. It has files. It has no git, no branches, no pull request, no
test runner, and no diff. Read literally, ADR-003's justification does not apply
to it. Read for intent, the question is whether *git* was the load-bearing part
or whether *the artifacts living on the client's side of the wire* was.

The blocking fact has now been confirmed: **Cowork workspace files persist across
sessions**, and MCP tool output can be written into them. Without that property
the stateless design fails and server-held state returns as an open question. It
holds, so it does not.

## Decision

**The client's workspace is the workspace.** ADR-003's principle extends; git was
sufficient, not necessary.

What ADR-003 was actually defending against was a cloud component that held the
artifacts and ran the model loop. Both stay out under this reading. The server is
stateless: it serves bearings and returns content for the client to write, exactly
as Orchestra's `orchestra_devlog_entry` and `orchestra_scaffold` return
`{path, content}` rather than persisting anything. No KV, no Durable Objects, no
R2, no artifact storage, no model loop.

### What persists, and where

Everything a journey needs to resume is a file in the client's workspace. The
server holds nothing about any engagement.

- **Artifacts** are markdown documents — a foundation statement, a positioning
  summary, a plan. They are the deliverable. The client owns them, reads them,
  and edits them.
- **Stage state** is frontmatter on the artifact, following Orchestra's
  convention (`status: draft | review | done`). Progress is derived by reading
  the files, never by consulting the server.
- **The client's answers** live in the artifact that captured them. They are
  never transmitted to or stored by the server.

Artifacts land in a plain, visible `compass/<bearing>/` directory, one file per
stage, named so the order is obvious in a file listing:

```
compass/brand-builder/
  01-discovery.md
  02-value-proposition.md
  …
```

Not a dot-directory. Orchestra hides `.orchestra/` because its audience is
engineers who expect tooling to be out of the way; Compass's audience is a
business owner for whom these files *are* the product. Hiding them would be
hiding the thing she paid for.

### Gates

An Orchestra gate is approved by a commit; the next run reads it and resumes.
That mechanism is unavailable here, so the gate is expressed the only way a
plain workspace allows: a stage is gated until its artifact's frontmatter says
`status: done`, and the human advances it by saying so in conversation, with the
agent writing the edit. The gate still blocks, and a human still decides — what
is lost is a second reviewer and an immutable record of who approved what.

For a consulting engagement, where the client is the sole stakeholder and the
artifacts are hers, that is an acceptable trade. It would not be acceptable for
code.

### Bearings remain server-side

The bearing itself — stages, prompts, gates — is never written into the client
workspace. It is fetched per stage. Methodology stays on the server where it can
be corrected and versioned; only its output lands on the client's disk. This is
also what keeps client-scoped serving (ADR-001) meaningful: a client who never
receives the bearing file cannot accumulate one.

## Consequences

- The stateless design in ADR-001 is confirmed rather than provisional. M2 is
  unblocked.
- Savvy's ADR-005, which modelled a journey as a Durable Object holding per-step
  state, is superseded on the runtime question. Its ontology — bearing as a
  direction held, journey as a workstream that terminates, steps typed by owner —
  survives intact and remains the vocabulary.
- **A lost workspace loses the engagement's answers.** There is no server-side
  copy and no backup, by design. The bearing is always reproducible from the
  server and the artifacts are ordinary files the client can copy anywhere, so
  what is genuinely at risk is her input between sessions. The mitigation is
  that artifacts are visible documents she can keep, not hidden state — plus, at
  M4, telling her plainly that the folder is the deliverable.
- Journeys cannot advance while the client is away. Orchestra's AFK work assumes
  a scheduler and a checkout; Compass has neither, and the agent-typed steps in
  Savvy's ADR-005 (dispatch a generator, wait at an approval gate) are out of
  scope until something owns a loop. This is a real capability that this decision
  gives up, and it should be revisited only by a new ADR, not by drift.
- Any future proposal to hold engagement state server-side must clear the bar
  ADR-003 set and this one keeps: it may hold state about the journey, never the
  journey's artifacts, and never its own model loop.
- The tool surface follows from this. `compass_get_stage` returns the stage
  prompt plus the target path and frontmatter template for the artifact the
  client is about to write. Nothing in the protocol acknowledges a session.

## References

- Orchestra ADR-003: The Repo Is the Workspace —
  https://github.com/mpazaryna/orchestra
- ADR-001: [Compass Forks the Orchestra Pattern](ADR-001-fork-the-orchestra-pattern.md)
- Savvy ADR-005 (journeys as Durable Objects) — runtime conclusion superseded,
  ontology retained

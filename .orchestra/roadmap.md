---
status: active
created_on: 2026-07-20
updated_on: 2026-08-05
---

# Compass Roadmap

**Objective:** Someone sits down in a chat client, works through a bearing with
Compass, and walks away with real artifacts in their own workspace — while the
same instrument, pointed at a different bearing, serves the next engagement
without being rewritten.

## Success Criteria

- [ ] The bearing schema has exactly one owner and one implementation
- [ ] A client connects a chat client to a deployed endpoint and gets only their own bearings
- [ ] A journey runs across more than one session — stages completed earlier stay completed
- [x] Authoring a new engagement is a bearing file, not a code change
- [ ] A person outside this project completes a journey end to end and keeps the artifacts

The last criterion no longer names anyone. It is deliberately kept: every run so
far has been two models talking to each other in `eval:journey`, and a
methodology instrument that no person has walked is unvalidated in the one way
that matters. Who that person is, and when, is open.

## Context

Compass has been implemented four times and the schema drifted each time
(ADR-001). This repository is the fifth and last: the loader moves here once,
Savvy deletes its copy, and every other consumer pins a version.

The runtime is settled by inheritance rather than invention. Orchestra proved a
deployed knowledge-worker MCP server in production — content baked at build
time, no database, no model loop, the client's workspace holding all state.
Compass forks that pattern with bearings where Orchestra has skills. What
remains is genuinely small: the plumbing is ~200 lines of proven code, the
loader already exists, and the work is bearings and client scoping.

## Milestones

| Milestone | Location | Status |
|-----------|----------|--------|
| M1: Loader lifted and owned | .orchestra/work/001-loader/prd.md | Done |
| M2: MCP server deployed | .orchestra/work/002-mcp-compass/prd.md | Done |
| M3: Brand Builder bearing | .orchestra/work/003-brand-builder/prd.md | Done |
| M4: Authenticated, client-scoped, resumable | needs a PRD | Not started |

M1 blocks the deletion in SAV-155 — nothing leaves savvy until the loader passes
its tests here.

**M4 was the first engagement — a named client and a five-bearing curriculum.
That is withdrawn.** The engagement is not happening, and the curriculum is not
being authored; `.orchestra/work/004-engagement/` is marked superseded and kept
for its research rather than deleted.

What M4 carried that still stands is the platform work, which was never
client-specific: authentication on the deployed endpoint, client scoping so a
connection sees only its own bearings, and a journey that survives across
sessions. Those serve two open success criteria on their own and need a PRD of
their own. They were bundled into an engagement because an engagement made them
unavoidable; the need does not disappear with it.

## Structural work

Work that serves a success criterion directly rather than a milestone.

| Work item | Location | Status |
|-----------|----------|--------|
| 005: Bearings live at the top level (SHE-18) | .orchestra/work/005-bearings-top-level/prd.md | Done |

005 makes "authoring a new engagement is a bearing file, not a code change"
literal: bearings moved to a repo-root `bearings/<slug>/`, out of the server
application. It landed ahead of any new bearing being authored, so the next one
starts in the shape that will hold rather than being moved afterward — which is
still true now that the curriculum it was sequenced against is withdrawn.

## References

- ADR-000: [The Score](adr/ADR-000-the-score.md)
- ADR-001: [Compass Forks the Orchestra Pattern](adr/ADR-001-fork-the-orchestra-pattern.md)
- ADR-002: [The Client's Workspace Is the Workspace](adr/ADR-002-the-client-workspace-is-the-workspace.md)
- ADR-003: [Bearings Are Reviewed as Copy](adr/ADR-003-bearings-are-reviewed-as-copy.md)
- ADR-004: [A Gate States a Countable Condition](adr/ADR-004-a-gate-states-a-countable-condition.md)
- `bearings/AUTHORING.md` — house style for bearings, and the copy-review checklist

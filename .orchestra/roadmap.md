---
status: active
created_on: 2026-07-20
updated_on: 2026-07-20
---

# Compass Roadmap

**Objective:** A salon owner sits down in a chat client, works through the Brand
Builder with Compass, and walks away with real artifacts in her own workspace —
while the same instrument, pointed at a different bearing, serves the next
engagement without being rewritten.

## Success Criteria

- [ ] The bearing schema has exactly one owner and one implementation
- [ ] A client connects a chat client to a deployed endpoint and gets only their own bearings
- [ ] A journey runs across more than one session — stages completed earlier stay completed
- [ ] Authoring a new engagement is a bearing file, not a code change
- [ ] Sheri completes at least one journey end to end and keeps the artifacts

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
| M2: MCP server deployed | .orchestra/work/002-mcp-compass/prd.md | Gherkin approved — implement next |
| M3: Brand Builder bearing | .orchestra/work/003-brand-builder/prd.md | PRD draft |
| M4: First engagement (Savvy Hair Loft) | .orchestra/work/004-engagement/prd.md | Not started |

M1 blocks the deletion in SAV-155 — nothing leaves savvy until the loader passes
its tests here.

## References

- ADR-000: [The Score](adr/ADR-000-the-score.md)
- ADR-001: [Compass Forks the Orchestra Pattern](adr/ADR-001-fork-the-orchestra-pattern.md)
- ADR-002: [The Client's Workspace Is the Workspace](adr/ADR-002-the-client-workspace-is-the-workspace.md)

---
ticket: SHE-18
status: approved
created_on: 2026-07-28
approved_on: 2026-07-28
---

# Bearings Live at the Top Level

## Problem

The roadmap promises that "authoring a new engagement is a bearing file, not a
code change." The repository's shape says otherwise. The bearings a client
actually receives sit *inside* the server application, filed among its source,
its build scripts, and its tests. Anyone opening this repository to author an
engagement — and the point of Compass is that this need not be an engineer —
has to go hunting inside an application to find the content, past a lot of
material that signals "this is machinery, don't touch it."

The cost is not only navigational. Compass is a deliberate fork of a working
archetype in which authored content sits at the top of the repository,
unmistakably separate from the code that serves it. Compass copied the serving
pattern but not the shape. So the two repositories read differently to anyone
moving between them, and the fork's central claim — that this pattern is
repeatable, that a second instrument proves it — is quietly undercut by the
divergence.

There is also nowhere to put what a bearing accumulates. A bearing today is one
file and nothing else. As an engagement matures it gathers rationale, source
references, notes on why a stage is gated the way it is — context *about* the
journey that is not part of the journey definition and does not belong in the
prompts a client will read. With no home for that material it either goes
missing or gets crammed into comments at the top of the file, where it competes
with the content the instrument actually serves.

## Objective

Authored bearings sit at the top level of the repository, each with its own home
and room for the material that explains it — so that adding an engagement is
visibly an act of authoring content rather than of editing an application.

## Success Criteria

- [ ] Someone opening the repository for the first time finds the bearings
      without opening the server application
- [ ] Each bearing has its own home, holding its definition alongside the
      supporting context that explains it; the Brand Builder's home explains
      itself in prose
- [ ] Adding a new bearing is done entirely by adding content in that place —
      it requires no code change
- [ ] A connected client sees exactly what it saw before: the same bearings, the
      same stages, the same prompts, the same gates. Nothing about any journey
      changes.
- [ ] The repository's own front-door documentation points at the new home
- [ ] The result is confirmed against the live deployed instrument, not only in
      tests

## Context

This serves the roadmap criterion "Authoring a new engagement is a bearing file,
not a code change," and it is worth doing now, immediately before **M4 (SHE-8,
first engagement)**, for two reasons. M4 is the first time bearing content is
authored under real delivery pressure; doing the move afterward means moving
live engagement material instead of one proof-of-concept file. And the second
bearing is the moment the missing supporting-context problem becomes concrete —
two bearings with no room to explain themselves is where drift starts, and drift
is the one failure this repository exists to prevent.

The cost of not doing it is small today and compounds: every engagement authored
under the current shape is one more thing to move later, and every one of them
teaches the next author that bearings are part of the application.

This work changes no behavior. It is structural only — the same content, served
identically, from a place that matches what it is.

## Materials

| Deliverable | Location | Status |
|-------------|----------|--------|
| Top-level home for authored bearings | `bearings/` | Not started |
| Brand Builder in its own home | `bearings/brand-builder/` | Not started |
| Brand Builder's supporting context | `bearings/brand-builder/README.md` | Not started |
| Baking reads the new home | `apps/mcp-compass/scripts/` | Not started |
| Test expectations follow the move | `apps/mcp-compass/test/` | Not started |
| Front-door documentation updated | `README.md` | Not started |

## References

- Roadmap: [`.orchestra/roadmap.md`](../../roadmap.md) — "Authoring a new
  engagement is a bearing file, not a code change"
- [ADR-001](../../adr/ADR-001-fork-the-orchestra-pattern.md) — the fork, and
  "content is served whole: its definition plus every support file"
- M3 (`003-brand-builder`) — authored the bearing being moved
- SHE-18 (Linear, Shed / Compass) — thin pointer to this work item
- Orchestra `skills/` — the top-level authored-content shape being mirrored

## Notes — open questions for the spec

1. **The malformed-bearing check.** The build is proven to fail on an invalid
   bearing by pointing it at a deliberately broken one. A home-per-bearing
   layout changes the shape that check depends on, and it introduces a new way
   to be wrong — a home with no bearing in it. The spec decides what the
   instrument says in that case; the message is the authoring interface.
2. **Historical records.** Closed work items name the old location. Proposal:
   leave them untouched — they record what was true when written.
3. **Schema-test fixtures stay put.** The example bearings under the core
   package are loader test data, never served, and do not move.
4. **Work item number.** Taking `005`; `004` is reserved by the roadmap for the
   M4 engagement.

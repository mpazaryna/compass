# CLAUDE.md

Compass is a bearing-driven methodology instrument served over MCP. Read
`.orchestra/roadmap.md` and `.orchestra/adr/ADR-001-fork-the-orchestra-pattern.md`
before working on anything here — ADR-001 explains what was copied from
Orchestra, what is inherited by citation, and where this repo deliberately
diverges.

## Two vocabularies

This repo *builds* Compass and is *developed with* Orchestra. Both use the word
"stage": an Orchestra stage is an SDLC step (prd, spec, …); a Compass stage is a
step inside a journey bearing. Check the context before assuming which is meant.

## Constraints inherited from Orchestra

- **The server carries the method; the client carries the state.** No database,
  no Durable Objects, no artifacts held server-side, no model loop in the cloud.
  A Worker may hold state *about* a journey, never the journey's artifacts.
- **Content is served whole.** Bearings and their support files are fetched by
  name; never flatten a bearing into a single blob for transport.
- Workers have no filesystem. Content is baked into a generated module at build
  time; `parseBearing(string)` is the Worker entry point and `loadBearing(path)`
  is a build-time-only helper.

## How code gets written here

- **TypeScript.** No JavaScript source. The one exception is build tooling —
  Orchestra's `build-skills.mjs` precedent — which is `.mjs` because it runs
  before a build exists.
- **Test-driven, always.** A failing test first, then the code that passes it.
  This is not negotiable per work item and does not need re-deciding in each
  spec. Negative tests assert on the error *message*, not just that it threw:
  validation messages are the authoring interface for anyone writing a bearing
  by hand.
- Strict compiler settings, including `exactOptionalPropertyTypes` — an absent
  optional field is an omitted key, never a key set to `undefined`. Parsed
  bearings get embedded in generated modules, so they must survive a JSON
  round-trip unchanged.

## Ownership

Compass owns the bearing schema. Every other consumer — including savvy — pins a
version and consumes. Schema changes happen here first.

## Orchestra SDLC — required workflow

This project follows the Orchestra SDLC, served by the `orchestra-sdlc` MCP
server. The `.orchestra/` directory is the agent knowledge base.

Before starting any non-trivial work:

1. Call `orchestra_list_skills` to see the available playbooks.
2. Call `orchestra_get_skill` for the relevant activity (PRD, spec, gherkin,
   implement, review, merge, …) and follow it as the playbook.
3. Respect the gates (`orchestra_get_gates`): every work item has a PRD before
   a spec, a spec before implementation. Nothing advances without explicit
   human approval at each gate.

Record sessions with `orchestra_devlog_entry` (write the returned file), and
record significant decisions as ADRs in `.orchestra/adr/`.

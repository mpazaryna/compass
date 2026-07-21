---
created_on: 2026-07-21
---

# 2026-07-21: M1's Gherkin Gated, and a Shed to Keep the Work In

## Summary

M1's gherkin was authored, reviewed, and approved — the last gate artifact before
the loader implementation. Mid-session the work took a deliberate detour into
tooling: the `orchestra-sdlc` MCP server was promoted to user scope so it loads in
every session, and a new Linear workspace (`workshed`) was stood up as the human
organizing layer for the solo "me + agents" projects. Compass and Orchestra now
live as projects there. The principle that governs it — `.orchestra/` is the
agents' source of truth, Linear is the humans' view — was recorded in CLAUDE.md
and in session memory. Implementation is queued for tomorrow.

## What Happened

- **Gherkin authored** (`.orchestra/work/001-loader/gherkin-spec.md`) from the
  approved spec, following the `orchestra-gherkin` skill read off disk (the MCP
  wasn't connected yet). Five features from the spec's eight steps; step 1 has no
  behaviour, step 8 is a document deliverable.
- **Reviewed against `types.ts` and the acceptance criteria**, two passes. First
  pass caught four issues (missing optional-field coverage, disguised outlines, a
  message-less negative, a misplaced no-cast assertion) — all fixed. Second pass
  (the actual review-the-gherkin request) found two real coverage holes — no
  invalid-`profile` test, initiatives with zero negative tests — plus consistency
  gaps on `actual_tool`, `actual`/`source` required-ness, and the
  `scoring.dimensions` positional path. All applied. ~40 concrete cases now,
  2 `@wip` gaps (unlocks referential integrity; Tier C tool-refs) written down
  rather than assumed.
- **Approved.** Frontmatter `status: approved`; roadmap M1 → "gherkin approved —
  implementation next". Commits `ad1ddbf` (draft) and `0cbaf2f` (approval).

## Decisions

- **`orchestra-sdlc` at user scope.** It was configured only for a now-deleted
  `orchestra-pilot` project; moved to the root `mcpServers` so it's available to
  every session. The stale project-scoped copy was removed (one token, not two).
- **Separate Linear workspace for solo work.** Savvy and Chiro are shared with
  partners; Linear membership is workspace-level, so isolation only exists at the
  workspace edge. The solo agent projects (Orchestra, Compass, …) get their own
  `workshed` workspace — one team (`Shed`, key `SHE`), each project a Project.
  Reached via `LINEAR_WORKSHED_API_KEY`, not the claude.ai Linear MCP tools (those
  are OAuth-scoped to Savvy and can't see it).
- **`.orchestra` authoritative, Linear a view.** Same shape as "the server carries
  the method; the client carries the state," one level up. A Linear issue is a
  card pointing at a repo artifact; it never holds a bearing, artifact, or gate.
  Making Linear the source of truth would be an ADR-level change. Recorded in
  CLAUDE.md and memory.
- **Orchestra M4 (Workshop) removed.** Workshop is a second, auto-generating human
  view (it aggregates `.orchestra/` folders); with Linear now filling that role,
  M4 was dropped from the orchestra repo — folder deleted, roadmap cleaned,
  ADR-002 left intact as history (orchestra commit `009e050`). Orchestra M5 (AFK)
  is the one genuinely-open item and was mirrored as SHE-9, In Progress.

## Board State (workshed / Shed)

- **Compass:** SHE-5 M1 (In Progress) · SHE-6/7/8 M2–M4 (Backlog) ·
  **SHE-11** "Implement M1 loader" (Todo, **due 2026-07-22**, sub-issue of M1).
- **Orchestra:** SHE-9 M5 AFK (In Progress).

## Next

Pick up SHE-11 tomorrow. Order is fixed by the spec: workspace skeleton, then port
the loader green against savvy's existing 119-line `loader.test.ts` **before any
v2 change** — that port-first step is the guard against "port" drifting into
"rewrite". Then red-first, one step at a time, through envelope v2, construct-don't
-cast, journey, standing + SAV-121's two fixes, serialization, and fixtures. Source
stays read-only in `os/web/packages/compass/src/` until M1 ships, at which point
SAV-155 deletes it.

Open thread parked, not decided: Workshop vs Linear as human views now overlap in
principle even though M4 is gone — Workshop still aggregates `.orchestra/` folders
across the workspace. No forcing function today.

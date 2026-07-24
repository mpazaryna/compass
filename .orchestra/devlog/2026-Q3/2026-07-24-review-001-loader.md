---
created_on: 2026-07-24
---

# 2026-07-24: Review — 001-loader

## Verdict

PASS

## What Was Reviewed

The M1 loader lift: the bearing parser/validator moved into this repo as
`@compass/core` and amended to schema v2. Reviewed the full `impl/001-loader`
diff against main (10 commits, 17 files) against the approved spec's acceptance
criteria, deliverables table, and TDD tiers.

## Findings

**Acceptance criteria — all pass, with evidence:**

- v2 journey + standing parse; `audience` rejected naming the key; `source`
  optional; `direction` materialised to `gte`; `daily`/`local-day` validated
  and cadence/anchor mismatches fail — covered by `parse.test.ts` and confirmed
  by a fresh run (60/60 green).
- No `as unknown as` cast in `parse.ts` (`grep` count 0); every value is built
  field by field (`validateStage`/`validateTarget`/etc. construct explicit
  objects).
- `parse.ts` has no `node:` import — asserted by a source-scanning guard test,
  `grep` count 0; `load.ts` is the sole Node-touching module.
- `parseBearing` runs under plain node (verified with `node --input-type=module`
  importing `./src/parse.ts` directly).
- Every optional field has both an accepting and a rejecting test — a gap
  (requires_signoff, mode, period, goal_tool, actual_tool, count) was found
  during the implement close-out and fixed in `b03beaa`; negatives assert on the
  message naming the field.

**Deliverables:** all 11 rows present and non-placeholder, including the owned
schema spec (`.orchestra/work/compass-bearing-schema/spec.md`, 124 lines with a
v1→v2 version history) and the synthetic `standing-example.yaml`.

**TDD tiers:** unit (`parse.test.ts`) and integration (`load.test.ts`, hitting
the real filesystem — no mocks at the seam) both present. E2E is N/A: M1 is a
library with no user-facing interface, and the approved spec scopes E2E to M2.

**Quality notes (non-blocking):**
- Steps 3–6 bundle the step's tests and implementation into one commit each.
  Red-first was practiced in-session (the suite was run to red before each
  implementation), but the single-commit-per-step granularity means the
  ordering isn't legible from the git history alone. Steps 2, 7, and the
  close-out are test-forward/test-only commits.
- Two deviations from the spec, both documented in commit messages and sound:
  `audience`-removal pulled forward from Step 8 into Step 3 (a v2 envelope
  cannot load a v1 fixture), and `business-plan.yaml` removed as client data in
  favour of a synthetic fixture.
- This was a self-review by the implementer; a second set of eyes at
  `/orchestra-merge` is welcome but not required by the gates.

## Next Step

Ready for `/orchestra-merge`.

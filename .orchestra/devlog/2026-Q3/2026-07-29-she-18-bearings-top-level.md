---
created_on: 2026-07-29
---

# 2026-07-29: SHE-18: bearings move to the top level, and the build learns to say why

## Summary

Ran SHE-18 through the full Orchestra loop — PRD, spec, gherkin, implement — in
one session. The served bearing set moved out of `apps/mcp-compass/bearings/` to
a repo-root `bearings/`, one folder per bearing: `bearings/<slug>/bearing.yaml`
plus a `README.md`. Seven commits on `impl/SHE-18`, deployed and verified,
awaiting review.

The refactor itself is small. What made it worth a full loop is that a structural
move is exactly the kind of change that quietly alters what a client receives,
and "trust me, nothing changed" is not a claim you can review.

## The claim that had to be provable

The whole work item rests on one assertion: **nothing a client sees changes**.
Rather than assert it, the spec made it a hard acceptance criterion — hash the
generated module before the move, hash it after, require byte-identity:

```
baseline 3c2609ae3342171796e47bae22201e33dcbe2d69bf9698b82ef7e82e369dbe56
actual   3c2609ae3342171796e47bae22201e33dcbe2d69bf9698b82ef7e82e369dbe56
```

`bearings.generated.ts` is gitignored build output, so this can't be read off a
diff — it has to be baked twice and compared. It held on the first try, and it
turns the review question from "did you break anything?" into "is the hash the
same?"

The second half of the same claim: `connector.e2e.test.ts` passes **unmodified**
against the redeployed Worker. A test you didn't have to touch is stronger
evidence than one you updated to match.

## Two guards that weren't on the card

Folder-per-bearing creates two new ways to be wrong, and both fail *silently*
under a naive directory scan:

| Mistake | Naive behavior | Now |
|---|---|---|
| `bearings/<slug>/` with no `bearing.yaml` | crash with an ENOENT path | `bearing home "<slug>" has no bearing.yaml — each bearing is a directory containing bearing.yaml` |
| a `.yaml` loose at the bearings root | **silently skipped** | `"<file>" sits loose in the bearings directory — a bearing lives at <slug>/bearing.yaml` |

The loose-file case is the one that mattered. It's precisely the mistake the old
flat layout trains an author into — drop a `.yaml` next to the folders — and the
failure mode is a client being served one bearing short with nothing anywhere
saying so. Failing the build is the right answer. This is CLAUDE.md's rule doing
real work: validation messages are the authoring interface, so the message names
the mistake *and* the fix.

## Mutation-checking instead of pretending

The spec ordered the guards after their tests. In practice the scan and both
guards were one coherent edit to one file, and the tests followed. Rather than
claim an ordering that didn't happen, each guard was disabled in turn to confirm
its test actually fails without it:

```
mutation 1: remove the loose-file guard        → 1 failed | 11 skipped
mutation 2: remove the missing-bearing guard   → 1 failed | 11 skipped
```

Both have teeth. Recorded as a deviation in the spec's implementation notes
rather than papered over — TDD's value is the guarantee that the test can fail,
and that guarantee can be earned after the fact.

## Two things caught by checking rather than assuming

**The loose fixture was invalid.** It was written with a comment claiming it was
"valid on purpose" — the point being that the build rejects it for its *location*,
not its content. It was missing the required `gate`. The test passed anyway,
because the guard fires before the parser ever runs, so nothing surfaced it.
Fixed in its own commit; now it genuinely parses standalone and the test means
what it says.

**"No code change to add a bearing" got verified, not asserted.** Baked a
two-home fixture root with nothing else edited:

```
baked 2 parsed bearings: brand-builder, second-engagement
```

That's the roadmap criterion — *authoring a new engagement is a bearing file, not
a code change* — demonstrated rather than claimed.

## Where the README goes

A bearing accumulates context that isn't part of the journey: where the stage
structure came from, why the prompts are drafts, how it runs. Previously that
had to be crammed into a header comment competing with the served content.
`bearings/brand-builder/README.md` now carries it — including the
draft-pending-Sheri warning, which also stays in the YAML header so it travels
with the file itself.

## Path resolution

The bake resolves its default directory from `import.meta.url`, never cwd. It
now has to reach up three levels out of the app, and it runs under `pnpm bake`,
`wrangler deploy`, and `execFileSync` from a test — all with different working
directories. All three exercised; all three fine.

## What shipped

Branch `impl/SHE-18`, 7 commits, **not merged**. Deployed to
`compass-mcp-spike.mpazbot.workers.dev` (version `3bfc0c4a`). Suites: core 60,
mcp unit 9, integration 12 (was 10), e2e 1 — all green, typecheck clean.

Linear SHE-18 moved to In Progress with a comment pointing at
`.orchestra/work/005-bearings-top-level/` — the card stays a thin pointer; the
repo stays authoritative.

## Notes for whoever picks this up

- The work item is **005**, not 004 — the roadmap reserves `004-engagement` for M4.
- It is anchored to no milestone. The implement playbook surfaced that as an
  advisory and it was consciously waived: this serves a roadmap success criterion
  rather than a milestone deliverable. Worth a roadmap row at merge.
- `packages/core/src/fixtures/` deliberately did not move. Those are loader test
  data, never served.
- The `003-brand-builder` PRD and spec still name the old path. They're closed
  and record what was true when written — left alone on purpose.

## Next

`/orchestra-review` against the spec, then `/orchestra-merge`.

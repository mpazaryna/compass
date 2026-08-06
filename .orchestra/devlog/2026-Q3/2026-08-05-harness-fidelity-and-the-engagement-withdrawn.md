---
created_on: 2026-08-05
---

# 2026-08-05: The harness learns to tell the truth, and the engagement comes off the roadmap

## Summary

Started as "review the last few commits." Ended with the client engagement
withdrawn from the roadmap, `v0.1.0` tagged, and a week of undeployed drift
shipped to Cloudflare.

Eleven commits on `develop`, fast-forwarded to `main`. Four test tiers green:
core 60, mcp unit 44, integration 14, e2e 1. Deployed as version
`f5631d15-61b7-441e-a281-6cee33a3b067`, replacing `3bfc0c4a` from 2026-07-29.

The connecting thread is unflattering and worth stating plainly: two things we
believed were true weren't, and finding that out cost most of the day.

## The audit was grading on evidence it never saw

The journey eval asks its auditor, among other things, *"for each stage the
guide opened, state its gate and whether the transcript shows it actually met."*

The transcript it was handed contained no tool calls. `get_stage` results — the
only place a gate rule appears verbatim — went to `console.log` and nowhere else.
So every Gates section written before today was inferred from the guide's prose,
or filled in from the auditor's own knowledge of the bearing.

That matters retroactively. The runs that produced ADR-004 and `AUTHORING.md`
were partly graded this way. Their findings survived review, but the records are
not comparable to anything produced after.

Two adjacent defects in the same file:

| Defect | Consequence |
|---|---|
| Only the terminating turn's text was returned | Anything the guide said while calling a tool never reached the record the one-question-per-turn check reads |
| Loop driven by `stop_reason` | A turn ending on `max_tokens` mid-call left the `tool_use` unanswered, failing the next request |

The fix (`cb41a61`) put the fidelity logic in `eval/harness.ts` behind twenty
tests, leaving `journey.ts` with only the two things that can't be unit tested —
the Anthropic API and the instrument's endpoint. `eval/` also entered `tsconfig`
and the unit tier, so it typechecks for the first time.

## Seven eval rounds, three of them self-inflicted

| Round | Found |
|---|---|
| 1 | Void — died on the audit call, and the transcript was written *after* the audit, so two complete journeys were discarded |
| 2 | Closing didn't stop; fabrication moved into commentary. **Both personas** — which made them copy problems, not sampling |
| 3 | Copy worked; the two models traded goodbyes until the exchange budget ran out |
| 4 | Clean endings; five remark slips on one persona, zero on the other, same copy |
| 5 | Strengthened instructions leaked their own machinery into client-facing text |
| 6 | Fixes held; two inventions inside *questions* rather than statements |
| 7 | Naming the seventh shape didn't fix it — the real mechanism was paraphrase |

Rounds 1, 5 and part of 6 were spent repairing defects introduced in the round
before. That's not the loop working; that's churn, and it's roughly a third of
the spend.

**Two gotchas worth carrying forward.**

`temperature` is removed on this model family and returns a 400. Run-to-run
agreement cannot be bought with a sampling parameter — what makes two audits
comparable here is the fixed heading set.

A test asserting only what a string *doesn't* say passes on `undefined`. The
first version of the ending test passed against the unfixed code, because an
unknown key yielded `Ended after 18 exchanges: undefined.` and that satisfied
every negative assertion. Assert what a string says.

## An ending may only claim what the transcript shows

The client persona could emit the end-of-run token in the same message as a
correction. One run stopped on *"Yes, that's mine. Only thing I'd flag is 'ten
years'…"* before the guide could revise — and the ending then read *"the guide
closed the bearing and the client had nothing further"* over a transcript
containing no closing message and an outstanding correction. Both halves false.

The auditor caught it unprompted: *"The stated ending does not match the
transcript."* The harness catching the harness lying is the clearest signal the
fidelity work paid for itself.

It is `client-ended` now, and it says only that the client ended the exchange.

## The runs were costing more than they needed to

Prompt caching was flagged as the cheapest available saving in the first review
of `journey.ts`, then not done for five rounds. Every exchange resent the
instructions, tool schemas, and the whole conversation at full input price —
sixteen times a run, twice a round.

```
Tokens: in 10k · cache write 19k · cache read 166k · out 13k
```

Roughly **$0.58 a run against about $1.30**. Twelve runs at the old rate is
~$15.60, which accounts for essentially the whole day's spend. The document and
console now carry the token line: a run whose price is invisible is a run nobody
can decide to stop taking.

## The document that ended the engagement

The client had spent a year working the same territory with ChatGPT, and shared
966 lines of it. It covers the ground the curriculum was going to cover — a
stage model with a placement, a financial phase sequence, a full seven-forces
implementation plan, three flagship projects.

Measured rather than eyeballed:

| Looking for | Found |
|---|---|
| Her business figures | **zero** — the only dollar amounts are generic illustrations |
| Dates or deadlines | **zero** |
| `constraint` / `bottleneck` | **zero** |
| `premortem` / `fail` / `risk` | **zero** |
| Action items | **49**, none prioritised, owned, dated, or costed |

And the verbs: *"I'd actually rewrite your mission slightly."* *"Where I believe
you are now."* *"Here's how I would fill in your Implementation Plan."*

That last one is the workbook she paid to work through, filled in for her. The
document covers the territory and produces none of the artifacts — which is the
clearest possible statement of the problem Compass exists to solve, and also the
reason the engagement was the wrong shape. She hadn't done the work. She'd
received the output of the work. Those look identical on the page.

## What came off, and what deliberately didn't

M4 was a named client and a five-bearing curriculum. Withdrawn (`8b9633b`).
`004-engagement` is `status: superseded` rather than deleted — `research.md`
carries verified canonical citations and the argued reasoning for two source
changes, and those stand without the engagement.

**The platform work it carried is not superseded.** Authentication, client
scoping, and journeys that survive across sessions were never client-specific.
An engagement made them unavoidable, which is a different thing from making them
necessary. That is what M4 becomes, and it needs a PRD.

The roadmap's last success criterion no longer names anyone but was deliberately
kept: *"A person outside this project completes a journey end to end."* Every run
to date has been two models talking to each other. An instrument no person has
walked is unvalidated in the way that matters.

Historical records — devlogs, the M3 and 005 work items, ADR-001, ADR-004's
consequences list — were left as written. They record what was true when written.

## The deploy nobody had done

The live endpoint was a week stale, and worse than expected. It was serving:

```
gate rule: "the owner accepts the foundation statement"
```

That is the pre-ADR-004 gate — the string the ADR itself quotes as its
motivating example of a rule satisfiable by agreement. An open, unauthenticated
endpoint had been serving the exact failure mode the last two days removed.

Eight markers checked before and after across `initialize` and the `foundation`
stage: all eight absent before, all eight present after. E2E re-run against the
deployed URL rather than localhost.

**The lesson is process, not code:** `pnpm deploy` is a manual step nobody owns,
and the repo's own record of what was live (`3bfc0c4a`, in the 2026-07-29
devlog) was the only way to discover the drift. Worth a CI deploy or a staleness
check before anyone connects for real.

## What's open

- **M4 needs a PRD** — auth, client scoping, cross-session continuity
- **Brand Builder's bar is unmet** and the bar itself is probably wrong. Seven
  rounds in, no run has produced a corrupted artifact; every failure has been
  commentary that reached no artifact. `EVAL-LOG.md` carries a two-tier proposal
- **The paraphrase fix is unverified** — no run has tested it
- **Compass has no committed user.** The instrument is in good shape and nobody
  is scheduled to walk it. That question is now upstream of the M4 PRD rather
  than answered by it
- Housekeeping: stale `she-8/…` remote branch, Linear SHE-8 describing a
  withdrawn plan, `package.json` at `0.0.0` against a `v0.1.0` tag,
  `persona-sheri.md` still carrying the name

## Related

- `bearings/brand-builder/EVAL-LOG.md` — all seven rounds, what changed, what's open
- `bearings/AUTHORING.md` — seven fabrication shapes and the copy-review checklist
- [ADR-003](../adr/ADR-003-bearings-are-reviewed-as-copy.md), [ADR-004](../adr/ADR-004-a-gate-states-a-countable-condition.md) — both moved to `accepted`
- `.orchestra/work/004-engagement/prd.md` — superseded; a plan that was not taken

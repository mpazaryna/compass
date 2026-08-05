# Brand Builder — eval log

What each journey eval found, and what changed in response. A bearing is content
(ADR-003), so it is not corrected by a compiler — it is corrected by running it
and reading what came back. This file is that record: without it the reasoning
lives only in commit messages and in whoever was at the keyboard.

Runs are produced by `pnpm --filter @compass/mcp run eval:journey` against a
local instrument, with `COMPASS_EVAL_PERSONA` selecting the fact sheet. **Two
personas, always** — Sheri (a salon) and Marco (agentic software for nonprofits).
A bearing that only works for one of them is tuned, not neutral.

Transcripts land in `apps/mcp-compass/eval/output/`, which is gitignored: they
are long, they are model output, and the finding is what belongs in version
control. Filenames below are the local artifacts, cited so a run can be found
again on the machine that produced it.

## The bar

A copy change is not finished because one run came back clean. Two runs at
temperature-you-cannot-set will differ for reasons unrelated to the edit, and
`temperature` is removed on this model family — sampling cannot be pinned. So:

> **Two consecutive runs, both personas, with no fabrication, no multi-question
> turn, no gate closed over an unapplied correction, and both artifacts produced
> in the person's own words.**

Two consecutive rules out a lucky sample. Both personas is what makes the
domain-neutrality claim real. **Not yet met** — see 2026-08-05, run 4.

---

## 2026-08-04 — the runs that wrote the house style

Cited rather than quoted. These predate the harness fidelity fixes of
2026-08-05, so their audits were reading transcripts with the tool traffic and
some guide turns missing; the findings that survived review are sound, but the
records are not comparable to what came after.

They produced [ADR-004](../../.orchestra/adr/ADR-004-a-gate-states-a-countable-condition.md),
`../AUTHORING.md`, and commit `7a5689e` — six defects, five of them found by
running the bearing rather than reading it. The three fabrication shapes named
individually in AUTHORING.md are theirs.

## 2026-08-05, run 1 — lost

Both personas walked the full journey; both runs then died on the audit call.
`temperature: 0` returns a 400 on this model family, and the harness wrote its
document only after the audit succeeded, so two complete journeys were discarded
to a failure in the last step.

**Changed:** the transcript is written before the audit is attempted, and the
auditor is no longer pinned with a sampling parameter — what makes two audits
comparable is the fixed heading set, not `temperature`. Recorded here because
the failure is a standing hazard for any expensive run: the finding must survive
the step after it.

## 2026-08-05, run 2 — the first trustworthy audits

`brand-builder-sheri-2026-08-05T14-48-39-135Z.md` · `brand-builder-dev-2026-08-05T14-48-21-234Z.md`
Both ended at the 16-exchange limit, after both stages had closed.

Held: both gates met, both statements owner-written, one question per turn, no
domain leakage. Sheri's run met the qualified-yes case the gate was rewritten
for — a correction filed inside a "yes" — and the guide refused to close on it.

Broke, on **both** personas, which is what made these copy problems rather than
sampling:

- **The closing did not stop.** Both named the artifacts, declared the journey
  over, then kept going — five further exchanges of coaching on one, a re-narration
  of the whole discovery synthesis on the other.
- **Fabrication moved into the commentary.** The reflected artifacts were clean;
  the leaks were in remarks between questions. An attribute carried from one
  person onto a group described without it, a capability the person never claimed
  (*"You'd catch it in a client's spreadsheet in an afternoon"* — which he then
  adopted), a figure bound to a claim it was attached to elsewhere.

Held under pressure, worth recording: **both** guides refused a phantom number
rather than agreeing — *"you didn't give me a rebooking number. No figure came up
at any point today."* Evidence that naming failure modes individually works where
a general instruction to be faithful did not.

**Changed:** the fabrication guard now governs every sentence said back, not only
the artifact, and carries the say-it-first test; the closing states what its one
message contains and what to do when the person keeps talking. Three new shapes
added to AUTHORING.md's table (six total), with the artifact/remarks distinction
made explicit. `MAX_EXCHANGES` 16 → 24.

## 2026-08-05, run 3 — the copy worked, the harness did not

`brand-builder-sheri-2026-08-05T15-06-30-754Z.md` · `brand-builder-dev-2026-08-05T15-06-11-187Z.md`
Both ended at the 24-exchange limit — on farewell chatter.

The stop rule fired verbatim on both: *"The bearing is finished. What you're
raising there sits outside it."* Neither resumed coaching. Marco's run came back
with no fabrications at all; Sheri's had one pronoun shift ("we" → "you").

But the guide stops *coaching*, not *replying*, and nothing ended a run — Compass
never ends a session, since under ADR-001 the client carries the loop. The two
models traded goodbyes until the budget ran out: eleven turns on one, six on the
other. Worse than the wasted calls, every run then reported *"the journey may be
unfinished"* over a journey that had finished.

**Changed:** the client persona can signal it has nothing further, and a
`journey-closed` ending distinguishes a completed run from a truncated one.

## 2026-08-05, run 4 — clean endings, unreliable remarks

`brand-builder-sheri-2026-08-05T15-34-09-700Z.md` (13 exchanges) ·
`brand-builder-dev-2026-08-05T15-35-37-477Z.md` (14 exchanges)
Both closed cleanly. First runs whose ending line is true.

Marco's run exercised the whole closing sequence and held it — one message,
both artifacts, no advice about what to do with the statement, and it stayed
stopped when he spoke again. Sheri's named both artifacts but quoted the
foundation statement in full, which is the one closing instruction not held.

**The remark guard is not reliable.** Sheri: one hardening, corrected before it
reached the artifact. Marco: five slips — a supplied count, an observation
pointing at something not in his sentence, a sharpening applied to three claims
where he had attached it to one, a characterisation he never made, and a
reference to what he had "asked for" in a turn that does not exist.

The same copy produced zero slips on Marco in run 3 and five in run 4. That is
the variance the two-run bar exists for: a single clean run would have read as
solved.

**Open.** The next move is not more prose in the same place — the guard already
names six shapes and gives a general test, and AUTHORING.md warns where more
emphasis stops helping. The structural alternative is that the between-questions
commentary is optional: a stage that asks and reflects but does not editorialise
removes the surface instead of policing it. That changes the bearing's character
and is a decision, not a copy edit.

**Also open:** ending the goodbye loop removed the conditions that exercised the
stay-stopped rule. One run reached it and held; the other never got there. A rule
that can only be tested when something else goes wrong is a rule with thin
coverage.

## 2026-08-05, run 5 — the first test of the strengthened instructions

`brand-builder-sheri-2026-08-05T16-33-02-543Z.md` (13 exchanges) ·
`brand-builder-dev-2026-08-05T16-34-04-219Z.md` (6 exchanges, void)

First run after `instructions.ts` was strengthened to say a gate is held rather
than asked about, and after the audit brief began deriving artifacts and gate
rules from the served bearing rather than naming Brand Builder's.

Sheri's run had **no fabrications at all** — every between-question remark
traced to direct quotation. But the instruction change leaked its own machinery
into what the person reads: the closing opened with *"Gate met — all three
questions answered…"* before naming the artifacts, and the guide re-read a stage
prompt mid-stage and explained itself: *"(That last call was just me re-reading
the stage prompt — nothing changed.)"* Checking the gate had become visible work,
narrated to the client.

**Marco's run is void**, and the fault was the harness's. The persona emitted the
end-of-run token in the same message as a correction — *"Yes, that's mine. Only
thing I'd flag is 'ten years'…"* — so the run stopped before the guide could
revise, and the ending then claimed the guide had closed a bearing whose closing
message does not exist. The audit caught the contradiction itself: *"The stated
ending does not match the transcript."*

**Changed:** the instructions say the gate check is silent work; the client
cannot end a run while correcting or answering; the ending is named
`client-ended` and describes only what the transcript shows.

## 2026-08-05, run 6 — the fixes hold, one shape left

`brand-builder-sheri-2026-08-05T16-49-57-054Z.md` (16 exchanges) ·
`brand-builder-dev-2026-08-05T16-49-39-776Z.md` (15 exchanges)
Both `client-ended`, both complete.

**Marco: clean.** *"Nothing in the run as transcribed breaks a rule the bearing
set."* The qualified yes was caught rather than pocketed, the owner's epistemic
hedge survived into the revised text, and the closing named the two artifacts and
said nothing else. No gate narration anywhere in either run — that regression is
gone.

**Sheri: two slips, both in the remarks, and both a shape the guard does not
name.** *"Why is this the work you've built your name on rather than something
easier?"* — she had said neither that it was harder nor that she had built her
name on it. And *"Other colourists do corrections too"* — she had said *salons*,
never *colourists*. Neither reached the artifacts.

The shape is new: the invention is inside a **question**, as a presupposition,
rather than inside a statement about them. The six named shapes are all
assertions, and the say-it-first test reads as governing what the model *claims*
— a leading question slips under it. Worth naming as a seventh shape before the
next bearing is authored, since a question is the one thing every stage is made
of.

**The bar is still not met.** Marco is clean twice running under this copy;
Sheri is not.

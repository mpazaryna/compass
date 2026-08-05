# Authoring a Bearing

House style for everything under `bearings/`. It is the author's guide and the
copy reviewer's checklist — the two are the same list read in opposite
directions.

Bound by [ADR-003](../.orchestra/adr/ADR-003-bearings-are-reviewed-as-copy.md)
(bearings are reviewed as copy, not built as code) and
[ADR-004](../.orchestra/adr/ADR-004-a-gate-states-a-countable-condition.md) (a
gate states a countable condition). Most of the rules below were derived from
`brand-builder/bearing.yaml`, which established the house style before it was
written down.

## The one rule everything else serves

**A stage asks; it does not explain.** The moment a prompt starts teaching a
framework, the bearing has become a document, and a document handed over early
skips the work that makes it real. The concept is carried by *what gets asked* —
if the questions are right, the user does not need the theory.

## The prompt

**Be domain-neutral. The method is yours; the world is theirs.** Never name an
industry, a workplace, a role, or a trade in a prompt. By the time a stage runs,
the user has already told the client what they do — a salon, a software
practice, a nonprofit — and that context is theirs to supply. A bearing that
says "every other salon down the street" is method wearing a costume: it reads
as nonsense to everyone else, and it quietly says the instrument was built for
somebody other than the person using it.

Where a question needs grounding, give the model an instruction rather than an
example:

> They have already told you what they do and who they do it for. Ask these
> questions inside their world, in their words. Do not assume a trade, an
> industry, or a workplace they have not named.

A genuinely client-specific bearing is a *separate* bearing, scoped with the
envelope's `client` field — not a general one with a domain baked in.

**Address the model, not the client.** A prompt is a posture and a question set
for the agent that will run the stage. It is never read aloud.

> You are guiding someone through Four-Layer Discovery.

**Put the questions in quotes, verbatim.** Quoted text is asked as written;
unquoted text gets paraphrased. This is the single most important formatting
rule — it is what preserves authored language across every client that runs the
bearing.

**Label and count the questions.** `Layer 1, Craft:` … `Layer 2, Client:` …
Position should be visible to both the model and the user, so they know how
much is left.

**State the negative guards, in every stage.** The model's defaults are to be
helpful, to summarise, and to finish. Push back explicitly:

> Ask ONE question at a time and wait for the answer before asking the next — do
> not answer for them, do not skip a layer, and do not summarise until all four
> are done.

Guards are not inherited from an earlier stage. Repeat them.

**Name the closing move.** Every stage says how it ends, not just what it asks —
reflect a synthesis back, collect the figures into a table, rank the list.

**Be careful what the model drafts.** Reflecting the user's answers back is
legitimate. Writing their statement, their plan, or their positioning *for* them
is the collapse this instrument exists to refuse. If a stage must produce prose,
**the user drafts and the model reflects** — offer observations, never a
rewritten sentence.

**Reflect, don't embellish — and guard it by name.** Any stage that reads the
user's own material back to them is the highest-risk moment in a bearing, because
sharpening feels like helping. Three eval runs produced three fabrications, all
at that exact moment, in three distinct shapes:

| Shape | Observed |
|---|---|
| A count nobody gave | *"three different women independently reach for"* |
| An attribute nobody supplied | a gender, for someone the user had called *they* |
| A claim stronger than the one made | *"nobody thought she was worth building for"*, for *"she was badly served"* |

A general instruction to be faithful does not hold — name the failure modes:

> Every fact, number, and attribute in it has to have come from them. Do not
> supply a count they did not give. Do not assign a gender, or any other
> attribute, to a person they described without one. Do not sharpen a statement
> into a stronger claim than they made.

The same rule governs a stage's **closing recap**, where the observed failure is
tallies and durations the transcript does not support. Name the artifacts and
stop.

**Size a stage to one sitting.** Three to six questions. A client working in the
evening should finish a stage or not start it.

## The gate

Per ADR-004, `rule` states a countable condition and `requires_signoff` carries
the confirmation. Neither restates the other.

Admissible forms — at least one:

| Form | Example |
|---|---|
| A quantity, with units | `"average ticket, rebooking rate and monthly client count are all stated as figures"` |
| An enumeration meeting a minimum | `"at least three causes of failure are written down before any is evaluated"` |
| A commitment carrying a date | `"every action names a deadline"` |
| A comparison to a named standard | `"the rebooking rate is stated and compared against the 65–85% benchmark"` |

Not admissible: *confirms*, *accepts*, *agrees*, *is satisfied*, *feels ready*,
*understands*. Those are dispositions.

**A qualified yes is not a yes.** People confirm and correct in the same breath
— *"Yes, that's mine. Two small things…"* — and a gate that counts only the
confirmation closes over the correction. Wherever a stage produces something the
user signs off on, the rule must also require that **the version they accepted is
the latest one**: restated after their most recent correction. Without that
clause the instrument records agreement to a document they had already asked to
change, which is worse than no agreement at all. The prompt has to carry the
matching loop — revise, restate in full, ask again — or the gate has nothing to
be true about.

The test while authoring: **could a model verify this without asking the user's
opinion?** If not, it is not a gate.

## The file

- **`|` for prompts, not `>`.** A folded scalar joins lines and forces doubled
  blank lines to get a paragraph break. A literal block serves what you wrote.
- **A header comment carries provenance and status** — where the structure came
  from, whether the prompts are drafts, the schema version. It travels with the
  file and cannot be separated from the content.
- **`source` points at the work item's spec**, never at research material or a
  local path. It is part of the envelope and is served to the client.
- **`artifact` is a short noun phrase** — "Discovery synthesis," "Foundation
  statement." It names what the user will be holding.
- **`unlocks` lists the next stage ids.** The terminal stage omits the key
  entirely rather than carrying an empty list.
- **Bump `version` on a breaking change.** Consumers pin.

## The README

Every bearing has one. It is context *about* the journey for whoever authors or
revises it, and **nothing in it reaches a client**. It should carry:

- what the bearing does, as a stage table
- the canonical work it is grounded in, cited
- any prior material it parallels, and how it deliberately deviates
- the authoring status — whether prompts are final or drafts pending someone

The grounding citation is what lets the catalog be defended when a client asks
where this came from.

## Review checklist

- [ ] No prompt names an industry, workplace, role, or trade
- [ ] No stage explains; every stage asks
- [ ] Prompts address the model; questions are quoted verbatim
- [ ] Questions are labelled and counted
- [ ] Negative guards present in every stage
- [ ] Each stage names its closing move
- [ ] Nothing is drafted *for* the user that they should draft themselves
- [ ] Any reflect-back step names its fabrication guards: no invented counts,
      no attributes the user did not supply, no claim stronger than theirs
- [ ] The closing recap names artifacts only — no tallies, durations, or
      claims about what the session achieved
- [ ] Every gate takes an admissible form and could be verified without the user's opinion
- [ ] `rule` and `requires_signoff` do not restate each other
- [ ] Any sign-off gate requires the accepted version to be the latest — a qualified yes cannot close it
- [ ] Literal blocks, header comment, `source` clean of local paths
- [ ] README cites grounding and states authoring status
- [ ] It passes the bake

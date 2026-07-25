# compass

> A bearing-driven methodology instrument, served over MCP.

## Brief

**Vision:** Methodology as a deployed instrument. A *bearing* is a YAML file
declaring a heading — a journey bearing carries ordered stages, prompts, gates,
and artifacts that walk someone from a blank slate to a real deliverable. The
server carries the method; the client's workspace carries the state. Adding an
engagement means authoring a bearing, not writing code.

**Audience:** paz.land consulting clients, working in a chat client — plus the
consultant, running the same instrument against his own bearings.

## How it thinks

Most tools built on AI collapse a real process into a transaction: answer a
question or two, receive a comprehensive document. Compass refuses the collapse.
It is structured, gated prompt delivery — it asks one question at a time, holds
you to a real answer, and won't advance a stage until its gate is met. The
deliverable is the byproduct; the walk is the point. The **order is the value**.

That places it in an old lineage: Socratic questioning that draws understanding
out rather than depositing it; Freire's *problem-posing* education against the
"banking model" of handing over a finished document; Vygotsky's scaffolding
toward what a person can't yet do unaided; and Bloom's mastery gates, which don't
let you move on until the current step holds. When generation is free, the scarce
thing is *being made to think* — Compass keeps the productive friction the rest
of the market is racing to remove.

### On Feynman

The tightest fit is Richard Feynman. His father taught him that knowing a bird's
name in every language is not knowing the bird — and Compass's whole discipline
is refusing the label to reach the thing itself. *"You must not fool yourself,
and you are the easiest person to fool"* is the first principle a gate enforces
from the outside, because you cannot do it reliably from within. You understand
something only when you can state it plainly; the stumble marks the hollow spot.
And *"what I cannot create, I do not understand"* — recognition is not
understanding, so the artifact has to be earned. Compass is Feynman-style inquiry
made into an instrument.

The fuller treatment is in the devlog:
[The Intellectual Lineage of Compass](.orchestra/devlog/2026-Q3/2026-07-24-compass-intellectual-lineage.md).

## Usage

The bearing loader and schema live in `@compass/core`. The MCP server
(`apps/mcp-compass`) is a Cloudflare Worker that bakes bearings at build time and
serves them over Streamable HTTP. Connect a chat client — e.g. a Claude Desktop
custom connector — to its `/mcp` endpoint and it exposes three tools,
`list_bearings`, `get_bearing`, and `get_stage`, and through its `initialize`
instructions it *runs the journey with you* rather than just returning a bearing.

The first bearing is **Brand Builder**. Bearings live in
`apps/mcp-compass/bearings/`; authoring a new engagement is a new bearing file
there followed by a redeploy — no code change.

> The current deployment is an early, single-tenant dev spike with **no auth**.
> Per-client scoping (which needs identity, and so OAuth) is future work.

## Relationship to Orchestra

Compass forks the pattern proven by
[orchestra](https://github.com/mpazaryna/orchestra): content directories baked
at build time and served over Streamable HTTP from a Cloudflare Worker, with no
database and no model loop in the cloud. Orchestra serves *skills* for the
software development lifecycle; Compass serves *bearings* for client
engagements.

The two share no code and no dependency. Orchestra's ADR-001 (content served
whole) and ADR-003 (the repo is the workspace) are inherited by citation and
bind this repository — see [ADR-001](.orchestra/adr/ADR-001-fork-the-orchestra-pattern.md).

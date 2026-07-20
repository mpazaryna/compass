---
id: ADR-001
status: accepted
created_on: 2026-07-20
---

# ADR-001: Compass Forks the Orchestra Pattern

## Context

Compass is a bearing-driven methodology instrument: a bearing is a YAML file
declaring a heading, and a *journey* bearing declares ordered stages, prompts,
gates, and artifacts that walk someone from a blank slate to a real deliverable.
The Brand Builder is the first one. It is not a feature of any single product —
it is the instrument carried into engagements, and its clients are paz.land
consulting clients.

It has been implemented four times, and the schema drifted each time:

| Implementation | Runtime | Fate |
|---|---|---|
| `workers/mcp/compass` (authentic-advantage) | MCP server, Claude Desktop / Goose | Superseded |
| CompassKit (authentic-advantage) | Native iOS/macOS | Dormant |
| discovery-engine | Web, direct Claude API | Replaced the AA web path |
| `@savvy/compass` | TypeScript package in the savvy monorepo | Extracted by this decision (SAV-155) |

The fourth is being removed from savvy because a cross-engagement instrument
should not live inside one client's repository. That extraction forced the
runtime question, and the runtime question turned out to be already answered
next door.

**Orchestra is a working archetype of the thing Compass needs to be**: a
deployed knowledge-worker MCP server. Content directories baked at build time,
served over Streamable HTTP from a Cloudflare Worker, with no database, no
model loop, and no artifacts held in the cloud. It is in production, it is
tested, and its hard-won decisions are written down. Compass is the same shape
with bearings where Orchestra has skills.

Three options were considered.

1. **`apps/mcp-compass` inside Orchestra.** Orchestra is already a monorepo with
   three apps and a `packages/core`; adding a fourth is the path of least
   resistance. Rejected — see below.
2. **A new repository written from scratch.** Rejected: throws away a working
   reference implementation for no gain, and invites divergence in exactly the
   places Orchestra already got right (the `initialize` instructions as trigger
   surface, notification semantics, the pure-`handleTool` testing posture).
3. **A new repository seeded by copying Orchestra's skeleton.** Chosen.

The deciding measurement against option 1 is how little there is to share.
Orchestra's entire reusable surface is under 200 lines: `auth.ts` is 13 lines,
the JSON-RPC fetch handler in `apps/mcp-sdlc/src/index.ts` is ~110, and all of
`packages/core` is 67. Sharing that through a package costs more in permanent
coupling than duplicating it costs in bytes. What is genuinely valuable in
Orchestra is not code but **decisions**, and decisions transfer by being read
and cited.

Two further costs sank option 1:

- **Charter tax, permanently.** Orchestra's stated scope is the software
  development lifecycle, and ADR-001 through ADR-004 are all reasoned from that
  domain. Compass would inherit an argument history about a different subject
  and spend the rest of its life disowning parts of it. Every future ADR in the
  shared repo would have to declare which instrument it binds.
- **Blast radius.** Orchestra is a personal development loop that has already
  had one application torn out wholesale (its ADR-003 addendum). Compass is a
  client-facing deliverable running live engagements. They want different
  stability expectations, different release cadence, and separate secrets.

The known risk of forking is the one this project's own history demonstrates:
cheap copies are how four implementations and four schema drifts happened. That
risk is real but misattributed. Each of those four *re-wrote* the loader; this
one moves it exactly once. Drift is prevented by single ownership of the schema,
which is a discipline, not a repository topology — no monorepo would have
prevented the previous four, since three of them were already in separate repos.

## Decision

Compass is its own repository, seeded by copying Orchestra's working skeleton
and inheriting its decisions by citation rather than by import.

### Copied, and then owned outright

- The JSON-RPC handler: `/health`, `/mcp` POST, `initialize`, the 202 response
  for notifications, `tools/list`, `tools/call`, and its error codes.
- `auth.ts` — bearer token checked against a Worker secret.
- The build-time bake: Workers have no filesystem, so content directories are
  compiled into a generated TypeScript module. Orchestra's `build-skills.mjs`
  becomes `build-bearings.mjs`, parsing YAML instead of frontmatter.
- The testing posture: `handleTool` stays a pure synchronous switch with no I/O,
  covered by unit, integration, and end-to-end tests at the protocol boundary.
- A stateless `wrangler.toml` — no KV, no Durable Objects, no R2.

There is no shared package, no workspace link, and no dependency between the two
repositories. Divergence is expected and permitted.

### Inherited by citation, not re-derived

- **Orchestra ADR-001 — content is served whole.** A skill is served as its
  `SKILL.md` plus every support file, fetched by name, because flattening
  destroys progressive disclosure and forking the content creates a "real"
  version and an "MCP copy." Bearings adopt the same rule.
- **Orchestra ADR-003 — the repo is the workspace.** A cloud component "may
  hold state about the pipeline, never the pipeline's artifacts, and never its
  own model loop." This was learned by building the opposite and deleting it the
  same day. Compass is bound by it: the server carries the method, the client
  carries the state.

Anything that later contradicts either of those is a new ADR in this repo that
says so explicitly, with reasons.

### Diverging from the archetype, deliberately

- **Bearings are data; Orchestra's stages are constants.** `packages/core/stages.ts`
  hardcodes one pipeline — `STAGES`, `STAGE_PROMPTS`, `STAGE_GATES`. Compass has
  N pipelines loaded from YAML, so its core is the bearing loader and its tools
  take a bearing argument: `get_stage(bearing, stage)` where Orchestra has
  `get_prompt(stage)`. Orchestra's SDLC is expressible as a journey bearing;
  this is the generalization, not a parallel invention.
- **Its own `initialize` instructions.** Orchestra's tell every connecting client
  to call `orchestra_list_stages` before writing any code. A salon owner
  connecting to Compass must not be instructed to do software development. The
  instructions string and the tool names are the product surface and stay
  hand-written per instrument.
- **Client-scoped serving.** Orchestra's skills are universal — every project
  gets the same SDLC, so baking everything and serving everything is correct.
  Bearings are authored per engagement. Bake everything, serve what the key
  allows: the API key maps to a client, and both listing and fetching are
  filtered by it. Bearings remain methodology; a client's answers and artifacts
  never reach the server at all.

### The loader moves once

`loader.ts` and `types.ts` (335 lines) are lifted from `@savvy/compass` into this
repository, verified, and only then deleted from savvy. `parseBearing(string)` is
the Worker entry point; `loadBearing(path)` is a Node-only build-time helper —
that split already exists and must be preserved, because Workers have no `fs`.
From that point Compass owns the bearing schema and every other consumer pins a
version. Savvy keeps a standing-profile stub and consumes; it does not own.

## Consequences

- Orchestra's role changes without any change to Orchestra: it stops being a
  candidate host and becomes the **reference implementation** of a deployed
  knowledge-worker MCP server. Compass is the second instance, and the second
  instance is what proves the pattern is forkable at all.
- Nothing is promoted to a shared template yet. If a third instrument appears,
  whatever both forks needed and neither had is the thing worth extracting into
  Orchestra's `templates/`. Extracting a framework from one example would shape
  it around the SDLC's quirks.
- Two Cloudflare Workers, two deployments, two secrets. An SDLC change cannot
  break a client engagement mid-journey.
- Savvy's `tools-compass-1.0` Linear project largely empties. SAV-77, SAV-114,
  SAV-121, and SAV-90 are canceled there with pointers here; SAV-68 (Brand
  Builder, eight gated stages) stays readable in Linear until its bearing is
  authored here. SAV-155 tracks the savvy-side deletion.
- The bearing schema needs its Savvy coupling stripped before it ships as a
  general instrument: `audience: ceo|owner` mirrors Savvy's CEO Hub gate, and
  `source:` entries point at `loft/data/kb/` paths. Both are product concerns.
- Two schema gaps recorded on the canceled SAV-121 travel with the loader and
  must be fixed here, not lost: targets carry no comparator direction (so a
  25-minute and a 4-minute wait time score identically), and `cadence: daily`
  is a hard validation failure rather than an unsupported value.

## Open — feeds ADR-002

> **Resolved 2026-07-20 by [ADR-002](ADR-002-the-client-workspace-is-the-workspace.md).**
> Cowork workspace files persist across sessions; ADR-003's principle extends,
> and the client's workspace is the workspace. The section below is retained as
> the framing that produced the question.

Orchestra's ADR-003 reasons from a git checkout: artifacts must live "where they
can be reviewed, diffed, and executed." Compass's first delivery target is a
Claude Desktop / Cowork workspace, which has files but no git, no branches, and
no pull-request review surface.

ADR-002 must decide whether that satisfies ADR-003 — whether the principle
extends (the client's filesystem is the workspace; git was sufficient, not
necessary) or whether client-facing instruments take a documented exception. The
argument for extending is that ADR-003's actual targets were the cloud-held
artifacts and the cloud-resident model loop, and both stay out under either
reading. The load-bearing property either way is that workspace files persist
across sessions and that MCP tool output can be written into them. If they do
not persist, the stateless design fails and server-side state returns as a
question — one Orchestra has already answered badly once.

Nothing in this repository should assume the answer until ADR-002 records it.

## References

- Orchestra: https://github.com/mpazaryna/orchestra — `apps/mcp-sdlc`,
  `packages/core`, `scripts/build-skills.mjs`, ADR-001, ADR-003
- Authentic Advantage: https://github.com/mpazaryna/authentic-advantage —
  the Compass MCP server and CompassKit implementations
- discovery-engine: https://github.com/mpazaryna/discovery-engine
- SAV-155 — Access Compass from the Orchestra project (savvy-side extraction)
- Savvy ADR-004 (standing-bearing delivery) and ADR-005 (journeys as Durable
  Objects) — ADR-005's runtime conclusion is superseded by this decision

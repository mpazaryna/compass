---
ticket: 002-mcp-compass
status: approved
created_on: 2026-07-24
approved_on: 2026-07-24
---

# MCP Server — Compass Serves Bearings Over a Connector

## Problem

M1 gave Compass an owned schema and a Worker-ready loader, but nothing serves
it. The bearings exist as data; there is no deployed endpoint a chat client can
reach, and the only prior Compass that *did* serve (the legacy Python
`mcp-compass`) is a stdio server connected through `claude_desktop_config.json` —
the local-JSON path SHE-12 is explicitly leaving behind, and a different domain
model (project methodology) than the bearing-driven one this repo owns.

So the roadmap's M2 objective — *"a client connects a chat client to a deployed
endpoint and gets only their own bearings"* — has no implementation, and
everything downstream (M3's real Brand Builder, M4's first engagement) blocks on
it.

## Objective

Stand up the Compass MCP server as a Cloudflare Worker that bakes the bearing set
at build time and serves it over Streamable HTTP, reachable from Claude Desktop
as a **custom connector** (not a stdio entry). ADR-001 already settled the runtime
by copying Orchestra's skeleton; this work item turns that decision into a
deployed, connector-verified endpoint.

## Success Criteria

- [ ] A Cloudflare Worker serves MCP over Streamable HTTP at `/mcp` — `initialize`,
      `tools/list`, `tools/call`, `202` for notifications, JSON-RPC error codes
- [ ] Bearings are **baked parsed-and-validated** at build time; the Worker ships
      no YAML parser and a malformed bearing fails the build, not a session
- [ ] Claude Desktop connects to it as a custom connector and can list and fetch
      bearings end to end
- [ ] The tool surface and `initialize` instructions are the product surface —
      hand-written for a methodology client, never "do software development"
- [ ] No Durable Objects, no KV, no R2, no database — a stateless `wrangler` config
      (ADR-001); the server carries the method, the client carries the state
- [ ] Deploys to the shared Cloudflare account with a repeatable `deploy` script

## Context

Serves **M2** (SHE-6). ADR-001 is unusually prescriptive here: Orchestra's entire
reusable surface is under 200 lines, and M2 is largely *plumbing that decision
already settled* — copy the JSON-RPC handler, copy the bake, diverge only where a
methodology instrument must differ from an SDLC one. The genuine design content is
small and named: the **tool surface**, the **`initialize` instructions**, and
**client-scoped serving**.

**A spike already proved half of this.** On branch `spike/002-mcp-connector`
(deployed at `compass-mcp-spike.mpazbot.workers.dev`) a hand-rolled JSON-RPC
handler serves the two M1 example bearings over Streamable HTTP, verified live in
Claude Desktop as a no-auth connector. That de-risked transport + connector +
Cloudflare deploy. This PRD folds that spike in and builds the real server around
it; it is prior art, not throwaway.

## Scope

### In M2

- The JSON-RPC `fetch` handler, promoted from the spike to the real server
  (`apps/mcp-compass`), following ADR-001's copied-from-Orchestra shape.
- `build-bearings.mjs` — bakes **parsed and validated** bearing objects into a
  generated module (not raw YAML strings as the spike does today).
- A real bearing set to serve (initially the journey + standing examples; M3
  authors the real Brand Builder).
- The tool surface and hand-written `initialize` instructions.
- Deploy script + a `workers.dev` (or routed) endpoint, connector-verified.

### Deferred out of M2 — named, not dropped

- **Per-client scoping + auth.** ADR-001's client-scoped serving ("the API key
  maps to a client, listing and fetching filtered by it") is the roadmap's
  *"gets only their own bearings"* criterion — and it requires identifying the
  caller. SHE-12 established that Claude Desktop connectors are **OAuth-or-none**,
  and OAuth needs persistent state (KV), which crosses ADR-001. So client-scoping
  travels with the auth decision: **SHE-16** (the ADR) then **SHE-15** (OAuth +
  scoping). M2 ships single-tenant / no-auth in dev; the boundary recorded on
  SHE-15 is that no-auth is acceptable only while the served bearings are
  synthetic/public.
- **The journey conversation engine** (running a journey, gate evaluation,
  scoring) — later. M2 *serves* bearings and their stages; it does not run the
  loop.

This sequences the roadmap's M2 rather than dropping any of it: deploy-and-serve
first (spiked), client-scoping second behind its own gate.

## Approach — copied, baked, diverged (ADR-001)

**Copied and owned outright:** the JSON-RPC handler (`/mcp` POST, `initialize`,
`202` for notifications, `tools/list`, `tools/call`, error codes) and a stateless
`wrangler` config. The spike is already this shape.

**Baked, not parsed at runtime.** Orchestra bakes raw content and parses on
demand; Compass bakes *parsed and validated* bearings — `build-bearings.mjs` runs
`loadBearing` at build time and writes plain objects into a generated module. The
Worker imports plain data and ships no YAML parser. M1's serialization guarantee
(parsed bearings survive `JSON.parse(JSON.stringify(...))` unchanged, no
`undefined` keys) is exactly what makes this safe. The spike's parse-at-cold-start
is a simplification to replace.

**Diverged deliberately** (ADR-001): tools take a bearing argument
(`get_stage(bearing, stage)`, not Orchestra's `get_prompt(stage)`), and the
`initialize` instructions are hand-written for a methodology client.

## Tool surface — proposed, to be settled in the spec

Starting point, mining the spike and the legacy `mcp-compass` for what a client
actually needs:

| Tool | Purpose |
|---|---|
| `list_bearings` | What bearings are available (scoped, once auth lands) |
| `get_bearing(bearing)` | The whole parsed bearing |
| `get_stage(bearing, stage)` | One journey stage — prompt + gate (ADR-001's shape) |

The exact set — whether M2 needs gate/next-stage navigation, or stays list+get
until the journey engine — is a spec decision. The legacy Python server's tool
list is reference for what to preserve or deliberately drop.

## Decisions

**1. Fold the spike in; don't restart.** The spike proved transport + connector +
deploy against real baked bearings. M2 promotes it to `apps/mcp-compass`, swaps
parse-at-runtime for bake-parsed, and adds the tool surface — rather than a
greenfield rewrite.

**2. M2 ships without per-client auth.** The roadmap's "gets only their own
bearings" is real M2 intent, but it depends on the auth decision (SHE-16) which is
an ADR-level change to ADR-001. Rather than block a working connector on that, M2
deploys single-tenant and client-scoping is its gated second phase. This matches
how the spike was used today and keeps auth a conscious decision, not drift.

**3. Bake parsed objects, not raw YAML.** Per ADR-001 and the M1 PRD, the Worker
ships no YAML parser; validation happens at build. This is a change from the
spike and the reason M1 pinned the serialization guarantee.

## Materials

| Deliverable | Location | Status |
|-------------|----------|--------|
| MCP Worker (JSON-RPC handler) | `apps/mcp-compass/src/index.ts` | Spiked |
| Bake script (parsed + validated) | `apps/mcp-compass/scripts/build-bearings.mjs` | Not started |
| Wrangler config (stateless) | `apps/mcp-compass/wrangler.jsonc` | Spiked |
| Tool surface + `initialize` instructions | `apps/mcp-compass/src/` | Not started |
| Served bearing set | `apps/mcp-compass/` (baked) | Not started |
| Deploy + connector verification | — | Spiked (no-auth) |

## References

- [ADR-001](../../adr/ADR-001-fork-the-orchestra-pattern.md) — the runtime,
  copied handler, bake, client-scoped serving, own `initialize` instructions
- [ADR-002](../../adr/ADR-002-the-client-workspace-is-the-workspace.md) — the
  client's workspace holds state; the server holds none
- M1 loader — `packages/core` (`@compass/core`), the serialization guarantee
- Spike: branch `spike/002-mcp-connector`, live at
  `compass-mcp-spike.mpazbot.workers.dev`
- Legacy `mcp-compass` (Python/FastMCP) — https://github.com/mpazaryna/mcp-compass
  — tool-surface reference, being replaced
- SHE-6 (M2 milestone), SHE-13 (this PRD), SHE-14/15/16 (fold-in, auth, ADR)

## Notes — open questions for the spec

1. **Tool surface depth.** List+get only, or journey navigation
   (`get_stage`/gate/next) in M2? Depends on whether M3 needs navigation to
   author against.
2. **Auth scheme, when it lands.** ADR-001 says copy Orchestra's `auth.ts`
   (bearer token vs Worker secret), but connectors are OAuth-or-none — so the
   bearer assumption is what SHE-16 revisits. M2 doesn't resolve this; it records
   the dependency.
3. **Endpoint shape.** `workers.dev` subdomain (spike) vs a routed custom domain
   for the real server — cosmetic for dev, matters once shared.

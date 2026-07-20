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

## Usage

{fill in after M2 ships}

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

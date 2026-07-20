---
id: ADR-000
status: accepted
created_on: 2026-07-20
---

# ADR-000: The Score

## Decision

This project uses Orchestra — a software development lifecycle encoded for agents. PRDs are the unit of work. Every significant piece of work has a PRD before a spec, and a spec before implementation.

## Rationale

Without a written PRD, work drifts. Without a spec, agents have no contract to
execute against. Without Gherkin, there is no definition of done an agent can verify.

The `.orchestra/` folder is the shared knowledge base. Agents read it. Humans update
it at each gate. The score doesn't change mid-performance without a new ADR.

## Consequences

- No implementation without an approved spec
- No spec without an approved PRD
- All significant architectural decisions are recorded as ADRs

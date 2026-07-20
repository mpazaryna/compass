# .orchestra/

Agent knowledge base for this project. All agents read this folder before acting.

## Structure

- `roadmap.md` — The score. Project vision and milestone index.
- `adr/` — Architecture Decision Records. Decisions that affect future agents.
- `work/` — Per-work-item folders. Each contains a PRD, spec, and gherkin.
- `uml/` — Mermaid diagrams for architecture, workflows, and state machines.
- `devlog/` — Chronological journal of development sessions.

## The Loop

```
/orchestra-roadmap   → define vision and milestones
/orchestra-plan      → PRD → Spec → Gherkin for a work item
/orchestra-implement → execute an approved spec
/orchestra-review    → validate implementation against spec
/orchestra-merge     → merge and close the work item
```

## Rules

- Agents read the roadmap and relevant ADRs before acting on any work item
- Every work item has a PRD before a spec; every spec before implementation
- Nothing moves forward without explicit human approval at each gate

## A note on two vocabularies

This repo builds Compass, whose domain nouns are **bearings**, **journeys**, and
**stages** — and it is *developed using* Orchestra, whose nouns are **stages**,
**gates**, and **skills**. `stage` appears in both and means different things:
an Orchestra stage is a step in the SDLC (prd, spec, …); a Compass stage is a
step inside a journey bearing. Read the context before assuming which is meant.

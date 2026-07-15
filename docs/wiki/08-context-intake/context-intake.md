---
title: Context Intake
status: current
owner: Dev
last_reviewed: 2026-07-14
review_frequency: weekly
source_of_truth: true
related_code:
  - scripts/ingest-chopdot-thread.mjs
  - scripts/generate-chopdot-wiki.mjs
related_docs:
  - docs/adr/0002-kg-is-index-not-source-of-truth.md
  - docs/adr/0003-thread-imports-are-evidence-not-truth.md
  - docs/wiki/06-agentops/build-loop.md
tags:
  - context-intake
  - agentops
  - wiki
---

# Context Intake

Context intake is how ChopDot imports useful work from Codex threads, side agents, AI Studio runs, and AgentOps reports without letting generated summaries become product truth.

## Rule

Imported context can route attention. It cannot replace:

- product cards;
- journey reviews;
- code;
- tests;
- screenshots;
- ADRs.

## Intake Flow

```text
external thread or agent run
-> explicit intake page
-> related product card / journey / proof artifact
-> wiki generated index
-> product checkpoint when the work changes repo direction
```

## Required Intake Fields

Each imported context page should include:

- source id or thread id;
- source type;
- imported date;
- current status;
- facts;
- inferences;
- assumptions;
- routing impact;
- source limitations;
- next action.

## Commands

- `npm run wiki:ingest-thread -- --thread-id=THREAD --title="Title" --summary="Summary"`
- `npm run wiki:generate`
- `npm run wiki:validate`
- `npm run product:validate`

## Source Truth

- `docs/adr/0002-kg-is-index-not-source-of-truth.md`
- `docs/adr/0003-thread-imports-are-evidence-not-truth.md`

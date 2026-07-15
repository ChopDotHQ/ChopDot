---
title: Agent Build Loop
status: current
owner: Dev
last_reviewed: 2026-07-06
review_frequency: monthly
source_of_truth: false
related_code:
  - scripts/chopdot-product-cockpit.mjs
related_docs:
  - AGENTS.md
  - product/journey-review-plan.md
  - docs/CHOPDOT_OPERATING_LOOPS.md
  - docs/wiki/08-context-intake/context-intake.md
tags:
  - agentops
  - build-loop
---

# Agent Build Loop

Agents should build through a narrow loop:

```text
context intake -> wiki route -> source truth -> product card -> implementation -> tests -> screenshots -> doc impact
```

## Rule

Do not start from a generated shell, old plan, or adapter doc without checking current product truth.

If the work starts in another Codex thread, side worktree, AgentOps report, or AI Studio run, import a context page first:

```bash
npm run wiki:ingest-thread -- --thread-id=THREAD --title="Title" --summary="Summary"
npm run wiki:sync
```

Imported context is evidence. It is not product truth until backed by product cards, journey reviews, code, tests, screenshots, or ADRs.

## Source Truth

- `AGENTS.md`
- `product/journey-review-plan.md`
- `docs/CHOPDOT_OPERATING_LOOPS.md`
- `docs/wiki/08-context-intake/context-intake.md`

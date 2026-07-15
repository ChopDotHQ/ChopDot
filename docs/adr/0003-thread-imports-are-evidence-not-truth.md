---
title: Thread Imports Are Evidence Not Truth
status: current
owner: Dev
last_reviewed: 2026-07-06
review_frequency: quarterly
source_of_truth: true
related_code:
  - scripts/ingest-chopdot-thread.mjs
related_docs:
  - docs/wiki/08-context-intake/context-intake.md
  - docs/adr/0002-kg-is-index-not-source-of-truth.md
tags:
  - adr
  - context-intake
  - codex-thread
---

# ADR 0003: Thread Imports Are Evidence Not Truth

## Decision

Imported Codex threads and agent-run summaries are evidence and routing context. They are not canonical ChopDot truth.

## Context

Important work happens across Codex threads, AI Studio runs, side worktrees, AgentOps reports, and browser sessions. If that work stays only in chat, agents lose it. If summaries silently become truth, agents drift.

## Consequences

- Imported thread pages must state facts, inferences, assumptions, routing impact, source limitations, and next action.
- Imported context must point to source artifacts where possible.
- Product changes still require product cards, journey reviews, tests, screenshots, or ADRs.
- Generated wiki indexes may surface imported context, but agents must verify current source artifacts before acting.


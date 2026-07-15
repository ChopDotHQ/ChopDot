---
title: Use Repo Native Wiki
status: current
owner: Dev
last_reviewed: 2026-07-05
review_frequency: quarterly
source_of_truth: true
related_code:
  - scripts/generate-chopdot-wiki.mjs
  - scripts/validate-chopdot-wiki.mjs
related_docs:
  - docs/wiki/README.md
tags:
  - adr
  - wiki
---

# ADR 0001: Use Repo Native Wiki

## Decision

ChopDot will use a repo-native Markdown wiki under `docs/wiki/` before adopting a hosted or framework-based docs site.

## Context

ChopDot has product cards, story maps, journey reviews, native research, design references, and generated cockpit views. Agents need a routing layer that points to source truth without creating a second product operating system.

## Consequences

- Markdown remains easy to diff, review, and index.
- Generated wiki files are read models.
- Fumadocs, Nextra, Mintlify, and GitBook remain deferred.
- Non-trivial changes must state documentation impact.


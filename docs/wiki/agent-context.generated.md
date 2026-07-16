<!-- GENERATED: run npm run wiki:generate. Do not edit by hand. -->

# ChopDot Agent Context

Generated: 2026-07-16T12:18:48.344Z

Use this as a routing map. Follow links to source truth before changing code or making claims.

## Read First

1. `docs/wiki/00-start-here/what-is-chopdot.md`
2. `docs/wiki/00-start-here/current-product-state.md`
3. `docs/wiki/00-start-here/how-agents-should-work.md`
4. `product/story-map.md`
5. `product/cards.md`
6. `docs/wiki/08-context-intake/context-intake.md` when continuing work from another Codex thread or imported agent run

## Routing

### Start Here

- `docs/wiki/00-start-here/current-product-state.md` — Current Product State (current)
- `docs/wiki/00-start-here/how-agents-should-work.md` — How Agents Should Work (current)
- `docs/wiki/00-start-here/what-is-chopdot.md` — What Is ChopDot (current)

### Product Truth

- `docs/wiki/01-product-truth/evidence-levels.md` — Evidence Levels (current)
- `docs/wiki/01-product-truth/non-goals.md` — Non Goals (current)
- `docs/wiki/01-product-truth/pillars.md` — Product Pillars (current)
- `docs/wiki/01-product-truth/product-spine.md` — Product Spine (current)

### User Journeys

- `docs/wiki/02-user-journeys/community-fund.md` — Community Fund Journey (draft)
- `docs/wiki/02-user-journeys/emergency-pot.md` — Emergency Pot Journey (current)
- `docs/wiki/02-user-journeys/normal-pot.md` — Normal Pot Journey (current)
- `docs/wiki/02-user-journeys/savings-circle.md` — Savings Circle Journey (current)
- `docs/wiki/02-user-journeys/settlement.md` — Settlement Journey (current)
- `docs/wiki/02-user-journeys/spend-capture.md` — Spend Capture Journey (draft)

### State Models

- `docs/wiki/03-state-models/native-session-state.md` — Native Session State Model (draft)
- `docs/wiki/03-state-models/payment-state.md` — Payment State Model (current)
- `docs/wiki/03-state-models/pot-closeout-state.md` — Pot Closeout State Model (current)
- `docs/wiki/03-state-models/privacy-state.md` — Privacy State Model (current)

### Design Quality

- `docs/wiki/04-design-quality/batch-1-2-principles.md` — Batch 1 And 2 Principles (current)
- `docs/wiki/04-design-quality/effortless-app-gate.md` — Effortless App Gate (current)
- `docs/wiki/04-design-quality/money-app-reference.md` — Money App Reference (current)

### Polkadot Native

- `docs/wiki/05-polkadot-native/asset-hub.md` — Asset Hub (current)
- `docs/wiki/05-polkadot-native/bulletin.md` — Bulletin (draft)
- `docs/wiki/05-polkadot-native/chopdot-dot-overview.md` — ChopDot Dot Overview (current)
- `docs/wiki/05-polkadot-native/chopdot-dot-smoke.md` — ChopDot Dot Smoke Lane (current)
- `docs/wiki/05-polkadot-native/native-boundaries.md` — Native Boundaries (current)
- `docs/wiki/05-polkadot-native/statement-store.md` — Statement Store (draft)

### AgentOps

- `docs/wiki/06-agentops/build-loop.md` — Agent Build Loop (current)
- `docs/wiki/06-agentops/failure-modes.md` — Agent Failure Modes (current)
- `docs/wiki/06-agentops/review-loop.md` — Agent Review Loop (current)
- `docs/wiki/06-agentops/user-path-coverage.md` — User Path Coverage (current)

### Quality

- `docs/wiki/07-quality/hard-path-qa.md` — Hard Path QA (current)
- `docs/wiki/07-quality/release-checklist.md` — Release Checklist (draft)
- `docs/wiki/07-quality/testing-strategy.md` — Testing Strategy (current)

### Context Intake

- `docs/wiki/08-context-intake/codex-thread-019f1ce5-telegram-portable-shell.md` — Codex Thread 019f1ce5 Telegram Portable Shell (current)
- `docs/wiki/08-context-intake/context-intake.md` — Context Intake (current)
- `docs/wiki/08-context-intake/w3s-open-source-map-2026-07-07.md` — W3S Open Source Map 2026 07 07 (current)

### ADRs

- `docs/adr/0001-use-repo-native-wiki.md` — Use Repo Native Wiki (current)
- `docs/adr/0002-kg-is-index-not-source-of-truth.md` — KG Is Index Not Source Of Truth (current)
- `docs/adr/0003-thread-imports-are-evidence-not-truth.md` — Thread Imports Are Evidence Not Truth (current)
- `docs/adr/0004-server-derived-payment-actor.md` — Server-Derived Payment Actor Boundary (current)
- `docs/adr/0005-portable-product-native-host-boundary.md` — Portable Product and Native Host Boundary (current)

## Never Assume

- Never assume generated files are source truth.
- Never assume KG/search replaces repo docs.
- Never expose Polkadot/native infrastructure in normal UI.
- Never treat happy-path tests as enough for journey promotion.

# Journey 27 — Account & Preferences V1

Status: **current definition stage** after Journey 26 Golden freeze. Prototype not built yet.

## Goal

Manage identity, notifications, appearance, security, and deletion.

## Entry

You or account menu

## Exit

Previous context or signed out

## Authority

This is a definition seed from the canonical registry only. Builder must define identity/preferences/security/deletion scope, state ownership, caller reachability, failure/retry/unknown outcomes, and recovery before creating a candidate. No account mutation or deletion behavior is approved by this seed.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

**Coverage:** Journey 27 initialization only; no candidate UX decisions are approved or inferred.

### J27-D01 — Initialize Journey 27 from the canonical registry

**Decision:** Journey 27 becomes the current definition-stage journey only after Journey 26 is checksum-locked as Golden #26 and the resulting canonical state is verified.

**Why:** Preserve sequential authority and prevent account/preferences implementation from outrunning the approved Golden chain.

**Alternatives:** Starting Journey 27 implementation before the J26 freeze is not authorized.

**Tradeoffs:** Definition work waits for exact verification, but authority remains auditable and deterministic.

**Revisit when:** A Builder proposes the first J27 candidate or the canonical registry is explicitly revised.

**Approval / version:** Process initialization only; J27 V1 remains unapproved.

**Sources:** [Journey registry](../../registry/journeys.json) and [review protocol](../../REVIEW_PROTOCOL.md).
<!-- JOURNEY_DECISION_HISTORY:END -->

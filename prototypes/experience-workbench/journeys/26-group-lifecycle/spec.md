# Journey 26 — Group Lifecycle V1

Status: **current definition stage** after Journey 25 Golden freeze. Prototype not built yet.

## Goal

Rename, configure, archive, leave, or delete safely.

## Entry

Group settings

## Exit

Group Home or Home

## Authority

This is a definition seed from the canonical registry only. Builder must define group-lifecycle states, destructive-action safeguards, ownership boundaries, caller reachability, failure/retry/unknown outcomes and recovery before creating a candidate. No rename/archive/leave/delete behavior is approved by this seed.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

**Coverage:** Journey 26 initialization only; no candidate UX decisions are approved or inferred.

### J26-D01 — Initialize Journey 26 from the canonical registry

**Decision:** Journey 26 becomes the current definition-stage journey only after Journey 25 is checksum-locked as Golden #25.

**Why:** Preserve sequential authority and prevent group-lifecycle implementation from outrunning the approved Golden chain.

**Alternatives:** Starting Journey 26 implementation before the J25 freeze is not authorized.

**Tradeoffs:** Definition work starts after exact verification, but authority remains auditable and deterministic.

**Revisit when:** A Builder proposes the first J26 candidate or the canonical registry is explicitly revised.

**Approval / version:** Process initialization only; J26 V1 remains unapproved.

**Sources:** [Journey registry](../../registry/journeys.json) and [review protocol](../../REVIEW_PROTOCOL.md).
<!-- JOURNEY_DECISION_HISTORY:END -->

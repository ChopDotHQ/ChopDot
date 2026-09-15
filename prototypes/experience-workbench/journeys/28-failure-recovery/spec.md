# Journey 28 — Things Go Wrong / Recovery V1

Status: **current definition stage** after Journey 27 Golden freeze. Prototype not built yet.

## Goal

Keep every journey understandable when things fail or conflict.

## Entry

Every journey

## Exit

Recovered state, safe retry, or explicit stop

## Authority

Journey 28 is the registered cross-cutting recovery closeout. Builder must define the shared failure, conflict, stale/unknown-result, cancellation, retry, reconciliation and explicit-stop patterns that remain material across the validated Golden set. It must not silently redesign prior Golden product meaning. Every material state must be caller-reachable or explicitly classified as an owner/system boundary.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

**Coverage:** Journey 28 initialization only; no candidate UX decisions are approved or inferred.

### J28-D01 — Initialize the registered cross-cutting recovery journey

**Decision:** Journey 28 becomes current only after Journey 27 is checksum-locked as Golden #27 and the resulting canonical state is verified.

**Why:** The final registered journey must reconcile failure/recovery patterns against the validated Golden set without reopening approved product meaning.

**Alternatives:** Starting J28 candidate work before the J27 transition verifies is not authorized.

**Tradeoffs:** Closeout waits for exact verification, preserving sequential authority and auditability.

**Revisit when:** A Builder proposes the first J28 candidate or the canonical registry is explicitly revised.

**Approval / version:** Process initialization only; J28 V1 remains unapproved.

**Sources:** [Journey registry](../../registry/journeys.json) and [review protocol](../../REVIEW_PROTOCOL.md).
<!-- JOURNEY_DECISION_HISTORY:END -->

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

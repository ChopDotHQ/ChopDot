## Decision history

**Coverage:** Journey 23 initialization only; no candidate UX decisions are approved or inferred.

### J23-D01 — Initialize Journey 23 from the canonical registry

**Decision:** Journey 23 becomes the current definition-stage journey only after Journey 22 is checksum-locked as Golden #22.

**Why:** Preserve sequential authority and prevent import implementation from outrunning the approved Golden chain.

**Alternatives:** Starting import implementation before the J22 freeze is not authorized.

**Tradeoffs:** Definition work starts later, but authority remains auditable and deterministic.

**Revisit when:** A Builder proposes the first J23 candidate or the canonical registry is explicitly revised.

**Approval / version:** Process initialization only; J23 V1 remains unapproved.

**Sources:** [Journey registry](../../registry/journeys.json) and [review protocol](../../REVIEW_PROTOCOL.md).

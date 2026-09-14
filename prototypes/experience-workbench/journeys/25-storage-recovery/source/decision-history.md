## Decision history

**Coverage:** Journey 25 initialization only; no candidate UX decisions are approved or inferred.

### J25-D01 — Initialize Journey 25 from the canonical registry

**Decision:** Journey 25 becomes the current definition-stage journey only after Journey 24 is checksum-locked as Golden #24.

**Why:** Preserve sequential authority and prevent storage/recovery implementation from outrunning the approved Golden chain.

**Alternatives:** Starting Journey 25 implementation before the J24 freeze is not authorized.

**Tradeoffs:** Definition work starts after exact verification, but authority remains auditable and deterministic.

**Revisit when:** A Builder proposes the first J25 candidate or the canonical registry is explicitly revised.

**Approval / version:** Process initialization only; J25 V1 remains unapproved.

**Sources:** [Journey registry](../../registry/journeys.json) and [review protocol](../../REVIEW_PROTOCOL.md).

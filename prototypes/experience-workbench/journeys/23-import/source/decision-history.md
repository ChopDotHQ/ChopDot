## Decision history

**Coverage:** Builder-proposed Journey 23 V1 definition recorded 2026-09-11 from the canonical J23 seed, shared design/review contracts and adjacent Golden ownership. These entries define an unapproved candidate contract; they do not create production format support, human approval or a Golden.

### J23-D01 — Initialize Journey 23 from the canonical registry

**Decision:** Journey 23 becomes the current definition-stage journey only after Journey 22 is checksum-locked as Golden #22.

**Why:** Preserve sequential authority and prevent import implementation from outrunning the approved Golden chain.

**Alternatives:** Starting import implementation before the J22 freeze is not authorized.

**Tradeoffs:** Definition work starts later, but authority remains auditable and deterministic.

**Revisit when:** The canonical registry is explicitly revised.

**Approval / version:** Process initialization only; J23 V1 remains unapproved.

**Sources:** [Journey registry](../../../registry/journeys.json), [progress](../../../registry/progress.json), [review protocol](../../../REVIEW_PROTOCOL.md).

### J23-D02 — Preview before any import write

**Decision:** Source selection and parsing are read-only. A human-readable preview and explicit `Import group` confirmation are required before the first product write.

**Why:** The canonical goal says existing history must be brought in safely; the shared contract requires clear authority and honest pending/failure states.

**Alternatives:** Immediate import on source selection and write-while-parsing are rejected for V1 because they remove a meaningful review/cancel boundary.

**Tradeoffs:** Import takes an extra confirmation step, but mistakes are caught before product state changes.

**Revisit when:** A future trusted source can prove a safer equivalent confirmation model without weakening user control.

**Approval / version:** Proposed J23 V1 behavior; unapproved until independent review and explicit human approval.

**Sources:** [J23 canonical seed](../spec.md), [Design Contract](../../../DESIGN_CONTRACT.md).

### J23-D03 — V1 imports one new group; it does not merge into an existing group

**Decision:** Import one group package at a time into a new group. Exact prior-import duplicates no-op to the existing imported group; merely similar groups require warning/review and are never auto-merged.

**Why:** Merge semantics can rewrite existing group history and identities. The canonical seed explicitly withholds merge, deduplication and conflict-policy authority until they are defined.

**Alternatives:** Bulk import, background sync and merge-into-existing are deferred rather than implicitly invented inside V1.

**Tradeoffs:** Users with an existing near-duplicate group may need to keep two groups until a later deliberate merge capability exists.

**Revisit when:** A separately defined merge contract can preserve provenance, identity, balances and rollback deterministically.

**Approval / version:** Proposed J23 V1 behavior; unapproved.

**Sources:** [J23 canonical seed](../spec.md), [Journey 03 group-creation Golden](../../03-create-group/spec.md), [Journey registry](../../../registry/journeys.json).

### J23-D04 — Identity and monetary truth are never guessed

**Decision:** Ambiguous imported people are not auto-linked from name similarity, and ambiguous/unsupported currency or amount semantics are not silently converted or replaced. Conflicts must be reviewed or kept separate/blocking as appropriate.

**Why:** Importing history must not create false identity or financial truth.

**Alternatives:** Name-only auto-linking and silent currency normalization are rejected for V1.

**Tradeoffs:** Some imports need manual review, but imported records remain explainable and reversible.

**Revisit when:** Stable identity/provenance evidence or an approved currency-normalization contract provides deterministic mappings.

**Approval / version:** Proposed J23 V1 behavior; unapproved.

**Sources:** [Design Contract](../../../DESIGN_CONTRACT.md), [Journey 08 Group Home Golden](../../08-group-home/spec.md).

### J23-D05 — Import history carries no payment, sharing or wallet authority

**Decision:** Imported payment/settlement-looking records are historical data only. Import cannot initiate settlement, connect/sign a wallet, expose receiving details, invite members or claim external verification/finality.

**Why:** Shared authority rules keep saved/history data distinct from execution, sharing and signing; import must not become a shortcut around owning journeys.

**Alternatives:** Replaying imported actions or treating imported destinations/accounts as live authority is rejected.

**Tradeoffs:** Imported history can describe what a source says happened without making those records executable or externally verified.

**Revisit when:** An owning journey explicitly defines a verified migration contract for one of those authority surfaces.

**Approval / version:** Proposed J23 V1 behavior; unapproved.

**Sources:** [Design Contract](../../../DESIGN_CONTRACT.md), [Journey registry](../../../registry/journeys.json).

### J23-D06 — Unknown or partial commit outcomes reconcile before retry

**Decision:** Known pre-write failure may retry directly; once a write may have started, an unknown/partial result must reconcile the existing import attempt before a second write is allowed.

**Why:** Blind retry can duplicate a group/history and turn recovery into a second mutation.

**Alternatives:** A generic `Try again` that always starts a fresh import is rejected after possible commit.

**Tradeoffs:** Recovery can take longer, but one logical import remains idempotent and the UI does not lie about outcome.

**Revisit when:** The storage layer guarantees an atomic, durable import transaction with a stronger proven retry contract.

**Approval / version:** Proposed J23 V1 behavior; unapproved.

**Sources:** [Design Contract](../../../DESIGN_CONTRACT.md), [Journey 28 registry boundary](../../../registry/journeys.json).

### J23-D07 — V1 remains source-format neutral at the UX contract layer

**Decision:** The J23 UX describes a user-selected import package and validation result without claiming support for a named provider, file extension, remote fetch or production parser. Prototype fixtures are evidence of the journey only.

**Why:** The canonical seed does not approve an import format or parser, and prototype behavior must not be presented as live production capability.

**Alternatives:** Naming Splitwise/CSV/JSON/ChopDot-export support without an approved format contract is deferred.

**Tradeoffs:** The first prototype demonstrates the safety model rather than promising a broad compatibility matrix.

**Revisit when:** A specific import/export format or provider integration is explicitly specified and reviewed.

**Approval / version:** Proposed J23 V1 behavior; unapproved.

**Sources:** [J23 canonical seed](../spec.md), [Design Contract](../../../DESIGN_CONTRACT.md).

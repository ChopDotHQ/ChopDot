## Decision history

**Coverage:** Backfilled on 2026-09-10 from the existing Journey 15 Golden specification and retained validation/QA records. This records only what those inspected sources support; it does not reconstruct the lost temporary review conversation or claim the recovered HTML is byte-identical to it.

### J15-D01 — Read-only canonical payment history

**Decision:** One canonical record per payment, with lifecycle events in its timeline and no write authority in history.

**Why:** Users need to understand what happened without history becoming another payment state machine UI.

**Alternatives:** One row per attempt; editable ledger history. Rejected because they create duplicate-looking payments or mutate truth.

**Tradeoffs:** Detailed execution recovery remains in Journey 12.

**Revisit when:** Research shows users cannot distinguish payment identity from attempts, or legal retention requirements demand additional fields.

**Approval / version:** V1, Design Approved as Golden #15. This approval status is confirmed by the current registry; the historical decision text was already present in the Journey 15 specification.

**Sources:** [Journey 15 specification](../spec.md); [Journey 15 visual QA](../VISUAL_QA.md); [Journey 15 Golden validation](../golden-validation.json).

### J15-D02 — Durable recovery of the reviewed artifact

**Decision:** Preserve the approved product decisions and reviewed visual evidence in a new durable artifact because the temporary review HTML was not committed.

**Why:** The workbench must be restartable from GitHub rather than this chat.

**Alternatives:** Not recorded in inspected sources.

**Tradeoffs:** The recovered artifact has a new checksum and is not claimed to be the lost byte sequence.

**Revisit when:** The original temporary HTML is later recovered and can be compared safely.

**Approval / version:** V1, Design Approved as Golden #15. The recovery provenance and Golden status are recorded in the existing specification and validation file.

**Sources:** [Journey 15 specification](../spec.md); [Journey 15 Golden validation](../golden-validation.json); [recovered durable artifact](../v1-recovered.html).

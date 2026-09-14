## Decision history

**Coverage:** Journey 24 V1 scope, artifact semantics, privacy, identity, operation binding, destination boundaries, and recovery behavior. This source was mechanically normalized at Golden freeze to the existing decision-history schema without changing the reviewed J24 product decisions or approved HTML.

### J24-D01 — Activate Journey 24 only after J23 Golden #23

**Decision:** J24 begins only after the exact J23 approved artifact is checksum-locked and verified as Golden #23.

**Why:** Preserve sequential authority.

**Alternatives:** Starting J24 before J23 Golden #23 was not authorized.

**Tradeoffs:** Not recorded in inspected sources.

**Revisit when:** Maintenance note: only if the canonical sequential-authority model is explicitly revised.

**Approval / version:** Process initialization for J24 V1; the exact J24 V1 artifact was later independently reviewed and explicitly approved for Golden freeze.

**Sources:** [Journey registry](../../../registry/journeys.json) and [J24 review receipt](https://github.com/ChopDotHQ/ChopDot/issues/38#issuecomment-5663139837).

### J24-D02 — V1 scope is account-wide or one group

**Decision:** Users choose account-wide or one-group export. Scope remains visible/reversible until final confirmation; changing it invalidates preview.

**Why:** A single explicit scope is easier to understand and bind to one snapshot/operation than an arbitrary hidden mixture.

**Alternatives:** Silent “everything we can find” export or automatic multi-group scope expansion was rejected.

**Tradeoffs:** Not recorded in inspected sources.

**Revisit when:** Maintenance note: revisit only if a future reviewed version introduces a different scope model.

**Approval / version:** J24 V1 reviewed decision; approved only with exact Golden #24 artifact bytes.

**Sources:** [J24 specification](../spec.md) and [J24 review receipt](https://github.com/ChopDotHQ/ChopDot/issues/38#issuecomment-5663139837).

### J24-D03 — One named portable package with explicit exclusions

**Decision:** V1 produces `chopdot-portable-v1` with manifest + portable records. Raw receiving details, credentials, secrets, signing/session material, and secret-like unexpected fields are excluded/blocking by policy.

**Why:** Portability must not weaken privacy or turn copied data into authority.

**Alternatives:** Copy every stored field blindly was rejected.

**Tradeoffs:** Not recorded in inspected sources.

**Revisit when:** Maintenance note: revisit only if a future reviewed package version changes the explicit include/exclude policy.

**Approval / version:** J24 V1 reviewed decision; approved only with exact Golden #24 artifact bytes.

**Sources:** [J24 specification](../spec.md) and [J24 trust/privacy review](https://github.com/ChopDotHQ/ChopDot/issues/38#issuecomment-5663139837).

### J24-D04 — Exported records remain history/data, never authority

**Decision:** Payment, settlement, wallet-looking, receiving, QR, and imported records remain read-only history/metadata. Export creates no payment/share/sign/wallet/settlement/retry permission.

**Why:** Preserve Journey 14/15/20/21 authority boundaries and prevent portable files from becoming bearer credentials.

**Alternatives:** Not recorded in inspected sources.

**Tradeoffs:** Not recorded in inspected sources.

**Revisit when:** Maintenance note: revisit only through a separately reviewed authority-model change; portable data must not silently become executable authority.

**Approval / version:** J24 V1 reviewed decision; approved only with exact Golden #24 artifact bytes.

**Sources:** [J24 specification](../spec.md) and [J24 review receipt](https://github.com/ChopDotHQ/ChopDot/issues/38#issuecomment-5663139837).

### J24-D05 — Preserve identity and money semantics exactly

**Decision:** Stable IDs and unresolved identity facts survive export. Money/assets/currencies/statuses are copied as recorded; J24 never name-links people or converts/normalizes financial truth.

**Why:** Portability should preserve uncertainty and meaning, not “clean it up” by guessing.

**Alternatives:** Not recorded in inspected sources.

**Tradeoffs:** Not recorded in inspected sources.

**Revisit when:** Maintenance note: revisit only if a future reviewed version defines a separate explicit normalization or identity-resolution operation.

**Approval / version:** J24 V1 reviewed decision; approved only with exact Golden #24 artifact bytes.

**Sources:** [J24 specification](../spec.md) and [J24 review receipt](https://github.com/ChopDotHQ/ChopDot/issues/38#issuecomment-5663139837).

### J24-D06 — Preview and snapshot are read-only; first effect is Create export

**Decision:** Scope/data review/snapshot/preview are read-only. Artifact creation begins only after the explicit final `Create export` action and is bound to exact scope + snapshot + schema + destination intent.

**Why:** Users need a reversible review boundary and deterministic recovery key.

**Alternatives:** Not recorded in inspected sources.

**Tradeoffs:** Not recorded in inspected sources.

**Revisit when:** Maintenance note: revisit only if a future reviewed version changes the effect boundary or operation binding.

**Approval / version:** J24 V1 reviewed decision; approved only with exact Golden #24 artifact bytes.

**Sources:** [J24 specification](../spec.md) and [J24 review receipt](https://github.com/ChopDotHQ/ChopDot/issues/38#issuecomment-5663139837).

### J24-D07 — Artifact creation and destination success are separate facts

**Decision:** Package-ready, browser download request, system share/save sheet, and external destination success are distinct states. Returning from a system picker/share sheet is never treated as delivery success.

**Why:** Avoid false “saved/shared” claims and duplicate delivery.

**Alternatives:** Not recorded in inspected sources.

**Tradeoffs:** Not recorded in inspected sources.

**Revisit when:** Maintenance note: revisit only with separately reviewed destination semantics and evidence.

**Approval / version:** J24 V1 reviewed decision; approved only with exact Golden #24 artifact bytes.

**Sources:** [J24 specification](../spec.md) and [J24 review receipt](https://github.com/ChopDotHQ/ChopDot/issues/38#issuecomment-5663139837).

### J24-D08 — Unknown outcomes reconcile before retry

**Decision:** Unknown generation reconciles the operation before regeneration; unknown external delivery reconciles destination status before another delivery attempt. Known no-artifact/no-save facts permit replay-safe retry; unresolved truth stops at Journey 28.

**Why:** Prevent duplicate artifacts/delivery and preserve user trust.

**Alternatives:** Not recorded in inspected sources.

**Tradeoffs:** Not recorded in inspected sources.

**Revisit when:** Maintenance note: revisit only if a future reviewed version changes reconciliation ownership or idempotency guarantees.

**Approval / version:** J24 V1 reviewed decision; approved only with exact Golden #24 artifact bytes.

**Sources:** [J24 specification](../spec.md) and [caller-reachability review](https://github.com/ChopDotHQ/ChopDot/issues/38#issuecomment-5663139837).

### J24-D09 — Completeness and integrity language is deliberately narrow

**Decision:** “Export ready” means the selected snapshot was packaged under the visible include/exclude policy. Checksum means artifact-byte integrity only, not authenticity, completeness of external systems, backup status, or finality.

**Why:** The prototype and eventual product must not overclaim what an export can prove.

**Alternatives:** Not recorded in inspected sources.

**Tradeoffs:** Not recorded in inspected sources.

**Revisit when:** Maintenance note: revisit only if future reviewed evidence supports stronger provenance or completeness claims.

**Approval / version:** J24 V1 reviewed decision; approved only with exact Golden #24 artifact bytes.

**Sources:** [J24 specification](../spec.md) and [J24 review receipt](https://github.com/ChopDotHQ/ChopDot/issues/38#issuecomment-5663139837).

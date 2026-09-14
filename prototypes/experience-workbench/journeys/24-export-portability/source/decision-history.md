## Decision history

**Coverage:** Journey 24 V1 scope, artifact semantics, privacy, identity, operation binding, destination boundaries, and recovery behavior.

### J24-D01 — Activate Journey 24 only after J23 Golden #23

**Decision:** J24 begins only after the exact J23 approved artifact is checksum-locked and verified as Golden #23.

**Why:** Preserve sequential authority.

**Approval / version:** Process initialization; J24 remains unapproved.

### J24-D02 — V1 scope is account-wide or one group

**Decision:** Users choose account-wide or one-group export. Scope remains visible/reversible until final confirmation; changing it invalidates preview.

**Why:** A single explicit scope is easier to understand and bind to one snapshot/operation than an arbitrary hidden mixture.

**Alternative rejected:** Silent “everything we can find” export or automatic multi-group scope expansion.

### J24-D03 — One named portable package with explicit exclusions

**Decision:** V1 produces `chopdot-portable-v1` with manifest + portable records. Raw receiving details, credentials, secrets, signing/session material, and secret-like unexpected fields are excluded/blocking by policy.

**Why:** Portability must not weaken privacy or turn copied data into authority.

**Alternative rejected:** Copy every stored field blindly.

### J24-D04 — Exported records remain history/data, never authority

**Decision:** Payment, settlement, wallet-looking, receiving, QR, and imported records remain read-only history/metadata. Export creates no payment/share/sign/wallet/settlement/retry permission.

**Why:** Preserve Journey 14/15/20/21 authority boundaries and prevent portable files from becoming bearer credentials.

### J24-D05 — Preserve identity and money semantics exactly

**Decision:** Stable IDs and unresolved identity facts survive export. Money/assets/currencies/statuses are copied as recorded; J24 never name-links people or converts/normalizes financial truth.

**Why:** Portability should preserve uncertainty and meaning, not “clean it up” by guessing.

### J24-D06 — Preview and snapshot are read-only; first effect is Create export

**Decision:** Scope/data review/snapshot/preview are read-only. Artifact creation begins only after the explicit final `Create export` action and is bound to exact scope + snapshot + schema + destination intent.

**Why:** Users need a reversible review boundary and deterministic recovery key.

### J24-D07 — Artifact creation and destination success are separate facts

**Decision:** Package-ready, browser download request, system share/save sheet, and external destination success are distinct states. Returning from a system picker/share sheet is never treated as delivery success.

**Why:** Avoid false “saved/shared” claims and duplicate delivery.

### J24-D08 — Unknown outcomes reconcile before retry

**Decision:** Unknown generation reconciles the operation before regeneration; unknown external delivery reconciles destination status before another delivery attempt. Known no-artifact/no-save facts permit replay-safe retry; unresolved truth stops at Journey 28.

**Why:** Prevent duplicate artifacts/delivery and preserve user trust.

### J24-D09 — Completeness and integrity language is deliberately narrow

**Decision:** “Export ready” means the selected snapshot was packaged under the visible include/exclude policy. Checksum means artifact-byte integrity only, not authenticity, completeness of external systems, backup status, or finality.

**Why:** The prototype and eventual product must not overclaim what an export can prove.

**Sources:** canonical registry; `DESIGN_CONTRACT.md`; `REVIEW_PROTOCOL.md`; Journey 14/15/20/21 approved boundaries; J24 Scout findings in issue #38.

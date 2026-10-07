# Journey 24 — Export / Portability V1

Status: **candidate contract**. Journey 23 is validated Golden #23; Journey 24 is current and unapproved. This contract defines V1 export behavior for the prototype. It does not authorize production delivery, cloud storage, sharing, payment execution, wallet signing, or changes to any approved Golden.

## Goal

Take records out of ChopDot in a useful, understandable package while preserving ownership, privacy, identity ambiguity, original money/status semantics, and the distinction between a prepared artifact and where that artifact ultimately goes.

## Entry

- Account / You → Export my data.
- Group settings → Export this group.

## Exit

- A prepared ChopDot portable package with an explicit snapshot, scope, schema, included/excluded classes, and integrity metadata; or
- a local/browser/system destination handoff whose outcome is stated precisely; or
- a safe stop/recovery state when artifact creation or external delivery cannot be established.

Journey 24 is terminal in the canonical registry. Cross-cutting unresolved recovery may hand to Journey 28 without claiming success or retry authority.

## V1 product contract

### Scope and read authority

- V1 supports **account-wide export** or **one-group export**. Scope stays visible and reversible until explicit final confirmation.
- J24 exports only records the current user is already authorized to view. A group export does not claim ownership of other members' private data.
- J24 is read/copy-only with respect to existing ChopDot truth. It cannot edit groups, people, balances, expenses, settlements, payment methods, identities, wallet sessions, or status/finality.
- Changing scope after preview invalidates that preview and requires a fresh snapshot/review.

### Exact V1 artifact

V1 creates a **ChopDot portable package** identified as `chopdot-portable-v1`.

The deterministic package contract represented by this prototype contains:

- a manifest with package schema/version, snapshot time, selected scope, source record versions, included/excluded classes, unresolved identity markers, omission warnings, artifact operation ID, and package-byte checksum;
- portable records for groups, expenses, splits, comments/notes where the user may view them, activity/history, and settlement-history facts;
- stable internal record/member identifiers plus display labels where available;
- money, asset, currency, amount, and status values **as recorded**. J24 never converts, normalizes, re-prices, or rounds records merely to make export easier.

V1 deliberately excludes:

- private keys, seed phrases, signing material, session tokens, provider credentials, authentication secrets, push tokens, and secret-like unexpected fields;
- connected-wallet/session authority;
- raw bank/phone/PayPal/wallet receiving details governed by Journey 14/20 privacy scope;
- permissions or capabilities that would let another system pay, settle, retry, share, sign, connect a wallet, or reveal private receiving details.

Payment-method labels/types and payment/settlement history may appear only as historical metadata. Exported records never become payment, sharing, signing, wallet-session, settlement, or retry authority.

### Identity truth

- Preserve stable IDs plus display labels where available.
- Missing, ambiguous, imported, or unresolved identity linkage remains explicit in the artifact.
- Never merge/relink people by display name during export.
- An artifact later imported elsewhere must be revalidated by the importing journey. J24 does not claim round-trip equivalence or identity proof.

### Provenance, completeness, and integrity

- `Export ready` means the **selected snapshot was packaged**, not that all external/provider data is authentic, current, exhaustive, backed up, or already delivered elsewhere.
- The manifest visibly states omitted/private/unsupported classes and the snapshot boundary.
- A checksum proves integrity of the produced artifact bytes only. It does not prove truth/authenticity/finality of the underlying source records.
- Non-financial unsupported display-only fields may be omitted only when the manifest names that omission and record meaning/balances are unchanged. Secret-like fields block packaging rather than being copied through.

### Preview-before-effect and exact operation binding

- Scope selection, data-class explanation, snapshot preparation, preview, and final review are read-only.
- The first artifact-creation effect begins only after explicit **Create export** confirmation.
- One export operation is bound to exact scope + source snapshot/version + package schema + destination intent. The fixture operation ID used by the prototype is stable across its recovery states.
- If source data changes after preview, confirmation is invalidated and a fresh snapshot is required.
- If an artifact for the exact operation already exists, reuse/recover that artifact instead of silently creating another package.

### Destination boundaries

Package creation and destination are separate facts:

1. **Package ready** — artifact bytes exist in the prototype fixture; nothing has been saved/shared externally yet.
2. **Browser/device download request** — ChopDot can say a download was requested, but cannot claim where the browser/OS stored it without system confirmation.
3. **OS share/save sheet** — opening the system sheet is not delivery or external storage success.
4. **Named external destination** — only an explicit provider/system success result may be shown as externally saved; returning from a picker/share sheet is not success.

The prototype labels destination outcomes as deterministic fixtures. It does not exercise a real browser download, OS share sheet, cloud provider, database write, or external delivery.

### Cancellation, retry, and recovery

- Cancellation before final confirmation creates no artifact and no destination effect.
- Cancellation after generation starts stops future work where possible but cannot claim to recall bytes that may already have been created/downloaded/shared.
- A known failure before artifact creation may retry the same operation safely.
- Unknown/partial generation outcomes must reconcile the exact operation before retry. If an exact artifact is found, reuse it. If no artifact is verified, retry may regenerate the same logical operation. If truth cannot be established, stop and hand to Journey 28.
- Unknown/partial external-destination outcomes must reconcile destination status before another delivery attempt. They never cause another package-generation operation.
- Changing scope, source version, package schema, or destination intent starts a fresh reviewed operation rather than mutating an uncertain one.

## V1 state coverage

The candidate must implement all states in `STATE_INVENTORY.md`, including happy, empty, oversized, private/secret blocking, partial omission, identity ambiguity, stale snapshot, offline, cancellation, generation failure, unknown outcome, reconciliation, replay-safe retry, local download boundary, share/external-destination ambiguity, and cross-cutting recovery.

Owner/system boundaries are represented explicitly and do not copy adjacent Golden product truth.

## Prototype evidence boundary

The candidate is a deterministic standalone UX prototype. It may model package bytes, checksums, browser/system callbacks, and destination results as fixtures for review. It does **not** prove production export serialization, file-system persistence, cloud delivery, provider authentication, external share permissions, cryptographic authenticity of source records, payment execution, wallet signing, or restoration.

TYPO-01 remains deferred.

<!-- JOURNEY_DECISION_HISTORY:START -->
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
<!-- JOURNEY_DECISION_HISTORY:END -->

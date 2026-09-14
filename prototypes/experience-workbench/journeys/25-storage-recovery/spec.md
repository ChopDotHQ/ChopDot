# Journey 25 — Storage / Backup / Recovery V1

Status: **candidate build in progress on dedicated non-canonical branch**. Journey 24 Golden #24 is exact-head verified; Journey 25 is authoritative at definition stage. This file defines the first J25 candidate contract only and does not approve it.

## Goal

Help a person understand where ChopDot data lives, create a recovery copy without widening authority, and restore recoverable context safely after loss or conflict.

## Entry

- **Storage settings** — a person wants to understand or change their storage/recovery posture.
- **Recovery event** — a working copy is unavailable, incomplete, or needs explicit restore/reconciliation.

## Exit

One of these truthful outcomes:
- device-only choice kept with no backup claim;
- backup artifact created, with local/external destination truth kept separate from durability claims;
- restore cancelled or safely blocked;
- restore reconciled and applied to the explicitly previewed recoverable records;
- unresolved truth handed to a named owner/system boundary without blind retry or invented success.

## Product contract

### 1. Local-first working copy stays distinct from copies
The current device working copy is the active product state in this prototype. A backup artifact or external provider copy is **not** silently promoted to canonical truth. Storage choice never creates payment, wallet, signing, participant, provider, or recovery authority.

### 2. Backup is artifact-first
J25 creates an explicit recovery artifact before any destination handoff. Scope, source snapshot, schema, exclusions, operation identity, and checksum limits are visible before the first effect. Destination actions reuse the same artifact; they never silently regenerate it.

### 3. Recovery is preview-first and conflict-aware
Selecting a recovery source is read-only. The manifest, source age, scope, incompatible schema, corruption, unresolved identity, and current/newer facts are inspected before the first restore mutation. Older backup facts never silently overwrite newer working-copy facts.

### 4. Secrets and executable authority do not round-trip
Private keys, seed phrases, session/provider credentials, hidden provider access, wallet/signing authority, and raw broad-scope receiving details are excluded. Payment-looking or settlement history may return only as inert recorded context. Restore cannot manufacture permission.

### 5. Integrity claims stay narrow
Artifact checksum means only “these artifact bytes match.” It does not prove source authenticity, source completeness, currentness, durable external storage, provider retention, or successful future recovery.

### 6. External provider truth stays at the provider boundary
Opening a browser save, OS share sheet, provider handoff, or sync boundary is not success. External persistence, credentials, retention, deletion, background sync, and provider recovery remain owned outside J25 unless an exact result is available. This prototype contains no live provider integration.

### 7. Unknown outcomes reconcile before retry
Backup creation, external save, and restore apply each carry a stable logical operation. Pending/unknown outcomes block duplicate effects until the exact operation is reconciled. A retry is allowed only after “no effect” is established. Existing exact artifacts/applies are reused.

### 8. Identity ambiguity remains explicit
Stable identifiers may be compared; display names alone never merge people/accounts. Ambiguous identity links are held out or handed to the identity owner boundary.

### 9. Device-only is an honest option
A person may keep device-only storage, but the UI must state that no recovery copy is verified and device loss may be unrecoverable.

## First-effect boundaries

| Effect | Before effect | First effect | After/unknown handling |
|---|---|---|---|
| Backup creation | snapshot + preview + final review | `Create backup` | pending/stop/known failure/unknown → reconcile |
| External save | backup artifact already exists | browser/OS/provider save request | cancelled/unknown → destination reconciliation |
| Restore apply | source + manifest + conflict-aware preview + final review | `Apply restore` | known pre-commit failure or unknown → restore reconciliation |

## Owner/system boundaries

- **J25-B01 — Browser / operating system:** final local file placement and persistence.
- **J25-B02 — External sync/storage provider:** provider credentials, background writes, retention, deletion, durability.
- **J25-B03 — External provider/account access:** provider-side recovery source discovery/access.
- **J25-B04 — Identity/account ownership flow:** ambiguous person/account resolution.
- **J25-B05 — Supported migration/schema owner:** incompatible schema migration.
- **J25-B06 — Journey 28 Things Go Wrong / Recovery:** unresolved operation/artifact/provider truth that cannot be safely decided in J25.

## Factory v1.1 evidence contract

This candidate uses the enabled v1.1 capabilities:
- sustained Builder execution;
- compressed current-work packet at `source/current-work-packet.md`;
- caller-reachability evidence.

Every registered material state must be reachable by a truthful UI caller path from either `settings-entry` or `recovery-entry`, or be explicitly classified as a named owner/system boundary. Direct hash rendering is used for visual coverage but **does not count as reachability evidence**.

## Prototype claim boundary

This candidate is a deterministic standalone UX fixture only. It does **not** prove:
- production encryption/key derivation;
- real filesystem persistence;
- real cloud/provider writes, credentials, sync, retention or deletion;
- production database restore;
- source authenticity/finality;
- live payment/wallet/signing authority;
- real device/account recovery.

## Review gate

Builder must provide exact branch/head, candidate SHA-256, current-work packet identity, registered state/boundary counts, caller-reachability proof, both canonical viewport screenshot evidence, interaction/layout/page/console/network results, and exact workflow runs. Independent Reviewer must directly inspect rendered PNGs and all five review lenses. Explicit Devinson approval of unchanged exact bytes is still required before any Golden freeze.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

Canonical decision history lives in [`source/decision-history.md`](source/decision-history.md). J25 remains unapproved until independent review + explicit human approval.
<!-- JOURNEY_DECISION_HISTORY:END -->

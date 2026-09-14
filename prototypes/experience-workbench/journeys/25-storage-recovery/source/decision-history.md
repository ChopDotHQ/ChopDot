# Journey 25 — Storage / Backup / Recovery V1 Decision History

Status: candidate-local decisions for independent review. No decision below is Golden authority until exact candidate review and Devinson approval.

## J25-D01 — Local-first working copy is distinct from backup/sync copies
**Decision:** The current device working copy remains the product working state in this prototype. Backup artifacts and external provider copies are separate roles and never silently become canonical truth.

**Why:** Storage copies should increase recoverability without creating ambiguous authority or silent last-writer-wins behavior.

**Rejected alternative:** Treating a provider copy as automatically canonical.

## J25-D02 — Backup is artifact-first; destination is a second effect
**Decision:** Create one reviewed recovery artifact first. Browser/local/provider destination actions reuse those exact bytes.

**Why:** Separates data packaging truth from filesystem/provider delivery truth and makes retries idempotent.

**Rejected alternative:** Regenerating a new backup every time the destination changes or retries.

## J25-D03 — Restore is preview-first and preserves newer facts
**Decision:** Inspect manifest/schema/age/conflicts and render a read-only restore preview before any working-copy mutation. Older backup facts do not silently overwrite newer current facts.

**Why:** Recovery must not destroy valid newer state merely because an artifact exists.

**Rejected alternative:** One-click full overwrite.

## J25-D04 — Secrets and executable authority never round-trip
**Decision:** Credentials, private keys, seed phrases, provider/session authority, wallet/signing authority and raw broad-scope receiving details are excluded. Payment-looking history returns only as inert recorded context.

**Why:** Recovering product context is not the same thing as recreating authorization.

**Rejected alternative:** “Complete backup” that serializes hidden authority.

## J25-D05 — Integrity claims are byte-level only
**Decision:** Artifact checksum proves only the bytes under that checksum. It does not prove source authenticity, completeness, freshness, external durability, or future restorability.

**Why:** Keeps trust copy honest and prevents checksum language from becoming an authenticity claim.

## J25-D06 — Unknown backup/save/restore outcomes reconcile before retry
**Decision:** Stable logical operations identify backup creation (`BKP25-DEMO-A`) and restore apply (`RST25-DEMO-A`). Pending/unknown outcomes block duplicate effects until reconciled.

**Why:** Prevents duplicate artifacts, duplicate provider writes, and replayed restore mutations.

**Rejected alternative:** “Try again” on every timeout.

## J25-D07 — External provider effects remain owner boundaries
**Decision:** Provider credentials, background sync, retention, deletion, access recovery and durability remain outside J25 unless exact external truth exists. The candidate is fixture-only.

**Why:** A standalone prototype cannot honestly claim live cloud/provider behavior.

## J25-D08 — Identity ambiguity is held out, never guessed
**Decision:** Stable IDs may be compared; display names alone never merge people/accounts. Ambiguous mappings are held out or sent to the identity owner boundary.

**Why:** Recovery must not fabricate ownership relationships.

## J25-D09 — Device-only is valid only with explicit unrecoverability warning
**Decision:** Device-only can be kept, but UI states that no verified recovery copy exists and device loss may be unrecoverable.

**Why:** Sovereignty requires an honest tradeoff, not a hidden backup assumption.

## J25-D10 — Factory v1.1 makes caller reachability a blocking evidence requirement
**Decision:** The exact QA must replay truthful click paths from `settings-entry` / `recovery-entry` to every registered material state, or classify a real owner/system boundary. Direct state injection alone is insufficient.

**Why:** A rendered state that a user cannot truthfully reach is not a coherent journey.

**Evidence:** `source/current-work-packet.md`, `source/review-qa-v1.mjs`, and the exact review artifact.

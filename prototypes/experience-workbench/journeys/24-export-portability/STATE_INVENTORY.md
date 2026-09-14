# Journey 24 — Export / Portability V1 State Inventory

Status: complete V1 candidate inventory. J24 remains unapproved until independent review + explicit human approval.

## State rules

- Scope/snapshot/preview states are read-only.
- The first artifact-creation effect begins only at explicit `Create export` confirmation.
- Exported history/data never becomes payment, sharing, receiving-detail, wallet, signing, settlement, or retry authority.
- Account/group scope, source snapshot/version, `chopdot-portable-v1` schema, and destination intent remain explicit through generation/recovery and survive direct load/reload.
- Package-ready and external-destination success are different facts.
- Unknown generation or destination outcomes reconcile before retry.
- Raw receiving details, credentials, signing material, keys, session tokens, and secret-like fields never enter V1 package bytes.

| Code | State | Purpose / truth | Safe exits |
| --- | --- | --- | --- |
| J24-S01 | `entry-account` | Account-level entry; nothing prepared/exported. | Start export, account boundary. |
| J24-S02 | `entry-group` | Group-settings entry for `Lisbon Weekend`; no write. | Review group export, group boundary. |
| J24-S03 | `scope-choice` | Choose account-wide or one-group scope; reversible/read-only. | Account scope, group scope, cancel. |
| J24-S04 | `scope-account` | Account-wide scope selected; classes/exclusions visible. | Review classes, change scope, demo empty/oversized. |
| J24-S05 | `scope-group` | Exact one-group scope selected; other groups excluded. | Review classes, change scope, demo empty. |
| J24-S06 | `data-classes` | Included/excluded record classes explicit. | Privacy rule, format, secret-field demo. |
| J24-S07 | `sensitive-policy` | Raw receiving details + secrets excluded; no V1 override. | Continue safely, back. |
| J24-S08 | `format-info` | Exact V1 package/schema/integrity limits explained. | Prepare snapshot, back. |
| J24-S09 | `snapshot-preparing` | Read-only snapshot preparation. | Snapshot ready, offline. |
| J24-S10 | `snapshot-ready` | Exact source snapshot/version fixed for preview. | Preview, partial omission, unresolved identity. |
| J24-S11 | `no-data` | No portable records in selected scope; no export action. | Change scope, return. |
| J24-S12 | `offline-before-snapshot` | Fresh snapshot unavailable; no artifact. | Recheck, return. |
| J24-S13 | `oversized` | Scope too large for V1; no silent truncation. | Narrow scope, cancel. |
| J24-S14 | `secret-like-field-blocked` | Unexpected secret-like field blocks packaging. | Return to data review. |
| J24-S15 | `partial-unsupported` | Non-financial display-only omission visibly carried in manifest. | Continue, cancel. |
| J24-S16 | `identity-unresolved` | Stable member ID + unresolved label preserved; no name-only relink. | Continue, cancel. |
| J24-S17 | `preview-summary` | Read-only exact scope/snapshot/classes preview. | Details, stale demo, cancel. |
| J24-S18 | `preview-details` | Manifest/include/exclude/identity/money semantics shown. | Final review, back. |
| J24-S19 | `stale-preview` | Source changed after preview; confirmation invalidated. | Refresh snapshot, cancel. |
| J24-S20 | `ready-to-confirm` | Final read-only review; no artifact yet. | Review Create export, cancel, existing-artifact fixture. |
| J24-S21 | `export-confirmation` | Explicit first-effect boundary for exact operation. | Create export, cancel. |
| J24-S22 | `cancelled-before-confirmation` | Stopped before first effect; no artifact/destination action. | Return. |
| J24-S23 | `existing-export` | Exact operation artifact already exists; reuse, no duplicate. | Use artifact, change scope. |
| J24-S24 | `generating` | Artifact creation may be underway; no destination effect. | Ready/slow/fail/unknown/cancel fixtures. |
| J24-S25 | `taking-longer` | Pending, explicitly not failure; duplicate generation blocked. | Wait, leave safely. |
| J24-S26 | `leave-during-generation` | Leaving does not cancel; reconcile before retry. | Check operation, return without retry. |
| J24-S27 | `generation-cancel-requested` | Stop requested after creation began; bytes cannot be presumed recalled. | Verify no artifact, reconcile. |
| J24-S28 | `generation-cancelled` | Verified stopped before artifact existed. | Fresh reviewed export, return. |
| J24-S29 | `generation-failed-before-artifact` | Known pre-artifact failure; same operation can safely retry. | Retry same operation, return. |
| J24-S30 | `generation-unknown` | Outcome unknown; neither success nor failure; no blind retry. | Reconcile, recovery boundary. |
| J24-S31 | `reconcile-generation` | Resolve exact operation before regeneration. | Artifact found, no artifact, recovery. |
| J24-S32 | `no-artifact-safe-retry` | Reconciliation proved no artifact; same logical operation can retry. | Retry, cancel. |
| J24-S33 | `artifact-recovered` | Exact artifact found; reuse. | Open artifact, return. |
| J24-S34 | `package-ready` | Selected snapshot packaged; no external save/share implied. | Choose destination, inspect facts. |
| J24-S35 | `choose-destination` | Choose browser/device or external handoff; package unchanged. | Local boundary, external boundary, keep ready. |
| J24-S36 | `browser-download-requested` | Browser download requested; final local path/storage not verified. | Result, request same bytes again. |
| J24-S37 | `download-unavailable` | Browser cannot accept request; package remains ready. | Destination choices. |
| J24-S38 | `share-sheet-opened` | System share/save sheet opened; not delivery success. | Cancel/unknown/confirmed fixture. |
| J24-S39 | `share-cancelled` | External handoff cancelled; package remains ready. | Retry same artifact, package. |
| J24-S40 | `share-return-unknown` | External outcome unknown; no duplicate delivery. | Reconcile, recovery. |
| J24-S41 | `destination-reconciling` | Resolve exact destination attempt before another delivery. | Saved/not-saved/recovery fixtures. |
| J24-S42 | `destination-not-saved` | Verified no external save; same artifact may be delivered again. | Retry delivery, package. |
| J24-S43 | `external-save-confirmed` | Deterministic provider fixture reports saved copy; no live provider proof. | Result, package. |
| J24-S44 | `result-download` | Package created + browser request sent; final local path unverified. | Account boundary. |
| J24-S45 | `result-external` | Package created + fixture provider reports saved; no live external proof. | Account boundary. |

## Owner/system-boundary renders

| Code | Boundary | Ownership truth |
| --- | --- | --- |
| J24-B01 | `system-file-boundary` | Browser/OS owns final local placement and persistence. J24 can request download/save but cannot invent where bytes landed. |
| J24-B02 | `external-app-boundary` | OS share sheet / external provider owns external delivery/storage result. Returning from the sheet is not success. |
| J24-B03 | `recovery-boundary` | Journey 28 owns unresolved cross-cutting recovery. J24 carries exact operation/snapshot/artifact context and grants no blind retry. |
| J24-B04 | `account-return-boundary` | Account / Preferences owns the destination surface after J24 returns. J24 does not redesign Journey 27. |
| J24-B05 | `group-return-boundary` | Group Lifecycle / settings owns the destination surface after group-export return. J24 does not redesign Journey 26. |

## Required review bundle

- 45 registered states + 5 owner/system-boundary renders.
- Direct rendering at `393×852` and `430×890` (100 base screenshots).
- Account-wide and one-group paths with scope surviving navigation, direct load, Back/Forward, and reload.
- Scope reversibility, exact preview/write boundary, stale preview invalidation.
- Empty, oversized, private/secret blocking, partial omission, unresolved identity, offline.
- Pre-confirm cancel; generation cancel/failure/slow/leave/unknown/reconciliation/retry.
- Exact existing-artifact reuse/idempotency.
- Local/browser destination truth and OS/external destination cancel/unknown/reconciliation/confirmed fixture result.
- Zero page/console errors, accidental external runtime requests, clipped required actions, or hidden authority-changing state.

TYPO-01 remains deferred.

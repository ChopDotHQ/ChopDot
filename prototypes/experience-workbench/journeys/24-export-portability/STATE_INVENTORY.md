# Journey 24 — Export / Portability V1 State Inventory

Status: complete V1 candidate inventory. J24 remains unapproved until independent review + explicit human approval.

## State rules

- Scope/snapshot/preview states are read-only.
- The first artifact-creation effect begins only at explicit `Create export` confirmation.
- Exported history/data never becomes payment, sharing, receiving-detail, wallet, signing, settlement, or retry authority.
- Account/group scope, source snapshot/version, `chopdot-portable-v1` schema, and destination intent remain explicit through generation/recovery.
- Package-ready and external-destination success are different facts.
- Unknown generation or destination outcomes reconcile before retry.
- Raw receiving details, credentials, signing material, keys, session tokens, and secret-like fields never enter V1 package bytes.

| Code | State | Purpose / truth | Safe exits |
| --- | --- | --- | --- |
| J24-S01 | `entry-account` | Account-level entry; nothing prepared or exported. | Start export, return to account. |
| J24-S02 | `entry-group` | Group-settings entry for the current group; no write. | Export this group, return to group settings. |
| J24-S03 | `scope-choice` | Choose account-wide or one-group scope; reversible/read-only. | Account scope, group scope, cancel. |
| J24-S04 | `scope-account` | Account-wide scope selected; visible classes/exclusions; no snapshot yet. | Review data classes, change scope, demo empty/oversized. |
| J24-S05 | `scope-group` | `Lisbon Weekend` one-group scope selected; no other groups included. | Review data classes, change scope, demo empty. |
| J24-S06 | `data-classes` | Included/excluded record classes are explicit; user can inspect privacy rule. | Privacy rule, format, secret-like-field demo, back. |
| J24-S07 | `sensitive-policy` | Raw receiving details + secrets are excluded; no override in V1. | Continue safely, back. |
| J24-S08 | `format-info` | Exact V1 artifact is `chopdot-portable-v1`; schema/integrity/completeness limits explained. | Prepare snapshot, back. |
| J24-S09 | `snapshot-preparing` | Read-only snapshot assembly; no artifact or destination effect. | Fixture snapshot ready, fixture offline. |
| J24-S10 | `snapshot-ready` | Exact source snapshot/version + scope fixed for preview. | Preview, partial omission demo, unresolved identity demo. |
| J24-S11 | `no-data` | Selected scope has no portable records; no export action available. | Change scope, return. |
| J24-S12 | `offline-before-snapshot` | Fresh snapshot cannot be established; no artifact created. | Recheck, return. |
| J24-S13 | `oversized` | Account-wide fixture is too large for V1 package limits; nothing created. | Narrow to one group, return. |
| J24-S14 | `secret-like-field-blocked` | Unexpected secret-like field blocks packaging instead of copying through. | Return to data review. |
| J24-S15 | `partial-unsupported` | Non-financial display-only fields are omitted with manifest warning; balances/meaning unchanged. | Continue to preview, cancel. |
| J24-S16 | `identity-unresolved` | Unresolved member identity is preserved explicitly; no name-only relink. | Continue to preview, cancel. |
| J24-S17 | `preview-summary` | Read-only summary of exact scope/snapshot/classes; no artifact exists. | View details, simulate stale snapshot, cancel. |
| J24-S18 | `preview-details` | Preview shows manifest/included/excluded/identity/money semantics before effect. | Final review, back. |
| J24-S19 | `stale-preview` | Source version changed after preview; confirmation invalidated. | Refresh snapshot, cancel. |
| J24-S20 | `ready-to-confirm` | Final read-only review; first effect still has not begun. | Review Create export, cancel, reuse exact existing artifact. |
| J24-S21 | `export-confirmation` | Explicit first-effect boundary bound to exact scope/snapshot/schema/destination intent. | Create export, cancel. |
| J24-S22 | `cancelled-before-confirmation` | User stopped before first effect; no artifact/destination action. | Return to account/group. |
| J24-S23 | `existing-export` | Exact operation already has an artifact; reuse instead of duplicate generation. | Use existing artifact, change scope. |
| J24-S24 | `generating` | Artifact creation may be underway; no destination effect yet. | Fixture ready/slow/fail/unknown/cancel. |
| J24-S25 | `taking-longer` | Still pending, explicitly not failure; duplicate generation blocked. | Keep waiting, leave safely/check later. |
| J24-S26 | `leave-during-generation` | Leaving does not establish cancellation or failure; operation must reconcile. | Check operation, return without retry. |
| J24-S27 | `generation-cancel-requested` | Stop requested after creation began; cannot claim already-created bytes were recalled. | Verify no artifact, reconcile operation. |
| J24-S28 | `generation-cancelled` | Exact operation verified stopped before artifact existed. | Start a fresh reviewed export, return. |
| J24-S29 | `generation-failed-before-artifact` | Known failure before artifact bytes; same operation may retry safely. | Retry same operation, return. |
| J24-S30 | `generation-unknown` | Outcome unknown; neither success nor failure; no blind retry. | Reconcile exact operation, recovery boundary. |
| J24-S31 | `reconcile-generation` | Resolve exact operation before regeneration. | Fixture found artifact, fixture no artifact, unresolved recovery. |
| J24-S32 | `no-artifact-safe-retry` | Reconciliation proved no artifact exists; same logical operation may retry. | Retry same operation, cancel. |
| J24-S33 | `artifact-recovered` | Existing exact artifact found for the operation; reuse it. | Open artifact, return. |
| J24-S34 | `package-ready` | Selected snapshot packaged; no external save/share is implied. | Choose destination, view package facts. |
| J24-S35 | `choose-destination` | Choose browser/device or OS/external handoff; package stays unchanged. | Local/system boundary, external app boundary, cancel. |
| J24-S36 | `browser-download-requested` | Browser download requested; ChopDot cannot claim final local path/storage. | View local result, request same download again. |
| J24-S37 | `download-unavailable` | Browser/device cannot accept download; package remains ready. | Return to destination choices. |
| J24-S38 | `share-sheet-opened` | OS share/save sheet opened; this is not external delivery success. | Fixture cancel, fixture unknown return, fixture provider-confirmed save. |
| J24-S39 | `share-cancelled` | External handoff cancelled; package remains ready; no delivery claimed. | Try same artifact again, return to package. |
| J24-S40 | `share-return-unknown` | Returned from system handoff with unknown external outcome; no duplicate delivery. | Reconcile destination, recovery boundary. |
| J24-S41 | `destination-reconciling` | Check exact destination attempt before another delivery. | Fixture confirmed saved, fixture confirmed not saved, unresolved recovery. |
| J24-S42 | `destination-not-saved` | Reconciliation proves no external save; same artifact may be delivered again. | Retry same artifact, return. |
| J24-S43 | `external-save-confirmed` | Prototype provider fixture reports saved copy; package bytes unchanged; no independent authenticity claim. | View external result, return. |
| J24-S44 | `result-download` | Final local/download summary: package created; browser download requested; final path not verified. | Return to account. |
| J24-S45 | `result-external` | Final external summary: package created; fixture provider reported saved copy; no live delivery proof. | Return to account. |

## Owner/system-boundary renders

| Code | Boundary | Ownership truth |
| --- | --- | --- |
| J24-B01 | `system-file-boundary` | Browser/OS owns final local placement and persistence. J24 can request download/save but cannot invent where bytes landed. |
| J24-B02 | `external-app-boundary` | OS share sheet / external provider owns external delivery/storage result. Returning from the sheet is not success. |
| J24-B03 | `recovery-boundary` | Journey 28 owns unresolved cross-cutting recovery when exact generation/destination truth cannot be established. J24 carries operation/snapshot/artifact context and grants no blind retry. |

## Required review bundle

- 45 registered states + 3 boundary renders.
- Direct rendering at `393×852` and `430×890`.
- Happy account and one-group paths.
- Scope reversibility, exact preview/write boundary, stale preview invalidation.
- Empty, oversized, private/secret blocking, partial omission, unresolved identity, offline.
- Pre-confirm cancel; generation cancel/failure/slow/leave/unknown/reconciliation/retry.
- Existing exact artifact reuse/idempotency.
- Local/browser destination truth and OS/external destination cancel/unknown/reconciliation/confirmed fixture result.
- No page/console errors, accidental external network requests, clipped required actions, or hidden authority-changing state.

TYPO-01 remains deferred.

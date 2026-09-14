# Journey 25 — Storage / Backup / Recovery V1 State Inventory

**Registered material states:** 65  
**Owner/system boundaries:** 6  
**Factory evidence:** every state must be reached from a truthful caller path; boundaries must be explicitly classified. Direct hash render alone does not satisfy reachability.

## Entry and storage posture

| Code | State | Purpose / truth |
|---|---|---|
| `J25-S01` | `settings-entry` | Keep recovery understandable — See where your ChopDot data lives and what recovery can actually prove. |
| `J25-S02` | `recovery-entry` | Something is missing? — Start from observed device/account state before choosing a restore source. |
| `J25-S03` | `storage-summary` | Your device is the working copy — Backups and sync are separate copies; they do not silently become canonical truth. |
| `J25-S04` | `storage-choice` | Choose what problem you are solving — Keep the working copy, backup copy and external sync roles distinct. |
| `J25-S05` | `device-only` | No backup claim is made — Your current working copy remains on this device in this prototype. |
| `J25-S06` | `device-only-result` | Device-only choice recorded · fixture — No backup or sync effect was created. |
| `J25-S63` | `sync-info` | Provider copy is a separate role — This prototype can explain the boundary without pretending a live sync provider exists. |
| `J25-S64` | `sync-conflict` | Two copies disagree — Neither side silently wins when recency/authority is unclear. |
| `J25-S65` | `lost-access` | No readable recovery source is proven — ChopDot cannot invent a restore path. |

## Backup definition and preview

| Code | State | Purpose / truth |
|---|---|---|
| `J25-S07` | `backup-scope` | Choose what this recovery copy covers — Only data you are already authorized to view may enter the backup. |
| `J25-S08` | `backup-classes` | Recovery copy without authority — History and state may be copied; secrets and executable authority may not. |
| `J25-S09` | `backup-sensitive-policy` | Sensitive authority stays behind — V1 has no override for secret-like material or hidden provider/session authority. |
| `J25-S10` | `backup-format` | One explicit backup artifact — The artifact names its schema, source snapshot, scope, exclusions and integrity limits. |
| `J25-S11` | `snapshot-preparing` | Preparing backup preview facts — No backup artifact or external effect has begun. |
| `J25-S12` | `snapshot-ready` | Review can begin — Exact source version and scope are fixed for this backup preview. |
| `J25-S13` | `backup-empty` | Nothing needs a recovery copy — No backup effect is available for this scope. |
| `J25-S14` | `snapshot-offline` | Fresh source facts cannot be established — The prototype does not claim a current backup can be prepared. |
| `J25-S15` | `secret-like-field-blocked` | Unexpected secret-like field found — Backup preparation stops instead of copying credential-like material. |
| `J25-S16` | `identity-unresolved` | One member link remains unresolved — Backup preserves ambiguity rather than merging people by display name. |
| `J25-S17` | `backup-preview` | Review this exact recovery snapshot — No backup artifact exists yet. |
| `J25-S18` | `backup-preview-details` | Know what recovery could restore — Included, excluded and unresolved facts are visible before effect. |
| `J25-S19` | `backup-preview-stale` | Source changed after preview — The old confirmation cannot silently back up a different working copy. |
| `J25-S20` | `backup-ready-to-confirm` | Ready to create the recovery artifact — The first backup effect has not begun. |
| `J25-S21` | `backup-confirmation` | Create this backup? — This exact operation is bound to scope + snapshot + schema + artifact-first destination intent. |
| `J25-S22` | `backup-cancelled-before-confirm` | Nothing was created — The user stopped before the first artifact effect. |
| `J25-S23` | `backup-existing` | This exact backup operation already has an artifact — Reuse it instead of silently generating a duplicate. |

## Backup execution and reconciliation

| Code | State | Purpose / truth |
|---|---|---|
| `J25-S24` | `backup-creating` | Packaging the reviewed recovery snapshot — No external destination effect has started. |
| `J25-S25` | `backup-taking-longer` | Taking longer is not failure — The same operation remains pending. |
| `J25-S26` | `backup-leave-pending` | Leaving does not prove cancellation — The exact backup operation must be reconciled before any retry. |
| `J25-S27` | `backup-stop-requested` | Future work will stop where possible — Already-created bytes cannot be claimed recalled or deleted. |
| `J25-S28` | `backup-stopped` | Verified: no artifact exists for this operation — A fresh reviewed backup may be started. |
| `J25-S29` | `backup-failed-before-artifact` | Known failure occurred before artifact bytes existed — The same logical operation may retry safely. |
| `J25-S30` | `backup-outcome-unknown` | Neither success nor failure is established — Blind regeneration is blocked. |
| `J25-S31` | `backup-reconcile` | Check whether this exact recovery artifact exists — No new backup creation starts during reconciliation. |
| `J25-S32` | `backup-no-artifact-retry` | Reconciliation proved no artifact exists — The same logical operation may regenerate. |
| `J25-S33` | `backup-artifact-recovered` | Existing exact artifact found — Reuse it; do not regenerate the same operation. |
| `J25-S34` | `backup-ready` | A recovery artifact exists — No external save, durability or restore success is implied yet. |

## Destination handoff

| Code | State | Purpose / truth |
|---|---|---|
| `J25-S35` | `backup-destination-choice` | Where should this artifact go? — The artifact stays unchanged while destination intent changes. |
| `J25-S36` | `browser-save-requested` | Save requested — ChopDot cannot claim final filesystem path or durable local persistence. |
| `J25-S37` | `external-save-opened` | External save sheet opened — Opening the sheet is not backup success. |
| `J25-S38` | `external-save-cancelled` | No durable backup is claimed — The artifact remains available and unchanged. |
| `J25-S39` | `external-save-unknown` | Returning from the sheet is not success — Duplicate external saving is blocked until the attempt is checked. |
| `J25-S40` | `external-save-reconcile` | Check this exact external save attempt — The artifact is not regenerated. |
| `J25-S41` | `external-save-not-saved` | Reconciliation proved no external save — The same artifact may be saved again. |
| `J25-S42` | `external-save-confirmed` | Provider fixture reports saved copy — This is a destination fact only, not live durability proof. |
| `J25-S43` | `backup-result-local` | Artifact created · local save requested — Final local path and persistence are not verified by ChopDot. |
| `J25-S44` | `backup-result-external` | Artifact created · external save fixture confirmed — No live provider durability or restoration proof is claimed. |

## Restore source, preview and apply

| Code | State | Purpose / truth |
|---|---|---|
| `J25-S45` | `restore-source-choice` | Choose only a source you can inspect — Recovery begins with source facts, not a blind overwrite. |
| `J25-S46` | `restore-file-selected` | Inspect before restore — Selection proves only that a candidate artifact is present. |
| `J25-S47` | `restore-manifest` | Understand scope and age — Source snapshot, scope, exclusions and unresolved identities are visible before apply. |
| `J25-S48` | `restore-corrupt` | Checksum or package structure failed — No restore preview or apply is allowed. |
| `J25-S49` | `restore-incompatible` | This schema cannot be safely applied here — The artifact stays read-only. |
| `J25-S50` | `restore-conflict` | Restore would conflict with current facts — Nothing is applied until the conflict strategy is explicit. |
| `J25-S51` | `restore-preview` | See exactly what would change — The preview is read-only and keeps current/newer facts visible. |
| `J25-S52` | `restore-identity-unresolved` | One identity mapping is unresolved — The affected link is held out of apply instead of guessed. |
| `J25-S53` | `restore-ready-to-confirm` | Ready to apply this recovery preview — The first working-copy mutation has not begun. |
| `J25-S54` | `restore-confirmation` | Apply this restore? — This exact apply operation is bound to artifact + preview + conflict decisions. |
| `J25-S55` | `restore-cancelled` | Working copy was not changed — The selected artifact remains read-only. |
| `J25-S56` | `restore-already-applied` | This exact restore operation is already applied — Do not replay the same mutation. |
| `J25-S57` | `restore-applying` | Rehydrating the reviewed recoverable records — The operation is bounded to the approved preview. |
| `J25-S58` | `restore-failed-before-commit` | Known failure occurred before any recovery mutation committed — The same reviewed operation may retry. |
| `J25-S59` | `restore-outcome-unknown` | Do not assume success or failure — A second apply is blocked until the exact operation is reconciled. |
| `J25-S60` | `restore-reconcile` | Check the exact apply operation — No new restore mutation begins while checking. |
| `J25-S61` | `restore-not-applied` | Reconciliation proved the operation did not apply — The same reviewed operation may retry. |
| `J25-S62` | `restore-success` | Reviewed recovery data applied · fixture — Current/newer facts were preserved and executable authority was not restored. |

## Owner/system boundaries

| Code | Boundary | Owner | Why it stops here |
|---|---|---|---|
| `J25-B01` | `system-file-boundary` | Browser / operating system | Final local placement is outside J25 — ChopDot can request a save but cannot invent where bytes ultimately landed or how long they persist. |
| `J25-B02` | `sync-provider-boundary` | External sync / storage provider | Provider storage is owned outside ChopDot — Provider credentials, background writes, retention, deletion and durability belong to the external system. |
| `J25-B03` | `provider-restore-boundary` | External provider / account access | Provider restore starts outside ChopDot — The provider must first prove an accessible artifact or version before ChopDot can preview recovery. |
| `J25-B04` | `identity-owner-boundary` | Identity / account ownership flow | Ambiguous identity must be resolved by its owner — Recovery cannot merge people, accounts or permissions from display names alone. |
| `J25-B05` | `schema-owner-boundary` | Supported migration / schema owner | Unsupported schema needs an explicit migration path — J25 will not guess how to reinterpret an incompatible recovery artifact. |
| `J25-B06` | `recovery-owner-boundary` | Journey 28 · Things Go Wrong / Recovery | Unresolved storage truth stops here — Exact operation, artifact, snapshot and destination facts are carried forward without blind retry or bypass authority. |

## Caller entries

- `settings-entry` — storage settings / posture caller.
- `recovery-entry` — loss/incomplete-state recovery caller.

The exact browser QA replays shortest truthful click paths from these callers to every registered material state and owner boundary, then separately renders the full state × viewport matrix.

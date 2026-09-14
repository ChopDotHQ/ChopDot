# Journey 27 — Account & Preferences V1

Status: **candidate definition owned by Builder**. Journey 26 is Golden #26 and the J26→J27 resulting state is exact-head verified.

## Goal

Give one signed-in person a clear place to understand and change ChopDot account identity, notification preferences, appearance, session/security state, sign-out, and account deletion without allowing cached state, navigation, or UI preferences to manufacture authority.

## Entry

`You` tab / account menu → Account & preferences.

## Exit

Return to `You`, a system-owned settings/reauth boundary, or a verified signed-out/deleted terminal state.

## V1 ownership model

Journey 27 owns the **customer-facing account/preferences workflow and prototype operation truth** only. It does not claim a production identity database, authentication provider, notification delivery system, device permission controller, account erasure service, settlement engine, wallet signer, or chain mutation.

V1 separates five domains:

1. **Profile identity** — ChopDot display name and avatar/profile presentation. A display-name change does not change cryptographic/account identity, wallet address, group history, or settlement attribution.
2. **Notifications** — the user's ChopDot notification preference. OS/device push permission is a separate system boundary; an app preference cannot grant system permission.
3. **Appearance** — System / Light / Dark app preference. Preview is reversible and is not persisted until Save succeeds.
4. **Security / session** — current-session inspection and sign-out. Sign-out revokes the local/session fixture only; it does not delete the account, alter group/money history, or claim remote-session revocation.
5. **Account deletion** — guarded deletion of the user's ChopDot account working state. Deletion is blocked while the user still owns a group or has unresolved money obligations that require an adjacent owner journey. Shared group/expense history, exports/backups, provider records, and public/on-chain history are explicitly not claimed erased.

## Required invariants

### J27-I01 — Fresh session truth before mutation

Cached profile/session facts can be displayed as last-known information, but writes require refreshed account/session truth. Offline mode is read-only.

### J27-I02 — UI preference ≠ authority

Display name, notifications, and appearance never create payment, wallet, group-owner, signing, or identity-provider authority.

### J27-I03 — Draft / preview ≠ persisted preference

Editing or previewing is reversible. Only a verified save result becomes the current preference in this prototype.

### J27-I04 — OS permission stays system-owned

Turning on ChopDot push preference cannot grant device/OS permission. If permission is absent, Journey 27 hands off to the system-owned notification-settings boundary and then refreshes current effective truth.

### J27-I05 — Conflict is not success

If the account/preference version changed since review, preserve the newer known truth and require refresh/re-review. Never overwrite silently.

### J27-I06 — Unknown result blocks replacement retry

After an effect may have started, timeout/unknown outcome must reconcile the same operation identity before offering a new write. A new retry is allowed only after reconciliation proves no effect.

### J27-I07 — Sign-out is not deletion

Verified sign-out ends the current session fixture only. Account identity, shared history, preferences stored elsewhere, group data, balances, and external/provider state are not described as deleted.

### J27-I08 — Deletion prerequisites are explicit

Account deletion cannot proceed while this person is still the owner of an active group or while unresolved money obligations require resolution. Those are adjacent-owner boundaries, not effects Journey 27 may fake.

### J27-I09 — Deletion scope is narrow and honest

A verified deleted state means the ChopDot account working state represented by this prototype is removed. Shared group/expense history remains attributable through durable participant/history records as required by their owning journeys. Exports/backups, provider records, and chain/public history are not claimed erased.

### J27-I10 — Navigation cannot create outcome truth

Back, tabs, reloads, and direct URLs are location only. They cannot convert pending/unknown/failed operations into saved, signed-out, or deleted outcomes.

## Primary user flows

### A. Enter and inspect

`account-entry → account-loading → account-overview`

Offline or load failure remains read-only and never exposes mutation as verified current truth.

### B. Edit display identity

`profile-overview → profile-edit → profile-review → profile-saving → profile-saved`

Material alternates: invalid input; cancel before save; stale-version conflict; known failure; unknown result → reconcile → proven no-effect retry or discovered saved result.

### C. Notification preference

`notifications-overview → notifications-edit → notifications-review → notifications-saving → notifications-saved`

If push preference is on but system permission is absent, show `notifications-permission-needed` and hand off to the system notification boundary. Denial leaves effective push unavailable without falsifying the saved app preference.

### D. Appearance

`appearance-overview → appearance-preview → appearance-saving → appearance-saved`

Preview never mutates persisted truth. Failure restores the previously saved preference. Unknown result reconciles before another save.

### E. Security / sign out

`security-overview → signout-review → signing-out → signed-out`

Known failure preserves the session. Unknown result reconciles the same sign-out operation before any retry.

### F. Delete account

`deletion-entry → deletion-review`

If group ownership or unresolved money blocks deletion, hand off to the owning journey and return with refreshed prerequisites. When eligible:

`deletion-review → deletion-type-confirm → deletion-final-review → deletion-requesting → deleted`

Typed confirmation must match the current display name. Cancellation is available only before execution begins. Unknown result reconciles the same deletion request; no duplicate deletion request is created while outcome is uncertain.

## Adjacent-owner boundaries

- `you-home-boundary` — returns to the owning `You` surface.
- `notification-system-boundary` — device/OS notification permission/settings; Journey 27 cannot grant it.
- `ownership-transfer-boundary` — Journey 26 group lifecycle ownership transfer / leave prerequisites.
- `money-resolution-boundary` — settlement/money resolution in the owning money journeys; Journey 27 cannot settle or zero balances.
- `export-boundary` — Journey 24 Export / Portability for a user-controlled copy before deletion.

## Prototype / production boundary

This candidate is a deterministic fixture for UX contract review. It does **not** claim production persistence, real authentication/session invalidation, OS permission mutation, notification delivery, backend deletion, provider erasure, wallet/chain effects, payment/settlement, or external recovery finality.

## Factory evidence requirements

- Factory generation `v1.1`.
- Every registered material state must have truthful caller reachability from `account-entry` or be a named adjacent-owner boundary.
- Deterministic browser QA at 393×852 and 430×890.
- No horizontal overflow or clipped required action.
- No page/console errors or external runtime requests.
- Exact candidate SHA/head/tree and evidence artifact binding.
- Independent five-lens review. Direct visual review follows the active risk-based visual doctrine; exhaustive screenshot generation/mechanical checks remain required.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

See `source/decision-history.md`; it is mirrored here by the decision-history tooling.
<!-- JOURNEY_DECISION_HISTORY:END -->

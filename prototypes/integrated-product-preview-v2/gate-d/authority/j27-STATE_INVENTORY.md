# Journey 27 — Account & Preferences V1 State Inventory

All material states below are candidate-owned and require truthful caller reachability from `account-entry` unless explicitly marked as an adjacent-owner boundary.

## Entry / overview

- J27-S01 `account-entry`
- J27-S02 `account-loading`
- J27-S03 `account-offline`
- J27-S04 `account-load-failed`
- J27-S05 `account-overview`

## Profile identity

- J27-S06 `profile-overview`
- J27-S07 `profile-edit`
- J27-S08 `profile-invalid`
- J27-S09 `profile-review`
- J27-S10 `profile-saving`
- J27-S11 `profile-saved`
- J27-S12 `profile-conflict`
- J27-S13 `profile-failed`
- J27-S14 `profile-unknown`
- J27-S15 `profile-reconciling`
- J27-S16 `profile-no-effect-retry`
- J27-S17 `profile-cancelled`

## Notifications

- J27-S18 `notifications-overview`
- J27-S19 `notifications-edit`
- J27-S20 `notifications-review`
- J27-S21 `notifications-saving`
- J27-S22 `notifications-saved`
- J27-S23 `notifications-permission-needed`
- J27-S24 `notifications-permission-denied`
- J27-S25 `notifications-conflict`
- J27-S26 `notifications-failed`
- J27-S27 `notifications-unknown`
- J27-S28 `notifications-reconciling`
- J27-S29 `notifications-no-effect-retry`
- J27-S30 `notifications-cancelled`

## Appearance

- J27-S31 `appearance-overview`
- J27-S32 `appearance-preview`
- J27-S33 `appearance-saving`
- J27-S34 `appearance-saved`
- J27-S35 `appearance-failed`
- J27-S36 `appearance-unknown`
- J27-S37 `appearance-reconciling`
- J27-S38 `appearance-no-effect-retry`
- J27-S39 `appearance-cancelled`

## Security / current session

- J27-S40 `security-overview`
- J27-S41 `signout-review`
- J27-S42 `signing-out`
- J27-S43 `signed-out`
- J27-S44 `signout-failed`
- J27-S45 `signout-unknown`
- J27-S46 `signout-reconciling`
- J27-S47 `signout-no-effect-retry`
- J27-S48 `signout-cancelled`

## Account deletion

- J27-S49 `deletion-entry`
- J27-S50 `deletion-blocked-owner`
- J27-S51 `deletion-blocked-money`
- J27-S52 `deletion-review`
- J27-S53 `deletion-type-confirm`
- J27-S54 `deletion-mismatch`
- J27-S55 `deletion-final-review`
- J27-S56 `deletion-requesting`
- J27-S57 `deletion-cancelled`
- J27-S58 `deletion-failed`
- J27-S59 `deletion-unknown`
- J27-S60 `deletion-reconciling`
- J27-S61 `deletion-no-effect-retry`
- J27-S62 `deleted`

## Adjacent-owner boundaries

- J27-B01 `you-home-boundary`
- J27-B02 `notification-system-boundary`
- J27-B03 `ownership-transfer-boundary`
- J27-B04 `money-resolution-boundary`
- J27-B05 `export-boundary`

## State-class rules

- Loading/pending states never imply success.
- Cancelled means execution did not begin or cancellation was verified before effect.
- Failed means a known pre-effect or known failed result; current truth is preserved.
- Unknown means effect may have started and replacement retry is blocked.
- Reconciliation always checks the existing operation identity.
- `*-no-effect-retry` appears only after reconciliation proves no effect.
- Saved/signed-out/deleted states are verified terminal fixture outcomes, not production claims.
- Boundaries never masquerade as Journey 27 effects.

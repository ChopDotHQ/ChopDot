# IDENTITY-001 Preflight — Profile lifecycle + recovery honesty

Status: BUILDING
Branch: `chatgpt/chopdot-v1-completion`

## User goal

A person should understand what their ChopDot profile is, edit it safely, connect/disconnect Polkadot without losing financial history, and understand exactly what can and cannot be recovered on another device today.

## Current problems

- Welcome shows disabled `Create account`, `Log in`, and `Connect wallet` controls that are not real product capabilities.
- GuestSetup is actually the working onboarding path but is labelled as a guest path.
- Profile writes every display-name keystroke directly into persisted state, allowing partial/blank-ish intermediate values.
- A connected Polkadot identity authenticates a product account but does not provide shared-data recovery; that distinction needs to remain prominent.
- The old host-session transport may supply a participant id/public key during onboarding. That is legacy session authority, not the same provenance as POLKADOT-001 `hostIdentity`.
- No canonical backend account/recovery system exists yet.

## Product rules

1. Do not show fake/disabled account options as if they are almost functional.
2. First-run onboarding creates a useful local ChopDot profile with one clear action.
3. “Local profile” is a valid product state, not a degraded/error state.
4. Display name is presentation only and is saved intentionally, not on every keystroke.
5. Display name cannot be empty after normalization.
6. Connecting Polkadot never silently changes display name.
7. Disconnecting Polkadot never deletes groups, expenses, history or local profile.
8. Polkadot connection does not imply cross-device financial data recovery.
9. If legacy host-session participant data is used for session compatibility, it must not be labelled as POLKADOT-001 authenticated host identity unless explicit binding occurred.
10. Clearing all app data remains a separate destructive Settings action with confirmation.
11. No “forgot password”, cloud backup, login or account-recovery claims until BACKEND/shared identity exists.

## Implementation shape

- simplify Welcome to one real primary path: `Start using ChopDot`;
- explain that Polkadot can be connected later where available;
- keep GuestSetup route for compatibility but present it as profile creation;
- generate local user id with `crypto.randomUUID()` when no legacy host participant id is required;
- normalize/validate initial display name;
- Profile uses draft + explicit Save for rename;
- show unsaved-name state clearly and keep Done from silently discarding without clarity;
- keep POLKADOT-001 connection controls and trust provenance;
- expand Data & recovery copy:
  - local data lives on this device today;
  - Polkadot identity can be reconnected but does not restore local groups on another device;
  - shared recovery is future BACKEND/SYNC work;
- pure profile helper tests for name normalization/validation and recovery-status copy state where useful.

## Acceptance cases

1. Fresh user sees no disabled fake login/account controls.
2. One obvious CTA starts profile creation.
3. Initial blank/whitespace name cannot be saved.
4. Valid initial name is trimmed.
5. Local user id is stable after creation and not regenerated on rename.
6. Editing Profile name does not mutate state until Save.
7. Save trims and rejects empty name.
8. Host username never overwrites display name.
9. Connect/disconnect Polkadot leaves local user id and financial data intact.
10. Profile clearly states local-data recovery limitation.
11. Connected state clearly states identity can be authenticated while data remains local.
12. No UI promises login/cloud recovery.

## Deferred

- canonical shared account/session issuance — BACKEND/POLKADOT follow-up;
- cross-device group/history recovery — BACKEND + SYNC;
- encrypted export/import — future product decision;
- account merge across multiple pre-existing local profiles — backend migration design;
- social identity/legal identity — out of scope.

## Quality status

Required G2 local-flow tests + mobile/keyboard/reload verification before DONE.
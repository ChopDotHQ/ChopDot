# IDENTITY-001 Preflight — Profile lifecycle + recovery honesty

Status: READY_FOR_CODEX_VERIFY
Branch: `chatgpt/chopdot-v1-completion`

## User goal

A person should understand what their ChopDot profile is, edit it safely, connect/disconnect Polkadot without losing financial history, and understand exactly what can and cannot be recovered on another device today.

## Implemented product behavior

### First run

Welcome no longer presents disabled `Create account`, `Log in`, or `Connect wallet` controls. Those were fake choices and added friction without capability.

The first run now has one real CTA:

```text
Start using ChopDot
```

with clear copy that:

- no wallet/account setup is required;
- a local profile is valid;
- Polkadot can be connected later when it adds value.

### Local profile creation

GuestSetup remains the route name for compatibility, but the UI now presents normal profile creation rather than a degraded guest account.

Implemented:

- display-name whitespace normalization;
- 1–80 character validation;
- `crypto.randomUUID()`-based local user ids when no legacy host-session participant id is needed;
- suggested host/Telegram name remains editable;
- device-local data/recovery limitation explained before continuing;
- legacy host participant public key may still be retained for old session compatibility, but it is not represented as POLKADOT-001 `hostIdentity` provenance.

### Profile editing

Profile display-name editing now uses a draft:

- typing does not mutate persistent app state;
- `Unsaved` is visible when changed;
- blank/invalid name cannot be saved;
- `Save & done` trims/normalizes before dispatch;
- renaming never changes local user id;
- Polkadot host username stays independent from ChopDot display name.

### Polkadot lifecycle

Existing POLKADOT-001 behavior is preserved:

- explicit Connect Polkadot;
- authenticated product-account provenance;
- no private key inside ChopDot;
- Disconnect removes host binding on this device but does not delete the user, groups, expenses or history.

### Recovery honesty

Profile now has a **Data & recovery** section generated from actual identity state.

Local profile:

> Your groups and history are stored on this device in this build. Cross-device recovery is not enabled yet.

Host-bound profile:

> Your Polkadot product identity can be connected again, but this build does not yet restore your groups and history onto another device.

The UI also states that connecting/disconnecting Polkadot does not delete this device's financial history.

No password recovery, login, cloud backup or shared-data restoration is claimed.

## Domain helpers + tests

`src/identity/profileLifecycle.ts`:

- `normalizeDisplayName()`;
- `validDisplayName()`;
- `createLocalUserId()`;
- `profileRecoveryMessage()`.

`src/identity/profileLifecycle.test.ts` covers:

- whitespace normalization;
- blank/oversized name rejection;
- deterministic local id generation through injected UUID;
- distinct local vs host-bound recovery messaging.

Existing `npm run test:identity` includes `src/identity/*.test.ts` and therefore covers this slice once executed.

Tests are WRITTEN / NOT EXECUTED HERE.

## Important non-claims / deferred

- no canonical shared account/session issuance yet — BACKEND/POLKADOT follow-up;
- no cross-device group/history recovery — BACKEND + SYNC;
- no encrypted export/import yet;
- no multi-local-profile merge semantics;
- legacy shared-session account key compatibility remains separate from hostIdentity provenance;
- no legal/KYC identity.

## Required before DONE

- `npm run lint`;
- `npm run test:identity`;
- `npm run build`;
- first-run flow at 320/375/390px;
- mobile keyboard behavior on name fields;
- restart after local profile creation;
- rename/restart persistence;
- connect/reload/disconnect Polkadot without losing money/history;
- reconcile against current deployed/local source.

## Quality status

G2 code/test artifacts exist. Runtime/mobile/reload evidence remains required before DONE.
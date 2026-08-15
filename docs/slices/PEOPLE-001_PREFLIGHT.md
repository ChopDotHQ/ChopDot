# PEOPLE-001 Preflight — Reusable people + receive preferences

Status: READY_FOR_CODEX_VERIFY
Branch: `chatgpt/chopdot-v1-completion`

## User goal

People should become reusable relationships rather than loose names scattered across groups. A user should be able to open a person, understand the shared context, and remember how that person prefers to receive money without re-entering instructions every time.

## Current model facts

- `User` is already the reusable person record and is referenced by groups, expenses, and splits.
- `User` already has optional Polkadot/host identity references (`accountPublicKeyHex`, `statementSignerHex`) and a wallet address.
- `PaymentMethod` already belongs to a `userId`, but the prior product did not expose reusable per-person methods meaningfully.
- `preferredPaymentMethod` on `AppState` remains a current-user/global preference; PEOPLE-001 adds a separate optional per-person receive preference on `User`.
- The prior Friends screen showed every non-current `User` as a flat row with no detail surface.

## Safety / trust rules

1. A friend/person is the existing stable `User` record; do not create a parallel contacts database in the local shell.
2. Reusable payment instructions are preferences, not proof that money moved.
3. Bank details and payment links entered by a user are unverified local data and must be presented as such.
4. Do **not** add manual wallet-address editing for friends in this slice. The current wallet settlement path can consume `User.walletAddress`; allowing arbitrary editing here would create an address-substitution risk.
5. Existing wallet/account identity references may be displayed, but the UI must not call them verified unless the host/auth layer actually proves that fact.
6. Per-person preferred receive methods may influence presentation/routing later, but must never independently confirm settlement.
7. Editing a receive preference must not mutate expenses, splits, requests, or payment evidence.
8. Historical person identity remains stable; do not delete a `User` merely because they are no longer in an active group.
9. No cross-device/shared authority claim in this local-shell slice.

## Implemented product behavior

Friends now behaves as a lightweight reusable-people surface:

- tap a person to open Person Detail;
- show active groups shared with the current user;
- show any existing Polkadot/wallet/account references in plain language;
- keep those identity references read-only in this slice;
- show saved receive methods;
- add/update a bank-transfer instruction or payment link;
- allow Cash as a no-details receive preference;
- choose a preferred receive method for that person;
- clearly label conventional instructions as saved locally/unverified rather than authenticated payment destinations;
- use stable per-person/per-type method ids so re-saving updates instead of duplicating.

The previous generic copy control was removed from the Friends row because it was not a real scoped invite. Real group invitations remain inside group context.

## Local data representation

Reuse `PaymentMethod` records:

```text
id = receive:{userId}:{type}
userId
type = cash | bank_transfer | payment_link
details = user-entered instruction text (empty for cash)
```

Add an optional per-user preferred receive-method reference on `User`:

```text
preferredPaymentMethodId?: string
```

This is additive/backward-compatible local persistence. No schema-version claim is made; DATA-002 still owns formal persisted migrations.

## Acceptance cases

1. Open a friend and see their name plus groups shared with the current user.
2. Saving bank instructions creates/updates that friend's payment method without affecting money balances.
3. Saving a payment link creates/updates that friend's payment method.
4. Cash can be saved without details.
5. Preferred receive method is only selected through a same-user method guard in this UI/domain slice.
6. Re-saving the same type updates rather than creating duplicates.
7. Existing wallet/Polkadot identity reference is display-only in this slice.
8. A friend without identity/payment data gets useful empty states, not protocol jargon.
9. Editing receive preferences does not dispatch any expense/split/settlement mutation.
10. Existing friend-list add/duplicate-name behavior remains present.

## Verification hooks

- `npm run test:people`
- `npm run test:group-safety` (added at the same time so GROUP-001 has a direct verification command)
- `npm run lint`
- `npm run build`
- mobile flow: Friends → Person Detail → save/update receive method → set preferred → reload → confirm persistence

Tests are **WRITTEN / NOT EXECUTED HERE**.

## Deferred

- cryptographically verified friend identity and address binding — `POLKADOT-001`;
- QR/account exchange and host-native person discovery — `POLKADOT-001`;
- backend contact sharing/sync — `BACKEND-001` / `SYNC-001`;
- using preferred method to execute settlement — `SETTLEMENT-001+`;
- removing receive methods — later preference-management work if needed;
- global contact deletion/merge — later data/identity work.

## Quality status

Required gate: G2 local-flow evidence.

Implementation and deterministic helper tests are written. Runtime/typecheck/build/mobile execution remains for Codex/local verification, so this slice must not be marked `DONE` yet.
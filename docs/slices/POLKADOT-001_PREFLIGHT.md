# POLKADOT-001 Preflight — Host identity + authenticated application authority

Status: READY_FOR_CODEX_VERIFY
Branch: `chatgpt/chopdot-v1-completion`

## User goal

A ChopDot user should be able to connect the Polkadot host/app and understand when their identity/account is host-authenticated versus merely local. Future DOT/USDC settlement must be able to rely on that binding instead of trusting manually typed addresses or matching display names.

## Current first-party/runtime facts

- `PolkadotHostBridge.requestIdentity()` already uses the Product SDK AccountsProvider.
- It requests host login, reads the host user id, and requests a product-derived account for the bridge `productId` at derivation index 0.
- The bridge returns host username, product id, product-account public key, and an SS58-style account id.
- Current `User` already has `accountPublicKeyHex` and `statementSignerHex`, but those fields did not encode where/how identity was authenticated.
- Friend wallet/account references remain display-only after PEOPLE-001.
- The current bridge default product id is `chopdot-shell-proof.dot`; this derivation input was deliberately not changed until the true v0.5.6/current host registration is reconciled.

## Trust model

Identity states for this slice:

- `local` — a ChopDot profile created/edited on this device; no host-authenticated account claim.
- `polkadot_host` — the current local profile has explicitly bound a Product SDK identity returned by the compatible host after login/consent.

A `polkadot_host` binding proves only what the host call supports:

- the host supplied the username;
- the host supplied the product-derived account for the requested ChopDot product id;
- ChopDot did not obtain or store the user's private key.

It does **not** prove legal identity, ownership of a manually stored wallet address, identity equality by matching names, or canonical backend acceptance on another device.

## Implemented safety rules

1. Host identity binding is explicit user action; no silent boot-time replacement.
2. ChopDot display name remains independently editable and is not overwritten by host username.
3. Binding persists product id, product-account public key, account id, prefix, host username, source, and timestamp.
4. Public keys are normalized to 32-byte hex and malformed identity payloads are rejected.
5. Product account fields are display-only; there is no free-text edit path.
6. Manual `walletAddress` remains separate and unverified by this binding.
7. Names remain presentation, never identity keys.
8. No private key/seed material is requested or stored.
9. Bind/unbind actions are intercepted as local-only by the local app reducer and do not enter the legacy shared-session transport.
10. Host unavailable/rejected/error paths leave existing money/identity state unchanged.
11. Unbinding removes both explicit host provenance and the compatibility `accountPublicKeyHex` copied from that binding, preventing stale authority interpretation.
12. Product id remains unchanged pending real-host/current-source reconciliation.

## Local data shape

`User.hostIdentity` now records:

```text
source: 'polkadot_host'
username
productId
accountPublicKeyHex
accountId
addressPrefix
boundAt
```

## Implemented product behavior

- Profile probes host capabilities.
- Outside a compatible host it remains a clear `Local profile` and explains that local use still works.
- Where host identity is available/needs login, Profile offers `Connect Polkadot`.
- Successful connection calls the existing Product SDK-backed `PolkadotHostBridge.requestIdentity()` and binds the result locally.
- Connected Profile shows `Connected with Polkadot`, host username, product account, product id, and explicit private-key/data-sync caveats.
- `Disconnect on this device` removes the host binding without deleting the profile, groups, expenses, or history.
- Application data is still described honestly as local on this branch; identity connection does not claim cloud sync.

## Tests written

`src/identity/polkadotIdentity.test.ts` covers:

- binding + provenance;
- display-name preservation;
- exact 32-byte key validation;
- malformed identity rejection;
- unbinding without deleting the person;
- separation of manually stored wallet address from authenticated product account;
- blank metadata rejection.

Verification command:

```text
npm run test:identity
```

## Required real-host verification before DONE

1. Reconcile the actual current/deployed product id and confirm `getProductAccount(productId, 0)` derives the intended ChopDot account.
2. Run `npm run lint`, `npm run test:identity`, host-adapter tests, and production build.
3. In the real current Polkadot host: open Profile → Connect Polkadot → approve login → verify username/account returned and persisted across reload.
4. Reject login and confirm no identity/money mutation.
5. Disconnect and confirm provenance/key are removed while normal app history remains.
6. Verify the Product SDK version/host API remains compatible with the current DevNet release.

## Deferred

- backend challenge/session issuance for canonical shared API authorization — BACKEND/POLKADOT follow-up after v0.5.6 reconciliation;
- friend-to-friend QR/account exchange and cryptographic binding — later identity work;
- DOT execution — POLKADOT-002;
- USDC execution — POLKADOT-003;
- Statement Store identity/sync use — SYNC-001, capability-gated;
- legal/KYC identity — out of scope unless future product requirements need it.

## Quality status

Implementation is `READY_FOR_CODEX_VERIFY`, not `DONE`. Domain/tests and consumer UI are written; real-host account derivation and runtime evidence are mandatory before this becomes a trusted production authority boundary.
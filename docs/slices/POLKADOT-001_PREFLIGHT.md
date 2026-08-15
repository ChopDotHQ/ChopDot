# POLKADOT-001 Preflight — Host identity + authenticated application authority

Status: BUILDING
Branch: `chatgpt/chopdot-v1-completion`

## User goal

A ChopDot user should be able to connect the Polkadot host/app and understand when their identity/account is host-authenticated versus merely local. Future DOT/USDC settlement must be able to rely on that binding instead of trusting manually typed addresses or matching display names.

## Current first-party/runtime facts

- `PolkadotHostBridge.requestIdentity()` already uses the Product SDK AccountsProvider.
- It requests host login, reads the host user id, and requests a product-derived account for the bridge `productId` at derivation index 0.
- The bridge returns host username, product id, product-account public key, and an SS58-style account id.
- Current `User` already has `accountPublicKeyHex` and `statementSignerHex`, but those fields do not currently encode where/how identity was authenticated.
- `Profile` currently labels every user as `Local profile` and says data is device-only.
- Friend wallet/account references are intentionally display-only after PEOPLE-001.
- The current bridge default product id is `chopdot-shell-proof.dot`; do not change this derivation input until the true v0.5.6/current host registration is reconciled.

## Trust model

Identity states for this slice:

- `local` — a ChopDot profile created/edited on this device; no host-authenticated account claim.
- `polkadot_host` — the current local profile has explicitly bound a Product SDK identity returned by the compatible host after login/consent.

A `polkadot_host` binding proves only what the host call supports:

- the host supplied the username;
- the host supplied the product-derived account for the requested ChopDot product id;
- ChopDot did not obtain or store the user's private key.

It does **not** prove:

- legal identity;
- that a manually stored EVM/PAS wallet address belongs to the same person;
- that a friend with a matching display name is the same host user;
- that another device has accepted this binding into canonical shared backend state.

## Safety rules

1. Host identity binding is explicit user action; do not silently replace a local identity during app boot.
2. Do not overwrite the user's editable ChopDot display name with the host username automatically.
3. Persist the exact product id, account public key, account id, and host username returned at binding time.
4. Normalize the public key before storage and reject malformed non-32-byte values.
5. A host-authenticated product account must never be editable as arbitrary free text.
6. Manual `walletAddress` remains separate and must not be promoted to authenticated merely because a host identity exists.
7. Names are presentation, never identity keys.
8. Private keys/seed phrases never enter ChopDot state, logs, or backend.
9. Binding/unbinding in this local parallel branch remains local-only; it must not be sent through the old shared-session transport.
10. If the host is unavailable, rejected, or errors, existing financial state and identity binding remain unchanged.
11. If product id/account derivation differs after v0.5.6 reconciliation, migrate deliberately; never silently rebind an account.
12. POLKADOT-002/003 must consume authenticated binding/capabilities rather than accepting manually entered settlement destinations as equivalent trust.

## Local data shape

Additive fields on `User`:

```text
hostIdentity?: {
  source: 'polkadot_host'
  username: string
  productId: string
  accountPublicKeyHex: 0x...
  accountId: string
  addressPrefix: number
  boundAt: ISO timestamp
}
```

`accountPublicKeyHex` may remain populated for backward compatibility, but `hostIdentity` is the explicit trust provenance for new code.

## Implementation shape

- Add a pure identity-domain module for normalization, binding, unbinding, and trust presentation.
- Add a local app reducer wrapper so `BIND_POLKADOT_HOST_IDENTITY` / `UNBIND_POLKADOT_HOST_IDENTITY` never enter the legacy shared-action transport.
- Update Profile with a simple capability-aware `Connect Polkadot` action.
- On success, show `Connected with Polkadot`, host username, product account, and clear language that ChopDot still stores application data locally in this branch.
- On unavailable host, preserve a useful local profile with no fake verification state.
- Keep display-name editing independent from host username.
- Add deterministic identity-domain tests using synthetic host identity values; real host proof remains a Codex/device verification step.

## Acceptance cases

1. Local profile is clearly labeled local before binding.
2. Compatible host + accepted login returns identity and binds it to the current local user.
3. Stored public key is canonical 32-byte hex and exact account/product metadata are retained.
4. Display name is not silently replaced by host username.
5. Host rejection/error leaves prior state unchanged and shows recoverable UI feedback.
6. Binding action is local-only and is never published through old session sync.
7. Manual wallet address remains visually/logically separate from host-authenticated product account.
8. Unbind removes host trust provenance without deleting the user, groups, expenses, or history.
9. Malformed identity payload is rejected.
10. Profile copy does not imply legal/KYC identity or cloud synchronization.
11. Keys are never requested or stored.
12. Product-id mismatch remains an explicit verification/migration concern, not silently changed in this branch.

## Deferred

- backend challenge/session issuance for canonical shared API authorization — BACKEND/POLKADOT follow-up after v0.5.6 reconciliation;
- friend-to-friend QR/account exchange and cryptographic binding — later POLKADOT identity slice;
- DOT execution — POLKADOT-002;
- USDC execution — POLKADOT-003;
- Statement Store identity/sync use — SYNC-001, capability-gated;
- legal/KYC identity — out of scope unless a future product requirement explicitly needs it.

## Quality status

Required gate: G2 local-flow evidence plus real-host evidence before this becomes a trusted production authority boundary.

Code/tests can be written here, but Product SDK host login/account derivation must be exercised on the real current Polkadot host by Codex/device verification before `DONE`.
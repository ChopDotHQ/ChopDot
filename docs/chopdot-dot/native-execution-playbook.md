# Native release execution playbook

**Kind:** guardrail
**Status:** active
**Owner:** release-integrator
**Last reviewed:** 2026-08-24
**Applies to:** chopdot-v1-launch
**Authority:** conditional native-release execution guardrail subordinate to the current plan, release state, and product law

## Programme declaration

The current candidate is ineligible for promotion until P-035 and P-022 are
repaired and a new immutable candidate is proven. This playbook supplies the
native route only; it does not select the current task.

This release runs **Programme A**, constrained by **Programme B**:

- Programme A ships and verifies one immutable public-testnet frontend.
- Programme B proves that identity, signed events, delivery, recovery, privacy,
  and payment evidence preserve product truth.

Neither programme may use a host, chain, contract, registry, wallet, cache, or
index as membership or money authority.

## Loop

For each accepted package:

1. Verify exact root, branch, HEAD, and complete status.
2. Name the cockpit card and GIVEN/WHEN/THEN contract.
3. Implement within the card scope.
4. Run focused tests and a `src/main.tsx` production-entrypoint test.
5. Obtain an independent product/security review.
6. Repair, rerun the wave regression, commit, and fingerprint.
7. Refresh exact-worktree Repo Graph and require KGv2 cited recall.

Fixture tests prove service behavior only. They never prove a public release.

## Native boundaries

- Statement Store: bounded wake-up hint or measured delivery payload only.
- Bulletin: encrypted content availability with explicit expiry and renewal.
- `RecoveryHeadIndex`: owner-scoped monotonic digest locator only.
- Asset/payment rails: evidence of an exact leg; receiver confirmation and group
  close remain separate.
- DotNS/IPFS/Desktop: resolve immutable bytes; never grant user authority.

## Promotion gate

Build once from a clean commit. Stage on Products Devnet, read the bytes back,
then promote the identical CAR without rebuilding. Verify CAR SHA-256, root/app
CID, release manifest, gateway, `.dev-dot.li`, public testnet host, independently
proved `.dot.li`, and Desktop Dev. Fixes create a new commit and CAR.

Human login is required only at the official deploy CLI sign-in/ownership gate.
No private key, seed phrase, or credential belongs in source, logs, reports, or
chat.

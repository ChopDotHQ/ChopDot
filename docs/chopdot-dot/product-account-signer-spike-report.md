# Product Account Signer Spike Report

Updated: 2026-06-15

## Discovery

- Product SDK signer package exposes `SignerManager`, host and dev providers, Product Account lookup, and `signRaw`.
- Product SDK host signing is designed for a Polkadot host container. A normal browser should not be treated as proof of host readiness.
- The local ChopDot.dot savings-circle path now has a `DotSessionSignerAdapter` boundary.

## Facts

- ChopDot.dot can now create and verify two session-signature types:
  - `demo-blake2` for local/offline lab signing.
  - `polkadot-raw` for Product Account-style raw message signatures.
- The native UI asks the signer adapter for a signer before publishing a session event.
- In a normal browser, host signing preflights as unavailable and falls back to the demo signer without changing user-facing copy.
- For B1 proof runs, `chopdot-dot-signer=host-required` disables demo fallback. If the Product Account host is unavailable, the action fails instead of silently signing with the lab signer.
- Unit coverage proves a Polkadot raw signature can be replay-verified without a demo secret.
- Unit coverage proves host-required mode refuses fallback when Product Account signing is unavailable.
- Installing the current Product SDK signer/host packages surfaced a local package compatibility problem when host-wrapper code is bundled or imported directly:
  - `@novasamatech/host-api-wrapper` imports `isResponse` from `@polkadot-api/json-rpc-provider`, but the installed version does not export it.

## Inferences

- The ChopDot architecture is now closer to the target shape because signer choice is an adapter, not product truth.
- Product Account signing is still the right Polkadot-native identity direction, but the current local repo cannot honestly claim host signing is proven.
- The app should keep the runtime loader and fallback until the Product SDK host package compatibility issue is resolved or tested inside the intended host container.
- The strict host-required mode gives us an honest B1 preflight path while the normal ChopDot experience remains usable for local product work.

## User Boundary

Users should not see Product Account, host API, signer provider, or SDK error language.

They should only see:

```text
Using Leo
Mark paid
Confirm received
Group view: up to date
```

## Next Step

Run the same savings-circle proof inside a Product SDK host container:

```text
Leo signs Mark paid through Product Account
Mina sees Confirm Leo through shared event transport
Mina signs Confirm received through Product Account
Raw signatures replay-verify
No Supabase
No shared localStorage
No SDK errors in normal UI
No demo fallback when `chopdot-dot-signer=host-required`
```

If the host package import mismatch persists inside the container, pin or override the incompatible `@polkadot-api/json-rpc-provider` dependency before promoting Product Account signing beyond `spike`.

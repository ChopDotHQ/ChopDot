# Codex Platform Catalog Addendum

This addendum extends `docs/CODEX_HANDOFF.md` with the Products Devnet research completed in RESEARCH-002.

Before changing any Polkadot/Parity integration, read:

1. `docs/research/RESEARCH-002_PARITY_PRODUCTS_DEVNET_CAPABILITY_CATALOG.md`
2. `docs/research/PARITY_PRODUCTS_DEVNET_CATALOG.json`
3. `docs/research/CHOPDOT_PLATFORM_OPPORTUNITY_MATRIX.md`
4. `docs/research/LIVE_DEVNET_REGISTRY_REFRESH.md`
5. `docs/CHOPDOT_V1_EXECUTION_BOARD.md`

## What the catalog establishes

- Product SDK is the high-level product-facing SDK family.
- TrUAPI is the lower-level typed host protocol.
- Triangle JS and `@polkadot-apps/*` are predecessor/compatibility families and must not be mixed casually with current Product SDK packages.
- Asset Hub owns canonical chain asset/contract facts.
- People/Individuality owns current username/personhood/Coinage/Statement Store facts.
- Bulletin owns retained content bytes/CIDs, not relational application state.
- DotNS owns current name/record/content-pointer facts.
- Browse/Publisher is the dynamic deployed-app registry.
- CDM owns contract build/deployment/dependency publication; Product SDK contracts owns runtime access.
- Polkadot Mobile/Desktop/Web hosts own user approval, product-account exposure and signing boundaries.
- ChopDot service/Postgres remains canonical for shared groups, expenses, obligations, intents and application confirmation.

## Current platform research status

`RESEARCH-002` is complete as a dated architecture/catalog snapshot.

It is deliberately not a claim that every current live `.dot` app was statically enumerated. Browse/Publisher is dynamic. A live registry snapshot must be generated from the matching current network/deployments before making current inventory claims.

## New planned slice

`PLATFORM-001 — Capability registry + adapter reconciliation`

Do not begin it until the true current ChopDot source is identified and compared with this parallel branch.

Expected work:

- reconcile Product SDK/TrUAPI package versions;
- record exact host, network, genesis, asset and contract provenance;
- centralize runtime feature detection;
- preserve narrow adapters so platform types do not enter financial domain logic;
- distinguish simulation from real-host/real-chain proof;
- add unsupported/degraded states that fail without changing financial truth;
- add a tooling-only live Browse registry refresh script after the local environment is reconciled.

## Platform rules Codex must not violate

- Do not use Statement Store as the financial ledger.
- Do not use Bulletin as a query database.
- Do not expose plaintext personal expense artifacts on public storage.
- Do not treat a `.dot` name as permanent unquestioned payment authority.
- Do not mark a submitted/finalized payer transaction as receiver-confirmed under the current v1 policy.
- Do not reuse mainnet asset metadata on Devnet.
- Do not enable USDC without verified network, asset ID, decimals and runtime transfer support.
- Do not add escrow/shared-pot custody as an incidental feature.
- Do not treat reference apps or SDK READMEs as security audits.
- Do not treat host simulation as real host/device/chain evidence.

## Recommended sequence

```text
true source reconciliation
→ QUALITY-002 completion and verification
→ Product SDK/TrUAPI package-family proof
→ real host product identity proof
→ real PAS Devnet settlement proof
→ DATA-002 or BACKEND-001 based on reconciled source
→ durable obligations/payment intents
→ optional Statement Store version hints
→ encrypted Bulletin artifact policy
→ reproducible DotNS/Bulletin deployment
→ Browse publication and live registry snapshot
```

The catalog should be refreshed whenever Product SDK/TrUAPI, host releases, Devnet genesis/runtime, contract deployments or supported assets change.
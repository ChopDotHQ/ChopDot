# 2026-09-10 — Polkadot Products Devnet reset compatibility

**Kind:** investigation and compatibility disposition  
**Status:** implementation and simulated/live-read verification pass; updated live-user Product Account proof remains blocked on deployment  
**Trigger:** Polkadot Community Foundation Products Devnet update published 2026-09-08  
**Owner:** implementation interval tracked by GitHub issue #32  
**Authority:** research and compatibility evidence only; never participant, membership, money, recovery, product-law, or release authority  
**Applies to:** `codex/chopdot-v1-launch` starting at `dd2a1b16913f2524e81e58e585139d457deac1dc`

## Question

What must ChopDot change, re-attest, or explicitly re-prove after the September
2026 Products Devnet reset, while preserving participant-held authority and
avoiding unnecessary protocol or recovery rewrites?

## Primary sources

- Products Devnet update, 2026-09-08: <https://docs.polkadotcommunity.foundation/updates/2026-09-devnet-update/>
- Current Products Devnet networks: <https://docs.polkadotcommunity.foundation/reference/networks/>
- Current Products Devnet addresses: <https://docs.polkadotcommunity.foundation/reference/addresses/>
- Product SDK usage / host test guidance: <https://docs.polkadotcommunity.foundation/products/sdk/>
- Current `polkadot-app-deploy` environment preset: <https://github.com/paritytech/polkadot-app-deploy/blob/main/assets/environments.json>
- Product SDK host changelog: <https://github.com/paritytech/product-sdk/blob/main/product-sdk/packages/host/CHANGELOG.md>

## Material upstream changes

The September update resets every Devnet user's username/account context and
does not carry contacts or chat history forward. Host chat transport moves from
P-256 to X25519. Product Account, People, Bulletin and Asset Hub descriptors
must be current after runtime changes. The CDM ContractRegistry was redeployed,
and the Bulletin authorization shape moved `bytesPermanent` under `extra`.

The update explicitly states that already-deployed contracts, `.dot`
registrations, and already-published Bulletin data survive the reset. Survival
of bytes is not equivalent to reassignment of participant authority to a new
Product Account.

Current Products Devnet anchors relevant to ChopDot are:

- Asset Hub parachain `1000`;
- People parachain `1004`;
- Bulletin parachain `1010`;
- EVM chain id `420420417`;
- Asset Hub genesis `0xd6eec26135305a8ad257a20d003357284c8aa03d0bdb2b357ab0a22371e11ef2`;
- Asset Hub WSS `wss://asset-hub-paseo-rpc.n.dwellir.com`;
- Ethereum JSON-RPC `https://eth-rpc-testnet.polkadot.io`;
- web gateway `dev-dot.li`;
- native token `PAS`, 10 decimals.

Chain id is not a sufficient environment identity because the configured
Paseo Next target also uses `420420417`; ChopDot therefore retains an immutable
Asset Hub genesis check at chain-affecting gates.

## ChopDot observations

### Host bootstrap

`src/environment/polkadotHostBridge.ts` already understands `dev-dot.li` when
inferring a Product ID. Before this interval,
`src/environment/bootstrapPolkadotHost.ts` automatically enabled hosted
capability bootstrap only for `paseo.li`; `dev-dot.li` required the explicit
`developerChecks=1` path. That mismatch could make local host simulation green
while the current gateway behaved differently.

Disposition: centralize trusted host-domain classification, include
`dev-dot.li`, reject lookalikes, and keep developer-only actions behind
explicit/local test mode.

### Real hosted observation, 2026-09-10

The existing `https://chopdotapp01.dev-dot.li` deployment resolves through the
current Products Devnet wrapper. A real user reached the host-owned **Identity
Disclosure** ceremony for `chopdotapp01.dot` and selected **Allow**. The hosted
app then returned `Your account did not connect`.

This narrows the observed failure boundary: wrapper resolution and identity
disclosure work, while the old deployed application fails after disclosure in
the Product Account connection path. The visible hosted UI (`You paid. Catch it
now.` / `Start with the receipt.` / `Use my Product Account`) matches the
August 24 source at commit `1a44c4ceced4ed75168d86d28a5b924925a0c5e6`, not
the current release candidate. The live host is therefore materially stale and
cannot serve as evidence for the September-compatible branch.

The current branch must be deployed as a new exact candidate before repeating
the real-user ceremony. Until that happens, the real hosted observation is a
failure report for the stale build, not a failure of the repaired candidate.

### Product SDK Product Account compatibility

The stale/live and pre-repair branch used `@parity/product-sdk-host@0.14.1`.
Upstream `0.15.0` changed the Product Account derivation-index wire shape while
preserving the high-level `getProductAccount(productId, derivationIndex)` API.
That is consistent with the observed boundary in which user disclosure succeeds
but Product Account resolution fails.

The bounded compatibility repair upgrades only the relevant PAPI-2-compatible
SDK family:

- `@parity/product-sdk-host` `0.16.0`;
- `@parity/product-sdk-statement-store` `0.6.5`;
- `@parity/host-api-test-sdk` `0.12.1`.

`polkadot-api` remains on the existing 2.x line and the frozen
`@polkadot-community-foundation/polkadot-app-deploy@0.13.1` release tooling is
not migrated in this interval. The package lock was generated by npm in CI and
committed without hand-editing transitive dependency state.

The upgraded SDK passes ChopDot's Products Devnet host simulation: distinct
Product Accounts, encrypted shared-session transport, observed-only payment
status, and redacted receipt/preimage round-trip. This is strong compatibility
evidence but is not a substitute for the real `dev-dot.li` Product Account
ceremony.

### Host simulation

Before this interval, `tests/polkadot-host-sim.spec.ts` used the test SDK's
`PASEO_ASSET_HUB` preset and appended `developerChecks=1` to the product URL.
Official SDK guidance says the shipped presets are not the Products Devnet;
Products Devnet should be supplied as an explicit `NetworkConfig` using current
network anchors.

Disposition: supply a Products Devnet Asset Hub configuration and remove the
query-parameter bypass from the simulator product URL. The simulator is also
part of the normal release-browser assurance command so a generic browser pass
cannot accidentally substitute for Products Devnet host coverage.

With the newer test SDK, the asynchronous capability probe can take longer than
the local harness's original five-second startup expectation. The local-only
developer action seam is therefore exposed before the asynchronous probe; the
actions themselves still execute the real capability operations. Real hosted
users do not receive this debug seam unless explicit developer checks are
requested.

### Identity-bound membership state

The durable membership key-envelope records are cryptographically bound to
product id, participant id and recipient Product Account public key. Their
storage registry, however, historically defaulted to the global key
`chopdot-membership-key-envelope-registry-v1`.

Because September requires a new Product Account, the safe Devnet behavior is
not to infer a cross-reset migration. The compatibility interval creates an
explicit `2026-09` Devnet identity epoch and scopes the active registry by
product id plus Product Account public key. Legacy v1 data is preserved but is
not silently consumed as current membership authority.

A future production identity-rotation design, if required, must use explicit
signed authority and is outside this Devnet repair.

### Chat encryption

ChopDot sends application payloads through the Product SDK host ChatManager.
The X25519 change is therefore a host/SDK transport compatibility concern, not
an instruction to rewrite ChopDot's application-level encrypted event or key
envelope formats. The current host SDK compatibility line is used and fresh
rooms/contacts plus real-host round-trip evidence remain required.

### Bulletin and recovery

ChopDot's Bulletin path uses the Product SDK PreimageManager rather than reading
or constructing `bytesPermanent` directly. No application-layer Bulletin schema
rewrite is justified from source inspection alone; a live submit/readback is
still required after the reset.

The existing RecoveryHeadIndex was deployed before the reset. Because upstream
states deployed contracts survive, redeployment is not the default action.
`scripts/recovery-head-deployment.mjs --readback` provides a read-only check that
re-attests environment anchors, live bytecode hash, deployment receipt/block and
address against the frozen compiler/deployment evidence.

On 2026-09-10 the read-only check passed through the current official Devnet RPC
`https://eth-rpc-testnet.polkadot.io`. Current DotNS bytecode matched the pinned
September code-anchor snapshot, and RecoveryHeadIndex at
`0x391DBCF8267f6AeCd4BE5DD84039dF588EC337EC` matched frozen PVM SHA-256
`f73520ea129a07dc5827ce3826fb730930ce4a2a2081bb7b5a3665c243b2b9b2`
with 5561 readback bytes. Deployment transaction
`0x2d49753699012b494a0b71979ee0a0ec1e5acb95bc78b2c2ba8722424b93eade`
was read back successfully at block `12603206` / block hash
`0x4ad0b1745ae3d4f09fc8dee7b940bdde7c5483e95c86b159ee0d1ddfc77d87b2`.

Disposition: retain the existing RecoveryHeadIndex. No redeployment is justified
or authorized by this interval.

The readback also exposed a local evidence-wiring defect: the recovery target
declared the September snapshot while `loadDeploymentContext()` still
hard-coded August file names. The loader now follows the code-anchor path
declared by the recovery target and then the environment snapshot declared by
that anchor, preserving immutable evidence chaining without date-specific code.

### CDM

No root `cdm.json` and no active CDM dependency were found in the release
branch. The CDM registry migration is therefore not a ChopDot blocker and CDM
will not be introduced merely because the platform update mentions it.

## Compatibility assertions

| ID | Assertion | Current evidence / remaining boundary |
|---|---|---|
| SEPT26-001 | `*.dev-dot.li` works without `developerChecks=1` | source + exact simulator; updated hosted candidate still required |
| SEPT26-002 | fresh host username/Product Account activates | stale live build fails post-Allow; upgraded candidate real-host retest required |
| SEPT26-003 | pre-reset local identity cannot silently claim the new identity | implemented and unit-tested on exact candidate |
| SEPT26-004 | two fresh users establish a ChopDot group | simulated multi-account coverage; live-user required |
| SEPT26-005 | host chat custom payload round-trip succeeds | upgraded simulated-host pass; live-user required |
| SEPT26-006 | Statement Store encrypted session round-trip succeeds | upgraded simulated-host pass; real-host-chain required |
| SEPT26-007 | payment request and Completed observation succeed | upgraded simulated-host pass; real-host-chain required |
| SEPT26-008 | Bulletin checkpoint submit and exact readback succeed | simulated preimage boundary; real-host-chain required |
| SEPT26-009 | existing RecoveryHeadIndex bytecode matches frozen artifact | passed live read-only on current September RPC |
| SEPT26-010 | RecoveryHeadIndex read/advance/finality behavior remains valid | readback passed; any new write proof requires human-authorized signer |
| SEPT26-011 | `.dot` hosted bundle resolves through `dev-dot.li` | stale bundle resolves; updated exact candidate must be deployed and observed |
| SEPT26-012 | full flow uses Products Devnet and never Paseo Next accidentally | custom Devnet simulator + live genesis/para/RPC evidence; updated hosted confirmation remains |

## Failure behavior

Wrong-network, stale-account, corrupt registry, ambiguous cross-reset ownership,
missing host capability, failed delivery, failed chain readback, or mismatched
contract code must fail closed. None of those conditions may promote canonical
money or membership state. No pre-reset username, chat room, contact record or
local membership envelope is treated as proof of ownership by a fresh Product
Account.

## Explicit non-goals

- no CDM adoption;
- no Product SDK umbrella refactor;
- no PAPI 3 migration;
- no recovery-contract redesign or redeployment;
- no broad `polkadot-app-deploy` migration;
- no on-chain write performed by the implementation agent;
- no public-beta or release promotion;
- no claim that simulator evidence is a real Products Devnet user journey.

## Remaining evidence

The source, exact-candidate, upgraded simulated-host, current-network anchor and
RecoveryHeadIndex read-only layers can be completed without a user ceremony.
The remaining higher-level boundary is to deploy the updated exact candidate to
a Devnet `.dot` host and repeat the real Product Account flow: fresh/current
Products Devnet username, Identity Disclosure approval, Product Account
activation, then a second fresh participant for the two-user journey and any
user-signed chain action. Private keys or recovery phrases must never be
supplied to an agent.

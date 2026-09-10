# 2026-09-10 — Polkadot Products Devnet reset compatibility

**Kind:** investigation and compatibility disposition  
**Status:** implementation in progress; real-host and live-user proof remain blocked  
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

### Host simulation

Before this interval, `tests/polkadot-host-sim.spec.ts` used the test SDK's
`PASEO_ASSET_HUB` preset and appended `developerChecks=1` to the product URL.
Official SDK guidance says the shipped presets are not the Products Devnet;
Products Devnet should be supplied as an explicit `NetworkConfig` using current
network anchors.

Disposition: supply a Products Devnet Asset Hub configuration and remove the
query-parameter bypass from the simulator product URL.

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
envelope formats. Fresh rooms/contacts and real-host round-trip evidence remain
required.

### Bulletin and recovery

ChopDot's Bulletin path uses the Product SDK PreimageManager rather than reading
or constructing `bytesPermanent` directly. No application-layer Bulletin schema
rewrite is justified from source inspection alone; a live submit/readback is
still required after the reset.

The existing RecoveryHeadIndex was deployed before the reset. Because upstream
states deployed contracts survive, redeployment is not the default action.
`scripts/recovery-head-deployment.mjs --readback` already provides a read-only
check that re-attests environment anchors, live bytecode hash, deployment
receipt/block and address against the frozen compiler/deployment evidence.

Disposition: update the current Devnet RPC target, then run read-only code and
receipt verification. Only consider a deployment if those checks prove the
recorded contract is absent or mismatched.

### CDM

No root `cdm.json` and no active CDM dependency were found in the release
branch. The CDM registry migration is therefore not a ChopDot blocker and CDM
will not be introduced merely because the platform update mentions it.

## Compatibility assertions

| ID | Assertion | Maximum evidence without a real user/host |
|---|---|---|
| SEPT26-001 | `*.dev-dot.li` works without `developerChecks=1` | exact-candidate / simulated-host |
| SEPT26-002 | fresh host username/Product Account activates | real-host-chain required |
| SEPT26-003 | pre-reset local identity cannot silently claim the new identity | exact-candidate |
| SEPT26-004 | two fresh users establish a ChopDot group | live-user required |
| SEPT26-005 | host chat custom payload round-trip succeeds | real-host-chain / live-user required |
| SEPT26-006 | Statement Store encrypted session round-trip succeeds | real-host-chain required |
| SEPT26-007 | payment request and Completed observation succeed | real-host-chain required |
| SEPT26-008 | Bulletin checkpoint submit and exact readback succeed | real-host-chain required |
| SEPT26-009 | existing RecoveryHeadIndex bytecode matches frozen artifact | real-host-chain, read-only |
| SEPT26-010 | RecoveryHeadIndex read/advance/finality behavior remains valid | real-host-chain; write requires human-authorized signer |
| SEPT26-011 | `.dot` hosted bundle resolves through `dev-dot.li` | real-host-chain required |
| SEPT26-012 | full flow uses Products Devnet and never Paseo Next accidentally | exact-candidate plus real-host confirmation |

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
- no recovery-contract redesign;
- no on-chain write performed by the implementation agent;
- no public-beta or release promotion;
- no claim that simulator evidence is a real Products Devnet user journey.

## Remaining evidence

Repository/unit/simulator/CI work can close the source and exact-candidate
assertions. The remaining higher-level boundary requires a real post-reset
Products Devnet username/Product Account, explicit host authorization, a second
fresh participant for the two-user journey, and any user-signed chain action.
Private keys or recovery phrases must never be supplied to an agent.

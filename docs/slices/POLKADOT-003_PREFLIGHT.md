# POLKADOT-003 Preflight — USDC asset settlement

Status: BUILDING / EXECUTION CAPABILITY BLOCKED
Branch: `chatgpt/chopdot-v1-completion`

## User goal

A ChopDot obligation denominated in USDC should eventually be payable through the authenticated Polkadot product account with exact asset/amount/destination evidence and the same `marked_paid -> receiver confirms` application lifecycle as every other rail.

## Verified first-party facts

### Polkadot mainnet

Polkadot Developer Docs list USDC on Polkadot Hub as:

```text
asset id = 1337
symbol = USDC
name = USD Coin
decimals = 6
sufficient = yes
```

USDC is managed through the Assets pallet, not the native Balances pallet.

### Product SDK availability

The current Product SDK chain reference says:

```text
paseo = available
polkadot = planned
kusama = planned
```

and explicitly warns that `getChainAPI('polkadot')` currently throws.

### Paseo DevNet

Paseo Asset Hub supports the Assets pallet, but this research pass has not found first-party evidence that a USDC test asset is registered there, nor a verified Paseo USDC asset id.

Therefore:

- never assume mainnet asset id 1337 exists on Paseo;
- never label an arbitrary Paseo asset `USDC`;
- do not expose executable USDC settlement until a verified network/asset registration exists.

## Transaction shape

Parity's first-party `asset-transfer-api` uses the Assets pallet `transferKeepAlive(assetId, destination, amount)` concept. PAPI call field names for the current Product SDK descriptor still require type/runtime verification before wiring live execution.

POLKADOT-003 therefore separates:

1. asset identity/config;
2. exact settlement plan;
3. execution adapter;
4. transaction receipt/evidence;
5. ChopDot application confirmation.

No speculative typed extrinsic is committed merely to make the feature appear complete.

## Asset configuration

Known mainnet configuration:

```text
network = polkadot
chain = assetHub
assetId = 1337
symbol = USDC
decimals = 6
verified = true
executionEnabled = false // current Product SDK does not yet expose polkadot preset
```

Paseo configuration:

```text
network = paseo
symbol = USDC
assetId = UNKNOWN
verified = false
executionEnabled = false
```

A DevNet USDC config may be enabled only after first-party/on-chain metadata proves its asset id, symbol and decimals.

## Authority rules

- payer and receiver need POLKADOT-001 host-authenticated product accounts;
- sender/receiver addresses derive from authenticated public keys for the target network;
- obligation currency must be exactly `USDC`;
- asset id + decimals come from verified config, never from user text;
- amount is integer base units;
- product id must match between participants;
- signer public key must match payer binding at execution time;
- no private keys enter ChopDot.

## Evidence model

```text
PolkadotAssetPaymentReceipt {
  network
  assetId
  symbol
  txHash
  senderAccountId
  recipientAccountId
  amountBaseUnits
  blockHash
  blockNumber
  finalizedAt
}
```

Evidence must match the exact configured asset, network, payer, receiver and amount before it may affect ChopDot state.

## Implementation for this slice

Safe work we can complete now:

- explicit verified/unverified asset config type;
- known Polkadot USDC metadata config;
- disabled Paseo USDC placeholder with no invented asset id;
- exact 6-decimal amount conversion;
- authenticated settlement-plan creation;
- network-specific account derivation from host-authenticated public keys;
- receipt/evidence type and pure matcher;
- execution-adapter interface so future typed Assets call plugs in without changing domain logic;
- deterministic tests;
- consumer capability helper that says whether USDC execution may be offered.

Do NOT yet:

- put a live `Pay USDC` button in PayerView;
- accept arbitrary locally created receipt evidence into financial state;
- call `getChainAPI('polkadot')` as if current Product SDK supports it;
- use mainnet asset id 1337 on Paseo;
- claim DevNet or production USDC execution proof.

## Acceptance cases

1. USDC converts exactly to 6-decimal base units.
2. Excess decimal precision is rejected.
3. Missing/unauthenticated payer or receiver is rejected.
4. Product-id mismatch is rejected.
5. Non-USDC obligation is rejected.
6. Unverified/disabled asset config cannot create an executable plan.
7. Mainnet USDC config retains exact `1337 / USDC / 6` metadata.
8. Chain-specific addresses derive from authenticated public keys.
9. Receipt matcher rejects wrong network, asset id, symbol, sender, receiver or amount.
10. No fake Paseo USDC config exists.
11. Execution adapter requires an explicitly verified enabled config.
12. No user-facing executable USDC option appears until capability becomes real.

## Unblock conditions for live execution

One of:

A. **Paseo DevNet**: verify an actual USDC test asset on the current Paseo Asset Hub (asset id, symbol, decimals) and verify the typed Assets transfer call through current Product SDK descriptors.

B. **Polkadot mainnet**: Product SDK enables its Polkadot environment/chain-client path; then verify asset 1337 metadata and execute a real host-signed transfer.

After either unblock:

- implement typed Assets transfer executor;
- verify balance + fee behavior;
- submit/finalize through product-account signer;
- persist independently matched evidence;
- advance exact split to `marked_paid`;
- receiver confirmation remains final under current v1 policy.

## Quality status

The domain/evidence seam can reach G2 artifacts now. Live USDC execution remains capability-blocked and must not be described as implemented.
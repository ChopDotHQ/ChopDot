# POLKADOT-003 Preflight — USDC asset settlement

Status: READY_FOR_CODEX_VERIFY / LIVE EXECUTION BLOCKED
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

The current Product SDK chain reference says only `paseo` is available; `polkadot` and `kusama` are planned and currently throw when requested through the preset chain client.

### Paseo DevNet

Paseo Asset Hub supports the Assets pallet, but this research/build pass has not found first-party evidence of a USDC registration or verified Paseo USDC asset id.

Therefore:

- mainnet asset id 1337 is never assumed on Paseo;
- no arbitrary Paseo asset is labelled USDC;
- no executable USDC option is exposed until network + asset metadata are verified.

## Transaction shape

Parity's first-party `asset-transfer-api` confirms the Assets pallet `transferKeepAlive(assetId, destination, amount)` model. The exact typed PAPI call against the current Product SDK descriptor still requires runtime/type verification before a live executor is committed.

POLKADOT-003 therefore separates:

1. asset identity/config;
2. exact settlement plan;
3. execution adapter;
4. transaction receipt/evidence;
5. ChopDot application confirmation.

## Implemented on this branch

### Asset metadata/config

`src/payments/polkadotAsset.ts` defines:

- `PolkadotAssetConfig`;
- known mainnet `POLKADOT_USDC_CONFIG`:
  - network `polkadot`;
  - asset id `1337`;
  - symbol `USDC`;
  - decimals `6`;
  - metadata verified;
  - execution deliberately disabled;
- `PASEO_USDC_UNVERIFIED_CONFIG`:
  - network `paseo`;
  - symbol `USDC`;
  - asset id `null`;
  - metadata unverified;
  - execution disabled.

### Financial/identity contract

Implemented:

- exact integer six-decimal conversion;
- `canExecutePolkadotAsset()` capability gate;
- payer + receiver require POLKADOT-001 host identity;
- obligation currency must exactly match configured symbol;
- product id must match between participants;
- network-specific account ids derive from authenticated 32-byte product public keys;
- asset id/decimals come only from config, never user text;
- disabled/unverified config cannot create an executable payment plan.

### Execution seam

Implemented `PolkadotAssetTransferExecutor` and `executePolkadotAssetPayment()`.

The executor is dependency-injected intentionally. A future verified Product SDK Assets implementation can plug in without changing obligation or evidence semantics. Returned evidence is rejected unless it exactly matches the original plan.

No speculative live Assets extrinsic was added.

### Evidence

Added `PolkadotAssetPaymentReceipt`:

```text
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
```

`assetReceiptMatchesPlan()` rejects mismatched network, asset id, symbol, sender, receiver, amount or malformed transaction/block evidence.

This receipt is **not yet accepted into live Split state** because no trustworthy execution/independent verification path is available. That is deliberate: locally fabricated asset receipts must not become money truth.

### Product correction discovered during this slice

`PayerView` previously aggregated all requested splits for a member even if they were owed to different people, then labelled the payment using one requester.

It now settles **one creditor at a time**:

- choose an active requested obligation;
- derive its receiver;
- include only requested splits owed to that same receiver;
- leave debts to other people untouched for their own settlement.

This protects both manual and Polkadot payment flows from combining unrelated obligations.

## Tests written

`src/payments/polkadotAsset.test.ts` covers:

1. exact six-decimal USDC units;
2. excess precision rejection;
3. exact mainnet metadata `1337 / USDC / 6`;
4. mainnet execution disabled under current SDK;
5. Paseo config contains no invented asset id;
6. disabled config cannot create executable plan;
7. authenticated payer/receiver requirements;
8. exact currency matching;
9. product-account namespace mismatch;
10. network-specific address derivation;
11. receipt tampering rejection;
12. executor output rejected when evidence does not match plan.

Tests are WRITTEN / NOT EXECUTED HERE. Existing `npm run test:wallet` includes `src/payments/*.test.ts` and therefore includes this test file once dependencies are installed.

## Live execution unblock conditions

One of:

### A. Paseo DevNet

Verify an actual USDC test asset on the current Paseo Asset Hub:

- asset id;
- metadata symbol exactly `USDC`;
- decimals exactly as configured;
- usable funded test balance;
- exact typed `Assets.transfer_keep_alive` call through the current Product SDK descriptor.

Then enable only that verified config and add the Product SDK executor.

### B. Polkadot mainnet

Product SDK enables the Polkadot environment/chain-client path, then:

- re-query asset 1337 metadata;
- verify signer/account path;
- execute real host-signed USDC transfer;
- record finalized evidence.

After either unblock:

- verify balance + fee behavior;
- submit/finalize through product-account signer;
- independently match exact evidence;
- persist evidence to exact split;
- advance split to `marked_paid`;
- receiver confirmation remains final under current v1 policy.

## Explicit non-claims

- no `Pay USDC` button is enabled today;
- no Paseo USDC registration is claimed;
- no mainnet Product SDK execution is claimed;
- no locally fabricated asset receipt can currently mutate financial state;
- no FX/conversion behavior exists.

## Quality status

The asset/domain/evidence seam has G2-style code/test artifacts and is `READY_FOR_CODEX_VERIFY`. Live execution remains platform/asset-capability blocked and must not be described as implemented.
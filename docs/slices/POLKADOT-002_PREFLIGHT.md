# POLKADOT-002 Preflight — Native Polkadot settlement adapter

Status: BUILDING
Branch: `chatgpt/chopdot-v1-completion`

## User goal

A ChopDot participant should be able to settle a matching native-chain obligation through the Polkadot host/app without ChopDot ever receiving a private key. The payment must use the authenticated product account established by POLKADOT-001, validate the exact destination and amount, wait for chain inclusion/finality evidence, then enter the existing `marked_paid -> receiver confirms` lifecycle.

## Current first-party facts

- Product SDK `PaymentManager` is not a generic DOT-transfer API. Its TrUAPI `Balance` is interpreted according to the host's single fixed payment asset (for example pUSD), and status is only Processing/Completed/Failed.
- Product SDK transaction tooling is the appropriate native-chain path:
  - `SignerManager.connect()` establishes the host signer provider;
  - `SignerManager.getProductAccount(productId, 0)` obtains the product account signer;
  - `getChainAPI('paseo')` supplies typed chain access on DevNet;
  - `Balances.transfer_keep_alive` builds the native transfer;
  - `submitAndWatch(..., { waitFor: 'finalized' })` returns transaction/block evidence.
- The SDK explicitly recommends the product-account signer because it routes through the host create-transaction path and preserves chain signed extensions.
- Paseo's native test token is PAS with 10 decimals. It is not DOT.
- The current ChopDot shell already supports an EVM-style PAS test flow. POLKADOT-002 must not silently reinterpret that evidence as native Substrate evidence.

## Product/network policy

One adapter, explicit configuration:

```text
DevNet proof:
network = paseo
asset = PAS
assetDecimals = 10

Production target:
network = polkadot
asset = DOT
assetDecimals = 10
```

Rules:

1. Never label PAS as DOT.
2. Never pay an obligation denominated in one asset using another asset without an explicit FX/conversion product flow.
3. This slice only executes when obligation currency matches the configured native asset.
4. Production DOT execution is not claimed until the real current Polkadot host/network path is verified.

## Authority and identity

- Payer must have a `hostIdentity` binding from POLKADOT-001.
- Receiver must have a host-authenticated product account binding; a manually entered `walletAddress` is not an equivalent destination.
- At execution time, SignerManager must return a product account whose address/public account matches the payer's stored authenticated binding.
- Product-id mismatch is a hard failure; do not derive/sign using an unreviewed different product id.
- The receiver destination comes from `receiver.hostIdentity.accountId`, never free text.
- No seed phrase/private key enters ChopDot.

## Evidence model

Add a distinct native receipt instead of overloading the current EVM receipt:

```text
NativePolkadotPaymentReceipt {
  network
  asset
  txHash
  senderAccountId
  recipientAccountId
  amountBaseUnits
  blockHash
  blockNumber
  finalizedAt
}
```

The local settlement layer may accept that receipt only when:

- the split is still `request_sent`;
- payer/receiver match the exact obligation;
- both host bindings exist;
- configured network/asset match;
- sender equals payer host account;
- recipient equals receiver host account;
- amount equals exact base units;
- tx hash has not already been consumed by another split.

A valid native receipt changes ChopDot application state to `marked_paid`, not `confirmed`.

## Implementation shape

- `src/payments/polkadotNative.ts`
  - asset/base-unit conversion;
  - pure execution-plan validation;
  - Product SDK host execution adapter;
  - typed receipt output.
- additive `Split.nativePayment` evidence field.
- local action `RECORD_VERIFIED_NATIVE_PAYMENT` handled in the existing settlement audit wrapper.
- local-app routing must classify the new action as local-only; it must not enter the legacy shared-session transport.
- PayerView prefers native PAS settlement when:
  - currency is PAS;
  - both payer and receiver have host-authenticated product accounts;
  - host transaction capability initializes successfully.
- otherwise the existing PAS EVM path remains available as the old compatibility route; no automatic trust upgrade.
- production DOT config is code/configurable but disabled from consumer claims until verified.

## Acceptance cases

1. Amount conversion uses integer base units and rejects precision beyond configured decimals.
2. Missing payer host identity blocks native execution without changing money state.
3. Missing receiver host identity blocks native execution without changing money state.
4. Product-account mismatch blocks signing.
5. Exact native transfer builds `Balances.transfer_keep_alive` to receiver's authenticated account.
6. Host/user signing rejection produces recoverable UI and no settlement mutation.
7. Dispatch failure produces no payment evidence.
8. Successful finalized transaction yields native receipt with tx/block evidence.
9. Receipt validation rejects wrong network, asset, sender, receiver, amount, or reused tx hash.
10. Valid receipt sets exact split to `marked_paid` and journals chain evidence.
11. Receiver confirmation remains final ChopDot application confirmation.
12. PAS DevNet UI says PAS; production DOT is not claimed from a PAS proof.
13. Legacy PaymentManager is not presented as DOT transfer.
14. No private key material is stored/logged.

## Deferred / verification required

- exact production Polkadot network chain-client config and real DOT transfer — real-host verification;
- product ID migration from `chopdot-shell-proof.dot` — `DEBT-POLKADOT-IDENTITY-001`;
- canonical backend/independent chain verification — BACKEND-002;
- multi-asset/FX settlement — future scope;
- USDC Assets pallet execution — POLKADOT-003;
- automatic receiver confirmation from chain finality — separate threat-model/contract decision.

## Quality status

Required gate: G2 code/tests + G3 real host + real Paseo native transaction proof before DevNet native settlement is `DONE`. Production DOT requires a separate real Polkadot proof.
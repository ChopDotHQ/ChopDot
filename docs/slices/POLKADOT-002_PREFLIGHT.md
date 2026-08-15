# POLKADOT-002 Preflight — Native Polkadot settlement adapter

Status: READY_FOR_CODEX_VERIFY
Branch: `chatgpt/chopdot-v1-completion`

## User goal

A ChopDot participant should be able to settle a matching native-chain obligation through the Polkadot host/app without ChopDot ever receiving a private key. The payment must use the authenticated product account established by POLKADOT-001, validate the exact destination and amount, wait for finalized chain evidence, then enter the existing `marked_paid -> receiver confirms` lifecycle.

## Current first-party facts

- Product SDK `PaymentManager` is not a generic DOT-transfer API. Its TrUAPI `Balance` is interpreted according to the host's single fixed payment asset (for example pUSD), and status is only Processing/Completed/Failed.
- Product SDK transaction tooling is the appropriate native-chain path:
  - `SignerManager.connect()` establishes the host signer provider;
  - `SignerManager.getProductAccount(productId, 0)` obtains the product account signer;
  - `getChainAPI('paseo')` supplies typed chain access on DevNet;
  - `Balances.transfer_keep_alive` builds the native transfer;
  - `submitAndWatch(..., { waitFor: 'finalized' })` returns transaction/block evidence.
- Product SDK recommends the product-account signer because it routes through the host create-transaction path and preserves chain signed extensions.
- Paseo's native test token is PAS with 10 decimals. It is not DOT.
- The current ChopDot shell also has an EVM-style PAS compatibility flow. Native and EVM evidence remain distinct.

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
3. Native execution only runs when obligation currency matches the configured native asset.
4. Production DOT execution is not claimed until the real current Polkadot host/network path is verified.

## Authority and identity

- Payer and receiver must both have POLKADOT-001 `hostIdentity` bindings.
- The authenticated 32-byte product-account public key is identity truth; SS58 addresses are presentation/network encodings.
- The adapter derives sender/receiver SS58 addresses for the target network from those authenticated public keys. This avoids false mismatches between generic-prefix profile addresses and network-specific Asset Hub addresses.
- At execution time, SignerManager's returned product-account public key must exactly match the payer's stored authenticated public key.
- Product-id mismatch is a hard failure.
- Receiver destination is derived from the receiver's authenticated public key, never free text or `walletAddress`.
- No seed phrase/private key enters ChopDot.

## Evidence model

Implemented additive evidence:

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

The local settlement layer accepts that receipt only when:

- the exact split remains `request_sent`;
- payer/receiver match the obligation;
- both host bindings exist;
- network/asset match the accepted DevNet config;
- sender/recipient match addresses derived from authenticated public keys;
- amount equals exact integer base units;
- tx hash has not already been consumed by another split.

A valid native receipt changes ChopDot state to `marked_paid`, not `confirmed`, and cannot use the manual Undo path.

## Implemented on this branch

- `src/payments/polkadotNative.ts`
  - native integer base-unit conversion;
  - explicit Paseo PAS and future Polkadot DOT config;
  - authenticated product-account payment-plan creation;
  - network-specific SS58 derivation from host-authenticated public keys;
  - Product SDK `SignerManager + getChainAPI + submitAndWatch` execution;
  - `Balances.transfer_keep_alive` with `waitFor: finalized`;
  - typed native receipt and receipt-plan matching.
- `Split.nativePayment` keeps native evidence separate from legacy EVM `walletPayment`.
- `RECORD_VERIFIED_NATIVE_PAYMENT` validates and persists native evidence in the settlement audit layer.
- native receipt append creates `native_chain_transaction` activity evidence.
- duplicate native tx hashes are rejected across splits.
- native evidence blocks manual `I didn't pay yet` retraction.
- local-app action routing classifies native evidence as local-only; it cannot enter the old shared-session publisher.
- PayerView prefers native PAS when the exact requested split is PAS and both parties have host-authenticated identities; otherwise the existing EVM PAS compatibility path remains.
- consumer copy explicitly says `Paseo TestNet · PAS`; no DOT claim is made.
- Product SDK transaction dependencies are pinned for verification:
  - `@parity/product-sdk-chain-client` 0.10.0
  - `@parity/product-sdk-signer` 0.12.1
  - `@parity/product-sdk-tx` 0.4.1
- `npm run test:native-payment` added.

## Tests written

- exact 10-decimal PAS conversion;
- excess-precision rejection;
- missing host identity rejection;
- PAS/DOT asset mismatch rejection;
- product-id mismatch rejection;
- network-specific address derivation from authenticated public keys;
- receipt tampering rejection;
- native evidence persistence to exact split;
- native payment remains `marked_paid` until receiver confirmation;
- manual retraction blocked once native evidence exists;
- wrong destination rejection;
- duplicate native tx rejection;
- local-only routing of native evidence.

Tests are WRITTEN / NOT EXECUTED HERE.

## Required verification before DONE

1. `npm install` with the newly pinned SDK packages.
2. `npm run lint`.
3. `npm run test:native-payment`.
4. `npm run test:identity`.
5. `npm run test:host-adapter`.
6. `npm run build`.
7. Reconcile Product SDK package versions: this branch still pins older `@parity/product-sdk-host`/Statement Store versions while the current transaction packages were read from a newer Product SDK release line. Do not silently upgrade without host regression tests.
8. On the real current Polkadot host, verify the POLKADOT-001 product id/account binding first.
9. Fund the matching product account with PAS on Paseo Asset Hub.
10. Execute one real PAS native transfer through PayerView.
11. Record sender, recipient, amount, tx hash, finalized block and resulting ChopDot `marked_paid` state.
12. Receiver confirms and only then ChopDot becomes `confirmed`.
13. Exercise user-rejected signing and insufficient-balance failure paths; both must leave money state unchanged.

## Deferred

- exact production Polkadot/DOT network proof;
- product-ID migration from `chopdot-shell-proof.dot` — `DEBT-POLKADOT-IDENTITY-001`;
- canonical backend/independent chain verification — BACKEND-002;
- multi-asset/FX settlement;
- USDC Assets pallet execution — POLKADOT-003;
- automatic receiver confirmation from finality — separate threat-model/contract change.

## Quality status

G2 implementation/test artifacts exist, but no local execution evidence exists here. G3 requires a real host + real Paseo native transaction. Production DOT requires its own production-network evidence.
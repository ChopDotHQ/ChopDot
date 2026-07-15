# Wallet settlement five-person v1

## Current truth to preserve

- The portable shell already proves one group-money journey across web, Telegram, and the Polkadot host.
- Product Account identity and signed, encrypted host-session actions are the shared coordination path.
- A payment item closes when a strong finalized transfer matches its payer, receiver, amount, currency, and chain. It does not require a second ceremonial confirmation.
- A matched payment must never close an unrelated share or finish a group with open items.
- Normal UI stays user-first and must not expose protocol, host, proof, adapter, native, state-machine, or test-harness language.

## Scope in

- PAS on Polkadot Hub TestNet as the first real connected-wallet payment.
- An EIP-1193 wallet handoff from the visible payer screen.
- Direct JSON-RPC observation of the submitted transaction, independent of saved reports.
- Five people: Mina receives; Leo, Nina, Omar, and Casey pay from separate funded wallets and separate browser profiles.
- Existing faucet-funded balances documented honestly; fresh hash-backed top-ups recorded separately.
- A proof packet containing balance snapshots, top-up hashes, payment hashes, explorer links, screenshots, UI actions, and final group summary.
- Correct the P-023 and P-024 readiness claims before implementation.

## Scope out

- Main ChopDot merge.
- Custody, escrow, automatic debits, or production payment claims.
- Live DOT or production/testnet USDC promotion in this pass.
- Polkadot Mobile distribution or a source-built native mobile app.
- A live `.dot` redeploy unless the local host proof passes and a deploy is separately authorized.

## Requirements

1. The payer screen SHALL show one dominant action: `Pay Mina`.
2. ChopDot SHALL request a wallet account without handling or storing a private key.
3. ChopDot SHALL submit the exact PAS amount to Mina's connected address.
4. ChopDot SHALL independently retrieve the transaction and finalized receipt from the public Polkadot Hub TestNet RPC.
5. ChopDot SHALL reject a failed, pending, wrong-chain, wrong-payer, wrong-recipient, wrong-amount, malformed, or duplicate transaction.
6. A valid matched transaction SHALL confirm only its exact payment item.
7. The group SHALL become finishable only after all four payer items are confirmed.
8. Shared peers SHALL not trust a payment event until they can validate its immutable transaction details.
9. The five-person proof SHALL use the real app UI in separate browser contexts. It SHALL NOT mutate reducer state, call the reducer directly, or read a prewritten payment report.
10. The proof report SHALL distinguish old faucet funding with no EVM-visible funding hash from fresh hash-backed top-up transactions.

## Scenarios

### Exact payment

GIVEN Leo opens his payment request in his own browser profile with his funded wallet
WHEN he taps `Pay Mina`, approves the exact PAS transfer, and the transaction finalizes
THEN ChopDot SHALL show `Payment received`, clear only Leo's item, and share that result with the group.

### Wrong transaction

GIVEN a transaction has the wrong payer, receiver, amount, chain, or failed status
WHEN ChopDot checks it directly
THEN the payment item SHALL remain open and the UI SHALL show a short normal-language recovery message.

### Five-person closeout

GIVEN Mina, Leo, Nina, Omar, and Casey share one host session
WHEN each payer completes their own wallet action
THEN all five devices SHALL converge, Mina SHALL be able to finish the group, and the final summary SHALL contain no open amount.

### Reload

GIVEN a payer completed a matched transfer
WHEN the shell reloads
THEN the confirmed item and transaction reference SHALL remain available from persisted/shared state.

## Proof

- Build and type-check output.
- Unit tests for amount conversion, direct RPC matching, mismatch rejection, duplicate rejection, and reducer invariants.
- Five-browser host test with an automated EIP-1193 wallet harness backed by the existing agent private keys.
- Screenshots from Mina and every payer at the meaningful action/result boundary.
- `report.json` and `report.md` containing addresses, before/after balances, top-up hashes, payment hashes, explorer URLs, direct-RPC observations, and final summary.
- Updated `HOSTS.md`, `proof/host-matrix.json`, P-023/P-024 cards, cockpit checkpoint, and relevant wiki source.

## Stop conditions

- Stop if a browser test injects product state or closes a payment without a matching finalized transaction.
- Stop if a saved report or dev endpoint is used as transaction truth.
- Stop if the wallet harness signs without the visible payer action initiating it.
- Stop if a transaction clears more than its exact payment item.

# ChopDot Real Paseo Token Trial

Status: `pass-live-testnet-transfer`
Date: 2026-06-20
Programme: `B` native truth / `PayoutEvidenceGate`

## Plain-English Result

We used real public Paseo Asset Hub testnet tokens in the ChopDot evidence path.

What passed:

- A real `1 PAS` transfer landed on Paseo Asset Hub.
- The receiving account balance changed from `0 PAS` to `1 PAS`.
- ChopDot accepted the finalized transaction as payment evidence.
- ChopDot did **not** treat the transaction as receiver confirmation.
- The round stayed blocked until the receiver confirms.

What did not pass:

- We did **not** complete an unattended fresh faucet claim. The official faucet requires a human reCAPTCHA token.
- This was not a Product SDK host transaction from inside the Polkadot app container.
- This does not promote `PayoutEvidenceGate` to PASS.

## What Actually Happened

The official Polkadot faucet page was opened with the generated ChopDot trial address prefilled:

```text
https://faucet.polkadot.io/paseo?address=13bRTFCgQh4hmAoq9Mv14twjkVW6z4xJTF8Aas4jmMcKJWKv&parachain=1000
```

The faucet endpoint rejected direct unattended requests without a valid `recaptcha` parameter. That is the right security behavior, and we did not bypass it.

To still run a real public-token test, we used a funded public development account on Paseo Asset Hub and sent real testnet PAS to the generated ChopDot trial account.

## Chain Evidence

| Field | Value |
| --- | --- |
| Network | Paseo Asset Hub |
| Endpoint | `wss://asset-hub-paseo-rpc.n.dwellir.com` |
| Source | public development account `//Bob` |
| Source address | `14E5nqKAp3oAJcmzgZhUD2RcptBeUBScxKHgJKU4HPNcKVf3` |
| Recipient | ChopDot generated trial account |
| Recipient address | `13bRTFCgQh4hmAoq9Mv14twjkVW6z4xJTF8Aas4jmMcKJWKv` |
| Amount | `1 PAS` |
| Block number | `10247538` |
| Block hash | `0x765986ba74108b324ce1be7211b867392cbbf82f45c089dcd7f2ce27e2198fa0` |
| Extrinsic index | `2` |
| Extrinsic hash | `0xd1e2abdc6c64c7d14d8d1e1a3dbd93fb4cc4cb73f910a284ccc9e80b5c59d8be` |
| Method | `balances.transferKeepAlive` |

Observed events:

- `system.NewAccount`
- `balances.Endowed`
- `balances.Transfer`
- `system.ExtrinsicSuccess`

Non-secret proof artifact:

```text
artifacts/polkadot-native/real-pas-transfer-2026-06-20.json
```

## ChopDot Evidence Result

The live transaction was replayed through the ChopDot native session model as:

```text
Leo marked paid with finalized PAS evidence.
Mina still needs to confirm received.
Closeout is still blocked.
```

Regression test:

```text
npx vitest run src/chopdot-dot/polkadotSession.test.ts
```

Result:

```text
50 tests passed
```

New coverage:

```text
treats the real Paseo Asset Hub PAS transfer trial as evidence only
```

## Product Meaning

For a user, this means:

- A real on-chain transfer can support the claim "I paid."
- It still does not let the payer finish the round alone.
- The receiver or treasurer still has to confirm what happened.
- The receipt can later include the transaction reference without pretending ChopDot had custody.

This is the product rule we need:

```text
payment evidence != receiver confirmation != closeout
```

## Current Truth

This improves `PayoutEvidenceGate`, but does not complete it.

| Claim | Status |
| --- | --- |
| Real public testnet PAS movement | `proven` |
| ChopDot evidence-only replay | `proven` |
| Fresh unattended faucet claim | `blocked_by_recaptcha` |
| Product SDK host tx from Polkadot app container | `not_proven` |
| Native host gate promotion | `not_promoted` |

## Sources Checked

- Polkadot docs say Paseo is the recommended Polkadot TestNet and PAS is available from the Polkadot faucet.
- Polkadot faucet docs say the faucet provides free TestNet tokens for testing and requires the user to request them through the faucet UI.
- Polkadot Hub TestNet docs list the Asset Hub Paseo WSS endpoint used here.

## Next Step

When the Polkadot app / host path is available, rerun the same user flow with:

```text
Product Account signing -> Product SDK tx submit -> Asset Hub finalized tx -> ChopDot evidence -> receiver confirmation -> closeout receipt
```

Until then, we can honestly say we have tested real public Paseo Asset Hub token evidence outside the host container, and ChopDot preserved the right product boundary.

# ChopDot.dot Polkadot Adapter Map

## Principle

Polkadot infrastructure should make ChopDot.dot easier to trust, deploy, recover, and verify. It should not become user-facing product language or domain truth.

## Adapter Slots

| Adapter slot | Parity/Polkadot candidate | Product job | V1 status |
| --- | --- | --- | --- |
| Signing | Product Account / Product SDK signer / host signing | Reduce wallet friction for approvals, claims, and proof actions. | Lab |
| Settlement rail | Asset Hub DOT/USDC | Optional crypto-native payment/reference rail. | Lab/current reference |
| Payment evidence | W3SPay QR/deeplink, Coinage, terminal payment refs | Attach weak evidence to a claim; clear a payment leg only when recipient and amount are verified. | Research/lab |
| Transaction status | Product SDK tx lifecycle | Clear signing, broadcasting, in-block, finalized, error states. | Lab |
| Native session transport | Statement Store + Host API Test SDK | Share compact signed/encrypted chapter events across people/devices without Supabase on the native truth path. | Lab/blocked-live |
| Proof | Product SDK contracts / CDM | Closeout/proof contract lifecycle without mixing proof with product truth. | Lab |
| Storage | Product SDK cloud storage / Bulletin | Portable redacted receipt storage and receipt packet round-trip. | Lab |
| Publishing | DotNS / Playground.dot | Deploy or remix a `.dot` edition. | Lab |
| Discovery | Browse | Future Polkadot-native app discovery. | Defer |
| Attestation | Attestation Protocol | Future schema-based confirmation/proof reference. | Defer |

## Status Vocabulary

Rail status can be:

- `signing`
- `broadcasting`
- `in_block`
- `finalized`
- `failed`

Product status stays separate:

- `claimed`
- `received`
- `confirmed`
- `cleared`
- `approved`
- `released_outside_chopdot`
- `closed`
- `closed_with_open_items`

## Red Lines

- Do not call an unverified transaction `received`.
- Do not call W3SPay/Coinage/terminal evidence `received` unless expected recipient and amount are verified.
- Do not ask for extra human ceremony once strong received evidence has cleared a payment leg.
- Do not call a proof anchor a legal settlement.
- Do not put raw emergency, payment, dispute, or identity details on public proof.
- Do not require Polkadot for ordinary users unless the selected mode needs it.
- Do not promote Product SDK/CDM/Bulletin from lab until a user-facing friction or trust metric improves.

## W3S Research Decisions

| Candidate | Decision | Use in ChopDot |
| --- | --- | --- |
| `w3spay` | `spike` | QR/deeplink parsing, payment status language, receipt evidence handling. |
| `t3rminal` | `spike` | Payment request generation, host-tested `.dot` app patterns, Coinage source map. |
| `w3s-payment-processor` | `adopt-pattern` | Reconciliation, closeout blockers, encrypted report packets, fail-closed claim handling. |
| Statement Store + Host API Test SDK | `adopt-spike` | Programme B G4 transport proof for signed/encrypted event replay. |
| Bulletin | `adopt-spike` | Programme B G5 redacted closeout receipt packet archive. |
| Coinage | `lab-only` | Payment evidence only until host behavior proves expected recipient and amount; never custody or closeout by itself. |

Detailed review: [Parity W3S Payment + Native Research Lane](./parity-w3s-payment-native-research-lane-2026-06-21.md).

# W3S Native Adoption Checklist

Status: `active`
Date: 2026-06-21
Owner lane: Programme B + product readiness

## Purpose

Make the Parity W3S discoveries impossible to lose and easy to execute.

This checklist turns the research lane into a short adoption board. It should be read before native/Polkadot implementation work so the team does not drift back into vague infra research or rebuild W3SPay as a separate product.

Reference research:

- [Parity W3S Payment + Native Research Lane](./parity-w3s-payment-native-research-lane-2026-06-21.md)
- [Polkadot Adapter Map](./polkadot-adapter-map.md)
- [Path to Fully Native](./path-to-fully-native.md)

## Decision

Adopt the W3S/Polkadot work as **ChopDot infrastructure patterns**, not as a new user-facing product model.

The user-facing reason is checkout capture: ChopDot should reduce the friction of recording a purchase at the moment money moves, instead of asking someone to reconstruct it later from memory, screenshots, bank statements, or chat messages.

```text
User sees:
Scan / capture at checkout -> Mark paid or Received -> Receipt saved -> Closed

System does:
payment request / receipt evidence -> strength check -> signed event -> Statement Store sync -> redacted Bulletin packet
```

## Tracking Rule

When work starts, update the row status here first.

When work completes, add evidence in the `Evidence` column and update:

- [Master execution plan](../superpowers/plans/2026-06-17-chopdot-dot-master-execution.md)
- [Host-ready 99% checklist](./host-ready-99-checklist-2026-06-20.md), if the work changes pre-release readiness
- [Runtime proof report](./polkadot-native-runtime-proof-report.md), if the work changes a Programme B runtime gate

## Status Legend

| Status | Meaning |
| --- | --- |
| `todo-now` | Next locally controllable implementation target |
| `planned` | Accepted but not the next build step |
| `in-progress` | Currently being implemented or tested |
| `pass-local` | Works locally or in host-sim but not live host |
| `local-preflight-pass-setup-required` | Local bundle/manifest/preflight passed; external tool, signer, funding, or live environment setup remains |
| `blocked-live` | Needs real Polkadot host / `.dot` availability |
| `defer` | Keep as research until a user problem pulls it in |

## Fast Board

| Priority | Workstream | Status | Done when | Evidence |
| --- | --- | --- | --- | --- |
| P0 | Checkout capture wedge | `pass-local` | A payer can capture amount, merchant/context, payer, group, receipt checklist, rail choice, and evidence at checkout with less typing than today's manual flow. | 2026-06-21: `SpendCardScreen` checkout capture UI + `capture-spend-loop.spec.ts` browser flow; 2026-06-23: receipt checklist + right-rail choice + desktop/mobile capture browser pass |
| P0 | `PaymentEvidenceAdapter` | `pass-local` | QR/link/on-chain/Coinage-style evidence can attach weak evidence to a claim; strong recipient+amount evidence can clear the payment leg without closing unrelated rules. | 2026-06-21: `PaymentEvidenceAdapter.test.ts`, `KernelBridge.test.ts`, `chapterEngine.test.ts`; 2026-06-22: `paymentClearance.test.ts` |
| P0 | `RedactedReceiptPacketV1` | `pass-local` | Savings, emergency, and community closeouts can produce a redacted packet with safe fields, hash, schema version, and emergency privacy tests. | 2026-06-21: `receiptPacket.ts` + `receiptPacket.test.ts` cover savings, emergency, and community packets |
| P0 | Statement Store host-sim proof | `pass-local` | Leo, Nina, Omar, and Mina replay compact signed events through a `polkadot-apps` Statement Store adapter in host-sim; local fallback cannot pass host-required mode. Private details remain in encrypted sidecars; full shared-store ciphertext stays tracked under G3 privacy. | 2026-06-21: `ProductSdkStatementStoreSessionAdapter` wired to `@parity/product-sdk-statement-store`; `polkadotSession.test.ts` proves host-sim convergence and no local fallback |
| P1 | W3S QR/deeplink parser spike | `pass-local` | Valid payment request becomes evidence candidate; malformed, unknown, interrupted, and failed states are readable to a normal user. | 2026-06-21: `PaymentEvidenceAdapter.test.ts`, `SpendCardScreen`, `capture-spend-loop.spec.ts`; 2026-06-23: no-app `/pay` link keeps evidence/claim separate from receiver confirmation |
| P1 | Coinage source map + evidence spike | `pass-local` | Exact T3RMINAL / W3S payment-processor modules, host calls, timeout behavior, and privacy boundaries are documented and tested as evidence-only. | 2026-06-21: `coinage-payment-evidence-source-map-2026-06-21.md`, `PaymentEvidenceAdapter.test.ts`, `KernelBridge.test.ts` |
| P1 | Coinage host-sim behavior gates | `pass-local` | Successful, timeout, rejected, offline, duplicate, and privacy cases prove Coinage remains fail-visible; only verified recipient+amount receipt can clear a leg. | 2026-06-21: `coinageEvidence.ts`, `coinageEvidence.test.ts`; 2026-06-22: `paymentClearance.ts` |
| P1 | Static `.dot` deploy readiness | `local-preflight-pass-setup-required` | ChopDot has a `polkadot-app-deploy` manifest, Paseo deploy script, current Bulletin Next gateway verification path, and non-writing local preflight; pinned `npx` deploy tool and `paseo-next-v2` pass, while real publish still needs funded signer/domain. | 2026-06-21: `polkadot-app-deploy.config.ts`, `preflight:dot-host:paseo`, `deploy:dot-host:paseo`, `paseo-dot-deploy-readiness-2026-06-21.md`, `artifacts/polkadot-native/dot-deploy-preflight-2026-06-21.json` |
| P1 | Closeout reconciliation panel | `pass-local` | Closeout shows observed, claimed, confirmed, unresolved, and ready states without protocol language. | 2026-06-21: `ChapterHome` closeout check + `chopdot-dot-native-session.spec.ts` browser assertions cover preview and multi-device savings-circle state changes |
| P2 | W3SPay admin/config pattern review | `defer` | Adopt only if it lowers group setup friction without adding merchant-admin complexity. | Pending |
| P2 | T3RMINAL/revive contract pattern review | `defer` | Adopt only after escrow/atomicity user comprehension passes; not a normal user feature yet. | Pending |

## Now / Next / Blocked

### Now

Build the smallest combined implementation that proves the new lane is real:

```text
Checkout capture wedge
+ PaymentEvidenceAdapter
+ RedactedReceiptPacketV1
+ host-sim Statement Store proof
```

Local progress:

- `pass-local`: checkout capture wedge;
- `pass-local`: PaymentEvidenceAdapter evidence-only path;
- `pass-local`: RedactedReceiptPacketV1;
- `pass-local`: host-sim Statement Store proof.

2026-06-23 local product pass:

- `pass-local`: receipt-first assisted capture in Spend Card;
- `pass-local`: rail adapter labels for TWINT, bank, Wise, Revolut, Venmo, Cash App, manual/cash, Asset Hub, Coinage lab, PayPal, and USDC-style references;
- `pass-local`: no-app `/pay` link hides admin status and shows one action;
- `pass-local`: `/confirm` closes only the matching share after payer claim.

Acceptance:

- checkout capture reduces manual entry at the purchase moment;
- weak payment evidence stays claim-only;
- strong recipient+amount receipt evidence clears the right payment leg;
- emergency receipt packets stay redacted;
- host-required Statement Store cannot pass through local fallback;
- UI copy remains normal ChopDot language.

### Next

Login to `polkadot-app-deploy`, rerun strict preflight, then attempt a controlled static `.dot` deploy on Paseo. Review W3SPay admin/config patterns only where they reduce group setup friction.

Acceptance:

- strict preflight passes with signer session visible;
- real deploy output records domain, CID, gateway URL, `.dot.li` URL, and screenshot;
- failed/interrupted payment evidence still cannot become hidden success;
- Coinage/T3RMINAL-style payment evidence remains lab-only until real host behavior is proven beyond host-sim.

### Blocked / Deferred

Live-native promotion remains blocked until the real Polkadot host can run:

- Product Account signing with distinct people;
- Statement Store transport;
- Bulletin/archive save + retrieve;
- Asset Hub/Product SDK evidence;
- `.dot` live load and publish/listing.

Coinage remains lab-only until real host behavior is proven beyond host-sim.

## Product Guardrails

Do:

- use W3S patterns to reduce payment evidence friction;
- treat t3rminal-style QR/payment request generation as a way to capture purchase context at checkout;
- use Statement Store for signed/encrypted native session events;
- use Bulletin for redacted receipt packets;
- use payment processor patterns for reconciliation and closeout blockers;
- keep all technical terms out of normal UI.

Do not:

- turn ChopDot into a POS product;
- call weak payment evidence `received`;
- require manual confirmation after strong received evidence has already cleared the leg;
- call a Bulletin receipt legal settlement;
- call Coinage custody or escrow;
- promote host-native readiness from local fallback.

## Speed Rule

To move faster, every implementation pass should produce one of these:

1. a working adapter seam with tests,
2. a browser-visible product improvement,
3. a host-sim proof,
4. a validator that prevents overclaiming,
5. a real pilot result.

Research without one of those outputs is not counted as progress.

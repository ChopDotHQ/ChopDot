# Polkadot Native Runtime Proof Report

Status: `active`  
Last updated: 2026-06-22  
Environment: ChopDot repo + documented host-container requirements  
**Agent handoff:** [polkadot-native-cursor-handoff.md](./polkadot-native-cursor-handoff.md)

## Latest 90% readiness execution refresh (2026-06-22)

Executed in Codex against local product surfaces and host-sim.

| Check | Result | Notes |
| --- | --- | --- |
| Mixed friend-pilot packet | PASS (ready) | `friend-pilot-2026-06-22-mixed` run sheet generated for Dev/Jeanine plus agent roles; no human promotion recorded yet |
| Unscripted agent pilot | PASS (agent-only) | 13 normal-surface agent routes loaded on `127.0.0.1:5173`; 9 obvious primary actions clicked; waiting states shown for future approvers/receivers |
| Native multi-device browser proof | PASS (local) | `NATIVE_SESSION=1 ... chopdot-dot-native-session.spec.ts` passed 13 tests |
| Agent-wallet PAS browser proof | PASS (local/import) | 5 tests passed; finalized public-testnet PAS evidence imports as received payment evidence for matching legs and emergency receipt stays redacted |
| Capture/pay/confirm browser proof | PASS (local) | 3 focused capture tests passed |
| Host-sim iframe smoke | PASS (host-sim) | `npm run e2e:host-sim` passed |
| Dot-host preflight | SETUP REQUIRED | local bundle/manifest/tool/env checks pass; `polkadot-app-deploy login` still required for signer session |
| Full Playwright regression | PASS | 82 passed, 4 skipped |

This refresh does **not** promote runtime gates. It strengthens local/product
confidence and keeps the same live-host boundary: Product Account signing,
Statement Store live transport, Bulletin/archive retrieval, closeout proof
anchor, and Asset Hub Product SDK tx remain unproven in the real host.

## Latest live-token execution (2026-06-20)

Executed in Codex against real Paseo Asset Hub.

| Check | Result | Notes |
| --- | --- | --- |
| Official faucet path | BLOCKED BY HUMAN CAPTCHA | Official faucet rendered with the ChopDot trial address prefilled; direct endpoint requires a valid `recaptcha` parameter |
| Real PAS movement | PASS | `1 PAS` sent on Paseo Asset Hub from public dev account `//Bob` to generated ChopDot trial account |
| Chain proof | PASS | Block `10247538`, extrinsic index `2`, hash `0xd1e2abdc6c64c7d14d8d1e1a3dbd93fb4cc4cb73f910a284ccc9e80b5c59d8be`, `balances.transferKeepAlive` |
| ChopDot replay | PASS | `polkadotSession.test.ts` now covers the real PAS transfer as finalized evidence-only; the claim stays `claimed`, confirmations stay empty, and closeout remains blocked |

This improves confidence in `PayoutEvidenceGate`, but does **not** promote it. The missing piece is still Product SDK host transaction execution from the real Polkadot host container.

## Latest escrow / atomicity lab execution (2026-06-20)

Executed locally in the Polkadot contract lab and ChopDot signed-session replay.

| Check | Result | Notes |
| --- | --- | --- |
| Escrow contract semantics | PASS (local + public testnet) | `ChopDotEscrowVault` covers native-value deposits, mock-token deposits, required approvals, release, refund after timeout, void, duplicate deposit rejection, early release rejection, and wrong-actor release rejection |
| Public testnet deploy | PASS | Escrow `0x93818bEe323c0202467f41f45a64C9ffc3f8B4C0`; mock `TEST_USDC` `0x198daAA27BcD49582d97a7952Bc340B65fD6850D` |
| Mock token path | PASS (local + public testnet) | Public scenario minted mock `TEST_USDC`, approved escrow, deposited, released, and refunded on Polkadot Hub TestNet |
| Native PAS escrow path | PASS (public testnet lab) | Shared expense case `13` accepted native PAS deposits from Leo and Nina, then released after Mina approval |
| Public mode coverage | PASS | Group expense case `10` released, savings circle case `11` released, emergency pot case `12` released after two approvals, native PAS shared expense case `13` released, community fund case `14` refunded after deadline |
| ChopDot escrow evidence replay | PASS | `escrow_evidence` replays as evidence-only across group expense, savings circle, emergency pot, and community fund |
| Release boundary | PASS | Escrow `Released` evidence does not confirm the recipient, mutate release confirmation, or close the savings-circle round |
| Emergency receipt privacy | PASS | Redacted emergency receipt excludes sensitive reason, recipient names, contract address, and tx hash |
| Native ChopDot escrow UI | PASS (lab) | `?chopdot-escrow-lab=1&chopdot-dot-dev=1` uses the real pot list/detail/tabs, adds a first-class group expense mode, labels the escrow surface as `Lab evidence only`, says ChopDot is not holding funds or guaranteeing payout, and keeps evidence controls under Developer checks |
| Browser escrow agent checks | PASS (local Chromium) | Focused tests prove lab-held evidence does not mark paid across group expense, savings circle, emergency pot, and community fund; group expense closes only after people mark paid and Mina confirms; separate browser-context agents converge on first payment in all four modes; wrong-person held evidence is blocked; normal `/pots` does not expose escrow lab controls |

This strengthens the escrow/atomicity lab, but does **not** promote `PayoutEvidenceGate`, `CloseoutProofGate`, or `UXGate` beyond their existing statuses. Public testnet execution proves a lab contract, mock token path, and native PAS escrow path, not production custody, real USDC, legal settlement, or real-user comprehension.

## Latest local/native-shaped execution (2026-06-21)

Executed in Codex after parking A4/A8 on external Polkadot app availability.

| Check | Result | Notes |
| --- | --- | --- |
| Native unit tests (`commitmentKernel.test.ts`, `polkadotSession.test.ts`) | PASS | `polkadotSession.test.ts` now has 54 tests; includes Product SDK Statement Store host-sim convergence for Leo/Nina/Omar/Mina, strict host fallback blocking, viewer authority, two-approver release gating, emergency open-item redaction, strict native closeout proof anchoring, strict Asset Hub host evidence fallback blocking, idempotent Statement Store access seeding under parallel device startup, aggregate host preflight reporting, Product Account signer-to-membership-grant alignment, multi-participant distinct host signer enforcement, Statement Store append/load/replay preflight, receipt archive save/retrieve/hash verification, finalized matching Asset Hub evidence checks, and signed-event privacy guards for private payment/release/exception sidecars |
| Native pot browser spec (`chopdot-dot-lab.spec.ts`, Chromium/mobile focused) | PASS | 22 passed, 2 skipped; includes real pot modes, savings round, emergency redacted receipt, community fund second-approver blocker, visible strict host-gate failures, and separate Product Account / Statement Store / archive / proof / Asset Hub preflight rows |
| Full Playwright app suite | PASS | 46 normal app/mobile tests passed, 2 desktop-only developer preflight checks skipped on mobile; host-only projects now run behind `DOT_HOST_PREVIEW=1` or `HOST_SIM=1`, and the multi-device native session proof is opt-in |
| Dot-host preview A5 | PASS | `DOT_HOST_PREVIEW=1 npx playwright test tests/e2e/chopdot-dot-a5-demo.spec.ts --project=dot-host-preview` |
| Host-sim iframe smoke | PASS | `HOST_SIM=1 npx playwright test tests/e2e/host-sim --project=host-sim` |
| Native multi-device session | PASS | `NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1`; lab Statement Store access seeding is now idempotent under parallel browser-context startup; kept out of the default suite because it is a multi-context sync proof, not a mobile layout proof |

The added checks do **not** promote host runtime gates. They strengthen the product/UX proof, Product SDK Statement Store host-sim transport, Product Account identity preflight, Statement Store transport preflight, receipt archive preflight, Asset Hub evidence preflight, and private-sidecar event safety while `.dot` live host access and real Polkadot host APIs remain blocked/unproven.

## Prior lab execution (2026-06-16)

Executed in **Cursor** as read-only verification during the 99% audit programme. See handoff file for full context.

| Check | Result | Notes |
| --- | --- | --- |
| `validate-chopdot-dot-native-map.mjs` | PASS | 11 matrix rows, 19 ledger entries |
| Native unit tests (`src/chopdot-dot/*.test.ts`) | PASS | 39/39 |
| `chopdot-dot-lab.spec.ts` | PASS | 5/5 |
| `chopdot-dot-native-session.spec.ts` | **Inconclusive / flaky** | Fails under parallel workers (sync timeout on cold SDK + access seeding); passes with `--workers=1`. **No product fix applied** — audit scope only |

### Parallel e2e flake (observed, not fixed)

- Symptom: `native-sync-status` shows `needs refresh` instead of `up to date` within 8s on first open.
- Likely cause: cold `@parity/product-sdk-signer` import while seeding four access events on the lab Statement Store under CPU load.
- A temporary fix was attempted then **reverted** per operator direction (audit-only exercise). Do not treat TransportGate as hardened until host proof or an explicitly approved product fix lands.

## Purpose

Record pass/fail status for the host-runtime evidence gates required before a "fully native" promotion claim.

## Gate Results

| Gate | Requirement | Status | Evidence | Notes |
| --- | --- | --- | --- | --- |
| IdentityGate | Product Account signs session-critical actions without demo fallback in real host | **FAIL (unit/browser fail-visible)** | [product-account-signer-spike-report.md](./product-account-signer-spike-report.md), [polkadotSession.test.ts](../../src/chopdot-dot/polkadotSession.test.ts), [chopdot-dot-lab.spec.ts](../../tests/e2e/chopdot-dot-lab.spec.ts) | Adapter seam + raw-sig unit tests pass; `chopdot-dot-signer=host-required` blocks demo fallback; aggregate preflight now reports Product Account signing separately, refuses a host signer that lacks a matching participant membership grant, and rejects one shared host address standing in for multiple participants; host signing still unproven |
| TransportGate | Leo/Mina/Nina/Omar converge via host Statement Store across separate contexts | **FAIL (host-sim partial/browser fail-visible)** | [tests/e2e/host-sim/smoke.spec.ts](../../tests/e2e/host-sim/smoke.spec.ts), [polkadotSession.test.ts](../../src/chopdot-dot/polkadotSession.test.ts), [chopdot-dot-lab.spec.ts](../../tests/e2e/chopdot-dot-lab.spec.ts) | `ProductSdkStatementStoreSessionAdapter` now wires `@parity/product-sdk-statement-store` and host-sim proves compact signed event publish/load/replay across Leo, Nina, Omar, and Mina; lab Statement Store also converges and duplicate access-event seeding is idempotent; aggregate preflight requires a signed no-op transport probe to append, load back, and replay deterministically; signed replay rejects shared events that leak direct Asset Hub refs or sensitive exception notes when private sidecars are present; `chopdot-dot-transport=host-required` blocks local fallback and aggregate preflight reports Statement Store separately; real host Statement Store still unproven |
| ArchiveGate | Redacted receipt upload + retrieve + replay via live cloud-storage/bulletin adapter | **FAIL (unit/browser fail-visible)** | [polkadotSession.test.ts](../../src/chopdot-dot/polkadotSession.test.ts), [chopdot-dot-lab.spec.ts](../../tests/e2e/chopdot-dot-lab.spec.ts) | Adapter seam and fallback proven; archive preflight now requires host-shaped save, retrieval, and hash match against the redacted receipt; `chopdot-dot-archive=host-required` blocks local fallback and aggregate preflight reports archive separately; live host upload/retrieve still unproven |
| CloseoutProofGate | Closeout receipt hash/proof anchor is explicit evidence and host-required mode cannot pass through hash-only fallback | **FAIL (unit/browser fail-visible)** | [polkadotSession.test.ts](../../src/chopdot-dot/polkadotSession.test.ts), [chopdot-dot-lab.spec.ts](../../tests/e2e/chopdot-dot-lab.spec.ts) | `anchor_receipt` is separate from `close_chapter` and `save_receipt`; `chopdot-dot-closeout=host-required` blocks hash-only lab fallback and aggregate preflight now reports proof separately; live host proof anchor still unproven |
| PayoutEvidenceGate | Asset Hub evidence attaches without collapsing `claimed != confirmed` and host-required mode cannot pass through local/lab tx evidence | **FAIL (unit + live testnet partial/browser fail-visible)** | [polkadotSession.test.ts](../../src/chopdot-dot/polkadotSession.test.ts), [testTokenRail.test.ts](../../src/chopdot-dot/testTokenRail.test.ts), [real-paseo-token-trial-2026-06-20.md](./real-paseo-token-trial-2026-06-20.md), [chopdot-dot-lab.spec.ts](../../tests/e2e/chopdot-dot-lab.spec.ts) | Real Paseo Asset Hub PAS transfer finalized and replays as evidence-only; `chopdot-dot-asset-hub=host-required` blocks lab fallback, missing tx/signer, and failed host submitter; aggregate preflight requires finalized evidence matching subject, amount, and currency, then replays it as evidence-only so it cannot confirm or close; Product SDK host tx pending |
| HybridRemovalGate | No runtime-critical `evmAddress`/EVM closeout dependency in native path | **FAIL** | [pvmCloseout.ts](../../src/services/closeout/pvmCloseout.ts), [capabilities.ts](../../src/services/wallet/capabilities.ts) | EVM closeout still required for classic settle path |
| UXGate | Full Catch->Management->Payout->History loop without chain jargon in native spike | **PASS (lab)** | [chopdot-dot-lab.spec.ts](../../tests/e2e/chopdot-dot-lab.spec.ts), [commitmentKernel.test.ts](../../src/chopdot-dot/commitmentKernel.test.ts), [ux-brief.md](./ux-brief.md) | Native chapter spike UX passes lab checks; 2026-06-19 strengthened emergency redaction + community approval controls; production path still hybrid |

## Runtime Gate Score

```text
passed_gates = 1 (UXGate lab)
tracked_gates = 7 including CloseoutProofGate
runtime_gate_score = 0.14
```

Host-runtime promotion requires all tracked gates to pass in the real host container, not lab substitutes.

## Required Host-Container Proof Script (next execution)

1. Open ChopDot native savings-circle in Polkadot host (`chopdot-dot-native=1`).
2. Leo signs `mark_paid` via Product Account (no demo fallback).
3. Mina receives event via host Statement Store (separate device/context).
4. Mina signs `confirm_received` via Product Account.
5. Closeout emits `save_receipt`; upload and retrieve CID via cloud-storage adapter.
6. Optional: attach Asset Hub tx evidence; verify state remains `claimed` until confirm event.
7. Record artifacts: screenshots, tx/signature refs, replay logs, gate checklist.

## Artifact Locations

| Artifact | Path |
| --- | --- |
| Agent resume (start here) | [polkadot-native-cursor-handoff.md](./polkadot-native-cursor-handoff.md) |
| Unit/session proofs | `src/chopdot-dot/*.test.ts` |
| Cross-device lab e2e | `tests/e2e/chopdot-dot-native-session.spec.ts` |
| Host-sim smoke | `tests/e2e/host-sim/smoke.spec.ts` → `artifacts/polkadot-native/host-sim-smoke-*.json` |
| Signer spike notes | [product-account-signer-spike-report.md](./product-account-signer-spike-report.md) |
| Host proof run log (create on first host run) | `artifacts/polkadot-native/host-runtime-proof-YYYY-MM-DD.md` |

## Promotion Rule

Do not update native readiness claims until this report shows **7/7 PASS** with host-backed artifacts.

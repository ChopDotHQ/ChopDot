# ChopDot Full Product Readiness Report

Status: `complete-local`
Date: 2026-06-20
Programmes: `CAPTURE` + `B` native truth

## Purpose

This report is the final evidence packet for the next goal:

```text
onboard -> capture money moment -> record payment -> confirm receipt -> resolve blockers -> close with receipt
```

It must cover the complete ChopDot product loop, not only native money modes.

## Status Legend

| Status | Meaning |
| --- | --- |
| `pass-local` | Works locally without live external host dependency |
| `hybrid-pass` | Works through Track 1 hybrid stack; acceptable but not native truth |
| `fail-visible` | Correctly refuses to overclaim or mutate without required capability |
| `blocked-live` | Requires live `.dot` / Polkadot host / external partner access |
| `todo` | Not yet tested in this completion pass |

## Flow Results

| Flow | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Savings circle | `pass-local` | `chopdot-dot-native-session.spec.ts` | Separate-device signed-session flow passed |
| Emergency fund | `pass-local` | `chopdot-dot-native-session.spec.ts`; `chopdot-dot-lab.spec.ts`; `commitmentKernel.test.ts` | Separate-device signed-session flow passed; redacted receipt behavior and protect-the-person guidance covered |
| Community pot | `pass-local` | `chopdot-dot-native-session.spec.ts`; `chopdot-dot-lab.spec.ts`; `commitmentKernel.test.ts` | Separate-device signed-session flow passed; two-approval, approval/payment separation, and handoff rules covered |
| Spend Cards | `hybrid-pass` | `capture-spend-loop.spec.ts` | Guest/local Spend Card captures pay moment, creates open legs, and shows the full record/pay/mark/confirm sequence before users act |
| `/spend` link | `hybrid-pass` | `capture-wallet-pass-spend.spec.ts`; `QRPayloadCodec.test.ts` | Spend token cold-load opens the correct spend action |
| `/pay` link | `hybrid-pass` | `capture-pay-confirm-link.spec.ts`; `useCaptureLinkFlow.test.tsx`; `QRPayloadCodec.test.ts` | Payer handoff opens, remote/shared token resolution survives onboarding, marked paid is only a claim, and the user returns to shared pot status |
| `/confirm` link | `hybrid-pass` | `capture-pay-confirm-link.spec.ts`; `QRPayloadCodec.test.ts` | Receiver confirmation is framed as the separate step that closes only the claimed leg |
| QR/share | `hybrid-pass` | `QRPayloadCodec.test.ts`; full Playwright suite | Share text opens spend/pay/confirm actions and avoids stack language |
| Telegram-style capture | `hybrid-pass` | `chapterStoreAdapter.test.ts` | Chat-style capture writes to the same linked app chapter and cannot bypass receiver confirmation |
| Wallet pass launcher | `hybrid-pass` | `capture-wallet-pass-spend.spec.ts`; `WalletPassService.test.ts` | Launcher opens `/spend`; launcher itself does not mark paid or confirm |
| Webhook-lite claim | `hybrid-pass` | `capture-firma-webhook.spec.ts`; `firmaWebhookClaim.test.ts` | Matching webhook marks a claim only; UI copy and tests keep receiver confirmation required; mismatches are rejected in service tests |
| Receipt/history | `pass-local` | `chopdot-dot-native-session.spec.ts`; `chopdot-dot-lab.spec.ts`; `simulationAgents.test.ts`; `capture-spend-loop.spec.ts` | Native modes close with readable/redacted receipts; receipt review explains local record meaning and live archive/proof boundary |
| First entry / onboarding | `pass-local` | `login-smoke.spec.ts`; `email-auth-provider.spec.ts`; `auth-provider-proof-ledger-2026-06-20.md`; `auth-provider-proof-run-packet-2026-06-21.md` | Guest entry, local email provider proof, start/join/wallet-later decision guide, friend-pilot device/profile guidance, sign-out cleanup, wallet setup-needed copy, provider-proof boundaries, and provider run instructions are visible |
| Friend-pilot handoff | `ready-to-run` | `friend-pilot-script-2026-06-20.md`; `friend-pilot-run-packet-2026-06-21.md`; `friend-pilot-results-ledger-2026-06-20.md`; `chopdot-dot-native-session.spec.ts` | Exact local links, in-app participant link copying, roles, evidence fields, unsafe assumptions, and ledger promotion gates are ready; no real participant pass is recorded yet |
| Host adapters | `fail-visible` | `chopdot-dot-lab.spec.ts`; `polkadotSession.test.ts` | Product Account, Statement Store, Bulletin/archive, Asset Hub, closeout proof require real host and refuse silent fallback in host-required mode |
| Live `.dot` | `blocked-live` | External Polkadot app/host availability | Do not count local proof as live readiness |

## Friend-Use Notes

- A friend can open a savings circle, emergency fund, or community pot locally from their own person/device context, see their next action, mark paid, confirm received, approve release, record a delay, and close with a receipt.
- A friend can use the Track 1 capture handoff locally: Spend Card, `/pay`, `/confirm`, `/spend`, wallet-pass launcher, QR/share copy, Telegram-style capture, and webhook-lite claim all converge into chapter state.
- The trustworthy boundary is now enforced in tests: marking paid, token/webhook evidence, approval, release, confirmation, and closeout remain separate.
- The capture path now shows the sequence as user work: record split, pay outside ChopDot, mark paid, then receiver confirms. The status panel now includes a payer/receiver action queue so people can see who acts next.
- The receipt path now says the record captures group confirmations and notes; it is not a bank statement or automatic payment proof. Receipt review now includes a trust summary that names what is confirmed, what is noted, what stays private, and what is not proven.
- Emergency pots now show what to protect: minimum group status is visible, while sensitive reason, recipient identity, and payment refs stay private.
- Community funds now show the role boundary in plain English: approvers approve readiness, payer records outside release, receiver confirms arrival. The Overview now includes a release handoff guide so approval, outside release record, recipient confirmation, and closeout remain separate.
- First-time pilots now see how to start or join: use guest mode for the group record, open a friend's link on their own device or browser profile, and connect a wallet later only when testing settlement references, archive, or proof.
- Capture links now resolve through the remote-capable token flow after onboarding, so a valid shared `/pay`, `/spend`, or `/confirm` link is not rejected just because the local browser has no token copy.
- Provider-auth proof now includes a local Email password pass. Desktop wallets, mobile WalletConnect, and Google remain unpromoted until real sign-in, sign-out, cleanup, and no-dead-end evidence is recorded.
- The friend-pilot packet gives the facilitator exact local URLs and evidence fields, and the app now lets a facilitator copy participant-specific links from the People tab; the result ledger still blocks promotion without real participant evidence.
- The parts that are still lab/local are the native session transport, Product Account fallback signing, Bulletin/archive fallback, hash-only proof, and Asset Hub evidence reference.
- The parts that are still hybrid are Spend Cards, links, QR/share, Telegram-style capture, wallet pass, and webhook-lite.
- The live blocker remains outside the repo: real `.dot` / Polkadot host availability for Product Account, Statement Store, Bulletin/archive, Asset Hub evidence, live closeout proof, and publish/listing.

## Verification Run

2026-06-21 refresh:

- `npm run type-check` — pass
- `npm run validate:use-case-9` — pass
- `npm run validate:friend-pilot` — pass
- `npm run validate:auth-provider-proof` — pass, ledger plus run packet
- `npm run validate:chopdot-native-map` — pass, 11 replacement rows, 21 evidence ledger entries, host-native boundary gate included
- `npm run validate:chopdot-coverage` — pass, 52 registered markdown files
- `NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1` — pass, 13 tests including participant-specific copy links for separate-device entry
- focused capture Playwright suite — pass, 4 tests
- `npx playwright test --workers=1` — pass, 72 tests passed and 4 skipped across desktop/mobile projects; local email-provider proof is opt-in and skipped in the default full suite unless the local proof env is enabled
- `npm run build` — pass, with existing Rollup eval/chunk-size warnings

2026-06-21 community handoff refresh:

- `npm run type-check` — pass
- `NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1 --grep "community-pot period"` — pass, 1 test
- `NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1` — pass, 13 tests including participant-specific copy links for separate-device entry
- `npm run build` — pass, with existing Rollup eval/chunk-size warnings

2026-06-21 capture action-queue refresh:

- `npm run type-check` — pass
- `npx playwright test tests/e2e/capture-spend-loop.spec.ts tests/e2e/capture-pay-confirm-link.spec.ts --project=chromium --workers=1` — pass, 2 tests
- focused capture Playwright suite — pass, 4 tests
- `npm run build` — pass, with existing Rollup eval/chunk-size warnings

2026-06-21 receipt trust-summary refresh:

- `npm run type-check` — pass
- `NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1 --grep "receipt review"` — pass, 2 tests
- `NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1` — pass, 13 tests including participant-specific copy links for separate-device entry
- `npm run build` — pass, with existing Rollup eval/chunk-size warnings

2026-06-21 onboarding decision-guide refresh:

- `npm run type-check` — pass
- `npx playwright test tests/e2e/login-smoke.spec.ts --project=chromium --project=mobile-chrome --workers=1` — pass, 12 tests

2026-06-21 shared capture link handoff refresh:

- `npx vitest run src/hooks/useCaptureLinkFlow.test.tsx` — pass, 2 tests
- `npm run type-check` — pass
- `npx playwright test tests/e2e/capture-pay-confirm-link.spec.ts --project=chromium --workers=1` — pass, 1 test

2026-06-21 email provider proof refresh:

- `CHOPDOT_EMAIL_PROVIDER_PROOF=1 VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=<local publishable key from supabase status> npx playwright test tests/e2e/email-auth-provider.spec.ts --project=chromium --workers=1` — pass, 1 test

2026-06-20:

- `npx tsc --noEmit` — pass
- focused Vitest native/capture set — pass, 86 tests
- `NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1` — pass, 13 tests including participant-specific copy links for separate-device entry
- focused capture Playwright suite — pass, 4 tests
- `npx playwright test tests/e2e/chopdot-dot-lab.spec.ts --project=chromium --workers=1` — pass, 12 tests
- `npm run validate:chopdot-coverage` — pass, 50 registered markdown files
- `npm run validate:chopdot-native-map` — pass, 11 replacement rows and 19 evidence ledger entries
- `npm run build` — pass, with existing Rollup eval/chunk-size warnings
- `npx playwright test --workers=1` — pass, 72 tests passed and 4 skipped across desktop/mobile projects

## Claim Boundary

Allowed after this report is complete:

```text
ChopDot's full local product loop has been tested across native money modes and capture handoff flows, with live Polkadot host gates still separated as blocked-live.
```

Not allowed:

```text
ChopDot is fully live-native.
ChopDot holds funds.
Webhook or token evidence confirms payment.
Spend Cards are real card custody.
Telegram is product truth.
```

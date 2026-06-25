# ChopDot.dot 99% Pre-Release Checklist

Status: `active`  
Date: 2026-06-22  
Owner lane: Programme B + CAPTURE hardening while Programme A live `.dot` remains externally blocked

## Purpose

Get ChopDot.dot as close as possible to live readiness before the Polkadot app / `.dot` host becomes available.

This checklist defines **99% pre-release readiness**, not final live-native readiness.

```text
99% pre-release = every locally controllable product, safety, privacy, native-session, and host-adapter gate is proven or fail-visible.

100% live-native = the same gates pass inside the real Polkadot host with live Product Account, Statement Store, Bulletin/archive, Asset Hub evidence, and publish/listing proof.
```

## Non-Negotiable User Bar

Leo, Nina, Omar, and Mina should each be able to open ChopDot from their own perspective and understand:

- what this group is doing
- what they personally need to do next
- who still owes, claimed, confirmed, approved, or delayed
- what is blocking closeout
- what record will remain later

They should not need to understand Product SDK, Statement Store, Bulletin, Asset Hub, adapters, kernels, rails, or `.dot`.

## Today Goal

Finish the **pre-release checklist**, not the externally blocked live `.dot` launch.

Next iteration goal: complete and test the full ChopDot loop across savings circle, emergency fund, community pot, Spend Cards, pay/spend/confirm links, QR/share, Telegram-style capture, wallet pass, webhook-lite, and receipts. See [2026-06-20-chopdot-full-product-test-completion-goal.md](../superpowers/plans/2026-06-20-chopdot-full-product-test-completion-goal.md).

W3S native adoption board: [w3s-native-adoption-checklist-2026-06-21.md](./w3s-native-adoption-checklist-2026-06-21.md). Use it as the active short board for the checkout capture wedge, PaymentEvidenceAdapter, RedactedReceiptPacketV1, Statement Store host-sim proof, Bulletin receipt packet, and Coinage lab work.

Done today means:

- each checklist row below has a clear status
- every locally finishable row is either proven with evidence or converted into a concrete next task
- every externally blocked row is marked `blocked-live`, not left ambiguous
- the master plan links to this checklist
- coverage/native validators pass

## Status Legend

| Status | Meaning |
| --- | --- |
| `pass` | Evidence exists and the row does not depend on live host access |
| `partial` | Some evidence exists, but user flow, test depth, or adapter boundary still needs work |
| `fail-visible` | The app/test correctly refuses to overclaim without real host support |
| `blocked-live` | Cannot be completed until Polkadot app / host / `.dot` access is released |
| `todo-today` | Locally controllable and should be closed before the day ends |

## 99% Scoreboard

| Gate | Status | What must be true | Evidence / command |
| --- | --- | --- | --- |
| Product modes | `pass` | Savings circle, emergency pot, and community fund appear as real ChopDot pot modes in the main `/pots` flow | `tests/e2e/chopdot-dot-lab.spec.ts`; browser review confirms primary mode cards and pot actions |
| Savings circle journey | `pass` | Leo/Nina/Omar/Mina can progress through claims, confirmations, delay, and closeout without confusing claim with confirmation | `tests/e2e/chopdot-dot-native-session.spec.ts`; `src/chopdot-dot/commitmentKernel.test.ts` |
| Emergency fund readiness | `pass` | Emergency fund is usable by friends from their own devices with private contribution, approval, release confirmation, and redacted closeout | `tests/e2e/chopdot-dot-native-session.spec.ts`; `tests/e2e/chopdot-dot-lab.spec.ts`; kernel privacy tests |
| Community pot readiness | `pass` | Community pot is usable by friends from their own devices with contribution, approval, release, receiver confirmation, and period closeout | `tests/e2e/chopdot-dot-native-session.spec.ts`; `tests/e2e/chopdot-dot-lab.spec.ts`; kernel approval tests |
| Capture wedge | `pass` | Spend Card, receipt/check-out capture, right-rail choice, pay/confirm links, remote/shared link handoff after onboarding, QR/share, Telegram convergence, wallet pass, and webhook-lite path remain green locally | Capture C1-C17 in master plan; capture e2e suite; 2026-06-23 `capture-spend-loop.spec.ts` + `capture-pay-confirm-link.spec.ts` desktop/mobile pass; `src/hooks/useCaptureLinkFlow.test.tsx` |
| Trust semantics | `pass` | `claimed != confirmed != approved != released != closed` across product modes | Kernel/session unit tests |
| Wrong-person protection | `pass` | Viewer/contributor/wrong member actions are blocked and do not mutate product truth | Kernel/session unit tests; adversarial browser checks |
| Signed-event replay | `pass` | Native session state derives from signed events and replay, not database trust | `src/chopdot-dot/polkadotSession.test.ts` |
| Multi-device local convergence | `pass` | Separate contexts converge on one group status in local/native-shaped session | `NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1` |
| Product Account host signing | `fail-visible` | Host-required mode refuses demo fallback and shared signer impersonation | `src/chopdot-dot/polkadotSession.test.ts`; runtime proof report |
| Statement Store host transport | `host-sim partial` | Product SDK Statement Store adapter appends/loads/replays compact signed events in host-sim and host-required mode still refuses local fallback; real host remains unproven | `src/chopdot-dot/polkadotSession.test.ts`; runtime proof report |
| Bulletin/archive retrieval | `fail-visible` | Archive preflight requires save, retrieve, and hash match; host-required mode refuses fallback | `src/chopdot-dot/polkadotSession.test.ts`; runtime proof report |
| Asset Hub evidence | `fail-visible` | Finalized matching tx evidence can clear a payment leg only when expected recipient and amount are verified; weak evidence remains a claim and cannot close | `src/chopdot-dot/polkadotSession.test.ts`; `src/chopdot-dot/testTokenRail.test.ts`; `src/chopdot-dot/paymentClearance.test.ts` |
| Closeout proof anchor | `fail-visible` | Hash/proof anchor is separate evidence and cannot replace closeout | `src/chopdot-dot/polkadotSession.test.ts`; runtime proof report |
| Hybrid removal | `fail-visible` | Native path has an explicit audit and a static code preflight that blocks Supabase/EVM/PVM/classic closeout from becoming native product truth | [host-ready-99-hybrid-removal-audit-2026-06-20.md](../../artifacts/polkadot-native/host-ready-99-hybrid-removal-audit-2026-06-20.md); `npm run validate:host-native-boundary` |
| Product-quality UX review | `pass` | First-time people can choose start, join, or wallet-later entry, then read one clear next action from the top board and continue through contribution -> confirm/release -> close flow in all three modes | `tests/e2e/login-smoke.spec.ts`; `tests/e2e/chopdot-dot-lab.spec.ts`; updated `first-time-agent-observations.md` and `multi-device-agent-observations.md` |
| Host launch runbook | `pass` | Exact launch-day click path, commands, screenshots, expected logs, and pass/fail rules exist | [host-launch-runbook-2026-06-20.md](../../artifacts/polkadot-native/host-launch-runbook-2026-06-20.md) |
| W3S native adoption | `pass-local` | Checkout capture wedge, PaymentEvidenceAdapter, redacted receipt packet, Statement Store host-sim proof, and closeout reconciliation panel are pass-local; live host promotion remains blocked | [w3s-native-adoption-checklist-2026-06-21.md](./w3s-native-adoption-checklist-2026-06-21.md) |
| Verification pass | `pass` | Focused docs/native/capture checks are green after this checklist update | 2026-06-22 mixed pass: lint, type-check, 421 unit/domain tests, production build, dot-host build/preflight, host-sim, use-case readiness report, friend-pilot guards, auth-provider guards, coverage, native map, host-native boundary, agent pilot, focused native/capture/PAS browser suites, full Playwright 82 passed / 4 skipped |
| Live `.dot` React load | `blocked-live` | Real React bundle loads through `.dot` URL | Polkadot app / host availability |
| Registry publish/listing | `blocked-live` | `--publish` succeeds and metadata matches live demo | Human-approved publish after live load |
| 7/7 native runtime gates | `blocked-live` | All host-backed gates pass inside real Polkadot host | `polkadot-native-runtime-proof-report.md` |

## Finish-Today Work Queue

### T1. Hybrid Removal Proof Packet

Status: `fail-visible`

Created [host-ready-99-hybrid-removal-audit-2026-06-20.md](../../artifacts/polkadot-native/host-ready-99-hybrid-removal-audit-2026-06-20.md), answering:

- which native routes still import or depend on Supabase, localStorage, EVM, PVM, or classic closeout
- whether each dependency is product truth, projection, adapter fallback, or unrelated legacy path
- what must fail in host-required mode
- what can remain in hybrid Track 1 without weakening native claims

Acceptance:

- no native-readiness claim depends on `pvmCloseout.ts`, `evmAddress`, Supabase pot rows, or localStorage
- any remaining dependency is explicitly labeled hybrid-only or fallback-only
- `HybridRemovalGate` has a static code preflight so native-critical imports cannot silently drift into Supabase, EVM/PVM closeout, or classic closeout truth

Completion evidence:

- `npm run validate:host-native-boundary` checks `src/chopdot-dot/**` and `src/components/screens/ChapterHome.tsx`
- the gate permits `localStorage` only inside the local signed-session adapter boundary
- the gate requires host-required Product Account, Statement Store, Bulletin/archive, closeout proof, and Asset Hub adapter wiring to stay visible in `ChapterHome`
- full live `HybridRemovalGate` remains blocked-live until the real Polkadot host can run identity, transport, archive, proof, and payout-evidence checks

### T2. Product UX Quality Pass

Status: `pass`

Completed.

Acceptance:

- each person has one obvious primary action (from the guided top action row)
- the UI explains blockers with group-money language
- emergency and community flows do not expose developer controls in normal use
- updated observations documents with pass/fail notes by scenario

Completion evidence:

- `tests/e2e/chopdot-dot-lab.spec.ts` covers all three modes through full closeout paths
- `tests/e2e/chopdot-dot-native-session.spec.ts` shows savings circle, emergency fund, and community pot as separate-device native sessions with one clear next action and convergence
- `docs/chopdot-dot/first-time-agent-observations.md` updated with the current behavior summary
- `docs/chopdot-dot/multi-device-agent-observations.md` updated with the shared-state status on separate local contexts

### T3. Launch-Day Host Runbook

Status: `pass`

Wrote [host-launch-runbook-2026-06-20.md](../../artifacts/polkadot-native/host-launch-runbook-2026-06-20.md), the exact runbook for the first moment `.dot` / Polkadot app access opens.

Acceptance:

- exact URL/query/path to open
- exact people/actions to run
- exact commands to capture proof
- exact screenshots/logs required for each gate
- exact criteria for saying pass, fail, or blocked-live

### T4. Verification Pass

Status: `pass`

Run:

```bash
npx tsc --noEmit
npm run validate:chopdot-coverage
npm run validate:chopdot-native-map
npm run validate:host-native-boundary
npx vitest run src/chopdot-dot/polkadotSession.test.ts src/chopdot-dot/commitmentKernel.test.ts
npx playwright test tests/e2e/chopdot-dot-lab.spec.ts --project=chromium
npm run build
```

If time is tight, run validators plus the focused native/unit tests first. Do not mark 99% pre-release as achieved without recording skipped checks.

2026-06-22 refresh:

- `npm run validate:use-case-9` — pass; now validates both the scorecard and generated readiness report
- `npm run validate:readiness` — pass; runs use-case, friend-pilot, auth-provider, coverage, native-map, and host-native-boundary validators as one daily gate
- `npm run validate:chopdot-coverage` — pass, 60 markdown files registered
- `npm run validate:chopdot-native-map` — pass, 11 replacement rows, 21 evidence ledger entries, and host-native boundary gate
- `npm run ci:fast` — pass; includes npm audit warning, lint, type-check, 421 unit/domain tests, production build, and component structure audit
- `npm audit --audit-level=high` inside `ci:fast` — warning only; unresolved dependency advisories still need separate dependency-risk triage before any public production claim
- `npm run pilot:friend-session -- --session friend-pilot-2026-06-22-mixed --base-url http://127.0.0.1:5173` — pass; run sheet generated
- `CHOPDOT_AGENT_BASE_URL=http://127.0.0.1:5173 npm run pilot:chopdot-agents` — pass after starting local Vite server; 13 agent routes loaded, 9 obvious primary actions clicked, human promotion still pending
- `CHOPDOT_AGENT_BASE_URL=http://127.0.0.1:5173 npm run pilot:humanlike-agents` — pass; 42 normal-surface steps, 41 visible app actions clicked, 1 deliberate missed-payment wait, 0 missing expected actions, 0 runtime errors, and all four core scenarios reached closed receipt states pending operator approval
- `NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1` — pass, 13 tests
- `npx playwright test tests/e2e/agent-wallet-pas-scenarios.spec.ts --project=chromium --workers=1` — pass, 5 tests
- `npx playwright test tests/e2e/capture-spend-loop.spec.ts tests/e2e/capture-pay-confirm-link.spec.ts tests/e2e/capture-wallet-pass-spend.spec.ts --project=chromium --workers=1` — pass, 3 tests
- `npx playwright test tests/e2e/login-smoke.spec.ts --project=chromium --project=mobile-chrome --workers=1` — pass, 12 tests
- `npm run e2e:host-sim` — pass, 1 host-sim iframe smoke
- `npm run preflight:dot-host:paseo` — pass local checks; `polkadot-app-deploy` signer session remains `setup_required`
- latest full browser regression remains `npx playwright test --workers=1` — pass, 82 tests passed and 4 skipped

2026-06-23 10x capture refresh:

- `npm run type-check` — pass
- `npx vitest run src/services/capture/KernelBridge.test.ts src/services/capture/PaymentEvidenceAdapter.test.ts src/services/capture/SettlementAdapterRegistry.test.ts src/chapter/chapterEngine.test.ts` — pass, 22 tests
- `npx playwright test tests/e2e/capture-spend-loop.spec.ts tests/e2e/capture-pay-confirm-link.spec.ts --workers=1` — pass, 4 tests across desktop and mobile projects
- Product evidence: Spend Card now supports `I just paid`, receipt checklist capture, rail choice, one-action `/pay`, separate `/confirm`, and evidence-only rail semantics

2026-06-22 dependency/security triage:

- [dependency-risk-triage-2026-06-22.md](./dependency-risk-triage-2026-06-22.md) records `npm audit` state as active risk: 49 advisories, including 3 critical and 19 high.
- Current claim remains: local CI passes with audit warnings; production dependency/security clearance is not complete.

2026-06-21 refresh:

- `npm run type-check` — pass
- `npx playwright test tests/e2e/login-smoke.spec.ts --project=chromium --project=mobile-chrome --workers=1` — pass, 12 tests
- `npx vitest run src/hooks/useCaptureLinkFlow.test.tsx` — pass, 2 tests
- `npx playwright test tests/e2e/capture-pay-confirm-link.spec.ts --project=chromium --workers=1` — pass, 1 test
- `CHOPDOT_EMAIL_PROVIDER_PROOF=1 VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=<local publishable key from supabase status> npx playwright test tests/e2e/email-auth-provider.spec.ts --project=chromium --workers=1` — pass, 1 test
- `npm run validate:use-case-9` — pass
- `npm run validate:friend-pilot` — pass
- `npm run validate:auth-provider-proof` — pass, ledger plus run packet
- `npm run validate:chopdot-coverage` — pass, 54 markdown files registered
- `npm run validate:chopdot-native-map` — pass, 11 replacement rows, 21 evidence ledger entries, and host-native boundary gate
- `NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1` — pass, 13 tests including participant-specific copy links for separate-device entry
- focused capture Playwright suite — pass, 4 tests
- `npx playwright test --workers=1` — pass, 72 tests passed and 4 skipped; the local-only email provider proof is intentionally skipped in default desktop/mobile projects unless the local proof env is enabled
- `npm run build` — pass, with existing Rollup eval/chunk-size warnings

2026-06-20 result:

- `npx tsc --noEmit` — pass
- `npm run validate:chopdot-coverage` — pass, 42 markdown files registered
- `npm run validate:chopdot-native-map` — pass, 11 replacement rows and 19 evidence ledger entries
- `npm run validate:host-native-boundary` — pass, native-critical imports separate from Supabase/EVM/PVM truth
- focused native/capture Vitest set — pass, 86 tests
- `NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1` — pass, 13 tests including participant-specific copy links for separate-device entry
- `npx playwright test tests/e2e/chopdot-dot-lab.spec.ts --project=chromium` — pass, 12 tests
- focused capture Playwright suite — pass, 4 tests
- `npx playwright test --workers=1` — pass, 46 tests passed and 2 skipped
- `npm run build` — pass, with existing Rollup eval/chunk-size warnings

### T5. W3S Native Adoption Board

Status: `pass-local`

Created [w3s-native-adoption-checklist-2026-06-21.md](./w3s-native-adoption-checklist-2026-06-21.md), turning the Parity W3S research into the next implementation lane.

Acceptance:

- `PaymentEvidenceAdapter` is the first P0 adapter seam;
- `RedactedReceiptPacketV1` is pass-local as the first Bulletin/archive packet seam;
- Statement Store host-sim proof is pass-local as the first G4 implementation step;
- W3S QR/deeplink parsing is pass-local, including failed/interrupted/unknown states;
- Coinage source map and evidence-only parser tests are pass-local;
- Coinage host-sim behavior gates are pass-local for success, timeout, rejection, unsupported host, duplicates, and private-secret rejection;
- static `.dot` deploy readiness has local preflight pass, with pinned deploy tool and `paseo-next-v2` verified; signer session still setup-required;
- Coinage stays lab-only until real host behavior is proven;
- user-facing UI remains ChopDot language, not W3S/Product SDK language;
- closeout reconciliation now separates observed evidence, marked-paid claims, confirmations, unresolved blockers, and ready-to-close state in the normal pot view.

Completion evidence:

- board added and registered in master plan;
- `npm run validate:chopdot-coverage` passes;
- `npm run validate:use-case-9` now validates both the scorecard and generated readiness report;
- local W3S seams remain pass-local, while signer setup and live host promotion remain explicit open gates.

### T6. 9/10 Readiness Report Gate

Status: `pass`

Added a generated readiness report and wired it into the normal use-case gate.

Acceptance:

- the repo has one current readable report for scores, friend-pilot status, auth-provider proof, dot-host state, and open gates;
- the normal `npm run validate:use-case-9` command fails if scorecard claims and readiness report gates drift apart;
- the report cannot promote completion while friend-pilot, provider-auth, static deploy, signer setup, or below-target scores remain open.

Completion evidence:

- `npm run report:use-case-9` generates `artifacts/use-case-9-readiness/current-use-case-9-readiness-report.md` and `.json`;
- `npm run validate:use-case-9` runs both `validate-use-case-9-scorecard.mjs` and `validate-use-case-9-readiness-report.mjs`;
- `npm run validate:readiness` runs the current non-browser product/evidence/native validator bundle for daily tracking;
- current generated status is `not_9_10_yet` with 5 open gates.

## What 99% Lets Us Say

Allowed:

- "The product flows are locally proven and host gates are fail-visible."
- "Capture and ChopDot.dot modes are ready for host verification."
- "The remaining live launch work is blocked by Polkadot app / `.dot` host availability."

Not allowed:

- "ChopDot.dot is fully native."
- "Statement Store/Bulletin/Asset Hub are proven in production."
- "All we need is publish."
- "A token transfer confirms payment."
- "ChopDot holds, protects, guarantees, or releases funds."

## Launch-Day Sequence When `.dot` Opens

1. Verify live React load.
2. Open savings circle as Leo in native host-required mode.
3. Leo signs mark-paid through Product Account.
4. Open Mina in a separate device/context.
5. Mina sees Leo waiting for confirmation via Statement Store.
6. Mina signs confirmation.
7. Record Omar delay.
8. Close with annotated receipt.
9. Save and retrieve redacted receipt through host archive.
10. Optional: attach finalized Asset Hub evidence and prove it does not confirm by itself.
11. Update `polkadot-native-runtime-proof-report.md`.
12. Only then consider `--publish`.

## Current Judgment

ChopDot.dot can credibly reach **99% pre-release** before `.dot` opens if T1 closes and blocked-live rows are accepted as external blockers.

It cannot credibly claim **100% live-native** until the host-backed runtime proof report reaches 7/7 PASS.

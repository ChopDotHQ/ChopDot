# ChopDot Full Product Test And Completion Goal

Status: `active-next-goal`
Date: 2026-06-20
Programmes: `CAPTURE` + `B` native truth, with Programme `A` live `.dot` still externally blocked

## Goal

By the next iteration, ChopDot should be usable and testable by me and friends across the full product loop we started:

```text
onboard -> capture money moment -> record payment -> confirm receipt -> resolve blockers -> close with receipt
```

This includes:

- savings circle
- emergency fund
- community pot
- Spend Cards
- pay / spend / confirm links
- QR / share handoff
- Telegram-style capture convergence
- wallet pass launcher
- webhook-lite payment claim path
- Polkadot-native signed session path
- receipt / history closeout

The user should not need to understand Polkadot, Supabase, Statement Store, Product SDK, Bulletin, kernels, adapters, rails, or webhooks. They should only see what happened, who needs to act, what is confirmed, what is blocked, and what record remains.

## Product Bar

This goal is not done until a real small group can test the product without us narrating the app.

Each tester must be able to answer:

- What am I part of?
- What do I need to do next?
- Who is waiting on whom?
- What was claimed?
- What was confirmed?
- What is delayed, disputed, or blocked?
- What payment evidence exists?
- What record will remain after closeout?

## Scope

### 1. Native Money Coordination Modes

These are the high-trust group-money modes:

- savings circle
- emergency fund
- community pot

Done means:

- each mode opens from normal ChopDot pot cards
- each person joins from their own device/person context
- each person sees one clear next action
- signed events produce one shared group state
- payment evidence never auto-confirms
- receiver/treasurer confirmation remains separate
- closeout requires confirmed or annotated items
- receipts are private/redacted where needed

Current local status:

- savings circle: `pass-local`
- emergency fund: `pass-local`
- community pot: `pass-local`

Live host status:

- blocked until Product Account, Statement Store, Bulletin/archive, Asset Hub, closeout proof, and `.dot` host are proven in real host.

### 2. Spend Cards

Spend Cards are the pay-moment capture wedge.

Done means:

- person can start from a spend card
- amount, memo, people, payer, split status, and next action are clear
- payee can mark paid
- receiver can confirm
- card connects back to the chapter/pot state
- card does not imply custody, escrow, or guaranteed payment
- wallet pass can launch back into the spend flow

Test requirement:

- run the spend-card flow from creation to payment claim to receiver confirmation
- verify the chapter state updates
- verify the user sees a clear closeout/history state afterwards

### 3. Pay / Spend / Confirm Links

Links are the no-install handoff path.

Done means:

- `/spend?t=...` opens the spend action
- `/pay?t=...` opens the payer action
- `/confirm?t=...` opens the receiver confirmation action
- expired, malformed, or wrong-person links fail safely
- QR/share text uses plain language
- links do not leak sensitive emergency details by default

Test requirement:

- run one link-only friend flow from share -> open -> mark paid -> confirm -> return to pot

### 4. QR / Share

QR/share is the in-person handoff.

Done means:

- QR opens the correct action
- shared text explains the job, not the stack
- scan/open recovery lands in the right pot/action
- wrong or stale QR state is handled clearly

Test requirement:

- run scan/share handoff for a spend action and a confirm action

### 5. Telegram-Style Capture Convergence

Telegram remains an edge capture channel, not product truth.

Done means:

- Telegram-style input can create or update a chapter/spend event
- app and Telegram-style capture converge on the same chapter state
- commands/copy are human-readable
- no Telegram-only state overrides app truth

Test requirement:

- run the local Telegram convergence test path and confirm the app shows the same chapter status

### 6. Wallet Pass Launcher

Wallet pass is a launcher, not custody.

Done means:

- wallet pass opens `/spend?t=...`
- the launched flow lands in the correct pot/action
- pass cannot mark paid or confirm by itself

Test requirement:

- run wallet-pass launch -> spend card -> mark paid / confirm path

### 7. Webhook-Lite Payment Claim Path

Webhook-lite can mark a payment claim, but never confirmation.

Done means:

- matching webhook event can mark a leg/payment as claimed
- receiver confirmation still required
- mismatched webhook is ignored or blocked
- webhook action is visible in history as evidence/claim, not final truth

Test requirement:

- run webhook -> claimed -> receiver confirm -> closeout
- run mismatched webhook and confirm it cannot mutate truth

### 8. Receipts / History

History is the trust layer.

Done means:

- every tested flow closes with a readable receipt or clear blocked state
- receipt states claimed, confirmed, delayed, approved, released, and closed separately
- emergency receipt defaults to redacted
- community pot receipt supports handoff/reviewer use
- receipt storage/archive is attempted or fail-visible in native mode

Test requirement:

- export receipts for savings circle, emergency fund, community pot, and a Spend Card flow

## Unified Test Matrix

| Flow | Must test | Expected result |
| --- | --- | --- |
| Savings circle | separate devices, delay, payout, closeout | pass-local |
| Emergency fund | private contribution, approval, release, redacted closeout | pass-local |
| Community pot | contribution, two approvals, release, receiver confirm, handoff | pass-local |
| Spend Card | pay moment capture, claim, receiver confirm, chapter update | must pass |
| `/spend` link | open from token and act | must pass |
| `/pay` link | payer handoff | must pass |
| `/confirm` link | receiver confirmation | must pass |
| QR/share | handoff opens correct action | must pass |
| Telegram convergence | chat-style capture and app state converge | must pass |
| Wallet pass | launcher opens correct spend action | must pass |
| Webhook-lite | webhook claims only, confirm still required | must pass |
| Receipt/history | closeout record is readable and honest | must pass |
| Host adapters | fail-visible without live host | must pass |

## Execution Plan

### Phase 0: Baseline The Product Truth

- [x] Run the existing focused verification set.
- [x] Record current pass/fail state in `docs/chopdot-dot/full-product-readiness-report-2026-06-20.md`.
- [x] Identify missing or stale E2E coverage for Spend Cards, links, QR/share, Telegram-style capture, wallet pass, webhook-lite, and receipts.

Exit criteria:

- no assumed-green flows
- every flow is labeled `pass-local`, `hybrid-pass`, `fail-visible`, `blocked-live`, or `todo`

### Phase 1: Native Money Modes Stay Green

- [x] Savings circle works from separate device/person contexts.
- [x] Emergency fund works from separate device/person contexts.
- [x] Community pot works from separate device/person contexts.
- [x] Re-run native-session E2E after capture changes to ensure no regression.

Exit criteria:

- `NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1` passes

### Phase 2: Spend Cards

- [x] Verify current spend-card route and UI still open from normal app navigation.
- [x] Verify spend card can capture a pay moment with amount, people, payer, and memo.
- [x] Verify mark-paid creates a claim, not confirmation.
- [x] Verify receiver confirmation remains separate.
- [x] Verify spend-card state is visible in the pot/chapter history.
- [x] Add or repair E2E coverage if the current tests do not prove the full loop.

Exit criteria:

- `capture-spend-loop.spec.ts` proves create/capture -> mark paid -> confirm -> history/receipt state

### Phase 3: Pay / Spend / Confirm Links

- [x] Verify `/spend?t=...` opens the intended spend action.
- [x] Verify `/pay?t=...` opens the payer handoff.
- [x] Verify `/confirm?t=...` opens receiver confirmation.
- [x] Verify malformed/expired/wrong-person tokens fail safely.
- [x] Verify shared copy is plain-English and does not expose stack details.

Exit criteria:

- `capture-pay-confirm-link.spec.ts` proves link-only friend handoff

### Phase 4: QR / Share

- [x] Verify QR payload opens the correct spend or confirm action.
- [x] Verify shared text explains the action clearly.
- [x] Verify stale or wrong QR state is handled without mutating product truth.

Exit criteria:

- QR/share assertions are included in capture link E2E or a focused QR E2E

### Phase 5: Telegram-Style Capture Convergence

- [x] Verify Telegram-style capture creates or updates the same chapter/spend state used by the app.
- [x] Verify Telegram language is plain-English.
- [x] Verify Telegram cannot override confirmation, closeout, or privacy rules.

Exit criteria:

- local Telegram convergence test or equivalent service-level test passes and is documented

### Phase 6: Wallet Pass Launcher

- [x] Verify wallet pass launches `/spend?t=...`.
- [x] Verify launcher alone cannot mark paid or confirm.
- [x] Verify launched spend action returns to the correct pot/action.

Exit criteria:

- wallet-pass launch path is covered in E2E or focused component/service test

### Phase 7: Webhook-Lite Claim Path

- [x] Verify matching webhook event marks a payment as claimed only.
- [x] Verify receiver confirmation is still required.
- [x] Verify mismatched webhook cannot mutate truth.
- [x] Verify webhook evidence appears in history as claim/evidence, not settlement truth.

Exit criteria:

- webhook-lite E2E or service test proves claim-only semantics

### Phase 8: Receipts / History

- [x] Verify savings circle receipt is readable.
- [x] Verify emergency receipt is redacted.
- [x] Verify community pot receipt supports reviewer/treasurer handoff.
- [x] Verify Spend Card / capture receipt or history state is readable.
- [x] Verify native archive path is attempted or fail-visible.

Exit criteria:

- every tested flow ends with either a readable receipt or a clear blocked state

### Phase 9: Product Trial Report

- [x] Write `docs/chopdot-dot/full-product-readiness-report-2026-06-20.md`.
- [x] Include what friends can do today.
- [x] Include what is confusing.
- [x] Include what is still lab/local.
- [x] Include what is hybrid Track 1.
- [x] Include what is Polkadot-native signed truth.
- [x] Include what is blocked by live `.dot` / Polkadot host access.

Exit criteria:

- report is plain-English and can be handed to the user before a real friend trial

## Verification Target

Required before saying this next goal is complete:

```bash
npx tsc --noEmit
npm run validate:chopdot-coverage
npm run validate:chopdot-native-map
npx vitest run src/chopdot-dot/polkadotSession.test.ts src/chopdot-dot/commitmentKernel.test.ts src/chopdot-dot/simulationAgents.test.ts
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1
npx playwright test tests/e2e/chopdot-dot-lab.spec.ts --project=chromium
npx playwright test tests/e2e/capture-spend-loop.spec.ts --project=chromium
npx playwright test tests/e2e/capture-pay-confirm-link.spec.ts --project=chromium
npm run build
```

If any named capture test does not exist or is stale, create or update the focused E2E before marking this goal done.

2026-06-20 result:

- `npx tsc --noEmit` — pass
- `npm run validate:chopdot-coverage` — pass, 42 markdown files registered
- `npm run validate:chopdot-native-map` — pass, 11 replacement rows and 19 evidence ledger entries
- focused Vitest native/capture set — pass, 86 tests
- `NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1` — pass, 3 tests
- `npx playwright test tests/e2e/chopdot-dot-lab.spec.ts --project=chromium --workers=1` — pass, 12 tests
- focused capture Playwright suite — pass, 4 tests
- `npx playwright test --workers=1` — pass, 46 tests passed and 2 skipped
- `npm run build` — pass, with existing Rollup eval/chunk-size warnings

## Completion Report

Produce one plain-English report after testing:

- what a friend can do today
- what worked without explanation
- where they got confused
- which flows are still lab/local only
- which flows depend on Supabase/hybrid Track 1
- which flows use Polkadot-native signed truth
- what remains blocked by live `.dot` / Polkadot host access

## Not Done Until

- Spend Cards are tested alongside the three native money modes.
- Link, QR, Telegram-style, wallet-pass, and webhook-lite paths are tested or explicitly marked blocked with reason.
- Every payment claim still requires confirmation before closeout.
- Emergency and community privacy/approval controls still hold after capture paths are included.
- The final status separates `pass-local`, `hybrid-pass`, `fail-visible`, and `blocked-live`.

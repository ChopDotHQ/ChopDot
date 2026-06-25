# ChopDot Agent Faucet-Token User Trial

Status: `complete-local`
Date: 2026-06-20
Scope: realistic agent trial across native money modes, Spend Cards, links, QR/share, Telegram-style capture, wallet pass, webhook-lite, receipts, and transaction evidence.

## Plain-English Result

The local product can now be tested like a real group-money workflow:

```text
join -> see my task -> claim paid -> wait for confirmation -> approve/release where needed -> close with a record
```

The strongest result is that agents acting as different people can complete the intended jobs without collapsing payment evidence into confirmation. The weakest result is that the "faucet token" path is still local/lab-only. It proves transaction behavior and edge cases, but it is not yet a real Asset Hub faucet/live transaction trial.

## What Was Simulated

The trial used two kinds of transaction evidence:

| Evidence type | Used for | What it proves | What it does not prove |
| --- | --- | --- | --- |
| Local faucet/test tokens | `TEST_USD`, `TEST_USDC`, `TEST_DOT` balances and transfers | duplicate, failed, insufficient-balance, pending/completed transfer behavior | real Asset Hub finality, wallet signing, public faucet funding |
| Lab Asset Hub reference | native-session mark-paid evidence | payment evidence can support a claim without confirming receipt | live host Product SDK transaction execution |

No real funds, custody, escrow, automatic payout, or live faucet token movement was used in this pass.

## Agent Scenarios

### Savings Circle

People:

- Leo: on-time contributor and round receiver.
- Nina: contributor.
- Omar: contributor / release recorder.
- Mina: organizer, treasurer, approver.

What worked:

- Leo opened from his own device, marked paid, and then saw that he was waiting for Mina.
- Mina opened from her own device, saw Leo waiting for confirmation, and confirmed receipt.
- Nina opened from her own device, marked paid, and Mina confirmed separately.
- Omar opened from his own device, stayed open until Mina recorded a delay, then later recorded release.
- Leo confirmed the release.
- Mina closed the round and the receipt showed `Record closed`.

Feedback:

- The trust model is right. Leo cannot close the round just because he marked paid.
- The user-facing task is understandable when the app says who is acting next.
- The round has enough steps that the next product improvement should be a guided "your turn" flow, not a denser status board.

### Emergency Fund

People:

- Casey: contributor.
- Morgan: contributor.
- Riley: organizer / treasurer / approver.
- Taylor: second approver.
- Jordan: recipient.

What worked:

- Casey and Morgan marked contributions from separate device contexts.
- Riley confirmed contributions separately.
- Riley prepared and approved release readiness.
- Taylor approved release readiness from their own perspective.
- Riley recorded the external release.
- Jordan confirmed receipt.
- Riley closed the pot.
- The redacted receipt behavior stayed intact.

Feedback:

- This mode has the highest trust burden because the context is sensitive.
- Redaction is essential and currently tested.
- The flow should avoid donor-wall or public-recipient language by default.
- The real friend trial should watch whether contributors understand why they cannot see every private detail.

### Community Pot

People:

- Sam: contributor / payer.
- Noor: contributor.
- Alex: admin / approver.
- Priya: second approver.
- Jordan: receiver.

What worked:

- Sam and Noor marked contributions.
- Alex confirmed contributions.
- Alex prepared and approved release.
- Priya approved separately.
- Sam could not release before required approval.
- Sam recorded external release only after approvals.
- Jordan confirmed receipt.
- Alex closed the period.

Feedback:

- The two-approver rule is clear in behavior.
- The product value is strongest for handoff and reviewer clarity.
- The flow needs a better "why this is blocked" explanation for non-admins.

### Spend Card / Pay Moment

People:

- Organizer creates a Friday Crew pot.
- Alice acts as payer.
- Owner acts as receiver.

What worked:

- Spend Card captured amount, memo, people, payer, and split state.
- Alice marked paid.
- Owner confirmed receipt separately.
- Chapter status moved from three open legs to two open legs after confirmation.

Feedback:

- Spend Cards remain the best Catch wedge.
- This flow feels closest to a real quick-use product.
- The next UX pass should make the receipt/history after a Spend Card feel more explicit.

### Pay / Confirm Links

What worked:

- `/pay?t=...` opened the payer handoff.
- Payer marked paid.
- `/confirm?t=...` opened receiver confirmation.
- Receiver confirmation closed only the claimed leg.

Feedback:

- Links are the strongest "friends do not need to install anything" path.
- Link copy needs to stay short and action-oriented.
- Wrong-person and expired token handling should be made more visible in a friend trial, even though service tests cover safe failure.

### QR / Share

What worked:

- Share text produced human-readable payment and confirmation copy.
- Links point to `/spend`, `/pay`, and `/confirm` actions.
- Share copy avoids stack language like kernel, adapter, webhook, Statement Store, and Supabase.

Feedback:

- QR/share should be treated as a user handoff, not a technical payload.
- The next visual trial should check whether the QR modal is obvious enough at table distance on mobile.

### Telegram-Style Capture

What worked:

- Chat-style capture writes into the same linked app chapter.
- Telegram-style updates do not get a separate truth store.
- Receiver confirmation still cannot be skipped.

Feedback:

- Telegram should remain an input surface, not the product authority.
- This is useful for low-friction Catch, but the app still needs to be where people resolve blockers and close records.

### Wallet Pass

What worked:

- Wallet pass launcher opened `/spend?t=...`.
- The launcher itself did not mark paid or confirm.

Feedback:

- This should be framed as "tap to return to this payment task," not as a money wallet.
- It helps repeat use if a member needs to come back later.

### Webhook-Lite Payment Claim

What worked:

- Matching webhook event marked a leg as claimed.
- Receiver confirmation remained required.
- Mismatched webhook behavior is rejected in service tests.

Feedback:

- Webhooks are useful because they reduce manual proof chasing.
- They must never be shown as "payment confirmed" without receiver confirmation.
- The history should say "payment evidence received" rather than "paid" when the source is a webhook.

## Transaction Edge Findings

Local faucet/test-token checks passed:

- completed fake transfer does not confirm contribution
- claim still needs receiver confirmation
- duplicate active transfer is blocked
- failed transfer returns balance and leaves blocker visible
- insufficient balance is blocked
- finalized Asset Hub-style evidence remains claim-only unless the expected recipient and amount are verified
- webhook evidence remains claim-only

Main product rule held:

```text
weak transaction evidence != received / cleared != approval != release != closeout
verified recipient+amount evidence can clear the payment leg
```

## User Feedback Summary

What feels strong:

- Each person can complete their own job in the current happy paths.
- The app protects the group from "I clicked paid, therefore we are done."
- Emergency receipts can stay private.
- Community pot approvals prevent one person from skipping the group rule.
- Spend Cards, links, and wallet pass are practical entry points.

Where people may still struggle:

- Too many modes still expose a lot of status at once.
- People may not understand the difference between "marked paid" and "confirmed received" unless the copy keeps repeating it.
- Emergency contributors may wonder why details are hidden.
- Community fund contributors need clearer blocked-state explanations.
- Faucet/test-token behavior is not yet a visible real wallet experience.

## Product Recommendations

Highest priority:

1. Add a `Your turn` strip to every money mode.
2. Add plain-language history entries: `Alice marked paid`, `Mina confirmed received`, `Webhook evidence received`, `Still waiting for receiver`.
3. Make Spend Card closeout/history more visible after confirmation.
4. Add a real friend-trial script with prompts after each action:
   - What did you think happened?
   - Who do you think acts next?
   - Do you trust the record?
   - What confused you?

Next live-gate priority:

1. Use real Polkadot faucet/PAS or test Asset Hub funding only after host/wallet access is ready.
2. Run one live transaction-evidence trial.
3. Confirm the UI still requires human receipt confirmation after a finalized transaction.
4. Record screenshots and transaction refs in the runtime proof report.

## Commands Run

```bash
NATIVE_SESSION=1 npx playwright test tests/e2e/chopdot-dot-native-session.spec.ts --project=native-session --workers=1
npx vitest run src/chopdot-dot/testTokenRail.test.ts src/chopdot-dot/polkadotSession.test.ts src/services/capture/firmaWebhookClaim.test.ts src/services/capture/WalletPassService.test.ts src/services/capture/QRPayloadCodec.test.ts src/bot/store/chapterStoreAdapter.test.ts
npx playwright test tests/e2e/capture-spend-loop.spec.ts tests/e2e/capture-pay-confirm-link.spec.ts tests/e2e/capture-wallet-pass-spend.spec.ts tests/e2e/capture-firma-webhook.spec.ts --project=chromium --workers=1
npx playwright test tests/e2e/chopdot-dot-lab.spec.ts --project=chromium --workers=1
```

Results:

- Native multi-device user trial: `3 passed`
- Transaction/faucet/token/service checks: `67 passed`
- Capture/link/Spend Card UI paths: `4 passed`
- Dot-mode/adversarial UI paths: `12 passed`

## Bottom Line

ChopDot is ready for a local friend-style trial with fake/local faucet tokens and transaction evidence. It is not yet ready to claim real live Polkadot transaction proof until the host/wallet/faucet path is available and tested with real transaction refs.

# ChopDot Product Cards

This is the source of truth for active ChopDot product work. The generated
cockpit reads these cards and turns them into views, readiness checks, history,
and resume context.

Source hierarchy:

```text
product/story-map.md -> product/journey-reviews/* -> product/cards.md -> generated cockpit views
```

The cockpit is the execution tracker. It must not replace the story map. A
card is valid only when it maps to a real story-map slice or explicitly records
why the story map changed.

Card rules:

- every user-facing card must fit the active story-map sequence
- every user-facing card must name one real journey and one next action
- ready/building/validation/done user-facing cards need a product gate score of 8+
- done cards need evidence and non-none evidence quality
- normal user copy must avoid internal technical language
- screenshots are required before a user-facing card is promoted to done

## P-001 - Dinner split pay-moment capture

```yaml
id: "P-001"
type: "journey"
title: "Dinner split pay-moment capture"
status: "done"
scope: "Catch"
module: "group-expense"
journey: "Mina paid CHF 120 for dinner in Zurich"
pillar: "Catch"
priority: "high"
evidence_quality: "strong"
owner: "devinsonpena"
depends_on: []
blocker: "none"
decision_contract: "DC-001"
tests:
  - "tests/e2e/capture-pay-confirm-link.spec.ts"
screens:
  - "SpendCardScreen"
  - "CaptureHandoffScreen"
evidence:
  - "docs/chopdot-dot/chopdot-10x-experience-thesis-2026-06-23.md"
  - "artifacts/chopdot-p001-capture/2026-06-29/p001-capture-2026-06-29/01-pot-capture-entry.png"
next_action: "Open the capture flow and split the payment without starting from a blank accounting form."
user_story: "I am Mina, I just paid for dinner, so I need ChopDot to capture the moment and give friends one clear way to pay me back."
one_next_action: "Split this payment"
friction_score: 3
trust_score: 3
clarity_score: 2
language_score: 1
total_score: 9
why: "This is the core wedge: capture what happened before the group loses context."
challenge: "If the first screen asks Mina to manually build receipt items, this card fails."
acceptance: "Mina can start from amount, receipt, link, or payment context and reach shareable friend actions in under 30 seconds."
screenshot_required: "yes"
last_touched: "2026-06-29"
```

User notes:

- Start from "I just paid", not "create expense".
- Manual entry can exist only after amount or receipt context exists.
- The first viewport should contain one primary action.

## P-002 - No-app friend payment link

```yaml
id: "P-002"
type: "feature"
title: "No-app friend payment link"
status: "done"
scope: "Payout"
module: "friend-action"
journey: "Leo receives a link and pays Mina back"
pillar: "Payout"
priority: "high"
evidence_quality: "partial"
owner: "product"
depends_on:
  - "P-001"
blocker: "none"
decision_contract: "DC-002"
tests:
  - "tests/e2e/capture-pay-confirm-link.spec.ts"
screens:
  - "CaptureHandoffScreen"
evidence:
  - "product/evidence/product-readiness-latest.json"
  - "product/evidence/screenshots/07-capture-handoff.png"
next_action: "Open the friend link and show only Leo's amount, receiver, and pay action."
user_story: "I am Leo, I got a ChopDot link from Mina, so I need to know what I owe and finish without creating an account first."
one_next_action: "Pay Mina"
friction_score: 3
trust_score: 3
clarity_score: 3
language_score: 1
total_score: 10
why: "Friend friction decides whether ChopDot works outside the organizer's device."
challenge: "If Leo sees admin controls or account setup before the first low-risk action, this card fails."
acceptance: "Leo can understand who receives money, how much, what happens next, and when he is done."
screenshot_required: "yes"
last_touched: "2026-06-24"
```

## P-003 - Confirm received

```yaml
id: "P-003"
type: "feature"
title: "Confirm received"
status: "done"
scope: "Management"
module: "confirmation"
journey: "Mina confirms money arrived"
pillar: "Management"
priority: "high"
evidence_quality: "partial"
owner: "product"
depends_on:
  - "P-002"
blocker: "none"
decision_contract: "DC-003"
tests:
  - "tests/e2e/capture-pay-confirm-link.spec.ts"
screens:
  - "CaptureConfirmScreen"
evidence:
  - "product/evidence/product-readiness-latest.json"
  - "product/evidence/screenshots/09-capture-confirm.png"
next_action: "Show Mina the exact payment to confirm received."
user_story: "I am Mina, Leo says he paid me, so I need to confirm what arrived and make the group record trustworthy."
one_next_action: "Confirm received"
friction_score: 3
trust_score: 3
clarity_score: 3
language_score: 1
total_score: 10
why: "The receiver confirmation is the product truth users trust later."
challenge: "If external payment activity silently confirms unrelated items, this card fails."
acceptance: "Mina confirms only the matching item, and everyone can see what remains open."
screenshot_required: "yes"
last_touched: "2026-06-24"
```

## P-004 - Close with readable saved record

```yaml
id: "P-004"
type: "feature"
title: "Close with readable saved record"
status: "done"
scope: "History"
module: "closeout"
journey: "The dinner group closes the record"
pillar: "History"
priority: "high"
evidence_quality: "strong"
owner: "devinsonpena"
depends_on:
  - "P-003"
blocker: "none"
decision_contract: "DC-004"
tests:
  - "tests/e2e/capture-pay-confirm-link.spec.ts"
screens:
  - "CloseoutReview"
evidence:
  - "docs/chopdot-dot/chopdot-10x-experience-thesis-2026-06-23.md"
  - "product/evidence/screenshots/normal-pot-j003-close-record/mobile-04-saved-record.png"
next_action: "Show what is confirmed, delayed, waived, or still open before closing."
user_story: "I am Mina, everyone has paid or been handled, so I need to close the record and keep something readable for later."
one_next_action: "Close record"
friction_score: 2
trust_score: 3
clarity_score: 3
language_score: 1
total_score: 9
why: "History is the durable reason to use ChopDot again."
challenge: "If the saved record is technical or unclear about open items, this card fails."
acceptance: "The final record is readable by a normal group member and states what it does and does not prove."
screenshot_required: "yes"
last_touched: "2026-06-28"
```

## P-026 - User path map and dead-end scanner

```yaml
id: "P-026"
type: "product-system"
title: "User path map and dead-end scanner"
status: "building"
scope: "Management"
module: "product-cockpit"
journey: "Product and engineering review the user's possible paths before adding new mini-app surfaces"
pillar: "Management"
priority: "high"
evidence_quality: "partial"
owner: "product"
depends_on:
  - "P-022"
  - "P-025"
blocker: "Twelve mapped dead ends remain open or unproven."
decision_contract: "DC-026"
tests:
  - "npm run product:path-map -- validate"
  - "npm run product:validate"
screens: []
evidence:
  - "product/user-path-map.md"
  - "product/user-path-map.mmd"
  - "product/generated/user-path-coverage.json"
  - "product/generated/user-path-coverage.md"
  - "product/generated/user-path-coverage.mmd"
  - "product/generated/user-path-coverage.html"
  - "product/evidence/user-path-coverage-latest.json"
  - "product/evidence/p026-user-path-scanner-proof-2026-07-15.md"
  - "product/evidence/screenshots/user-path-coverage/p026-user-path-coverage.png"
next_action: "Review the highest-risk user path and identify the next dead end or missing proof."
user_story: "I am a ChopDot builder or product manager, I need to see every possible user path and outcome, so we can catch dead ends before shipping new surfaces."
one_next_action: "Review journey map"
friction_score: 3
trust_score: 3
clarity_score: 3
language_score: 1
total_score: 10
why: "ChopDot is expanding across surfaces, and each new surface multiplies hidden branches unless user paths and proof gaps are visible in the cockpit."
challenge: "If the map becomes a pretty diagram without path ownership, proof status, dead-end checks, and cockpit routing value, this card fails."
acceptance: "The normal-pot journey has explicit action paths, resulting states, available next actions, actor maps, surface status, proof status, a validated dead-end register, and generated cockpit coverage."
screenshot_required: "no"
last_touched: "2026-07-15"
```

Operator notes:

- This is an internal product-system artifact, not normal-user UI.
- The source map stays manually reviewable; generated coverage is a read model.
- The first useful question is not "is the diagram complete?" but "which path is most likely to fail next?"
- New mini-app surfaces must reference this map before adding adapter-specific UX.

## P-005 - Spend Card capture path

```yaml
id: "P-005"
type: "feature"
title: "Spend Card capture path"
status: "discovery"
scope: "Catch"
module: "spend-card"
journey: "Mina pays with a card and captures the split"
pillar: "Catch"
priority: "high"
evidence_quality: "thin"
owner: "product"
depends_on:
  - "P-001"
blocker: "needs current UI walkthrough"
decision_contract: "DC-005"
tests:
  - "tests/e2e/capture-spend-loop.spec.ts"
  - "tests/e2e/capture-wallet-pass-spend.spec.ts"
screens:
  - "SpendCardScreen"
evidence:
  - "docs/chopdot-dot/chopdot-10x-experience-thesis-2026-06-23.md"
  - "product/design-references/ai-studio-universal-miniapp-shell-plan-2026-07-01.md"
next_action: "Review the current Spend Card flow and identify the first dead end."
user_story: "I am Mina, I just paid with a card, so I need ChopDot to turn that payment moment into a split without extra typing."
one_next_action: "Split this spend"
friction_score: 3
trust_score: 2
clarity_score: 2
language_score: 1
total_score: 8
why: "The card moment can become ChopDot's lowest-friction capture surface."
challenge: "If it becomes a card-management product instead of capture, this card fails."
acceptance: "The Spend Card path starts a real split or clearly hands off to one."
screenshot_required: "yes"
last_touched: "2026-06-24"
```

## P-006 - Savings circle round

```yaml
id: "P-006"
type: "journey"
title: "Savings circle round"
status: "done"
scope: "Management"
module: "savings-circle"
journey: "Mina runs a Friday savings circle"
pillar: "Management"
priority: "medium"
evidence_quality: "strong"
owner: "devinsonpena"
depends_on:
  - "P-003"
  - "P-004"
blocker: "none"
decision_contract: "DC-006"
tests:
  - "tests/e2e/chopdot-dot-native-session.spec.ts"
  - "artifacts/chopdot-p006-savings-circle/2026-07-01/p006-savings-circle/p006-savings-circle-review.json"
screens:
  - "ChapterHome"
evidence:
  - "docs/chopdot-dot/mode-map.md"
  - "product/journey-reviews/J-010-savings-circle-round.md"
  - "artifacts/chopdot-p006-savings-circle/2026-07-01/p006-savings-circle/01-leo-mark-paid.png"
  - "artifacts/chopdot-p006-savings-circle/2026-07-01/p006-savings-circle/03-mina-confirm-leo.png"
  - "artifacts/chopdot-p006-savings-circle/2026-07-01/p006-savings-circle/09-mina-record-payout.png"
  - "artifacts/chopdot-p006-savings-circle/2026-07-01/p006-savings-circle/13-mina-round-closed.png"
  - "artifacts/chopdot-p006-savings-circle/2026-07-01/p006-savings-circle/p006-savings-circle-review.json"
next_action: "Move to the next user journey: emergency pot privacy flow."
user_story: "I am Mina, I run a savings circle, so I need to see who paid, who is delayed, and whether this round can close."
one_next_action: "Confirm received"
friction_score: 3
trust_score: 3
clarity_score: 3
language_score: 1
total_score: 10
why: "Savings circles extend ChopDot from one-off splits to repeated group commitments."
challenge: "If the screen feels like a lab or ledger, this card fails."
acceptance: "Leo marks paid, Mina confirms, Mina records delays, payout is confirmed by Leo, and Mina closes the round without technical language."
screenshot_required: "yes"
last_touched: "2026-07-01"
```

## P-007 - Emergency pot privacy flow

```yaml
id: "P-007"
type: "journey"
title: "Emergency pot privacy flow"
status: "done"
scope: "Management"
module: "emergency-pot"
journey: "A group coordinates private emergency help"
pillar: "Management"
priority: "medium"
evidence_quality: "strong"
owner: "devinsonpena"
depends_on:
  - "P-002"
  - "P-003"
blocker: "none"
decision_contract: "DC-007"
tests:
  - "tests/e2e/chopdot-dot-native-session.spec.ts"
  - "artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot/p007-emergency-pot-review.json"
screens:
  - "ChapterHome"
evidence:
  - "docs/chopdot-dot/emergency-pot-spec.md"
  - "product/design-references/chopdot-batch-1-flow-reference-2026-07-01/README.md"
  - "product/design-references/chopdot-batch-2-settlement-reference-2026-07-01/README.md"
  - "product/design-references/chopdot-batch-1-2-consolidated-principles-2026-07-01.md"
  - "product/journey-reviews/J-011-emergency-pot-privacy-flow.md"
  - "artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot/p007-emergency-pot-contact-sheet.png"
  - "artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot-batch-principles-pass/index.html"
  - "artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot-batch-principles-pass/01-casey-contribute.png"
  - "artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot-batch-principles-pass/03-riley-confirm-casey.png"
  - "artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot-batch-principles-pass/08-taylor-approve-release.png"
  - "artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot-batch-principles-pass/12-riley-record-saved.png"
  - "artifacts/chopdot-p007-emergency-pot/2026-07-01/p007-emergency-pot-batch-principles-pass/13-casey-saved-redacted.png"
next_action: "Move to the next user journey: community fund role flow."
user_story: "I am Casey, I want to help with an emergency, so I need to contribute privately without exposing Jordan's private details."
one_next_action: "Contribute"
friction_score: 3
trust_score: 3
clarity_score: 3
language_score: 1
total_score: 10
why: "Emergency pots only work if dignity and clarity are both protected."
challenge: "If sensitive names, reasons, notes, or payment references leak into the normal record, this card fails."
acceptance: "Casey and Morgan contribute privately; Riley confirms contributions, prepares release, records release, and closes; Taylor approves; Jordan confirms received; contributors see a redacted saved record."
screenshot_required: "yes"
last_touched: "2026-07-01"
```

## P-008 - Community fund role flow

```yaml
id: "P-008"
type: "journey"
title: "Community fund role flow"
status: "discovery"
scope: "Management"
module: "community-fund"
journey: "A small group manages shared fund decisions"
pillar: "Management"
priority: "medium"
evidence_quality: "thin"
owner: "product"
depends_on:
  - "P-003"
  - "P-004"
blocker: "needs role-based first viewport"
decision_contract: "DC-008"
tests:
  - "tests/e2e/chopdot-dot-native-session.spec.ts"
screens:
  - "ChapterHome"
evidence:
  - "docs/chopdot-dot/community-fund-spec.md"
next_action: "Show each role exactly what they can do next."
user_story: "I am a fund approver, I need to approve or question a request, so the group knows whether money can be released."
one_next_action: "Review request"
friction_score: 2
trust_score: 3
clarity_score: 2
language_score: 1
total_score: 8
why: "Community funds make ChopDot useful for repeated group operators."
challenge: "If it becomes DAO or admin-console language, this card fails."
acceptance: "Admins, approvers, contributors, payers, receivers, and reviewers each have a clear view."
screenshot_required: "yes"
last_touched: "2026-06-24"
```

## P-009 - Agent wallet journey testing

```yaml
id: "P-009"
type: "experiment"
title: "Agent wallet journey testing"
status: "done"
scope: "Quality"
module: "agent-testing"
journey: "Mina, Leo, Nina, and Omar act from separate devices"
pillar: "Management"
priority: "high"
evidence_quality: "strong"
owner: "devinsonpena"
depends_on:
  - "P-001"
  - "P-002"
blocker: "none"
decision_contract: "DC-009"
tests:
  - "tests/e2e/agent-wallet-pas-scenarios.spec.ts"
screens:
  - "PotsHome"
  - "CaptureHandoffScreen"
evidence:
  - "docs/chopdot-dot/agent-wallet-journey-model-2026-06-22.md"
  - "product/agent-reviews/P-009-normal-pot-agent-ui-audit.md"
  - "artifacts/chopdot-normal-pot-agents/2026-06-28/normal-pot-agent-2026-06-28/normal-pot-agent-ui-audit.md"
  - "artifacts/chopdot-normal-pot-agents/2026-06-28/normal-pot-agent-2026-06-28/02-mina-pot-detail.png"
  - "artifacts/chopdot-normal-pot-agents/2026-06-28/normal-pot-agent-2026-06-28/02-leo-pot-detail.png"
next_action: "Run agents through the app UI and record confusion, dead ends, and unsafe assumptions."
user_story: "I am testing ChopDot as real people, so I need each agent to use the real app and reveal where the journey breaks."
one_next_action: "Run agent journey"
friction_score: 3
trust_score: 3
clarity_score: 3
language_score: 1
total_score: 10
why: "Selector tests are not enough; product tests must show what people would understand."
challenge: "If agents mutate state directly or only follow happy paths, this card fails."
acceptance: "Each agent uses the visible app from their own context and produces screenshot-backed observations."
screenshot_required: "yes"
last_touched: "2026-06-28"
```

## P-021 - J-004 no-app friend payment link

```yaml
id: "P-021"
type: "journey"
title: "J-004 no-app friend payment link"
status: "done"
scope: "Payout"
module: "friend-action"
journey: "Leo receives a link and pays without joining"
pillar: "Payout"
priority: "high"
evidence_quality: "strong"
owner: "devinsonpena"
depends_on:
  - "P-009"
  - "P-002"
blocker: "none"
decision_contract: "DC-021"
tests:
  - "tests/e2e/capture-pay-confirm-link.spec.ts"
screens:
  - "CaptureHandoffScreen"
  - "CaptureConfirmScreen"
  - "PotHome"
evidence:
  - "product/agent-reviews/P-009-normal-pot-agent-ui-audit.md"
  - "product/journey-reviews/J-004-no-app-friend-payment-link.md"
  - "artifacts/chopdot-p021-friend-link/2026-06-29/p021-friend-link-2026-06-29/p021-friend-link-audit.md"
  - "artifacts/chopdot-p021-friend-link/2026-06-29/p021-friend-link-2026-06-29/01-leo-pay-link.png"
next_action: "Move to the next cockpit card after P-021 validation."
user_story: "I am Leo, Mina sent me a ChopDot link, so I need to know what I owe and pay without setting up an account first."
one_next_action: "Pay Mina"
friction_score: 3
trust_score: 3
clarity_score: 3
language_score: 1
total_score: 10
why: "The P-009 audit showed friends should not be sent to the full normal pot view. The friend link is the bridge between organizer-owned pots and separate-device group behavior."
challenge: "If Leo sees organizer controls, full pot chrome, setup pressure, or more than one primary action, this card fails."
acceptance: "Leo opens a generated link, sees one amount and one receiver, marks paid, then Mina confirms the matching item without closing unrelated items."
screenshot_required: "yes"
last_touched: "2026-06-29"
```

## P-022 - Regular pot end-to-end coherence

```yaml
id: "P-022"
type: "journey"
title: "Regular pot end-to-end coherence"
status: "building"
scope: "Quality"
module: "group-expense"
journey: "Mina uses one regular pot from first cost to saved record"
pillar: "Management"
priority: "high"
evidence_quality: "partial"
owner: "devinsonpena"
depends_on:
  - "P-001"
  - "P-003"
  - "P-004"
  - "P-021"
blocker: "none"
decision_contract: "DC-022"
tests:
  - "scripts/run-p022-regular-pot-coherence-audit.mjs"
  - "tests/e2e/capture-pay-confirm-link.spec.ts"
  - "tests/e2e/capture-spend-loop.spec.ts"
screens:
  - "PotsHome"
  - "PotHome"
  - "SpendCardScreen"
  - "CaptureHandoffScreen"
  - "CaptureConfirmScreen"
  - "CloseoutReview"
evidence:
  - "output/playwright/normal-pot-onboarding-2026-07-01/index.html"
  - "product/story-map.md"
  - "product/journey-reviews/J-005-regular-pot-end-to-end-coherence.md"
  - "artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782820959927/p022-regular-pot-coherence-audit.md"
  - "artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782820959927/01-pots-list.png"
  - "artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782820959927/04-pot-after-first-cost.png"
  - "artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782820959927/07-leo-pay-link.png"
  - "artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782820959927/17-saved-record.png"
  - "artifacts/chopdot-p022-regular-pot/2026-06-29/p022-regular-pot-1782727857377/p022-regular-pot-coherence-audit.md"
  - "artifacts/chopdot-p022-regular-pot/2026-06-29/p022-regular-pot-1782727857377/04-pot-after-first-cost.png"
  - "artifacts/chopdot-p022-regular-pot/2026-06-29/p022-regular-pot-1782727857377/07-leo-pay-link.png"
  - "artifacts/chopdot-p022-regular-pot/2026-06-29/p022-regular-pot-1782727857377/15-pot-after-confirmations.png"
  - "artifacts/chopdot-p022-regular-pot/2026-06-29/p022-regular-pot-1782727857377/17-saved-record.png"
next_action: "Fix the normal pot journey breaks found in the latest screenshot review."
user_story: "I am Mina, I am using a regular pot for a dinner or trip, so I need to add costs, split/pay, confirm received money, and close the record without wondering which flow I am in."
one_next_action: "Review journey"
friction_score: 3
trust_score: 3
clarity_score: 3
language_score: 1
total_score: 10
why: "The latest screenshot review showed the journey regressed: member splits drifted, the currency picker was hard to read, the mobile settle action was blocked, and DOT/USDC wallet steps were unclear."
challenge: "If the pass adds modes, explanations, dashboard panels, or backend rewrites before the visible normal-pot journey works, this card fails."
acceptance: "Mina can create a CHF pot, add friends, record CHF 120 split with those friends, see who owes, collect via TWINT/bank, and view the DOT wallet path without mobile blockers or hidden controls."
screenshot_required: "yes"
last_touched: "2026-07-01"
```

Implementation note:

- Add expense is handled by `QuickKeypadSheet`, an in-flow sheet opened from `PotHome`, not a routed screen.

## P-023 - PAS test wallet payment

```yaml
id: "P-023"
type: "feature"
title: "PAS test wallet payment"
status: "done"
scope: "Payout"
module: "friend-action"
journey: "Leo pays Mina from a funded test wallet"
pillar: "Payout"
priority: "high"
evidence_quality: "strong"
owner: "devinsonpena"
depends_on:
  - "P-002"
  - "P-003"
blocker: "none"
decision_contract: "DC-023"
tests:
  - ".worktrees/portable-shell-trial/src/payments/pasWallet.test.ts"
  - ".worktrees/portable-shell-trial/tests/polkadot-host-wallet-settlement.spec.ts"
screens:
  - "CaptureHandoffScreen"
evidence:
  - "product/journey-reviews/J-006-pas-test-wallet-payment.md"
  - "artifacts/chopdot-p023-pas-payment/2026-06-30/p023-pas-payment-1782824214315/01-leo-pay-with-pas.png"
  - "artifacts/chopdot-p023-pas-payment/2026-06-30/p023-pas-payment-1782824214315/02-leo-payment-received.png"
  - "artifacts/chopdot-p023-pas-payment/2026-06-30/p023-pas-payment-1782824214315/03-payment-not-found.png"
  - "artifacts/chopdot-p023-pas-payment/2026-06-30/p023-pas-payment-1782824214315/p023-pas-payment-review.json"
  - ".worktrees/portable-shell-trial/proof/polkadot-host-wallet-settlement/report.md"
  - ".worktrees/portable-shell-trial/proof/polkadot-host-wallet-settlement/report.json"
  - ".worktrees/portable-shell-trial/proof/polkadot-host-wallet-settlement/05-1-ready-to-pay-leo.png"
  - ".worktrees/portable-shell-trial/proof/polkadot-host-wallet-settlement/06-1-payment-received-leo.png"
  - ".worktrees/portable-shell-trial/proof/polkadot-host-wallet-settlement/08-final-group-summary-mina.png"
next_action: "Keep PAS on the direct wallet and public-chain path; do not restore artifact-backed payment checks."
user_story: "I am Leo, I owe Mina from Friday Crew, so I need to pay her from a funded test wallet and have ChopDot clear only my share."
one_next_action: "Pay Mina"
friction_score: 3
trust_score: 3
clarity_score: 3
language_score: 1
total_score: 10
why: "This proves real money movement can reduce follow-up while preserving the exact-share trust boundary."
challenge: "If a mismatched transfer clears the wrong share, or the UI exposes native/protocol terms, this card fails."
acceptance: "Leo triggers a wallet-signed PAS transfer from the real friend-link UI; ChopDot independently observes a finalized payer, receiver, amount, chain, and currency match; only Leo's payment item clears; balances, hashes, explorer links, screenshots, and five-person convergence are retained."
screenshot_required: "yes"
last_touched: "2026-07-15"
```

## P-024 - DOT and USDC wallet payment checks

```yaml
id: "P-024"
type: "feature"
title: "DOT and USDC wallet payment checks"
status: "discovery"
scope: "Payout"
module: "friend-action"
journey: "Leo checks whether his wallet payment clears the right share"
pillar: "Payout"
priority: "high"
evidence_quality: "partial"
owner: "devinsonpena"
depends_on:
  - "P-023"
blocker: "DOT remains fixture-shaped and TEST_USDC used a mock token contract. Neither currency has completed the connected-wallet, direct-chain-observation, five-person run required for promotion."
decision_contract: "DC-024"
tests:
  - "src/__tests__/AgentWalletPasSettlement.test.ts"
screens:
  - "CaptureHandoffScreen"
evidence:
  - "product/journey-reviews/J-006-pas-test-wallet-payment.md"
  - "product/journey-reviews/J-007-wallet-payment-currency-checks.md"
  - "artifacts/chopdot-p024-wallet-payment/2026-06-30/p024-wallet-payment-1782830349578/01-dot-pay-with-wallet.png"
  - "artifacts/chopdot-p024-wallet-payment/2026-06-30/p024-wallet-payment-1782830349578/02-dot-payment-received.png"
  - "artifacts/chopdot-p024-wallet-payment/2026-06-30/p024-wallet-payment-1782830349578/03-usdc-wrong-currency.png"
  - "artifacts/chopdot-p024-wallet-payment/2026-06-30/p024-wallet-payment-1782830349578/04-usdc-wallet-needs-funds.png"
  - "artifacts/chopdot-p024-wallet-payment/2026-06-30/p024-wallet-payment-1782830349578/p024-wallet-payment-review.json"
  - "artifacts/agent-wallet-trials/agent-wallet-trial-2026-06-22/wallet-scenario-report.md"
next_action: "After the PAS wallet path passes, run separate real DOT and real testnet USDC connected-wallet checks without reusing PAS, fixtures, or prior reports."
user_story: "I am Leo, I owe Mina from Friday Crew, so I need to pay her with the wallet currency I actually have and have ChopDot clear only the matching share."
one_next_action: "Check payment"
friction_score: 3
trust_score: 3
clarity_score: 3
language_score: 1
total_score: 10
why: "Wallet payments only help ChopDot if they reduce follow-up and never clear the wrong payment."
challenge: "If DOT or USDC-shaped payment data clears a mismatched share, or the UI exposes technical payment wording, this card fails."
acceptance: "Real DOT and real testnet USDC transfers are initiated from the friend-link UI, observed directly from their authoritative chain or asset source, and clear only the exact matching payment item; fixtures and mock tokens cannot promote this card."
screenshot_required: "yes"
last_touched: "2026-07-15"
```

## P-025 - Universal Chop Core security architecture

```yaml
id: "P-025"
type: "architecture"
title: "Universal Chop Core security architecture"
status: "building"
scope: "Quality"
module: "mini-app-security"
journey: "Future mini-app surfaces act on one trusted Chop record"
pillar: "Management"
priority: "critical"
evidence_quality: "strong"
owner: "product/security"
depends_on:
  - "P-021"
  - "P-022"
  - "P-023"
  - "P-024"
blocker: "Non-atomic financial writes, durable payment intents, scoped guest capabilities, and one canonical cross-host state remain open."
decision_contract: "DC-025"
tests:
  - "npm run product:validate"
  - "backend/src/__tests__/auth.middleware.test.ts"
  - "backend/src/__tests__/actor-boundary.routes.test.ts"
  - "backend/src/__tests__/settlements.routes.test.ts"
  - "backend/src/__tests__/users.routes.test.ts"
  - "backend/src/integration/p025-migration-chain.database.ts"
  - "backend/src/integration/p025-actor-boundary.database.ts"
  - "backend/src/integration/p025-financial-authority.database.ts"
screens: []
evidence:
  - "docs/security/universal-chop-core-security-architecture.md"
  - "docs/security/p025-security-foundation-crosswalk-2026-07-14.md"
  - "docs/security/p025-database-backed-actor-boundary-proof-2026-07-14.md"
  - "docs/security/p025-settlement-state-migration-proof-2026-07-14.md"
  - "docs/security/p025-capture-link-migration-proof-2026-07-14.md"
  - "docs/security/p025-security-foundation-integration-manifest-2026-07-14.md"
  - "docs/security/p025-security-foundation-canonical-integration-2026-07-15.md"
  - "docs/security/p025-owner-checkpoint-node22-proof-2026-07-15.md"
  - "docs/security/p025-financial-table-authority-lockdown-proof-2026-07-16.md"
  - "docs/adr/0004-server-derived-payment-actor.md"
  - "product/design-references/ai-studio-universal-miniapp-shell-plan-2026-07-01.md"
next_action: "Make payment-state, event, and closeout persistence atomic at the backend command boundary."
user_story: "I am building ChopDot across mini-app environments, so I need one auditable core contract before Circles, Telegram, or other surfaces can change shared money records."
one_next_action: "Review security boundary"
friction_score: 3
trust_score: 3
clarity_score: 3
language_score: 1
total_score: 10
why: "Mini-app expansion only works if every surface submits scoped actions into one trusted Chop record model."
challenge: "If any surface owns final truth, trusts caller-supplied identity, or can confirm or close outside its role, this card fails."
acceptance: "The architecture and executable database proofs define server-derived actors, canonical payment states, scoped capture-link access, role boundaries, replay behavior, direct-client financial mutation denial, privacy limits, deployment boundaries, and the remaining enforcement gaps."
screenshot_required: "no"
last_touched: "2026-07-16"
```

## P-010 - Polkadot-native session boundary

```yaml
id: "P-010"
type: "research"
title: "Polkadot-native session boundary"
status: "building"
scope: "Native Stack"
module: "polkadot-native"
journey: "The group shares one trusted state without a central app database"
pillar: "History"
priority: "medium"
evidence_quality: "partial"
owner: "devinsonpena"
depends_on:
  - "P-009"
blocker: "The five-person normal-UI host proof is complete locally. Live promotion still requires a runnable Polkadot Mobile client, live multi-device Statement Store convergence, and live payment/receipt proof."
decision_contract: "DC-010"
tests:
  - "tests/e2e/chopdot-dot-native-session.spec.ts"
  - ".worktrees/portable-shell-trial/src/environment/encryptedSession.test.ts"
  - ".worktrees/portable-shell-trial/src/environment/polkadotHostBridge.test.ts"
  - ".worktrees/portable-shell-trial/tests/polkadot-host-sim.spec.ts"
  - ".worktrees/portable-shell-trial/tests/polkadot-host-five-person-stress.spec.ts"
  - ".worktrees/portable-shell-trial/tests/polkadot-host-real-ui.spec.ts"
screens: []
evidence:
  - ".worktrees/portable-shell-trial/HOSTS.md"
  - ".worktrees/portable-shell-trial/proof/portable-shell-dot-host/report.json"
  - ".worktrees/portable-shell-trial/proof/polkadot-host-capability/report.json"
  - ".worktrees/portable-shell-trial/proof/polkadot-host-capability-live/report.json"
  - ".worktrees/portable-shell-trial/proof/product-account-login-boundary-2026-07-14.md"
  - ".worktrees/portable-shell-trial/proof/polkadot-host-capability-live/product-account-login-qr.png"
  - ".worktrees/portable-shell-trial/proof/polkadot-host-sim/report.json"
  - ".worktrees/portable-shell-trial/proof/polkadot-host-sim/alice-host.png"
  - ".worktrees/portable-shell-trial/proof/polkadot-host-sim/bob-host.png"
  - ".worktrees/portable-shell-trial/proof/polkadot-host-stress/report.json"
  - ".worktrees/portable-shell-trial/proof/polkadot-host-stress/mina-host.png"
  - ".worktrees/portable-shell-trial/proof/polkadot-host-stress/leo-host.png"
  - ".worktrees/portable-shell-trial/proof/polkadot-host-stress/nina-host.png"
  - ".worktrees/portable-shell-trial/proof/polkadot-host-stress/omar-host.png"
  - ".worktrees/portable-shell-trial/proof/polkadot-host-stress/vera-host.png"
  - ".worktrees/portable-shell-trial/proof/polkadot-host-real-ui/report.json"
  - ".worktrees/portable-shell-trial/proof/polkadot-host-real-ui/06-leo-marked-paid-leo.png"
  - ".worktrees/portable-shell-trial/proof/polkadot-host-real-ui/07-all-confirmed-mina.png"
  - ".worktrees/portable-shell-trial/proof/polkadot-host-real-ui/08-saved-summary-mina.png"
  - ".worktrees/portable-shell-trial/proof/polkadot-ios-reference-host-setup-2026-07-14.md"
  - "docs/adr/0005-portable-product-native-host-boundary.md"
next_action: "Repeat the proven five-person normal-UI journey against live Product Accounts and live Statement Store when a runnable Polkadot Mobile client is available; test real payment execution as a separate evidence lane."
user_story: "I am Mina, I need Leo's payment action to reach the same group from his device, so we can finish with one trusted summary."
one_next_action: "Prove the live connection"
friction_score: 3
trust_score: 3
clarity_score: 3
language_score: 1
total_score: 10
why: "A shared native session matters when separate devices converge without changing the simple ChopDot journey or exposing infrastructure."
challenge: "If plaintext money data enters Statement Store, a host event bypasses the payment-intent boundary, or technical language reaches normal UI, this card fails."
acceptance: "Static .dot delivery, live capability discovery, the Product Account QR ceremony, the developer boundary tests, and a five-person normal-UI journey across isolated official test hosts are proven. Five separate participants now create, split, request, mark paid, confirm, finish, and converge on one saved summary without developer actions or direct state mutation. Live-native promotion still requires completed host identity, encrypted live-device convergence, exact payment matching, and redacted receipt submit/retrieval against the deployed host."
screenshot_required: "no"
last_touched: "2026-07-14"
```

## P-011 - Product language cleanup

```yaml
id: "P-011"
type: "cleanup"
title: "Product language cleanup"
status: "done"
scope: "Quality"
module: "language"
journey: "Normal users understand the app without internal terms"
pillar: "Management"
priority: "high"
evidence_quality: "strong"
owner: "devinsonpena"
depends_on: []
blocker: "none"
decision_contract: "DC-011"
tests:
  - "scripts/chopdot-product-cockpit.mjs"
screens:
  - "AllNormalUserScreens"
evidence:
  - "product/evidence/product-integrity-latest.json"
  - "product/agent-reviews/P-011-product-language-cleanup.md"
  - "artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782810444015/p022-regular-pot-coherence-audit.md"
  - "artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782810444015/06-split-payment-created.png"
  - "artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782810444015/07-leo-pay-link.png"
  - "artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782810444015/16-close-record-review.png"
  - "artifacts/chopdot-p022-regular-pot/2026-06-30/p022-regular-pot-1782810444015/17-saved-record.png"
next_action: "Scan normal UI for internal terms and replace them with user language."
user_story: "I am a first-time ChopDot user, so I need the app to tell me what to do without technical or internal vocabulary."
one_next_action: "Clean visible copy"
friction_score: 3
trust_score: 3
clarity_score: 3
language_score: 1
total_score: 10
why: "Language leakage is one of the clearest symptoms that the product is serving the architecture."
challenge: "If a normal screen uses internal terms, this card fails."
acceptance: "Normal screens use receipt, mark paid, confirmed received, waiting on, ready to close, and saved record."
screenshot_required: "yes"
last_touched: "2026-06-30"
```

## P-012 - Receipt capture without manual-first entry

```yaml
id: "P-012"
type: "feature"
title: "Receipt capture without manual-first entry"
status: "done"
scope: "Catch"
module: "receipt-capture"
journey: "Mina captures a receipt before editing details"
pillar: "Catch"
priority: "high"
evidence_quality: "strong"
owner: "devinsonpena"
depends_on:
  - "P-001"
blocker: "none"
decision_contract: "DC-012"
tests:
  - "tests/e2e/capture-spend-loop.spec.ts"
  - "tests/e2e/capture-image-receipt-flow.spec.ts"
screens:
  - "SpendCardScreen"
evidence:
  - "product/journey-reviews/J-009-receipt-capture-without-manual-first-entry.md"
  - "artifacts/chopdot-p012-receipt-capture/2026-06-30/p012-receipt-capture/01-add-receipt.png"
  - "artifacts/chopdot-p012-receipt-capture/2026-06-30/p012-receipt-capture/02-review-split.png"
  - "artifacts/chopdot-p012-receipt-capture/2026-06-30/p012-receipt-capture/03-payment-links.png"
  - "artifacts/chopdot-p012-receipt-capture/2026-06-30/p012-receipt-capture/p012-receipt-capture-review.json"
next_action: "Move to the next user journey: savings circle round."
user_story: "I am Mina, I have a receipt, so I need ChopDot to capture it first and let me correct details only if needed."
one_next_action: "Add receipt"
friction_score: 3
trust_score: 3
clarity_score: 3
language_score: 1
total_score: 10
why: "Manual item entry made the product feel worse and must not be the default."
challenge: "If the normal path starts with item rows, this card fails."
acceptance: "The first capture path is photo, paste, import, or fallback amount; item editing is secondary and appears only after capture."
screenshot_required: "yes"
last_touched: "2026-06-30"
```

## P-013 - Competitor and 10x benchmark

```yaml
id: "P-013"
type: "research"
title: "Competitor and 10x benchmark"
status: "discovery"
scope: "Quality"
module: "research"
journey: "ChopDot beats the strongest normal splitting app on the chosen wedge"
pillar: "Management"
priority: "medium"
evidence_quality: "thin"
owner: "product"
depends_on: []
blocker: "needs refreshed competitor walkthrough evidence"
decision_contract: "DC-013"
tests:
  - "manual-competitor-walkthrough"
screens:
  - "CompetitorReview"
evidence:
  - "docs/chopdot-dot/chopdot-10x-experience-thesis-2026-06-23.md"
  - "product/design-references/ai-studio-universal-miniapp-shell-plan-2026-07-01.md"
next_action: "Compare the same dinner split, no-app pay, confirm, and close record journey against the strongest alternatives."
user_story: "I am deciding what makes ChopDot worth using, so I need to know where it clearly beats normal splitting apps."
one_next_action: "Compare one journey"
friction_score: 2
trust_score: 3
clarity_score: 2
language_score: 1
total_score: 8
why: "Competitors are the floor; ChopDot needs a sharper wedge."
challenge: "If this becomes generic feature comparison instead of journey comparison, this card fails."
acceptance: "Each comparison says beats, ties, or loses for a concrete journey."
screenshot_required: "no"
last_touched: "2026-06-24"
```

## P-014 - Product cockpit upgrade

```yaml
id: "P-014"
type: "feature"
title: "Product cockpit upgrade"
status: "done"
scope: "Quality"
module: "product-cockpit"
journey: "The team knows what to build next and why"
pillar: "Management"
priority: "high"
evidence_quality: "partial"
owner: "devinsonpena"
depends_on: []
blocker: "none"
decision_contract: "DC-014"
tests:
  - "npm run validate:product-cockpit"
screens:
  - "product/board.html"
evidence:
  - "product/cards.md"
  - "product/board-policy.md"
  - "product/board.html"
  - "product/evidence/screenshots/product-cockpit-latest.png"
  - "product/evidence/product-cockpit-visual-review-latest.json"
next_action: "Generate a readable cockpit with roadmap, kanban, decisions, history, and resume."
user_story: "I am working on ChopDot, so I need one cockpit that tells me what matters, what is proven, what is blocked, and what to do next."
one_next_action: "Open product cockpit"
friction_score: 3
trust_score: 3
clarity_score: 3
language_score: 1
total_score: 10
why: "This prevents product drift, context loss, and technically valid but user-hostile work."
challenge: "If the cockpit is only a generated report page, this card fails."
acceptance: "The cockpit is useful within 30 seconds and its lifecycle commands update source truth and history."
screenshot_required: "yes"
last_touched: "2026-06-24"
```

## P-015 - Friend-pilot readiness scorecard

```yaml
id: "P-015"
type: "quality"
title: "Friend-pilot readiness scorecard"
status: "ready"
scope: "Quality"
module: "readiness"
journey: "The next pilot knows which use cases are actually ready"
pillar: "History"
priority: "high"
evidence_quality: "partial"
owner: "quality"
depends_on:
  - "P-009"
blocker: "none"
decision_contract: "DC-015"
tests:
  - "npm run validate:readiness"
screens:
  - "product/board.html"
evidence:
  - "docs/chopdot-dot/use-case-9-completeness-scorecard-2026-06-20.md"
next_action: "Mark each journey ready, needs work, or blocked using current proof."
user_story: "I am preparing a real pilot, so I need to know what is safe to show friends and what still needs work."
one_next_action: "Review readiness"
friction_score: 2
trust_score: 3
clarity_score: 3
language_score: 1
total_score: 9
why: "Honest readiness protects the product from overclaiming."
challenge: "If agent-passed gets treated as human-approved without review, this card fails."
acceptance: "The scorecard separates ready, needs work, setup required, and blocked-live."
screenshot_required: "yes"
last_touched: "2026-06-24"
```

## P-016 - Product resume for future agents

```yaml
id: "P-016"
type: "quality"
title: "Product resume for future agents"
status: "ready"
scope: "Quality"
module: "agent-handoff"
journey: "A future agent resumes without losing the product point"
pillar: "History"
priority: "medium"
evidence_quality: "partial"
owner: "quality"
depends_on:
  - "P-014"
blocker: "none"
decision_contract: "DC-016"
tests:
  - "npm run product:resume"
screens:
  - "product/generated/product-resume.md"
evidence:
  - "product/cards.md"
next_action: "Generate a short handoff with thesis, active work, blockers, and next actions."
user_story: "I am a future ChopDot agent, so I need to resume from product truth instead of rereading the whole repo."
one_next_action: "Read product resume"
friction_score: 3
trust_score: 3
clarity_score: 3
language_score: 1
total_score: 10
why: "The cockpit only becomes a flywheel if it survives context switches."
challenge: "If the resume does not state the top next action and boundaries, this card fails."
acceptance: "The generated resume answers what ChopDot is, what is active, what is blocked, and what to do first."
screenshot_required: "no"
last_touched: "2026-06-24"
```

## P-017 - AI PM process guardrails

```yaml
id: "P-017"
type: "quality"
title: "AI PM process guardrails"
status: "done"
scope: "Quality"
module: "ai-product-management"
journey: "Future agents apply AI PM lessons without making ChopDot more complex"
pillar: "Management"
priority: "high"
evidence_quality: "partial"
owner: "product"
depends_on:
  - "P-014"
blocker: "none"
decision_contract: "DC-017"
tests:
  - "npm run product:ai-pm:validate"
screens:
  - "product/ai-manager/ai-product-management-adoption.md"
evidence:
  - "product/ai-manager/ai-product-management-adoption.md"
  - "scripts/validate-ai-pm-process.mjs"
  - "product/ai-manager/post-mortems/smart-scan-text-trap.md"
next_action: "Run the AI PM validator before shipping AI-assisted capture work."
user_story: "I am a future ChopDot agent, so I need AI PM lessons converted into hard checks before I build another high-friction AI feature."
one_next_action: "Run AI PM check"
friction_score: 3
trust_score: 3
clarity_score: 3
language_score: 1
total_score: 10
why: "The AI PM books are only useful if they prevent the next text-box-first or model-first product mistake."
challenge: "If AI documentation exists but the process still lets high-friction AI UI ship, this card fails."
acceptance: "The process documents AI fit, false-positive/false-negative costs, human review, correction path, monitoring, and catches paste-first capture debt."
screenshot_required: "no"
last_touched: "2026-06-27"
```

## P-018 - Normal pot expense tracking

```yaml
id: "P-018"
type: "journey"
title: "Normal pot expense tracking"
status: "done"
scope: "Catch"
module: "group-expense"
journey: "Mina adds shared costs during an evening or trip"
pillar: "Catch"
priority: "high"
evidence_quality: "strong"
owner: "devinsonpena"
depends_on: []
blocker: "none"
decision_contract: "DC-018"
tests:
  - "npm run validate:journey-reviews"
screens:
  - "PotHome"
  - "ExpensesTab"
evidence:
  - "product/journey-reviews/J-001-normal-pot-add-and-track-expenses.md"
  - "product/evidence/screenshots/normal-pot-j001-desktop-compare/04-local-desktop-after-add.png"
next_action: "Open the normal pot and add one shared expense without entering a dense form."
user_story: "I am Mina, I need to add a shared cost during a trip or evening, so the group can keep an accurate pot before anyone settles."
one_next_action: "Add Expense"
friction_score: 3
trust_score: 3
clarity_score: 3
language_score: 1
total_score: 10
why: "This is the baseline ChopDot loop. If normal expense tracking feels sloppy, advanced capture, savings circles, and funds will inherit the wrong foundation."
challenge: "If the first viewport mixes expense tracking with payback planning or the add sheet feels like an accounting form, this card fails."
acceptance: "The first viewport centers Add Expense, quick add is amount/title first, split settings are secondary, and payback is visually later than tracking."
screenshot_required: "yes"
last_touched: "2026-06-28"
```

## P-019 - Normal pot mobile and desktop polish

```yaml
id: "P-019"
type: "quality"
title: "Normal pot mobile and desktop polish"
status: "done"
scope: "Quality"
module: "group-expense"
journey: "J-008 Mobile/Desktop Layout Quality for J-001 through J-003"
pillar: "Management"
priority: "high"
evidence_quality: "strong"
owner: "devinsonpena"
depends_on:
  - "P-018"
  - "P-003"
  - "P-004"
blocker: "none"
decision_contract: "DC-019"
tests:
  - "npm run validate:journey-reviews"
  - "npm run product:validate"
screens:
  - "PotsHome"
  - "PotHome"
  - "SettleSelection"
  - "SettleHome"
  - "CloseoutReview"
evidence:
  - "product/journey-review-plan.md"
  - "product/journey-reviews/J-008-mobile-desktop-layout-quality.md"
  - "product/evidence/screenshots/normal-pot-j008-layout-quality/final/mobile-02-pot-detail.png"
  - "product/evidence/screenshots/normal-pot-j008-layout-quality/final/desktop-02-pot-detail.png"
  - "product/evidence/screenshots/normal-pot-j008-layout-quality/final/mobile-07-saved-record.png"
  - "product/evidence/screenshots/normal-pot-j008-layout-quality/final/desktop-07-saved-record.png"
next_action: "Run the normal pot loop on mobile and desktop, then fix only the visual and flow mismatches."
user_story: "I am a ChopDot user on phone or desktop, so I need the same money flow to feel intentionally designed for my screen."
one_next_action: "Keep the current money action obvious"
friction_score: 3
trust_score: 3
clarity_score: 3
language_score: 1
total_score: 10
why: "The normal pot loop is the product foundation. Savings circles, emergency pots, and spend capture should inherit a professional baseline, not prototype clutter."
challenge: "If the pass adds features, explanations, dashboard panels, or desktop-stretched mobile layouts, this card fails."
acceptance: "Mobile and desktop screenshots for pots list, pot detail, settle flow, close review, and saved record pass the journey review and visual quality gates."
screenshot_required: "yes"
last_touched: "2026-06-28"
```

## P-020 - Chat capture agent

```yaml
id: "P-020"
type: "feature"
title: "Chat capture agent"
status: "building"
scope: "Catch"
module: "chat-capture"
journey: "Mina adds ChopDot to a Telegram dinner chat"
pillar: "Catch"
priority: "high"
evidence_quality: "partial"
owner: "product"
depends_on:
  - "P-001"
  - "P-003"
blocker: "none"
decision_contract: "DC-020"
tests:
  - "src/__tests__/chatCaptureDraft.test.ts"
  - "src/__tests__/telegramSafety.test.ts"
  - "src/bot/store/chapterStoreAdapter.test.ts"
screens: []
evidence:
  - "src/__tests__/chatCaptureDraft.test.ts"
  - "docs/telegram-chat-agent.md"
next_action: "Write a paid message in the chat, then review the draft before adding it."
user_story: "I am Mina in a group chat, I need ChopDot to capture a paid message, so the group can review the split and keep moving."
one_next_action: "/addlast"
friction_score: 3
trust_score: 3
clarity_score: 2
language_score: 1
total_score: 9
why: "This lets ChopDot meet groups where money moments already happen, without turning chat guesses into product truth."
challenge: "If the bot silently adds expenses, sends payment links, marks paid, confirms received, or reads private chats without consent, this card fails."
acceptance: "A Telegram message creates a reviewable draft; only /addlast writes the expense, live use requires an allowlisted chat plus mutation flag, and paid/confirmed states still require explicit actions."
screenshot_required: "no"
last_touched: "2026-06-28"
```

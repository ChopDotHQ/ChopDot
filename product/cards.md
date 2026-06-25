# ChopDot Product Cards

This is the source of truth for active ChopDot product work. The generated
cockpit reads these cards and turns them into views, readiness checks, history,
and resume context.

Card rules:

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
status: "ready"
scope: "Catch"
module: "group-expense"
journey: "Mina paid CHF 120 for dinner in Zurich"
pillar: "Catch"
priority: "high"
evidence_quality: "partial"
owner: "product"
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
last_touched: "2026-06-24"
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
status: "validation"
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
status: "validation"
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
status: "ready"
scope: "History"
module: "closeout"
journey: "The dinner group closes the record"
pillar: "History"
priority: "high"
evidence_quality: "partial"
owner: "product"
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
last_touched: "2026-06-24"
```

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
status: "discovery"
scope: "Management"
module: "savings-circle"
journey: "Mina runs a Friday savings circle"
pillar: "Management"
priority: "medium"
evidence_quality: "thin"
owner: "product"
depends_on:
  - "P-003"
  - "P-004"
blocker: "needs product-native flow simplification"
decision_contract: "DC-006"
tests:
  - "tests/e2e/chopdot-dot-native-session.spec.ts"
screens:
  - "ChapterHome"
evidence:
  - "docs/chopdot-dot/mode-map.md"
next_action: "Make the treasurer's first action obvious for one current round."
user_story: "I am Mina, I run a savings circle, so I need to see who paid, who is delayed, and whether this round can close."
one_next_action: "Review this round"
friction_score: 2
trust_score: 3
clarity_score: 2
language_score: 1
total_score: 8
why: "Savings circles extend ChopDot from one-off splits to repeated group commitments."
challenge: "If the screen feels like a lab or ledger, this card fails."
acceptance: "Mina can confirm contributions, record a delay, and close the round without technical language."
screenshot_required: "yes"
last_touched: "2026-06-24"
```

## P-007 - Emergency pot privacy flow

```yaml
id: "P-007"
type: "journey"
title: "Emergency pot privacy flow"
status: "discovery"
scope: "Management"
module: "emergency-pot"
journey: "A group coordinates private emergency help"
pillar: "Management"
priority: "medium"
evidence_quality: "thin"
owner: "product"
depends_on:
  - "P-002"
  - "P-003"
blocker: "needs privacy-first user test"
decision_contract: "DC-007"
tests:
  - "tests/e2e/chopdot-dot-native-session.spec.ts"
screens:
  - "ChapterHome"
evidence:
  - "docs/chopdot-dot/emergency-pot-spec.md"
next_action: "Show one private contribution action without exposing sensitive details."
user_story: "I am a contributor, I want to help with an emergency, so I need to contribute without exposing the recipient or private reason."
one_next_action: "Contribute privately"
friction_score: 2
trust_score: 3
clarity_score: 2
language_score: 1
total_score: 8
why: "Emergency pots only work if dignity and clarity are both protected."
challenge: "If sensitive names, reasons, notes, or payment references leak into the normal record, this card fails."
acceptance: "Contributor, organizer, approver, and recipient each see only what they need."
screenshot_required: "yes"
last_touched: "2026-06-24"
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
status: "ready"
scope: "Quality"
module: "agent-testing"
journey: "Mina, Leo, Nina, and Omar act from separate devices"
pillar: "Management"
priority: "high"
evidence_quality: "partial"
owner: "quality"
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
last_touched: "2026-06-24"
```

## P-010 - Polkadot-native session boundary

```yaml
id: "P-010"
type: "research"
title: "Polkadot-native session boundary"
status: "blocked"
scope: "Native Stack"
module: "polkadot-native"
journey: "The group shares one trusted state without a central app database"
pillar: "History"
priority: "medium"
evidence_quality: "partial"
owner: "engineering"
depends_on:
  - "P-009"
blocker: "external host and live dot availability"
decision_contract: "DC-010"
tests:
  - "tests/e2e/chopdot-dot-native-session.spec.ts"
screens:
  - "DeveloperChecks"
evidence:
  - "docs/chopdot-dot/native-execution-playbook.md"
next_action: "Keep native session work fail-visible and separate from normal product readiness."
user_story: "I am building ChopDot's future stack, so I need infrastructure work to prove shared state without confusing users."
one_next_action: "Check native boundary"
friction_score: 1
trust_score: 3
clarity_score: 1
language_score: 1
total_score: 6
why: "Polkadot infrastructure matters only when it reduces friction or increases trust invisibly."
challenge: "If infrastructure status is presented as product readiness, this card fails."
acceptance: "The boundary is documented, fail-visible, and never blocks local user-flow improvement."
screenshot_required: "no"
last_touched: "2026-06-24"
```

## P-011 - Product language cleanup

```yaml
id: "P-011"
type: "cleanup"
title: "Product language cleanup"
status: "ready"
scope: "Quality"
module: "language"
journey: "Normal users understand the app without internal terms"
pillar: "Management"
priority: "high"
evidence_quality: "partial"
owner: "product"
depends_on: []
blocker: "none"
decision_contract: "DC-011"
tests:
  - "scripts/audit-components-and-structure.mjs"
screens:
  - "AllNormalUserScreens"
evidence:
  - "product/evidence/product-integrity-latest.json"
next_action: "Scan normal UI for internal terms and replace them with user language."
user_story: "I am a first-time ChopDot user, so I need the app to tell me what to do without technical or internal vocabulary."
one_next_action: "Clean visible copy"
friction_score: 3
trust_score: 2
clarity_score: 3
language_score: 1
total_score: 9
why: "Language leakage is one of the clearest symptoms that the product is serving the architecture."
challenge: "If a normal screen uses internal terms, this card fails."
acceptance: "Normal screens use receipt, mark paid, confirmed received, waiting on, ready to close, and saved record."
screenshot_required: "yes"
last_touched: "2026-06-24"
```

## P-012 - Receipt capture without manual-first entry

```yaml
id: "P-012"
type: "feature"
title: "Receipt capture without manual-first entry"
status: "ready"
scope: "Catch"
module: "receipt-capture"
journey: "Mina captures a receipt before editing details"
pillar: "Catch"
priority: "high"
evidence_quality: "thin"
owner: "product"
depends_on:
  - "P-001"
blocker: "none"
decision_contract: "DC-012"
tests:
  - "tests/e2e/capture-pay-confirm-link.spec.ts"
screens:
  - "CaptureHandoffScreen"
evidence:
  - "docs/chopdot-dot/chopdot-10x-experience-thesis-2026-06-23.md"
next_action: "Make photo, paste, or import the default before any item editing."
user_story: "I am Mina, I have a receipt, so I need ChopDot to capture it first and let me correct details only if needed."
one_next_action: "Add receipt"
friction_score: 3
trust_score: 2
clarity_score: 3
language_score: 1
total_score: 9
why: "Manual item entry made the product feel worse and must not be the default."
challenge: "If the normal path starts with item rows, this card fails."
acceptance: "The first capture path is photo, paste, import, or amount; item editing is secondary."
screenshot_required: "yes"
last_touched: "2026-06-24"
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

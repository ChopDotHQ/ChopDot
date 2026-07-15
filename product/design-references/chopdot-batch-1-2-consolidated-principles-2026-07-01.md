# ChopDot Batch 1 + Batch 2 Consolidated Design Principles

Date: 2026-07-01

Source references:

- `product/design-references/chopdot-batch-1-flow-reference-2026-07-01/`
- `product/design-references/chopdot-batch-2-settlement-reference-2026-07-01/`

## The Bar

ChopDot should feel like a focused money app for groups, not a dashboard, protocol console, or generated workflow.

## Principles

### 1. One Screen, One Job

Each screen should have exactly one user job:

- create a pot;
- add an expense;
- review a split;
- collect from one person;
- confirm a payment;
- close a record.

If a screen is trying to handle setup, explanation, status, settlement, and history at once, split it.

### 2. Hero First, Details Second

The first viewport should show:

- where the user is;
- the current state;
- one amount or one key status;
- one primary action.

Supporting details come after the action moment, not before it.

### 3. One Dominant Action

The primary pink action should be unmistakable. Secondary actions should be lighter, lower, or hidden until needed.

### 4. Labels Beat Explanations

Use short labels, names, amounts, and states. Avoid paragraph copy. If the UI needs explanation to make sense, the screen is doing too much.

### 5. Details Must Belong To The Moment

Only show details that help the current action. For example:

- pay screen: amount, receiver, payment method;
- confirmation screen: who paid, amount, method;
- receipt screen: final totals and participants;
- activity screen: chronological actions.

Do not show lifecycle mechanics because the system has them.

### 6. Completion Must Feel Clean

Saved, paid, received, and settled states should feel final. Avoid toasts, overlays, bottom nav collisions, or duplicated saved labels on completion screens.

### 7. Privacy Should Be Designed Away

Do not show sensitive data and then explain why it is hidden. Prefer natural phrases such as:

- `Kept private`
- `Private by default`
- `Only needed details shown`

Avoid defensive or system-like privacy copy unless the user is reviewing a record.

### 8. Focused Tasks Can Hide App Chrome

For payment, confirmation, approval, and close screens, the bottom nav can disappear. These moments should feel decisive and focused, with a clear back path at the top.

### 9. Mobile Fit Is A Product Requirement

The first viewport must feel composed. If the primary action, amount, and state compete with metrics, rows, or nav, simplify.

### 10. Copy The Discipline, Not The Skin

Batch 1 and Batch 2 are references for rhythm, hierarchy, and finish. ChopDot should keep its own product language and not copy another product's banking, reward, or card proposition.

## Emergency Pot Application

For emergency pots:

- first viewport: private support hero, amount, one action;
- below first viewport: compact target/raised/status detail;
- contributor copy: no recipient identity, no private reason, no payment references;
- organizer copy: action-first confirmation and release flow;
- completion: clean saved private record, no toast over the nav.

## Reusable Check

Before accepting a screen, ask:

- Is there one job?
- Is there one hero state or amount?
- Is there one primary action?
- Are details below the action moment?
- Is any privacy copy too defensive?
- Does app chrome compete with the task?
- Does completion look clean?
- Does it look like a finished product screenshot?

## Effortless App Check

Batch 1 and Batch 2 should now be reviewed together with the effortless-app standard:

1. **State model locked**
   - Can we name the real state before looking at the UI?
   - Does the screen avoid blurring paid, received, approved, released, closed, and saved?

2. **Design system obeyed**
   - Does the screen reuse ChopDot's known spacing, button, sheet, row, card, and typography patterns?
   - Are any new shapes or components justified by the job?

3. **Scope cut**
   - What was removed so the screen has one job?
   - Is there any explanation, option, or secondary panel that should be deferred?

4. **Invariant protected**
   - What product law does this screen depend on?
   - Is there a test or agent path proving that law does not break?

5. **Fewest screens**
   - Is this a necessary separate moment, or should it be merged into the previous/next screen?
   - Does the separation reduce friction, or only add ceremony?

6. **QA clicked the hard paths**
   - Did someone click empty, error, wrong-person, payment, privacy, and closeout paths where relevant?
   - Are the screenshots from the real app, not an imagined flow?

If any answer is weak, do not add more polish. Cut scope, lock the state, or rerun the journey.

# Journey 08 — Understand a Group / Group Home

**Priority:** P0  
**Status:** V1 Golden Candidate / Review pending  
**Prototype:** `v1-golden-candidate.html`

## User goal
When I open a group, I should immediately know:
- what happened;
- what needs me;
- where I stand;
- what I can do next.

## Entry
- Home → group card
- Create Group success → open group
- Invite / Join success → open group

## Primary exits
- review an expense
- view all expenses
- view balances
- add an expense
- view group people
- invite someone
- settle
- group settings
- global Home / People / Activity / You

## V1 hierarchy
1. Group identity
2. What needs you
3. Your position
4. Recent activity
5. People / settle handoffs
6. Global bottom navigation

## Core design decision
Group Home is **overview-first, not tab-first**.

The user should not have to choose between `Expenses / Members / Settings` before understanding the group. Detailed areas still exist, but they are reached contextually from the overview.

## Product decisions in the candidate
- Group identity stays compact in the header: name, people count, currency.
- Invite and group settings stay available from the header without becoming primary content.
- Attention is the first content block when action is required.
- User position is more important than a dense accounting dashboard.
- Total group spend stays visible as context, not the hero.
- Recent expenses show enough activity to answer “what happened?” without becoming the full expense ledger.
- People and Settle are compact contextual handoffs.
- Bottom navigation remains the global ChopDot navigation inherited from Home.
- The center expense action remains visible except when settlement has locked expense changes.

## Designed states

### Active / needs review
`One thing needs you.`
- review Dinner
- user is owed CHF 52.90
- recent expenses visible
- People and Settle handoffs visible

### Nothing needs you
`Nothing needs you.`
- user has no action
- others may still owe the user
- state explains that ChopDot is waiting on other people

### New / empty group
`Ready when you are.`
- no expenses
- add expense
- invite people
- CHF 0.00 position

### Settlement in progress
`Settlement in progress.`
- progress is visible
- outstanding participant is visible
- current position updates as payments land
- add-expense center action is visibly unavailable

### Everyone square
`Everyone’s square.`
- no outstanding action
- CHF 0.00 user position
- settlement appears in recent history

### Offline
- clear offline status
- saved group data remains understandable
- last-sync time is visible
- unresolved task remains visible

## Handoff rule
This journey shows only enough of downstream journeys to prove the exits are coherent. It does not redesign Expense Detail, Add Expense, Settlement, People, or Settings inside Group Home.

## Review questions
- Does Group Home tell you the state of the group quickly enough?
- Is `Your position` the right financial hero?
- Is the total group spend visible enough without becoming dashboard noise?
- Is `Recent` useful, or too much / too little?
- Do People and Settle feel like the right secondary actions?
- Does the empty group make the first move obvious?
- Does settlement-in-progress feel safely locked without feeling broken?
- Does this still feel like the same ChopDot as Home V1.4 and Create Group V2?

## Approval rule
If approved, freeze as **Golden Journey #4 / Design Approved** and then continue to Journey 05 Add Expense.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

**Coverage:** Selected source-supported decisions, backfilled 2026-09-06 from commit `f403b02d05a50d13f556b3edfb949f92b24488a9`. Not a complete conversation or alternatives audit. Earlier candidate labels in the spec body describe its drafting stage; the registry/approval sources below establish the recorded status. Revisit triggers below are maintenance notes added now, not claims about past discussion or permission to redesign.

### J08-D01 — Overview before tabs

**Decision:** Group Home leads with identity, what needs the user, personal position and recent activity. People, Settle and deeper areas are contextual handoffs; retain global navigation.

**Why:** The source explicitly says people should understand the group before choosing Expenses / Members / Settings.

**Alternatives:** Tab-first navigation and a dense accounting-dashboard hero are explicitly contrasted with the overview. Total spend is context, not the hero.

**Tradeoffs:** Recent activity is not the full ledger. The historical prototype includes an expense-change lock during settlement; later item-scoped contracts must be considered at integration without asserting that this HTML already implements them.

**Revisit when:** The overview fails to answer what happened or what needs action; integration reveals a mismatch between the historical settlement lock and later item-scoped rules.

**Approval / version:** v1 — Golden #4 / design-approved, as recorded at the source commit. This documentation update does not create or expand approval. TYPO-01 shared typography/readability remains deferred.

**Sources:** [Spec: core design decision](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/08-group-home/spec.md#core-design-decision); [Spec: product decisions in the candidate](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/08-group-home/spec.md#product-decisions-in-the-candidate); [Spec: handoff rule](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/08-group-home/spec.md#handoff-rule); [version and approval registry](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/journeys.json). [Later scope contract](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/11-settle-up/spec.md#small-correction-to-earlier-golden-assumptions).
<!-- JOURNEY_DECISION_HISTORY:END -->

# Journey 06 — Review / Correct an Expense

**Priority:** P0  
**Status:** V1 Golden Candidate / Review pending  
**Prototype:** `v1-golden-candidate.html`

## User goal
Open an existing expense, understand it immediately, and correct it when permitted.

## Entry
- Group Home → expense row
- Activity → expense
- Attention → expense
- Add Expense success → view expense

## Core paths
Owner:
`Expense detail → Edit → Save changes → Updated expense`

Other member:
`Expense detail → Review expense → Journey 07`

Delete:
`Expense detail → More → Delete → Balances updated → Group Home`

## Information hierarchy
1. Total amount
2. Expense name
3. Review/change status
4. Payer, personal share, and date
5. Split
6. Receipt and history
7. Contextual actions

## Candidate decisions
- Detail is readable before it is editable.
- Edit Expense reuses Journey 05 fields and controls with values prefilled.
- The user's personal share remains visible near the top.
- Only the expense owner or an authorized role gets Edit/Delete.
- Other members can review but do not see fake edit controls.
- Editing resets or updates review status transparently.
- Delete is a separate confirmation state and explains the balance impact.
- Important changes show what changed.
- History and receipt are available without dominating the first screen.
- Journey 06 owns detail, edit, delete, and history.
- Journey 07 owns confirm, question, and dispute.

## States
Core:
- own expense
- someone else's expense
- fully reviewed
- changed since review
- updated expense

Supporting:
- full split
- receipt viewer
- expense history
- change comparison

Control:
- edit
- delete confirmation
- deleted
- settlement lock
- no edit permission

Recovery:
- offline detail/edit/save
- failed save with edits preserved
- sync conflict
- loading
- not found

## Approval rule
If approved:
1. freeze as Golden Journey #6;
2. promote Expense Detail, Change Status, Expense History, and Delete Confirmation patterns;
3. begin Journey 07 — Confirm / Agree / Dispute.

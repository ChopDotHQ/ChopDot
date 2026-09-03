# Journey 06 — Review / Correct an Expense

**Priority:** P0  
**Status:** Design Approved / Golden Journey #6  
**Version:** V1.1  
**Prototype:** `v1.1-golden.html`

## User goal

Open an existing expense, understand it immediately, and correct it when permitted.

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

## Approved decisions

- Detail is readable before it is editable.
- Edit Expense reuses Journey 05 fields and controls with values prefilled.
- The user's personal share remains visible near the top.
- Only the expense owner or an authorized role gets Edit/Delete.
- Other members can review but do not see fake edit controls.
- Editing resets or updates review status transparently.
- Delete is a separate confirmation state and explains the balance impact.
- Important changes show what changed.
- History and receipt are available without dominating the first screen.
- Journey 06 owns detail, edit, delete, receipt, history, permissions, and recovery.
- Journey 07 owns review, agreement, questions, and issues.

## Visual correction in V1.1

The sync-conflict state initially had missing semantic icon treatment. V1.1 restores:

- compare icon in the conflict heading;
- person icon for the remote version;
- device icon for the locally saved version;
- compare/check icons in the footer actions.

## QA

- 31 explicit states
- 128/128 links resolve
- 393 × 852 and 430 × 890
- zero horizontal overflow
- zero header/content/footer overlap
- no placeholder icons
- visual comparison against the Golden set completed

## Next

Journey 07 — Review / Agree / Raise an Issue.

# Journey 05 — Add an Expense

**Priority:** P0  
**Status:** Golden Journey #5 / Design Approved  
**Prototype:** `v1-golden.html`

## User goal
Record a shared cost quickly, while retaining precise control over payer, participants, split, date, and receipt.

## Entry
- Group Home → center expense action
- Home → center expense action → group selected
- Create Group success → Add expense

## Success exits
- Back to the updated group
- Add another expense

## Core path
`Amount + description → confirm defaults → Add expense → success → updated group`

## Default experience
The common case requires only amount and description.

Visible defaults:
- payer: You
- participants: Everyone
- method: Equal
- date: Today
- receipt: None

All defaults remain editable.

## Detail paths
- choose another payer
- include or exclude participants
- Equal, Exact, or Shares
- date
- receipt

## Recovery states
- missing amount or description
- invalid custom total
- possible duplicate
- offline/local save
- failed save with details preserved
- settlement lock

## Approved decisions
- Fast by default; precise when needed.
- Amount and description lead.
- Configuration appears as compact, editable summaries.
- The common path has no separate review page.
- A possible duplicate warns without trapping the user.
- Important failures preserve entered details.
- Success confirms amount, payer, and personal share.
- Global tabs are absent in this focused transaction flow.
- Journey 06 owns later review and correction.

## QA
- rendered at 393 × 852 and 430 × 890
- 27 explicit states
- 98/98 internal links resolve
- zero horizontal overflow
- zero header/content/footer overlap
- no placeholder icons
- Golden visual comparison passed

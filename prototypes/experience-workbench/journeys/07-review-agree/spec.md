# Journey 07 — Review / Agree / Raise an Issue

**Priority:** P0  
**Status:** V1.1 Golden / Design Approved

## User goal

Decide whether another person's expense is accurate, or raise a clear issue without social friction.

## Core language

- `Does this look right?`
- `Looks right`
- `Something's off`
- `Not now`

## Core reviewer path

`Group attention → Review queue → Expense → Looks right → Next expense / caught up`

## Issue path

`Something's off → Choose reason → Optional note → Send → Waiting on owner`

## Owner-resolution loop

The owner may edit through Journey 06 or reply. The reviewer sees the update or reply and can choose `Looks right` or `Still off`.

## Boundary

Journey 06 owns detail, edit and delete. Journey 07 owns review, questions, issues and resolution status.

## Settlement dependency clarification

An unresolved issue blocks only payment items whose amount depends on the disputed expense. Unrelated balances remain actionable. This is the smallest correction needed for the Journey 11 payment-scope contract; the approved Journey 07 interaction design is unchanged.

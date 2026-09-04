# Journey 07 — Review / Agree / Raise an Issue

**Priority:** P0  
**Status:** Golden Journey #7 / Design Approved  
**Version:** V1.1  
**Prototype:** `v1.1-golden-candidate.html.xz`

## User goal

Decide whether another person's expense is accurate, or raise a clear issue without social friction.

## Approved human language

Primary question:

`Does this look right?`

Primary choices:

- `Looks right`
- `Something's off`
- `Not now`

Do not expose `attestation` or `dispute` terminology in the user experience.

## Approved reviewer path

`Group attention → Review queue → Expense → Looks right → Next expense / caught up`

## Approved issue path

`Something's off → Choose reason → Optional note → Send → Waiting on owner`

Reasons:

- My share
- I wasn't part of this
- Expense details
- Possible duplicate
- Ask a question

## Approved owner-resolution loop

The owner may edit the expense through Journey 06 or reply with context.

If edited:

`Owner edits → Reviews reset → Reviewer sees changes → Reviews again → Resolved`

If replied:

`Owner replies → Reviewer reads reply → Looks right / Still off`

## Boundaries

Journey 06 owns expense detail, edit, delete, receipt, history, permissions, and recovery.

Journey 07 owns review, agreement, questions, issues, and resolution status.

Checkpoint confirmation that all expenses are entered remains a separate pre-settlement concern.

## Approved decisions

- Review one expense at a time.
- A queue helps with multiple expenses but does not blindly approve all.
- Total and personal share are visible before the decision.
- Users do not review their own expenses; owners see review status.
- Changed expenses invalidate the prior review and explain what changed.
- Issues use structured reasons plus an optional note.
- Issues remain visible until resolved or withdrawn.
- An unresolved issue blocks settlement for the group in the approved prototype.
- Offline reviews may save locally and sync later in the prototype.
- Removed expenses leave no dead review task.
- Alternate issue paths preserve the correct person, expense, and reason.

## QA record

- 61 explicit states.
- 176/176 internal links resolve.
- Rendered at 393 × 852 and 430 × 890.
- No horizontal overflow.
- No header/content/footer overlap.
- No duplicate IDs.
- No placeholder icons.
- Icon and avatar alignment passed.
- Reason, person, and expense variants passed.

## Approval record

Approved by the product owner on September 4, 2026.

This is now product truth and should not be silently redesigned. If Journey 11 exposes a genuine conflict with the settlement-blocking rule, mark this decision **Needs revisit** and version it deliberately.

## Next

Continue to Journey 10 — Overall Position.

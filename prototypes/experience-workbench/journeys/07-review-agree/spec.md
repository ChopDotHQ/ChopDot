# Journey 07 — Review / Agree / Raise an Issue

**Priority:** P0  
**Status:** V1.1 Golden Candidate / Review pending  
**Prototype:** `v1.1-golden-candidate.html.xz`

## User goal

Decide whether another person's expense is accurate, or raise a clear issue without social friction.

## Human language

Primary question:

`Does this look right?`

Primary choices:

- `Looks right`
- `Something's off`
- `Not now`

Do not expose `attestation` or `dispute` terminology in the user experience.

## Core reviewer path

`Group attention → Review queue → Expense → Looks right → Next expense / caught up`

## Issue path

`Something's off → Choose reason → Optional note → Send → Waiting on owner`

Reasons:

- My share
- I wasn't part of this
- Expense details
- Possible duplicate
- Ask a question

## Owner-resolution loop

The owner may edit the expense through Journey 06 or reply with context.

If edited:

`Owner edits → Reviews reset → Reviewer sees changes → Reviews again → Resolved`

If replied:

`Owner replies → Reviewer reads reply → Looks right / Still off`

## Boundaries

Journey 06 owns expense detail, edit, delete, receipt, history, permissions, and recovery.

Journey 07 owns review, agreement, questions, issues, and resolution status.

Checkpoint confirmation that all expenses are entered is a separate pre-settlement concern.

## Candidate decisions

- Review one expense at a time.
- A queue helps with multiple expenses but does not blindly approve all.
- Total and personal share are visible before the decision.
- Users do not review their own expenses; owners see review status.
- Changed expenses invalidate the prior review and explain what changed.
- Issues use structured reasons plus an optional note.
- Issues remain visible until resolved or withdrawn.
- Open issues block settlement in this candidate.
- Offline reviews may save locally and sync later in the prototype.
- Removed expenses leave no dead review task.
- Alternate issue paths preserve the correct person, expense, and reason.

## Review questions

- Is `Does this look right?` the right central question?
- Are `Looks right` and `Something's off` natural?
- Does the queue help without feeling bureaucratic?
- Are the five reasons enough?
- Is the owner response loop fair and understandable?
- Should an open issue block settlement?
- Does the flow reduce social friction?

## Approval rule

If approved:

1. freeze as Golden Journey #7;
2. promote Review Queue, Review Prompt, Issue Reason, Review Status, and Resolution patterns;
3. continue to Journey 10 — Overall Position.

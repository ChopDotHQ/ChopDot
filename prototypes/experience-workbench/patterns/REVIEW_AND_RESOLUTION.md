# Review & Resolution Patterns

Approved from Journey 07 V1.1.

## Review Prompt

Use one human question:

`Does this look right?`

Actions:

- `Looks right`
- `Something's off`
- `Not now`

Show the expense total and the user's personal share before asking for a decision.

## Review Queue

Use when multiple expenses need attention.

Required:

- expense name;
- payer;
- total;
- user's share;
- explicit review destination.

The queue accelerates navigation. It must not silently approve multiple expenses.

## Issue Reason

Offer structured reasons before asking for free text:

- My share
- I wasn't part of this
- Expense details
- Possible duplicate
- Ask a question

A note is optional. Preserve the selected reason, person, and expense through every subsequent state.

## Review Status

Useful states:

- Needs your review
- Looks right
- Waiting on owner
- Changed since review
- Resolved

Changed expense data invalidates the previous review and explains what changed.

## Resolution Loop

The expense owner can:

- edit the expense through Journey 06;
- reply with context.

The reviewer then sees the update or reply and can choose `Looks right` or `Still off`.

Every issue must have a visible status, a responsible person, and a path to closure.

## Settlement boundary

An unresolved issue blocks settlement for the affected group in the approved prototype. Retest this rule deliberately during Journey 11; do not silently weaken it.

## Language rule

Do not expose `attestation`, `dispute`, transaction hashes, or blockchain terminology in the everyday review flow.

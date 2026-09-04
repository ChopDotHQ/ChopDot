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

Use when multiple expenses need attention. The queue accelerates navigation; it must not silently approve multiple expenses.

## Issue Reason

Offer structured reasons before asking for optional free text. Preserve the selected reason, person and expense through every subsequent state.

## Resolution Loop

The owner may edit through Journey 06 or reply with context. The reviewer sees the update or reply and can choose `Looks right` or `Still off`.

## Settlement boundary — clarified by Journey 11

An unresolved issue blocks only payment items whose amount depends on the disputed expense. Unrelated people, groups, currencies and independent payment items remain actionable. This narrows the earlier group-wide wording without redesigning Journey 07.

## Language rule

Do not expose `attestation`, `dispute`, transaction hashes, or blockchain terminology in the everyday review flow.

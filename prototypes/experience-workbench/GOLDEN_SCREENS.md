# ChopDot Golden Screens & Journeys

## Golden set

1. Home / Orientation — V1.4
2. Create a Group — V2
3. Invite / Join — V1
4. Group Home — V1
5. Add an Expense — V1
6. Review / Correct Expense — V1.1
7. Review / Agree / Raise an Issue — V1.1

## Golden Journey #7 — Review / Agree / Raise an Issue

**Version:** V1.1  
**Status:** Design Approved

Core reviewer path:

`Group attention → Review queue → Expense → Looks right → Next / caught up`

Issue path:

`Something's off → Reason → Optional note → Send → Waiting`

Resolution loop:

`Owner edits or replies → Reviewer sees update/reply → Looks right / Still off`

Approved decisions:

- human language instead of `attestation` or `dispute`;
- one expense reviewed at a time;
- queue without blind approval;
- personal share visible before the decision;
- owners see review status but do not review their own expenses;
- changed expenses require review again;
- structured reasons and optional notes;
- unresolved issues remain visible and block settlement for the group;
- issue loops close through edit or reply.

QA:

- 61 states;
- 176/176 links;
- both target phone sizes;
- no overflow;
- no frame overlap;
- no duplicate IDs;
- no placeholder icons;
- aligned iconography;
- semantic variants passed.

Approved September 4, 2026.

## Current design system

The Golden set now establishes:

- locked mobile frame;
- fixed header and contextual footer actions;
- Lucide-style semantic icons;
- group-first shared-money hierarchy;
- compact, human copy;
- visible personal financial impact;
- focused create, invite, expense, correction, and review flows;
- explicit recovery and resolution states.

## Next Golden candidate

Journey 10 — Overall Position.

It must answer what the user owes, what they are owed, who is involved, which groups created the balances, and what needs action without becoming a banking dashboard.

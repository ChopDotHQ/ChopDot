# ChopDot Golden Screens & Journeys

Golden references are approved prototype truth. They stay frozen unless a later journey exposes a genuine contradiction.

## Golden #1 — Home / Orientation
**V1.4 · Design Approved**

Establishes the attention-first Home, visible overall position and wallet context, group cards as primary objects, the locked frame, and the Golden visual language.

## Golden #2 — Create a Group
**V2 · Design Approved**

Core path:
`Start group → Currency → Create → Invite / Add expense`

## Golden #3 — Invite / Join
**V1 · Design Approved**

Establishes human-first invitations, clear pre-join context, privacy before joining, and explicit Join / Not now exits.

## Golden #4 — Group Home
**V1 · Design Approved**

Core hierarchy:
`Group identity → Attention → Your position → Recent activity → People / Settle`

Establishes the overview-first group experience and the explicit active, waiting, empty, settling, square, and offline states.

## Golden #5 — Add an Expense
**V1 · Design Approved**

Source:
`journeys/05-add-expense/v1-golden.html`

Core path:
`Amount + description → confirm defaults → Add expense → success → updated group`

Establishes:
- fast default path with precision on demand
- amount and description as the leading inputs
- visible editable defaults for payer, participants, split, date, and receipt
- Equal, Exact, and Shares
- focused flow without global tabs
- explicit success showing the personal result
- duplicate, offline, failed-save, invalid-split, and settlement-lock recovery

Promoted patterns:
- Amount Entry
- Payer Selector
- Participants and Split
- Expense Success
- Expense Recovery

## Golden Candidate #6 — Review / Correct Expense
**V1 · Review pending**

Specification:
`journeys/06-review-correct-expense/spec.md`

Visual QA:
`journeys/06-review-correct-expense/visual-qa/README.md`

Core owner path:
`Expense detail → Edit → Save changes → Updated expense`

Other-member path:
`Expense detail → Review expense → Journey 07`

Candidate decisions:
- detail is readable before it is editable
- personal share remains visible near the top
- Edit reuses Golden Add Expense controls with prefilled values
- Edit/Delete appear only for an authorized user
- changes and review resets are explicit
- delete is a separate confirmation state
- history and receipt remain available without dominating the screen
- Journey 06 owns detail, edit, delete, and history
- Journey 07 owns confirm, question, and dispute

QA:
- 31 explicit states
- 128/128 internal links
- 44 representative renders
- 393 × 852 and 430 × 890
- zero horizontal overflow
- zero frame overlap
- no placeholder icons
- Golden comparison passed

## Next

If Journey 06 is approved:
1. freeze it as Golden #6;
2. promote Expense Detail, Change Status, Expense History, and Delete Confirmation patterns;
3. begin Journey 07 — Confirm / Agree / Dispute.

## Golden rule

New journeys may add necessary content and patterns, but may not casually redefine the frame, spacing, typography, card language, icon family, financial color semantics, or established interaction patterns.

# ChopDot Golden Screens & Patterns

Golden Screens and Golden Journeys are the visual/product references used to prevent design drift.

## Golden Screen #1 — Home / Orientation

**Status:** Design Approved  
**Version:** V1.4

Source:
`journeys/02-home-orientation/v1.4-inherited-icons.html`

### Establishes
- attention-first product hierarchy
- visible overall position + wallet context
- group cards as primary objects
- locked app frame
- Golden type/spacing/card/color/icon language
- short, scannable copy

## Golden Journey #2 — Create a Group

**Status:** Design Approved  
**Version:** V2

Source:
`journeys/03-create-group/v2-golden-candidate.html`

### Core path
`Start a group → Currency → Create group → Group created → Invite people / Add expense`

### Establishes
- group name as the only required conceptual input
- visible, preselected currency
- people invited after creation
- wallet addresses excluded from creation
- savings as a separate journey
- explicit success state
- fixed header + fixed action footer

## Golden Journey #3 — Invite / Join

**Status:** Design Approved  
**Version:** V1

Source:
`journeys/04-invite-join/v1-golden-candidate.html`

### Establishes
- invite people as people, not wallets
- no blockchain terminology in Invite / Join
- simple share-link and direct-add paths
- pre-join context limited to group-level information
- expense details/balances remain private until join
- explicit `Join group` / `Not now` exits
- pending invites remain visible
- successful join hands off to Group Home

### QA
- rendered at 393 × 852 and 430 × 890
- 14 explicit states
- 37/37 internal links resolve
- zero horizontal overflow
- zero header/content/footer overlap
- no placeholder glyph icons
- expired / already joined / offline states included

## Golden Candidate #4 — Group Home

**Status:** Review pending  
**Version:** V1

Source:
`journeys/08-group-home/v1-golden-candidate.html`

Visual QA:
`journeys/08-group-home/visual-qa/README.md`

### Core hierarchy
`Group identity → Attention → Your position → Recent activity → People / Settle`

### Candidate decisions
- Group Home is overview-first, not tab-first.
- Attention is first when the group needs the user.
- User position outranks dense accounting metrics.
- Total group spend stays visible as context, not the hero.
- Recent expenses answer “what happened?” without becoming the full ledger.
- People and Settle are compact secondary handoffs.
- Bottom navigation remains global ChopDot navigation.
- Add Expense stays available from the inherited center action except while settlement locks expense changes.

### Designed states
- active / needs review
- nothing needs you
- new / empty group
- settlement in progress
- everyone square
- offline / saved data

### QA
- rendered at 393 × 852 and 430 × 890
- 96 internal hash links resolve
- zero horizontal overflow
- zero header/content/footer overlap
- no placeholder glyph icons
- semantic exit pass completed for Back, global tabs, and `See all`

If approved, promote Journey 08 to **Golden Journey #4 / Design Approved** and begin Journey 05 — Add Expense.

## Golden rule
A new journey may add necessary content and patterns, but should not casually redefine frame, spacing rhythm, icon language, typography hierarchy, financial color semantics, card language, or navigation behavior.

If a later journey reveals a genuine weakness, mark the affected Golden reference **Needs revisit** and create a new version deliberately.

## Current Golden set
- Home / Orientation — Golden V1.4
- Create Group — Golden V2
- Invite / Join — Golden V1

## Current candidate
- Group Home — V1 Golden Candidate

## Next after approval
- Add Expense — Journey 05

## Golden Patterns
Started:
- Attention Item
- Group Card
- Completion State
- Iconography
- Locked App Frame
- Currency Picker
- Error / Recovery State
- Invite Card
- Member Row
- Invite Status
- Group Summary
- Group Position
- Recent Expense Row
- Settlement Progress State

Likely next:
- Add Expense Amount Entry
- Split Selector
- Payer Selector
- Expense Review State
- Wallet Strip
- Overall Position
- Bottom Sheet

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

## Golden Candidate #3 — Invite / Join

**Status:** Review pending  
**Version:** V1

Source:
`journeys/04-invite-join/v1-golden-candidate.html`

Visual QA:
`journeys/04-invite-join/visual-qa/README.md`

### Inviter path
`Invite people → Share link / Add someone → Pending/sent → Open group`

### Joiner path
`Open invite → Understand group + inviter → Join / Not now → Joined → Open group`

### Candidate decisions
- invite people as people, not wallets
- no blockchain terminology
- share link and direct-add are both simple entry paths
- pre-join context is limited to group name, inviter, people count, and currency
- expense details/balances remain private until join
- pending invites remain visible to the inviter
- join success hands off to Journey 08 Group Home

### QA
- rendered at 393 × 852 and 430 × 890
- 14 explicit states
- 37/37 internal links resolve
- zero horizontal overflow
- zero header/content/footer overlap
- no placeholder glyph icons
- expired / already joined / offline states included

If approved, promote Journey 04 to **Golden Journey #3 / Design Approved** and begin Journey 08 — Group Home.

## Golden rule
A new journey may add necessary content and patterns, but should not casually redefine frame, spacing rhythm, icon language, typography hierarchy, financial color semantics, card language, or navigation behavior.

If a later journey reveals a genuine weakness, mark the affected Golden reference **Needs revisit** and create a new version deliberately.

## Current Golden set
- Home / Orientation — Golden V1.4
- Create Group — Golden V2

## Current candidate
- Invite / Join — V1 Golden Candidate

## Next after approval
- Group Home — Journey 08

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

Likely next:
- Group Summary
- Expense Row
- Group Attention State
- Wallet Strip
- Overall Position
- Empty State
- Bottom Navigation
- Bottom Sheet

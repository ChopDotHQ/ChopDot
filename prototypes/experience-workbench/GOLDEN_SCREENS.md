# ChopDot Golden Screens & Patterns

Golden Screens are the visual/product references used to prevent design drift.

## Golden Screen #1 — Home / Orientation

**Status:** Design Approved  
**Version:** V1.4

Current source:
`journeys/02-home-orientation/v1.4-inherited-icons.html`

Visual QA reference viewports:
- 393 × 852
- 430 × 890

### What Home establishes

**Product hierarchy**
- unresolved human/shared-money work outranks infrastructure
- overall financial position remains visible
- wallet remains visible as compact context
- groups are the primary product objects
- group cards communicate state and next action

**Frame**
- viewport-locked app shell
- header remains visible
- bottom navigation remains visible
- only center content scrolls
- no controls unpredictably cover content
- safe-area aware

**Visual character**
- generous breathing room
- confident type scale
- restrained cards
- black/white primary language
- Polkadot pink used strategically
- green only for positive financial meaning
- negative obligations use normal ink/minus, not alarm-red

**Copy**
- short
- scannable
- action-led
- common actions should not need explanatory sentences

**Icons**
- Lucide family / production semantic mappings
- currentColor line icons
- no Unicode/emoji placeholder icons

## Golden Candidate #2 — Create a Group

**Status:** Review pending  
**Version:** V2

Candidate source:
`journeys/03-create-group/v2-golden-candidate.html`

Visual QA:
`journeys/03-create-group/visual-qa/README.md`

### What V2 inherits
- Golden Home viewport frame
- fixed header + fixed action footer
- center-only scrolling
- same background/surface/border/shadow/radius family
- same Lucide-style icon language
- short, direct copy
- no placeholder glyphs
- clear journey exits rather than feature sprawl

### Core path
`Start a group → Currency → Create group → Invite people / Add expense`

### Candidate product decisions
- group name is the only required conceptual input
- currency remains visible and preselected
- inviting people happens after creation
- wallet addresses do not belong in creation
- savings remains a separate journey
- success is an explicit state, not toast-only feedback

### Open before implementation
- reconcile CHF support with current production currency options
- validate offline creation semantics against the data layer

If the user approves V2, promote it to **Golden Journey #2 / Design Approved** before starting Journey 04.

## Golden Screen rule

A new journey may add necessary content and patterns, but should not casually redefine frame, spacing rhythm, icon language, typography hierarchy, financial color semantics, card language, or navigation behavior.

If a later journey reveals a real weakness, mark the affected decision **Needs revisit** and create a new Golden version deliberately.

## Planned Golden Screens
- Home / Orientation — Golden V1.4
- Create Group — V2 Golden Candidate
- Group Home
- Add Expense
- Expense Detail / Review
- Confirm / Resolve
- Settle
- Settlement Complete
- People
- Activity
- You

## Golden Patterns
Started:
- Attention Item
- Group Card
- Completion State
- Iconography
- Locked App Frame
- Currency Picker
- Error / Recovery State

Likely next:
- Wallet Strip
- Overall Position
- Empty State
- Member Row
- Expense Row
- Bottom Navigation
- Bottom Sheet

# ChopDot Golden Screens & Patterns

Golden Screens and Golden Journeys are the visual/product references used to prevent design drift.

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
- safe-area aware

**Visual character**
- generous breathing room
- confident type scale
- restrained cards
- black/white primary language
- Polkadot pink used strategically
- green only for positive financial meaning

**Copy**
- short
- scannable
- action-led

**Icons**
- Lucide family / production semantic mappings
- currentColor line icons
- no Unicode/emoji placeholder icons

## Golden Journey #2 — Create a Group

**Status:** Design Approved  
**Version:** V2

Current source:
`journeys/03-create-group/v2-golden-candidate.html`

Visual QA:
`journeys/03-create-group/visual-qa/README.md`

### Core path
`Start a group → Currency → Create group → Group created → Invite people / Add expense`

### What Journey 03 establishes
- group name is the only required conceptual input
- currency stays visible and preselected
- invite people after the group exists
- wallet addresses stay out of creation
- savings stays a separate journey
- success is explicit, not toast-only
- fixed header + fixed action footer
- center-only scrolling
- short, direct copy

## Golden rule
A new journey may add necessary content and patterns, but should not casually redefine frame, spacing rhythm, icon language, typography hierarchy, financial color semantics, card language, or navigation behavior.

If a later journey reveals a real weakness, mark the affected Golden reference **Needs revisit** and create a new version deliberately.

## Current Golden set
- Home / Orientation — Golden V1.4
- Create Group — Golden V2

## Next Golden candidate
- Invite / Join — Journey 04

## Planned Golden references
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
- Invite Card
- Member Row
- Invite Status
- Wallet Strip
- Overall Position
- Empty State
- Expense Row
- Bottom Navigation
- Bottom Sheet

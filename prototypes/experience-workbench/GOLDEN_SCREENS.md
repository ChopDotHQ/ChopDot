# ChopDot Golden Screens & Patterns

Golden Screens are the visual/product references used to prevent design drift.

## Golden Screen #1 — Home / Orientation

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
- no unpredictable controls covering content
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

## Golden Screen rule

A new journey may add new content and necessary patterns, but should not casually redefine frame, spacing rhythm, icon language, typography hierarchy, financial color semantics, card language, or navigation behavior.

If a later journey reveals a real weakness, mark the affected decision **Needs revisit** and create a new Golden version deliberately.

## Planned Golden Screens
- Home / Orientation — V1.4 current
- Create Group — next candidate
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

Likely next:
- Wallet Strip
- Overall Position
- Empty State
- Error / Recovery State
- Member Row
- Expense Row
- Bottom Navigation
- Bottom Sheet
- Currency Picker

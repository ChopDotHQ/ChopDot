# ChopDot Design Inheritance Contract

Every review-ready prototype inherits this system. Do not recreate these foundations screen-by-screen.

## Inheritance order

`Frame → tokens → typography → components → iconography → journey content`

## Frame
- App root locks to the visible mobile viewport (`100dvh`, with fallback).
- Header is a non-scrolling row.
- Footer/navigation is a non-scrolling row.
- Only the center content region scrolls.
- Respect mobile safe-area insets.
- Never shrink cards/type just to fit everything above the fold.
- Avoid floating controls that cover content.
- Flex/grid children that contain variable content must use safe shrinking (`min-width: 0`).

## Core tokens
- Background: `#F7F7F8`
- Surface: `#FFFFFF`
- Secondary surface: `#F0F0F2`
- Ink: `#111113`
- Secondary text: approximately `#65656C`
- Border: approximately `#E5E5E8`
- Polkadot pink: `#E6007A`
- Positive financial meaning: green around `#19A96F`
- Card radius: about 18px

Polkadot pink is strategic, not generic decoration. Negative obligations use normal ink/minus rather than alarm-red.

## Typography / copy
- Keep Home copy short, scannable, and action-led.
- Prefer labels and verbs over explanatory sentences.
- Common actions should not require instructional prose.
- Use hierarchy, amount, state, and icon before adding text.
- Variable text clamps/truncates safely.

## Golden patterns

### Attention Item
Required: plain action title, group/context, amount/status where useful, clear destination. It must disappear or update after resolution. Do not use attention items for passive information or blockchain jargon.

### Group Card
Required: group name, lightweight context, user's position, current state, and one meaningful next action when attention is needed. Do not force the user to open a group just to discover whether action is needed.

### Completion State
Required: clear confirmation, updated result/state, one or two logical next actions, and a safe route back to Home/group. Avoid toast-only completion for important actions.

## Iconography
Production ChopDot uses `lucide-react`; prototypes inherit the same line-icon family.

Rules:
- 24×24 viewBox
- stroke width 2 by default
- round linecap/linejoin
- `currentColor`
- navigation 20–24px
- action icons 18–24px
- contextual circle icons 16–18px
- no Unicode, emoji, or font-symbol placeholder icons in review-ready prototypes

Current production navigation mapping:
- Pots → `LayoutGrid`
- People → `Users`
- Activity → `Home` (inherit for now; semantic review remains open)
- You → `User`
- Center expense action → `Receipt`

Common mappings:
- Notifications → `Bell`
- Expense review → `Receipt`
- Settle → `ArrowLeftRight`
- Wallet → `Wallet`
- Drill-in → `ChevronRight`
- Add/create → `Plus`

## Rule for changing the system
A journey may introduce a new pattern, but it may not silently redefine a Golden pattern. If a later journey exposes a weakness, mark the affected decision **Needs revisit**, update the shared pattern deliberately, and identify every journey affected.

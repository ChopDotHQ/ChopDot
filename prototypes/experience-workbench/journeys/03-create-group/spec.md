# Journey 03 — Create a Group

**Priority:** P0  
**Status:** Design Approved / Golden Journey #2  
**Prototype:** V2  

## User goal
Create a shared expense space with the minimum necessary decisions.

## Entry
Home → **Start a group**

## Success exit
New group state with two obvious next actions:
- invite people → Journey 04
- add first expense → Journey 05

## Golden source
`v2-golden-candidate.html`

The filename remains historical; V2 is now the approved Golden reference.

## Approved experience
- Start with the group name.
- Currency is visible and preselected.
- People are invited after creation.
- Wallet addresses do not belong in creation.
- Savings is a separate journey.
- Success is an explicit state, not toast-only feedback.
- Copy stays short and action-led.

## Core path
`Start a group → Currency → Create group → Group created → Invite people / Add expense`

## Inherited system
- locked viewport frame
- fixed header
- scrollable center content
- fixed action footer
- Golden background/surface/border/shadow/radius language
- Lucide-style SVG icon language
- no Unicode/emoji placeholders
- no floating controls over content

## Golden copy
Entry:
- `Start a group.`
- `Name it. Pick a currency.`
- `Create group`

Success:
- `Geneva Weekend is ready.`
- `Invite people or add an expense.`

## Edge states included in the prototype
- create failure
- offline/local-save proposal
- alternate currencies
- savings handoff kept separate

## QA
Visual QA:
`visual-qa/README.md`

Reviewed at:
- 393 × 852
- 430 × 890

Checks passed:
- zero horizontal overflow
- no header/content/footer overlap
- all internal links resolve
- core click path completes
- alternate currency states remain currency-correct
- no placeholder glyph icons

## Prototype truth
Journey 03 is now frozen as **Golden Journey #2 / Design Approved**.

Later journeys may expose a genuine weakness. If that happens, mark Journey 03 **Needs revisit** and create a deliberate new Golden version; do not casually rewrite V2.

## Next
Journey 04 — Invite / Join inherits from:
1. Home V1.4
2. Create Group V2

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

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

**Coverage:** Selected source-supported decisions, backfilled 2026-09-06 from commit `f403b02d05a50d13f556b3edfb949f92b24488a9`. Not a complete conversation or alternatives audit. Earlier candidate labels in the spec body describe its drafting stage; the registry/approval sources below establish the recorded status. Revisit triggers below are maintenance notes added now, not claims about past discussion or permission to redesign.

### J03-D01 — Create the group before inviting people

**Decision:** Lead with a group name and visible preselected currency. Invite people after creation. Keep wallets and savings out of group creation. Show explicit creation success with Invite or Add expense exits.

**Why:** The recorded goal is to create a shared expense space with the minimum necessary decisions.

**Alternatives:** Wallet addresses in creation and a toast-only success are explicitly excluded. Savings remains a separate journey. No exhaustive earlier option comparison is recorded.

**Tradeoffs:** Invitation is a later action, not a prerequisite. Offline/local-save is recorded as a prototype proposal rather than verified shared persistence.

**Revisit when:** A downstream journey exposes a genuine weakness; the existing spec requires a deliberate new Golden version rather than rewriting V2.

**Approval / version:** v2 — Golden #2 / design-approved, as recorded at the source commit. This documentation update does not create or expand approval. TYPO-01 shared typography/readability remains deferred.

**Sources:** [Spec: approved experience](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/03-create-group/spec.md#approved-experience); [Spec: edge states included in the prototype](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/03-create-group/spec.md#edge-states-included-in-the-prototype); [Spec: prototype truth](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/03-create-group/spec.md#prototype-truth); [version and approval registry](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/journeys.json).
<!-- JOURNEY_DECISION_HISTORY:END -->

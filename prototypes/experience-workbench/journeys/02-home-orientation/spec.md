# Journey 02 — Home / Orientation

**Priority:** P0  
**Status:** Design Approved / Golden Screen #1  
**Prototype:** `v1.4-inherited-icons.html`  
**Production:** not implemented/verified against Golden yet

## User goal
Immediately understand what needs attention, where groups stand, overall financial position, and the next useful action.

## Entry
- Successful app entry
- Pots/Home tab root
- Return from a completed task

## Exits
- Attention task → relevant journey
- Group card → Group Home
- Start group → Journey 03
- Add expense → Journey 05
- Settlement → Journey 11
- Bottom tabs → People / Activity / You

## Golden hierarchy
1. shared-money state/headline
2. attention / unresolved tasks
3. overall position
4. compact wallet context
5. groups with state + next action
6. context-sensitive add action
7. bottom navigation

## Approved rules
- Home is attention-first and group-first, not wallet-first or finance-dashboard-first.
- Wallet remains visible as compact secondary context.
- Every group card exposes human-readable state and a meaningful next action.
- Home copy is short, scannable, and action-led.
- Review-ready prototypes inherit Lucide iconography; Unicode/emoji placeholders are prohibited.
- Mobile app frame is viewport-locked: header/footer stay visible, only center content scrolls.
- Preserve breathing room; never shrink the product just to fit more above the fold.

## States reviewed
- standard / attention
- caught-up / nothing needs you
- first-use / no groups
- offline / stale data

## Open gaps
- Mixed-currency overall position needs an explicit product rule before implementation.
- Loading / initial sync / refreshing presentation still needs approval.
- Activity tab currently inherits production's `Home` icon; semantics should be deliberately reviewed later.

## Visual QA
Mandatory viewports:
- 393 × 852
- 430 × 890

The visual QA pass caught a real flex-shrink regression that collapsed the attention card and caused overlap. See `visual-qa/README.md`.

## Completion status
**Design Approved. Not Implemented. Not Production Verified.**

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

**Coverage:** Selected source-supported decisions, backfilled 2026-09-06 from commit `f403b02d05a50d13f556b3edfb949f92b24488a9`. Not a complete conversation or alternatives audit. Earlier candidate labels in the spec body describe its drafting stage; the registry/approval sources below establish the recorded status. Revisit triggers below are maintenance notes added now, not claims about past discussion or permission to redesign.

### J02-D01 — Attention first, wallet secondary

**Decision:** Home is attention-first and group-first. Wallet context remains compact and visible. The header/footer stay visible while only the center scrolls; use inherited icons and short action-led copy.

**Why:** The user goal is immediate orientation: what needs attention, where groups stand and the next useful action.

**Alternatives:** Wallet-first and finance-dashboard-first layouts are explicitly ruled out. Shrinking content to fit more above the fold and placeholder glyph icons are also ruled out.

**Tradeoffs:** The source lists mixed-currency, loading/sync and Activity-icon questions as open at that time. Journey 10 later specifies currency behavior; that does not establish that the Home HTML was updated or integrated.

**Revisit when:** Orientation tests hide an important task or wallet context; a demonstrated frame or icon regression occurs. Shared typography remains deferred under TYPO-01.

**Approval / version:** v1.4 — Golden #1 / design-approved, as recorded at the source commit. This documentation update does not create or expand approval. TYPO-01 shared typography/readability remains deferred.

**Sources:** [Spec: golden hierarchy](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/02-home-orientation/spec.md#golden-hierarchy); [Spec: approved rules](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/02-home-orientation/spec.md#approved-rules); [Spec: open gaps](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/02-home-orientation/spec.md#open-gaps); [version and approval registry](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/journeys.json). [Later scope contract](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/10-overall-position/spec.md#currency-rule).
<!-- JOURNEY_DECISION_HISTORY:END -->

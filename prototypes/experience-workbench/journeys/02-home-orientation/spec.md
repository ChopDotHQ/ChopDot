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

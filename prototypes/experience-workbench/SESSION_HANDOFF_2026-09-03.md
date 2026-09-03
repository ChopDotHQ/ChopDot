# Session Handoff — ChopDot UX Rebuild — 2026-09-03

This document preserves the originating design thread so future sessions can resume without relying on ChatGPT conversation memory.

## Why this work started

The ChopDot codebase had accumulated significant capability and technical hardening, but the product experience and visual identity had drifted. The goal became to rebuild the experience safely in a risk-free prototype layer, journey by journey, before changing production.

The central product principle is:

> Complex shared-money coordination should feel simple to the user. Infrastructure should remain quiet until it helps make a decision.

## Original method

The latest production repo was inspected first rather than designing from screenshots or memory. Existing navigation, screens, design guidelines, current app shell, wallet banner, bottom navigation, settlement flows, and sandbox architecture were used as implementation truth.

A standalone HTML prototype was then used as a safe design playground with no wallet, auth, database, chain, IPFS, or GitHub writes.

## Journey strategy

28 journeys are registered in the workbench state snapshot.

The core loop is:

`Enter → Create/Join Group → Understand Group → Add Expense → Confirm/Resolve → Understand Position → Settle → Complete`

The Experience Workbench exists so no journey, feature, edge state, or decision silently disappears.

## Home evolution and lessons

### Home V1 — breakthrough

The first redesigned Home was loved because it changed the mental model from a finance dashboard to calm shared-money coordination.

Key ideas:
- “What needs you” first
- groups as primary objects
- group cards show human-readable state and next action
- overall position visible but not the product hero
- infrastructure quiet
- one obvious action

### Create Group V1

The current production creation flow asks for many decisions up front: expense vs savings, name, currency, cash/bank behavior, members, wallet addresses, invite link, and potentially savings goals.

Prototype direction:
- create the shared expense group first
- group name is the only required conceptual decision
- currency visible and preselected
- invite people after creation
- wallet addresses do not belong in creation
- savings gets its own journey rather than complicating expense-group creation

This prototype exists but is **not yet Golden**. It must be rebuilt/retested through the inherited system.

### Mobile click-through problem

Early HTML prototypes relied on JavaScript click handlers. ChatGPT/iOS file preview did not reliably execute them. Review artifacts were changed to normal HTML-link navigation for core paths.

### Frame regression

A viewport-locked frame was introduced so header/footer/navigation remain visible and only the center content scrolls.

A mistake followed: the UI was compressed to fit too much content at once. This regressed the calm visual quality of the original Home.

Lesson:
- a fixed frame does **not** mean every card must fit simultaneously
- preserve breathing room
- allow the center content to scroll
- never shrink typography/cards merely to avoid scrolling

### Visual QA discovery

The process originally inspected CSS/structure but did not render screenshots before declaring a retest successful.

When actual screenshots were rendered, a major bug appeared: the scroll column was flex-based and its children were allowed to shrink. The attention card collapsed to almost zero height, causing content to overlap the wallet.

This led to the permanent rule:

`Build → Render → Inspect screenshot → Fix → Re-render → Approve`

Rendered visual QA is now mandatory.

### Wallet correction

Wallet context was initially removed too aggressively to avoid making ChopDot feel crypto-first.

Final direction:
- wallet remains visible on Home
- compact secondary context
- connection/address/balance are useful
- wallet does not outrank human attention/group state
- advanced wallet interactions live in the Wallet/Crypto journey

### Copy correction

The user explicitly wants short, intuitive copy.

Direction:
- prefer verbs and labels
- common actions should not need instructional prose
- state should be communicated by hierarchy, amount, label, and icon
- avoid long sentences on Home

### Icon inheritance failure

Later prototypes were inheriting layout/colors but not icons. Placeholder glyphs such as Unicode symbols were changing the feel.

Production already uses `lucide-react`, including current bottom-nav mappings.

Decision:
- prototype iconography inherits the Lucide family through the shared icon registry
- review-ready prototypes may not contain Unicode/emoji placeholder icons
- icon family/stroke/scale is part of visual QA

Current production navigation mapping inspected from `BottomTabBar.tsx`:
- Pots → `LayoutGrid`
- People → `Users`
- Activity → `Home` (semantically questionable; inherited for now and should be reviewed deliberately later)
- You → `User`
- center context action defaults to `Receipt`

## Current Golden reference

Home V1.4:
`journeys/02-home-orientation/v1.4-inherited-icons.html`

Visual QA reference viewports:
- 393 × 852
- 430 × 890

The rendered-image findings and regeneration checklist are stored in `journeys/02-home-orientation/visual-qa/README.md`.

## Home hierarchy at handoff

The intended hierarchy is approximately:

1. current shared-money state/headline
2. attention / unresolved tasks
3. overall position
4. compact wallet context
5. groups with state + next action
6. context-sensitive add action
7. bottom navigation

Exact micro-order can still be tested deliberately, but avoid silently pushing wallet or crypto to the top of the product hierarchy.

## Open Home gaps

Home is visually strong but not production-verified.

Open product/state questions include:
- mixed-currency aggregate position: do not misleadingly sum CHF/EUR/USD/DOT without an explicit product rule
- loading / initial sync / refreshing presentation
- final deliberate review of navigation semantics (especially Activity icon)

## Nine quality/consistency commitments approved by the user

1. Home V1.4 becomes the first Golden Screen/reference.
2. Stop duplicating CSS/system foundations between journeys; inherit shared files.
3. Every journey follows Define → Build → Render → Inspect → State Test → Journey Test → Approve → Freeze.
4. Add automated regression checks.
5. Maintain a Golden Screen gallery.
6. Maintain reusable Golden Patterns.
7. Keep the Experience Map as the control tower.
8. Separate Design Approved, Implemented, and Production Verified statuses.
9. Before showing work, self-check against the Golden quality bar and rendered output.

## Continuity model

Two truths must remain separate:

**Product truth**
- approved prototypes
- decision log
- Golden Screens/Patterns
- journey specs

**Implementation truth**
- current production GitHub code

Production does not silently redefine intended UX. Prototype decisions do not pretend to already exist in production.

## Where to resume

Do not jump immediately into Journey 04.

Next:
1. Treat Home V1.4 as Golden Screen #1.
2. Finish refactoring shared prototype foundations so frame/tokens/components/icons are actually inherited rather than copied.
3. Rebuild/retest Journey 03 Create Group using those inherited foundations.
4. Render Create Group at 393×852 and 430×890.
5. Visually compare to Home V1.4 quality bar.
6. Test normal/back/cancel/error/empty/relevant offline states.
7. Approve and freeze it as the next Golden Journey only if it passes.
8. Then continue Journey 04 Invite/Join.

## Safety boundary

Prototype work belongs in the workbench/UX branch. Do not merge prototype HTML into production application paths or modify production journeys until an explicit implementation step is approved.

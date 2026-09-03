# ChopDot Experience Quality Workflow

Every journey follows the same pipeline.

## 1. Define
Before visual work, record the user goal, entry points, success exit, cancellation/back exits, dependencies, relevant feature coverage, and relevant edge/failure states.

## 2. Inherit
Do not recreate foundations locally. Inherit the app frame, design tokens, typography hierarchy, cards/buttons, iconography, copy rules, and approved Golden Patterns. If a shared pattern is missing, define it first.

## 3. Build small
A journey is not a mini-app. If a flow grows, split it into explicit states/screens.

## 4. Render
Mandatory before review:
- 393 × 852
- 430 × 890
- important scrolled/terminal states where relevant

Prototype review is not complete from code/CSS inspection alone.

## 5. Visual QA
Inspect actual rendered images for overlap, clipping, density, hierarchy regression, spacing rhythm, typography regression, icon inconsistency, header/footer behavior, unsafe text wrapping, color semantics, and whether it still feels like ChopDot.

The originating thread proved why this matters: a flex-shrink bug collapsed the Home attention card even though the CSS looked structurally reasonable.

## 6. State QA
Review relevant normal, empty, loading, refreshing, offline, error, permission/role, conflict, retry, and terminal-success states.

## 7. Journey QA
Check:
- Can the user enter from every expected entry?
- Do they understand where they are?
- Is the next action obvious?
- Can they cancel/back out safely?
- Does success show what changed?
- Is there a meaningful next destination?
- Any dead ends?
- Do notifications/deep links resolve somewhere valid?

## 8. Automated prototype checks
Review-ready artifacts should pass:
- no Unicode/emoji placeholder icons
- no horizontal overflow
- no content hidden behind fixed navigation
- header/footer remain in frame
- links resolve
- duplicate IDs absent
- no missing icon mapping
- no giant monolithic prototype file

## 9. Compare to Golden Screens
Before approval ask:
- Is this as good as or better than the Golden quality bar?
- Did we inherit instead of recreate?
- Did density increase without user benefit?
- Did prose replace good hierarchy?
- Did system/crypto complexity leak into the UX?

## 10. Approve and freeze
Status progression:

`Not Started → Prototype → Review → Design Approved → Implemented → Production Verified`

Approved work is frozen. Later changes create a new version and explicitly identify affected journeys/patterns.

## 11. Implement separately
Engineering receives the approved prototype version, journey spec, decisions, reusable patterns, implementation map, and edge cases. Implement one approved journey at a time; do not broadly “redesign ChopDot.”

## 12. Production verification
After implementation, render the real app at the same viewports, compare with the Golden Screen, test real exits/states, update the implementation map, and only then mark **Production Verified**.

# Journey 06 — Visual and Journey QA

## Inherited references
- Home V1.4
- Create Group V2
- Invite / Join V1
- Group Home V1
- Add Expense V1

## Rendered viewports
- 393 × 852
- 430 × 890

## Automated checks
- 31 explicit states
- 128/128 internal links resolve
- 44 representative state/viewport renders
- zero horizontal overflow
- zero header/content/footer overlap
- no Unicode or emoji placeholder icons

## Actual visual inspection
Reviewed directly:
- default expense detail
- someone else's expense
- edit form
- changed-after-review state
- update success
- delete confirmation
- no-permission state
- sync conflict
- Golden comparison contact sheet

## Comparison points
1. Same fixed header, center scroll, and fixed action footer.
2. Same bold amount and concise heading hierarchy.
3. Same background, cards, borders, shadows, and radii.
4. Same Lucide-style stroke language.
5. Pink is reserved for actionable attention; green for completed/positive states.
6. Detail is denser than Add Expense by necessity, but remains scannable.
7. Edit reuses Add Expense rather than creating a second form language.
8. Copy uses short labels and verbs.

## Defects found and fixed during rendering
- Footer action icons needed spacing from labels.
- `Open` was vague for review status and became `Status`.
- Fully reviewed status looked like a dead action and now links to History.

## Intentional boundary
Confirmation, questioning, and dispute are represented only as a handoff. Their interaction design belongs to Journey 07.

## Verdict
**Golden Candidate — ready for user review.**

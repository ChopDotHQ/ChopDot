# Journey 05 — Visual and Journey QA

## Rendered viewports
- 393 × 852
- 430 × 890

## Automated checks
- 27 explicit states
- 98/98 internal links resolve
- zero horizontal overflow
- zero header/content/footer overlap
- no Unicode or emoji placeholder icons

## Golden comparison
Compared with Home V1.4 and Group Home V1.

Passed:
- background and surface temperature
- card radius, border, and shadow language
- bold, compact type hierarchy
- restrained Polkadot pink
- Lucide-style icon geometry
- fixed focused-flow frame
- quiet default path
- explicit personal result on success

## Defects found and fixed during rendering
1. Participant initials escaped their avatar circles.
2. Split-method chevron inherited the wrong scale.
3. Payer screen repeated the same question.
4. Payer order was inconsistent.
5. Success copy was vague.

## Intentional deviation
Global tabs are absent inside Add Expense. This is a focused transaction flow with Back/Cancel and a fixed Save action.

## Verdict
**Design Approved / Golden Journey #5.**

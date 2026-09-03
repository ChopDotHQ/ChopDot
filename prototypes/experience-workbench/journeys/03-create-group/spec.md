# Journey 03 — Create a Group

**Priority:** P0  
**Status:** Prototype V1 / Review pending  
**Production:** Existing screen; needs UX simplification

## User goal
Create a shared expense space with the minimum necessary decisions.

## Entry
Home → **Start a group**

## Success exit
New group home, with obvious next actions:
- invite people
- add first expense
- return Home

## Current production complexity
The production Create Pot screen currently asks for type, name, currency, cash/bank behavior, members, optional wallet addresses, invite handling, and savings-specific goal information.

## Prototype direction
- Core expense-group creation should feel almost instant.
- Group name is the only required conceptual decision.
- Currency is visible and preselected, not hidden.
- People can be invited after the group exists.
- Wallet addresses are not part of creation.
- Savings is a separate journey and should not complicate shared-expense creation.
- Success should land in an understandable new-group state, not rely on a toast.

## First prototype
The initial V1 explored:
`Home → Start group → Name → Currency → Create → Invite people / Add expense`

It also proved that core click-through navigation in review artifacts should use normal HTML links rather than JavaScript-only handlers because the ChatGPT/iOS preview did not reliably execute the earlier JS interactions.

## Why V1 is not Golden yet
V1 predates the finalized inheritance rules and still contains design debt such as copied CSS, older frame behavior, placeholder glyphs, and more explanatory copy than the Home V1.4 quality bar allows.

## Required next pass
1. Rebuild using the shared Golden frame/tokens/components/icons.
2. Keep copy short and intuitive.
3. Render at 393×852 and 430×890.
4. Inspect actual rendered images.
5. Test normal, back/cancel, creation failure, unsupported/changed currency, empty/only-owner, and relevant offline behavior.
6. Compare visually to Home V1.4.
7. Approve/freeze only if it meets or exceeds the Golden quality bar.

## Production mapping
- `src/components/screens/CreatePot.tsx`
- `src/routing/screen-props/misc-screens.tsx`
- `src/hooks/useBusinessActions.ts`

The underlying create service can likely remain; the UX layer is what needs simplification.

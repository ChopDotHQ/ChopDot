# Journey 03 — Create a Group

**Priority:** P0  
**Status:** V2 Golden Candidate / Review pending  
**Production:** Existing screen; needs UX simplification

## User goal
Create a shared expense space with the minimum necessary decisions.

## Entry
Home → **Start a group**

## Success exit
New group state with obvious next actions:
- invite people → Journey 04
- add first expense → Journey 05

## Production mapping
- `src/components/screens/CreatePot.tsx`
- `src/routing/screen-props/misc-screens.tsx`
- `src/hooks/useBusinessActions.ts`

The underlying create service can likely remain. The UX layer is what needs simplification.

## Current production complexity
The production Create Pot screen currently asks for type, name, currency, cash/bank behavior, members, optional wallet addresses, invite handling, and savings-specific goal information.

## Approved direction carried into V2
- Core expense-group creation should feel almost instant.
- Group name is the only required conceptual decision.
- Currency is visible and preselected, not hidden.
- People are invited after the group exists.
- Wallet addresses are not part of creation.
- Savings is a separate journey.
- Success is a full state with obvious next actions, not toast-only feedback.

## V1
The initial V1 proved the basic path:

`Home → Start group → Name → Currency → Create → Invite people / Add expense`

It also proved that review artifacts should use normal HTML links rather than JavaScript-only navigation because the ChatGPT/iOS preview did not reliably execute the earlier JS interactions.

V1 is retained as historical exploration only. It predates the Golden inheritance rules.

## V2 Golden Candidate

Current file:

`v2-golden-candidate.html`

V2 was rebuilt from Journey 02 Home V1.4 rather than from the old Create Pot screen.

### Inherited system
- locked viewport frame
- fixed header
- scrollable center content
- fixed action footer
- Golden background/surface/border/shadow/radius language
- Lucide-style SVG icon language
- short, action-led copy
- no Unicode icon placeholders
- no floating controls over content

### Primary path

`Start a group → Currency → Create group → Group created → Invite people / Add expense`

### V2 copy
Entry:
- `Start a group.`
- `Name it. Pick a currency.`
- `Create group`

Success:
- `Geneva Weekend is ready.`
- `Invite people or add an expense.`

### Edge states designed
- create failure with details preserved
- offline/local-save proposal
- alternate currency states
- savings handoff kept separate

### QA
Visual QA file:

`visual-qa/README.md`

Rendered and reviewed at:
- 393 × 852
- 430 × 890

Automated checks passed:
- zero horizontal overflow
- no header/content/footer overlap
- all 37 internal links resolve
- core click path completes
- EUR/USD choices remain currency-correct
- no placeholder glyph icons

## Open product questions

### CHF support
V2 uses CHF as product truth, consistent with the Swiss use case and Golden Home examples. Current production `CreatePot.tsx` does not include CHF in its visible currency options. Do not silently resolve this during implementation; reconcile it deliberately.

### Offline creation
V2 proposes:

`Offline. Save now. Sync later.`

This is a product proposal consistent with the local-first direction, but implementation feasibility/state semantics must be validated against the actual data layer before production work.

## Approval rule
V2 is **not Design Approved yet**. It is a Golden Candidate awaiting user review.

If approved:
1. mark Journey 03 Design Approved;
2. add it as Golden Journey #2;
3. update the current state checkpoint;
4. then begin Journey 04 Invite / Join using Home V1.4 + Create Group V2 as inherited references.

# ChopDot Product Schema V1 — Stage 1 Frozen Inventory

**Status: complete inventory candidate**  
**Schema branch:** `research/product-schema-v1`  
**Frozen product authority:** `ux/experience-workbench@4ba456e6595330e4ca8e21366e0d827f17e10881`  
**Accepted integration baseline:** Gate A `8548313791e4ef7b436ee742cd18c1fa48d74eeb`

## What Stage 1 does

Stage 1 inventories and pins the product that already exists. It does not reinterpret it. The 28 approved journeys remain frozen, Phase C1 selective contracts remain overlays, and Gate A remains the accepted integrated baseline. Stage 2 will normalize semantic primitives from these sources; it must not invent product behavior.

## Frozen authority

- 28 registered journeys / 28 Goldens.
- Canonical product tree: `cb424dafedff066fed433e106eb4468bec985d98`.
- Journey registry, approvals, artifact locks, journey-local specs and the shared design contract retain their existing authority order.
- Phase C1 identity/spend contracts are pinned separately so the schema does not collapse `Participant`, account identity, spend, and settlement into one vague concept.
- Gate A integration status is kept separate from design approval status.

## Gate status

**Gate A:** accepted/materialized/verified. Its accepted scope includes entry/Home, one local group, the common equal-split expense path, exact MoneyV1 allocations/range, draft recovery, local save/retry and demonstration account conversion/continuity.

**Gate B:** not built by this stage. Its frozen plan composes J08 Group Home + J05 Add Expense + J06 Review/Correct Expense + J07 Review/Agree/Raise an Issue. The schema will later derive the construction view for that loop.

## Inventory counts

- Journeys: **28**
- Golden artifact locks: **28**
- Feature coverage records: **35**
- Edge-case records: **41**
- Journey-local supplemental contracts discovered: **7**

## Source classification

| Class | Meaning |
|---|---|
| Product authority | Registry, approvals, Golden locks, journey specs/Goldens, Design Contract |
| Selective approved contract overlay | Phase C1 identity/spend/execution contracts; does not replace unrelated Goldens |
| Accepted integration evidence | Gate A acceptance + exact accepted preview commit/tree |
| Coverage support | Features and edge-case registries |
| Reference only | Implementation map and historical gap documents; may lag later approvals |
| Excluded | Product IR/funding/conformance research and unapproved future implementation choices |

## Important normalization rule for Stage 2

Do **not** infer semantic status from old workflow labels such as `not-started`, `partial`, or `current` in `features.json`. All 28 UX journeys are frozen Goldens; feature and edge-case status fields describe their own historical/coverage workflow, not whether a journey is approved or whether Gate A/B has integrated it.

## Files

- `frozen-baseline.json` — machine-readable pinned inventory.
- `verify-stage-1.mjs` — checks that local frozen authority files still match the pinned Git blobs and registry relationships.
- `README.md` — schema-program entry point and stage boundaries.

Stage 1 is complete when the verifier passes without changing any frozen product source.

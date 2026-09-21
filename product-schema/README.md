# ChopDot Product Schema V1

Status: **Stage 1 — frozen product inventory**

This branch builds a derived, composable product schema over the product that is already approved. It is not a new product authority and it does not authorize Gate B implementation.

## Program

1. **Frozen inventory** — pin every current authority source and accepted integration boundary.
2. **Semantic normalization** — identify reusable product primitives, states, operations and invariants without changing product meaning.
3. **Composition wiring** — connect primitives → operations → projections/journeys → gates.
4. **Completeness / Gate B view** — validate coverage, duplicates/orphans and derive the Gate B construction packet.

## Non-negotiable

- No approved Golden or journey semantics change during schema construction.
- Gate A accepted bytes and acceptance meaning remain frozen.
- Phase C1 contracts are composed as overlays, not rewritten into a parallel truth system.
- Research branches are lessons, not product authority.
- Unknown policy stays unknown.
- Generated schema views are disposable and never outrank their cited source.

Start with `STAGE_1_INVENTORY.md` and `frozen-baseline.json`.

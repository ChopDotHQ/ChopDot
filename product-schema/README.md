# ChopDot Product Schema V1

Status: **evidence-backed reconstruction-closure freeze candidate**

The primary artifact is the **composable ChopDot Product Schema**. Its purpose is to let ChopDot be decomposed, understood, changed with analyzable impact, and recomposed without silently losing or inventing approved product meaning. Gate-specific construction packets are downstream derived views; they are not the schema's authority or organizing purpose.

## Authority target

V1 reconstructs the approved product contract from:

- the 28 frozen Goldens at `4ba456e6595330e4ca8e21366e0d827f17e10881`;
- approved Phase C1 identity/spend overlays;
- approved post-J28 product decisions;
- explicit post-Golden decision impacts.

Stage 5.1 pins the curated mapping/state sources **and** the executable/decision mapping sources used to recover dynamic product meaning. Later branch edits cannot silently become historical Golden authority.

## Reconstruction closure

The closure pipeline checks both directions:

1. **Golden → Schema completeness** — approved states, controls, fields, events, recovery states and superseded pieces are explicitly accounted for.
2. **Schema → Product soundness** — canonical operations and semantic structures have legitimate product/contract/recovery witnesses rather than merely existing in the schema.

Current strict verification on the freeze candidate establishes:

- 4,418 reconstructed pieces;
- 0 unjustified pieces;
- 0 pseudo-state pieces;
- 141 / 141 frozen domain events covered;
- 49 / 49 canonical operations witnessed;
- 21 / 21 required states resolved with governed trigger meaning;
- Phase C1, post-J28 and post-Golden decision sources explicitly decomposed;
- 58 / 58 independent safety co-mutations detected across seven safety domains.

The generated piece-level mapping is `generated/reconstruction-pieces.json`; the summary is `generated/reconstruction-coverage.json` / `generated/PRODUCT_SCHEMA_CLOSURE.md`.

## Independent safety verification

Stage 5.1 deliberately does **not** count the old authored safety snapshots as independent mutation detectors. The mutation suite co-mutates those snapshots with the schema and then checks the result against fixed invariants grounded in frozen authority.

Safety coverage is tracked independently for:

- identity;
- exact money / savings confirmation;
- recovery and replay;
- storage / restore;
- authority boundaries;
- settlement;
- composition continuity.

This prevents a schema + local expectation co-edit from preserving a false green score.

## Blast-radius analysis

`generated/blast-radius.json` uses a directed dependency → consumer graph and reports **direct** and **transitive** impact separately. High-impact primitives can therefore receive stronger verification without treating presentation/navigation details as equivalent to financial or identity semantics.

Operations expose important read dependencies explicitly where needed for impact analysis. The graph no longer uses laws/objects as bidirectional bridges that collapse most of ChopDot into one connected component.

## Settlement kernel

The previously hardened settlement contract remains load-bearing:

- expense mutation guards run at effect time and fail closed;
- current and proposed state are both considered;
- settlement descriptors use a closed resolution-state model;
- released scopes require fresh authoritative reconciliation;
- eligible balance, source lineage and dispute eligibility are compared before/after;
- partial remainder preserves settlement dependency;
- dispute-state changes invalidate dependent prepared PaymentIntents;
- `PositionScope` is typed as `participant_pair | group`, and settlement consumers require the participant-pair scope;
- J05 `locked` remains a recovery state while its historical blanket-lock copy is explicitly superseded for ordinary dependency-scoped locking;
- whole-group closeout remains semantic-only until an approved user surface exists.

## Verification rule

Generated outputs are pinned and the Product Schema workflow runs in **strict read-only mode**. A change must regenerate deterministically and pass the reconstruction, independent mutation, provenance, semantic, UX/task and earlier Stage 1–4 checks before the branch is green.

A green Gate packet alone is not Product Schema completeness. The freeze criterion is the round trip: **nothing approved lost, nothing unapproved invented, every semantic effect legitimately witnessed, and critical changes independently detectable.**

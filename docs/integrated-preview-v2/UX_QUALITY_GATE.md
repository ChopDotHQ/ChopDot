# Integrated Preview V2 — UX Quality Gate

This file binds the UX quality framework into the V2 stage process without changing any approved Golden journey.

For every Gate A/B/C/... stage, use this order:

1. identify Golden authority;
2. integrate shared state/plumbing;
3. pass visible primary/alternate/recovery browser paths;
4. capture all meaningful states;
5. review one contact sheet screen-by-screen and transition-by-transition;
6. fix fidelity/continuity defects;
7. apply `docs/ux-quality/UX_LAWS_V1.md` using `docs/ux-quality/JOURNEY_UX_REVIEW_TEMPLATE.md`;
8. resolve or explicitly human-defer BLOCKER/MAJOR findings;
9. refresh affected screenshots and regression paths;
10. human walkthrough / acceptance;
11. only then expand to the next stage.

The repeatable mechanics and learning loop are defined in `docs/ux-quality/PROCESS.md`.

## Why this is separate from Golden fidelity

Golden fidelity asks: **did we integrate the approved experience?**

Continuity asks: **does the same person/state/object survive between journeys?**

UX-law review asks: **is the resulting continuous experience actually easy, understandable, familiar and physically usable?**

A journey can pass one and fail another. Gate A proved this directly.

## Acceptance rule

A V2 stage is not accepted until all of the following are true:

- Golden fidelity is intact;
- cross-journey continuity is coherent;
- screenshot/contact-sheet review is complete;
- applicable UX Laws V1 checks are complete;
- no unresolved BLOCKER/MAJOR finding remains unless Devinson explicitly defers it with rationale;
- material fixes have refreshed evidence;
- Devinson completes the human walkthrough.

No UX-law recommendation may silently override a product, financial, identity, security or recovery contract.

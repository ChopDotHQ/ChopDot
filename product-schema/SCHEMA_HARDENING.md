# Product Schema V1 — Adversarial Hardening Pass

Status: **schema checks PASS; Gate B remains BLOCKED pending frozen-authority/product-decision items**

This pass responds to the independent Claude review without changing any Golden, journey specification, Gate A product bytes, or runtime code.

## Corrections

- resolved pointer/package Goldens explicitly; J05's five missing structured-source slices are now an explicit authority blocker rather than a hidden pointer;
- pinned every existing journey-local STATE_INVENTORY / EDGE_CASES / decision-history authority file;
- added participant-bound ExpenseAllocation and separate conservation vs attribution laws;
- made Position/Activity/Attention/change-history derived invalidations rather than direct write targets;
- modeled the settlement-related ExpenseMutationGuard without inventing its unresolved scope;
- gave J07 ownership of issue resolution and added Withdraw/Reply operations;
- modeled receipt and accepted Expense change history;
- made Group Home depend on Attention + Activity projections;
- removed the duplicate Gate-vs-composition ownership of journeys/contexts/operations;
- split Gate B rendered views from downstream projections that must stay fresh;
- qualified every Gate A reused context and retained the J05 reconstruction caveat;
- replaced hard-coded Stage 4 semantic prose with references to continuity contracts, composition laws and build constraints.

## New hostile checks

`gate-b-authority-oracle.json` is a small independent test oracle pinned to frozen authority evidence. `verify-schema-hardening.mjs` checks the hardened semantic contract, including executable split-attribution/conservation/lock fixtures. `mutation-battery.mjs` deliberately corrupts twelve schema facts and requires every mutation to be detected.

## Why Gate B is still blocked

1. **AUTH-J05-GOLDEN-INCOMPLETE** — the frozen J05 structured-source manifest declares five files absent from the frozen authority tree.
2. **POLICY-EXPENSE-LOCK-SCOPE** — frozen J08/J05/J06 behavior establishes a settlement-related expense mutation lock, but later item-scoped settlement contracts leave the final dependency scope unresolved.

The schema must report these facts rather than making them disappear to obtain a green result.

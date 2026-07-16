# P-025 + P-026 Canonical Integration V1

## Change name

`p025-p026-canonical-integration-v1`

## Programme and lane

- Canonical root integration lane.
- Programme A portable-shell work remains independent and is referenced only
  through committed P-026 evidence.
- The shared dirty repository root is not an integration source and must not be
  staged, reset, or modified.

## User journey

I am a ChopDot group member, I need payment truth to remain protected while the
team can see which product journeys are proven or blocked, so the group can use
one trustworthy product rather than conflicting implementations.

## One next action

Unchanged. This integration adds no user-facing action, screen, copy, or flow.

## Current truth to preserve

- `dc6b964` is the published canonical baseline.
- `26d2cc3` adds the P-025 financial-table authority lockdown on top of that
  baseline.
- The five commits from `codex/p026-user-path-scanner` are the complete P-026
  product behavior-map stack.
- Only the backend command boundary may mutate settlement, payment, event, and
  group-closeout financial truth.
- The normal product journey and visible UI remain unchanged.
- Programme A remains a separately proven host and portability lane.
- P-026 evidence may point to Programme A proof, but portable implementation
  code is not merged into the canonical product.

## Scope in

- Replay the five P-026-owned commits onto `26d2cc3` in order.
- Reconcile shared product-card, cockpit, wiki, and generated-evidence files
  without weakening P-025 or losing P-026 source truth.
- Regenerate product and wiki read models from their source files.
- Run focused P-026 routing checks and P-025 authority checks.
- Run the combined frontend, backend, build, security, migration, product, and
  documentation gates.
- Record an auditable integration report and commit.

## Scope out

- User-facing feature work or visual changes.
- Receipt/OCR implementation and D-019.
- P-022 journey fixes.
- Atomic financial persistence beyond P-025's current authority lockdown.
- Programme A code, host adapters, deployments, or proof regeneration.
- Cleaning or reconciling unknown changes in the shared repository root.
- Dependency upgrades or unrelated refactors.

## Requirements

1. The integration SHALL descend from `26d2cc3`.
2. The integration SHALL include all five P-026-owned commits in their original
   order and SHALL NOT cherry-pick the prior combined integration branch.
3. P-025 financial authority requirements and migrated-database proof SHALL
   continue to pass after P-026 is added.
4. P-026 routing, ownership, freshness, and evidence-precedence tests SHALL pass
   after P-025 is present.
5. Product source truth SHALL preserve both P-025 and P-026 cards and contracts.
6. Generated product and wiki artifacts SHALL be regenerated from reconciled
   sources rather than treated as hand-authored truth.
7. Programme A implementation files SHALL NOT enter this branch.
8. The shared dirty root SHALL remain untouched.
9. The integration SHALL introduce no user-visible behavior or copy change.
10. Completion SHALL include exact test results, known baseline debt, and a
    clean committed worktree.

## Scenarios

### Security authority survives product-map integration

GIVEN the P-025 authority-lockdown migration and backend command proof pass
WHEN the P-026 behavior-map stack is integrated
THEN authenticated clients still cannot directly mutate financial truth
AND legitimate payer and receiver command paths still work.

### Product behavior map preserves lane ownership

GIVEN canonical application evidence, P-025 security evidence, and separately
owned Programme A proof
WHEN P-026 regenerates its routing queue
THEN each item retains one owner
AND portable proof cannot overwrite canonical application truth
AND stale or incomplete proof is downgraded rather than promoted.

### No product behavior changes

GIVEN a user follows the existing ChopDot journey
WHEN this integration is built
THEN the visible screens, copy, actions, and state transitions are unchanged.

### Generated artifacts remain reproducible

GIVEN reconciled source cards, contracts, wiki sources, and path models
WHEN product and wiki generators run
THEN their validation checks pass
OR any pre-existing missing external evidence is explicitly reported without
being disguised as an integration success.

## Invariants

- `paid`, `confirmed`, and `closed` remain distinct states.
- Payer and receiver authority cannot be inferred from browser-supplied actor
  identifiers.
- Financial-table write access cannot be restored to authenticated clients.
- One work item has one active implementation owner.
- Evidence from a reference/prototype lane cannot silently become canonical
  product proof.
- Generated files never outrank their source files.

## Product gate

- Friction: 3/3 - no new user step.
- Trust: 3/3 - security authority and evidence ownership become one baseline.
- Clarity: 3/3 - no visible action hierarchy changes.
- Language: 1/1 - no normal UI copy changes.
- Total: 10/10.
- Decision: PASS.

## Proof

- P-026 routing regression test and product validators.
- Frontend type check, test suite, lint/build as configured.
- Backend tests, type check, and production build.
- P-025 security baseline and disposable migrated-database authority tests.
- Wiki generation and validation.
- Git ancestry, diff, and clean-worktree checks.

## Documentation impact

- Add a dated canonical integration report under `docs/security/` or
  `product/evidence/` based on the final evidence shape.
- Update source product cards/contracts if reconciliation requires it, then
  regenerate product read models.
- Regenerate and validate wiki read models.
- No new ADR is expected because this combines already-approved boundaries and
  does not change architecture.

## Stop conditions

- Stop if the P-026 source worktree changes after the ownership freeze.
- Stop if reconciliation requires changing normal UI or payment semantics.
- Stop if a failing P-025 authority test would be hidden by regenerating files.
- Stop before deploying, moving a canonical branch pointer, or merging to a
  production branch without separate operator approval.

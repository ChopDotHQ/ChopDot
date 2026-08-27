# ChopDot product prioritization repair

**Kind:** plan
**Status:** active
**Owner:** product assurance
**Last reviewed:** 2026-08-27
**Applies to:** `chopdot-v1-launch`
**Authority:** bounded implementation plan; it cannot change product law or choose a product priority without the recorded product-decision evidence

## Goal

Make the Product Cockpit, Product Judgment skill, and Product Definition agent
loop reject unsupported or contradictory priorities. A card may enter execution
only when its user state, action scope, expected outcome, proving evidence,
failure outcome, accountable owner, exit condition, and comparative rationale
are explicit. The selected operator priority must never be presented as one
universal action for every ChopDot user.

## Current truth to preserve

- `PRODUCT_TRUTH.md` is the only product law.
- Cockpit sources contain current revocable product decisions; generated views
  and skills are supporting or derived surfaces.
- One screen or user state should have one obvious next action.
- One card action is not automatically the global Home action.
- Product score is an implementation admission gate, not a ranking formula.
- P-035, P-022, and the other current card priorities remain unchanged by this
  repair unless their governing evidence is separately reviewed.

## Baseline failure

- `scripts/product-cockpit.mjs` hard-codes `Scan a receipt` as the generated
  universal first action while the ranked next card is P-035, `Create my group`.
- `rankCards` sorts asserted status, blocker, and priority fields; it does not
  establish why those fields are correct.
- Cards do not currently require a user-state/action scope, expected observable
  outcome, failure outcome, owner, exit condition, or comparison with the next
  alternatives.
- The Product Judgment skill anchors on the Cockpit priority before requiring an
  independent view and embeds a dated receipt scenario strongly enough to drift
  into a universal default.
- The Product Definition loop evaluates a selected definition but does not
  require a comparative prioritization verdict.
- The 19 focused Cockpit tests pass this contradictory state.

## Scope in

1. Add an objective prioritization contract to active Cockpit cards.
2. Make generated views describe the operator priority and its action scope,
   never a universal first action.
3. Add semantic validation for action scope, loop outcome fields, and decision
   coverage.
4. Add a scoped product decision clarifying that one obvious action is selected
   per user state or screen, not once for the entire product.
5. Add a Product Portfolio Judgment loop before the existing implementation
   composition.
6. Update the portable Product Definition profile and rubric to require an
   independent-first assessment, alternatives, outcome proof, and falsifier.
7. Rewrite the installed Product Judgment skill as a thin, source-aware method
   that cannot outrank the exact-worktree Cockpit.
8. Add regression cases that reproduce the present failure.

## Scope out

- Selecting a different active card or changing the current numeric order.
- Implementing a new Home screen, receipt flow, group flow, or mode.
- Declaring one universal first action for every user.
- Editing product law.
- Deployment, promotion, merge, branch-protection, wallet, or chain effects.
- Accepting unrelated dirty knowledge-adapter work in this worktree.

## Objective expected outcomes

| ID | Expected outcome | Proving evidence | Failure or blocker outcome |
|---|---|---|---|
| PRIO-1 | No generated source calls a card action the universal ChopDot first action. | Focused regression test plus generated-resume diff. | `failed_verification`; generated views are not refreshed. |
| PRIO-2 | Every non-done card records action scope, expected outcome, success evidence, failure outcome, accountable owner, exit condition, priority basis, and alternatives not now. | `product:validate` card-schema checks and source inspection. | Card is invalid and cannot be queried as `next`. |
| PRIO-3 | A priority verdict starts with an independent product assessment and explicitly compares the Cockpit result. | Product Definition profile, rubric, skill, and behavioral case. | `blocked` on source conflict or `approval_required` for a real strategy change. |
| PRIO-4 | Product score cannot be represented as ranking evidence. | Validator/output language and rubric distinguish admission from ordering. | Priority claim is rejected as unsupported. |
| PRIO-5 | Decision scope cannot leak into a universal generated action. | Decision contract plus semantic regression tests. | Same-level conflict blocks the affected product work. |

## Loop contract

- **Accountable owner:** product assurance owns this repair; product owns later
  priority decisions; a different reviewer must evaluate the repaired behavior.
- **Maximum repair budget:** two implementation passes and one independent
  recheck. Repeating the same failing assertion without changing the hypothesis
  is not a repair.
- **Exit condition:** focused tests pass; skill validation passes; generated
  views are semantically coherent; all changed tracked sources are named; full
  validation either passes or reports only pre-attributed unrelated dirty-path
  blockers.
- **Actual result and verdict:** recorded after execution with exact commands,
  counts, paths, and remaining product decisions.

## Ordered implementation

1. Freeze the contradictory baseline in tests.
2. Extend card schema and populate the required prioritization contract without
   changing current order.
3. Repair generated views and add the contextual-action decision contract.
4. Add the Product Portfolio Judgment loop to operating documentation.
5. Extend the portable Product Definition profile, rubric, example, and
   taxonomy.
6. Rewrite and validate the Product Judgment skill.
7. Refresh derived product views where source validation permits it.
8. Run focused tests, product/context validation, agent validation, and skill
   validation; record any unrelated dirty-path blocker separately.

## Documentation impact

`docs/wiki/` does not need a new product page: this is process and Cockpit
governance, not product law or a new user feature. The operating-loop source,
Cockpit decisions/contracts, portable agent profile/rubric, and this plan are
the affected canonical documents. Generated product views must be refreshed
from source rather than edited directly.

## Actual result — 2026-08-27

- PRIO-1: **passed locally**. Generated views identify P-035 as the current
  operator priority, keep `Create my group` scoped to first shared-group
  creation, and explicitly reject a universal card action.
- PRIO-2: **passed locally**. All ten cards now contain the full priority
  outcome contract and name at least two alternative cards not now.
- PRIO-3: **passed at tracked profile and tracked instruction level**. The
  Product Definition profile requires an independent first view, Cockpit
  comparison, and two alternatives. The durable judgment method now lives at
  `governance/agent-system/instructions/chopdot-product-judgment.md`; the
  machine-local skill is a thin loader.
- PRIO-4: **passed locally**. Generated output, tests, rubric, skill, and
  decisions state that product score is admission only, not ranking evidence.
- PRIO-5: **passed locally**. DEC-001 is Catch-scoped, DEC-009 governs
  contextual actions, and semantic regression tests reject universal drift.

Verification:

- `npm run context:validate`: pass, 12 default sources.
- `npm run product:validate`: pass, 10 cards.
- `npm run wiki:validate`: pass, 12 source pages.
- `node --test scripts/product-cockpit.test.mjs`: 24/24 pass.
- `npm run agent:ci:core`: 122/122 pass; 45 governance artifacts valid.
- Skill loader frontmatter: Ruby/YAML fallback pass; SHA-256
  `ddd50cd9782d99a44e90fea5e7796d1bbe9b3aa5d9fbcc6fb19b98253abdb455`.
- Tracked product-judgment method SHA-256:
  `94ad402d0e1108950854ffa7adf83a7c6afeb9a5753270def79fd0052d0d1115`.
- The Skill Creator `quick_validate.py` could not execute because both available
  Python runtimes lack the pre-existing `yaml` module. No dependency was
  installed for this repair.

Verdict: **implemented and locally verified; not independently reviewed,
committed, pushed, or deployed.** Existing unrelated dirty knowledge-adapter
paths remain attributed and were not included as product-priority evidence.

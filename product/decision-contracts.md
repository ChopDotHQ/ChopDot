# ChopDot Public Beta Decision Contracts

**Kind:** guardrail
**Status:** active
**Owner:** product assurance
**Last reviewed:** 2026-08-27
**Applies to:** `chopdot-v1-launch`
**Authority:** executable acceptance boundaries for current decisions

## DC-001 - Capture — reviewed 2026-08-27

- The bounded Catch route has one dominant `Scan a receipt` action.
- Capture wording is not exported as the universal Home action for unrelated
  participant or operator states.
- Photo/import/link precede manual correction.
- OCR failure is visible and changes no shared state.
- Review shows amount, currency, payer, people and split before acceptance.

## DC-002 - Money and membership — reviewed 2026-08-24

- Wrong actor/signature/version/frontier/currency produces no state change.
- Contact verification never grants group membership.
- Account ownership and personhood never grant group membership or organizer authority.
- Marked paid, cleared, confirmed received, approved/released and closed remain distinct.
- Exact replay and checkpoint replay produce the same state hash.

## DC-003 - Recovery — reviewed 2026-08-24

- Fresh browser/device restores from account-authorized encrypted data.
- Wrong account/key/group/digest and stale head fail closed.
- Revoked members cannot read future data.
- Recovery-kit skip copy is honest and non-blocking.

## DC-004 - Modes — reviewed 2026-08-27

- Every mode completes its cited category or null-workflow baseline through
  production UI before a differentiated claim is accepted.
- Every path names actor, transition, authority, privacy, offline/recovery and failure.
- No mode adds custody, guaranteed payout or parallel authority.

## DC-005 - Release — reviewed 2026-08-24

- Clean commit/tree, dependency lock, build aggregate, CAR hash and CID are recorded.
- Devnet and public root/app records resolve the same CID and release ID.
- Real host screenshots show no internal infrastructure language.
- Rollback bytes and previous mappings are read back before promotion.
- A live P0/P1 first-use failure invalidates the candidate even when byte and chain gates pass.

## DC-006 - Context and Cockpit — reviewed 2026-08-27

- Every default read path exists in the exact worktree and is typed, scoped,
  owned, and freshness-bounded.
- Cockpit `next` is selected by blocker severity and explicit reviewed priority,
  never Markdown file order; every eligible card records the full
  prioritization outcome contract.
- Generated views label `next` as an operator priority, preserve its action
  audience and scope, and reject universal first-action drift.
- Product score gates a definition for implementation but never ranks cards.
- Missing, stale, cross-worktree, generated-as-authority, or ambiguous context
  fails validation.
- KG facts remain distinct from Repo Graph facts and direct source facts.
- `kg_known=true` requires active v2, no fallback, citations, and exact accepted
  root/branch/commit identity.

## DC-007 - First-use account setup — reviewed 2026-08-27

- A guest may capture locally without account ceremony.
- A shared signed action either completes account binding behind one
  plain-language action or presents one working recovery action before the
  final mutation.
- Group name and safe local draft state survive rejection, retry, and reload.
- The UI does not expose `Product Account`, host, adapter, chain, personhood, or
  protocol language as the cause of failure.
- Empty and returning Home states each select one dominant working action from
  the observed participant state. A capture-ready participant may see `Scan a
  receipt`; first shared-group creation may expose `Create my group`; neither
  card action is a universal default. Modes live inside creation.

## DC-009 - Comparative product priority — reviewed 2026-08-27

- Before reading the current numeric priority as a recommendation, the product
  evaluator records an independent first view of user state, job, expected
  outcome, authority, risk, and likely next action.
- The verdict compares that view with the current Cockpit card, names same-level
  conflicts, and explains why at least the next two eligible alternatives are
  not now.
- Each selected card names expected outcome, proving evidence, failure outcome,
  accountable owner, retry or exit condition, priority basis, audience, and
  action scope.
- Missing or circular evidence blocks the card from `next`; a real strategy
  change requires product-owner approval rather than silent field editing.

## DC-010 - Benchmark-grounded product composition — reviewed 2026-08-27

- `product/benchmark-baseline.md` is the launch-worktree benchmark source. It
  records evidence grade, observation date, conventional or null reference,
  baseline outcome, and E2 status; it cannot override `PRODUCT_TRUTH.md`.
- Every active user-facing card names a delivery phase, one or more valid
  baseline requirement IDs, a differentiated outcome, and an evidence state.
  An internal or operator-only card may use a bounded `not-applicable:` reason.
- Product score, generated views, fixtures, market copy, registry rows, and the
  Devnet platform catalog cannot substitute for same-journey baseline evidence.
- E1 public-source review may admit a research or implementation hypothesis but
  cannot close an E2 hands-on, production-entrypoint, or real-user gate.
- A differentiator cannot hide a failed familiar job. Missing, stale, unknown,
  or intentionally omitted baseline coverage remains visible in the card and
  blocks experience-complete or release-complete claims.
- Scenario examples remain scoped to the actor, state, authority, and failure
  path they actually exercise. No benchmark row selects a universal Home
  action.

## DC-008 - Full release completion — reviewed 2026-08-27

- `implemented`, `tested`, `committed`, `pushed`, `candidate_built`, `staged`,
  `promoted`, `reachable`, `user_owned`, `user_proven`, and `kg_known` are
  measured and reported separately.
- `implemented=true` requires the normal journey and every named mode through
  the production entrypoint; service fixtures alone are insufficient.
- `tested=true` requires zero unresolved release-blocking authority, privacy,
  recovery, accessibility, dependency, contract, or release findings.
- `promoted=true` requires the same CAR SHA-256 and root/app CID as the staged
  candidate; rebuilding for a public environment is a failure.
- `reachable=true` requires fresh live readback from every advertised surface,
  not an upload receipt or local preview.
- `user_owned=true` requires post-transfer chain readback, and
  `user_proven=true` requires one real organizer plus two real participants.
- `kg_known=true` requires the current portable knowledge port to cite the
  exact accepted root, branch, commit, and outcome without fallback. A backend
  version name cannot satisfy this contract by itself.
- Any false verdict, byte mismatch, stale candidate, approval mismatch, live
  P0/P1, or unowned advertised name returns to the owning gate and preserves an
  explicit rollback target.

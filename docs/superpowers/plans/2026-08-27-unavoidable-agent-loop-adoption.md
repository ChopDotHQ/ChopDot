# Unavoidable agent-loop adoption

**Kind:** implementation plan
**Programme:** Track 1 product/application governance
**Owner:** release integrator
**Exact worktree:** `/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch`
**Branch at start:** `codex/chopdot-v1-launch`
**HEAD at start:** `15fd49de78121a08e07e76c6fee91ef3850bb18d`

## Goal

Make governed ChopDot outcomes impossible to accept, merge, mark complete, or
release without the applicable agent-loop contract, exact-candidate evidence,
independent verdict, and portable knowledge receipt. Keep exploratory work
possible, but label it `ungoverned` or `unverified` and prevent promotion.

## Current truth to preserve

- `PRODUCT_TRUTH.md` remains the only product-law source.
- Product Cockpit source files route product work; generated views are read
  models.
- `OutcomePacketV1` is the sole successful portable outcome.
- Agent evidence cannot replace real-screen or real-participant proof.
- External effects retain explicit approval, idempotency, readback, and repair
  boundaries.
- No enforcement mechanism may silently commit, push, merge, deploy, or mutate
  product truth.

## Scope in

1. A versioned adoption policy mapping governed paths and completion surfaces
   to required loop profiles and evidence.
2. An automatic context receipt command that binds root, branch, HEAD, tree,
   dirty state, authority sources, active product card, and knowledge status.
3. A completion/promotion guard that reports `governed`, `ungoverned`, or
   `unverified` and fails closed for governed acceptance surfaces.
4. A tracked pre-push hook for early local enforcement and an installer/check
   that makes missing hooks visible.
5. Remote PR and release workflow integration using the same deterministic
   guard so `--no-verify` cannot bypass acceptance.
6. Product Cockpit finish/checkpoint integration so governed product work
   cannot be marked finished without its accepted packet.
7. Adversarial tests for stale context, wrong root/branch/commit/tree, absent or
   self-reviewed outcomes, missing knowledge recall, hook bypass, and release
   without an accepted packet.
8. Source documentation and operator commands describing the exact boundary.

## Scope out

- Blocking every edit, note, experiment, or conversational response.
- Treating local hooks as a security boundary; remote required checks remain
  authoritative.
- Automatically changing GitHub rulesets before the repository implementation
  and readback evidence are accepted.
- Claiming that agent or simulated evidence proves real-user acceptance.
- Deploying or changing a `.dot` name in this change.

## Objective expected outcome

A governed product, UX, implementation, security, knowledge, or release change
cannot cross its acceptance surface unless one exact candidate has:

1. a fresh context receipt;
2. the required loop profile and contract;
3. an accepted independent evaluation;
4. an `OutcomePacketV1` bound to the same root, branch, commit, tree, and dirty
   state;
5. a successful knowledge record and exact-digest recall when the profile
   requires it.

Exploratory or incomplete work remains possible only with a machine-readable
`ungoverned` or `unverified` verdict and cannot be promoted.

## Proving evidence

- Focused unit tests for policy matching, receipts, outcome discovery, identity
  binding, knowledge receipts, and all fail-closed cases.
- Repository governance and workflow tests proving local-hook bypass does not
  bypass remote PR/release checks.
- Product Cockpit tests proving `finish` rejects governed work without an
  accepted exact-candidate packet.
- Fresh `npm run agent:ci:core`, `npm run agent:ci:governance`,
  `npm run product:validate`, `npm run context:validate`, and documentation
  validation with exact counts.
- A live GitHub ruleset readback only after the implementation is committed and
  available to the required workflow.

## Failure and blocker outcome

Any missing, stale, mismatched, self-reviewed, unrecorded, or unrecalled proof
returns a non-zero exit with a typed reason and the next bounded repair. No
failure is converted to success by retrying or by descriptive prose.

If protecting the active release branch would strand the current dirty worktree
or prevent the required workflow from being installed, produce a ruleset packet
and leave the external ruleset mutation pending rather than silently widening
or weakening enforcement.

## Retry and exit condition

- Maximum three repair iterations per failing assertion.
- Same blocker three times produces a continuation/blocker packet.
- Exit only when focused and full verification pass on the exact final tree,
  documentation impact is explicit, and external enforcement is either read
  back active or separately reported pending with its blocker.

## Ordered work

1. Reconcile current runner, PR/release governance, cockpit lifecycle, and
   ruleset support.
2. Define the adoption policy and context/completion receipt contracts.
3. Implement deterministic receipt and acceptance-guard commands.
4. Install early local hook enforcement and hook-health validation.
5. Integrate the guard into Product Cockpit, PR CI, and release enforcement.
6. Add adversarial tests and repair failures.
7. Update source documentation, generate read models, and run full verification.
8. Produce ruleset/readback evidence and report separately what is locally
   enforced, remotely enforced, and still pending.

## Verification checkpoint — 2026-08-27

- Focused adversarial boundary: 81/81 tests passed.
- Full agent governance: 13/13 command groups passed.
- Core agent-system suite: 157/157 passed.
- Focused governance suite: 81/81 passed.
- Application Node suite: 369/369 passed.
- Repository validator: 401 checks, zero errors or warnings.
- Security baseline: 198 files checked, passed.
- Context authority: 13 active default sources, valid for the exact worktree.
- Product Cockpit: 11 cards, valid.
- Wiki: 13 source pages; regenerate and revalidate after source edits.
- Independent adversarial re-audit and remote ruleset/environment readback
  remain required before the adoption outcome is called complete.

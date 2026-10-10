# J01 — Surface Clarity battle test

**Verdict: J01 is not cleared.** Guest entry is clear in the tested returning
browser, but deeper account paths expose two confirmed integration findings
and one interrupted-entry decision. Existing model tests pass while those
surface problems remain. This is a heuristic/interaction audit, not a user
comprehension study or independent clearance.

Tested source: `4857d3beca6add7ba1a03f210d79ff67c215b931`, tree
`716b05d6cd7c27340211a4edcce5eef974459f45`. Runtime is unchanged from
`3738c7307d8223d37bfd7d3cd8a51eadbf4b798a`; digest
`b73554f66065ce545675ebe56dd0baf79b3fb426b24d724628a7ef30dd4801ab`.
Frozen schema and Golden/C1 sources retain their existing exact pins.

Hosted interaction used the existing private preview. Sites version 13 still
reports packaging source `3c33539b2a25ac5d26a05b444b78c1eff06d1d7d`, matching
the prior audit's deployment-to-source mapping. That mapping is reused, not a
fresh readback of every hosted asset. `deployment.json` records current metadata.
The evidence does not claim the hosted source commit is the GitHub runtime commit.

## What was exercised

The exact steps and observations are in `results.json`: 22 bounded cases,
16 executed browser cases (11 pass, 4 fail, 1 needs a decision) and 6 unexecuted
cases. These are case outcomes, not a journey success percentage. Two failing
email cases and the failing wallet case expose the same underlying finding.

| Finding | Observation | Smallest next action |
|---|---|---|
| SC-J01-001 — P2 | Email says “Sent to…” and wallet says approve there, but both are local simulations. The integrated wrapper hides the fixture code/outcome instructions. | Explain the simulation and expose the defined local completion path beside the relevant action. Preserve verification guards and truthful pending states. |
| SC-J01-002 — P2 | Guest Home → Invite someone → Create account → email Back reaches the old marketing welcome, without guest/Home exit. | Return Back to its incoming guest boundary or approved entry, preserving contextual invite routing. |
| SC-J01-003 — P3, needs decision | Reload during code entry preserves groups/expense but silently loses conversion and invite intent. | Specify safe interrupted-entry behavior or disclose a restart. Never retain stale auth proof just for continuity. |

Keep the successful behavior: guest primary, account prerequisite before inviting,
“Everything you've done stays,” cancellation/reopen, retained local records,
empty-email validation, inline incorrect-code feedback, honest pending wallet
state and wallet cancellation. A synthetic public fixture code reaches the
new-person ready screen, but this required source knowledge absent from normal UI.
The final Open ChopDot conversion was deliberately not committed against the
pre-existing browser records.

## Authority and change boundary

Read `docs/integrated-preview-v2/J01_ENTRY_FRONT_DOOR_DECISION.md` for the
approved minimal guest-first entry and account boundary. Its historical Gate A
status is not the latest acceptance status. The current integrated runtime also
includes later accepted repairs and documented prototype limitations; see
`docs/prototype-closeout/ACCEPTED-d6c85f9e.md`. This test does not revoke those
acceptances or pretend prototype identity is real authentication.

J01 has frozen mappings for session.enter, participant.link_account and
preferences.update, with ctx.entry/ctx.identity. It has **no certified V1 task
path**. The record keeps those source mappings unchanged. UX-law lenses here
include Jakob/predictable Back, cognitive load/recognition, proximity of recovery
instructions and truthful completion. No universal word/button limit or
psychological performance claim is used.

No runtime, schema, Goldens/C1 or frozen tag was changed. Runtime fixes are
proposals for the next bounded change, not fixes claimed complete by this audit.

## Framework result

The J01 record now contains explicit scope, steps, source/browser evidence,
failures and unexecuted obligations. It remains blocked. Other journey records
and the original 12 findings retain their status.

`check` validates structure/freshness, while `ready` remains exit 2/INCOMPLETE.
That distinction matters: valid bookkeeping is not good UX. The framework
successfully records what the earlier guest-only sample missed.

One maintenance issue surfaced: checker unit fixtures assumed every live record
would forever be unassessed. Tests now create pending obligations in disposable
fixtures, with a separate regression checking that the actual J01 failures and
unexecuted paths remain blockers. All original 17 tests are retained.
No denominator, production record, verifier or readiness rule was weakened.

The method still needs human judgment: artifact hashes cannot prove that a
picture depicts the right state, that a screenshot/AX pair was simultaneous,
or that a person understands the next action. Rejecting mismatched captures and
leaving comprehension unassessed are part of this battle test.

## Reproduction and evidence

Run:

```bash
bash product/surface-clarity/evidence/J01-2026-10-10/run.sh
```

Prerequisites: Node and Git, this repository/evidence commit, and the two pinned
authority objects. No npm packages are needed for these checks. The runner writes
logs into its own new temporary directory and never resets a normal checkout or
browser. It replays model/bookkeeping checks; it does not replay the captured UI.
For UI replay use the stable case IDs and steps in `results.json`, a separate
browser profile/test origin, and synthetic fixtures. Do not reset a person's
ordinary browser storage.

Current source tests: 50 J01 model checks and 163 subject/request-binding checks,
both exit 0. Their logs are included. Framework and authority/runtime command
receipts accompany the delivery. These are local tests, not hosted Actions.

Ten retained native screenshots and their hashes are in the accompanying
`J01-Surface-Clarity-Battle-Test.zip`; repo evidence retains AX transcripts and
a screenshot index. Outer viewport 1363×936, embedded CSS 428×878.
This is not a canonical 393×852 or 430×890 Golden comparison.
Three duplicate/mismatched captures are explicitly rejected in the index.
The account-boundary image lagged and shows Home; its AX transcript, rather than
that image, is the evidence for the boundary.

## Limitations and browser cleanup

No fresh-storage first-use, final integrated conversion, returning Sign in,
contextual invite/counterpart, all rendered recovery fixtures, keyboard-only
qualification, canonical viewport comparison or human study was completed.
Model coverage of those guards is not substituted for UI coverage.

A packaged local server was created, but cloud Chrome could not reach
127.0.0.1:4187 (ERR_CONNECTION_REFUSED). Testing continued on the existing hosted
preview without clearing its records. Some later guide links and the diagnostic/
restore call were rejected by browser navigation policy. No workaround was tried;
they are environment blocks, not proven application defects.

Existing groups, people, expense and payment history were not cleared or converted.
The prior tab was placed on about:blank to release the single-writer lock, and
its test-person fixture was changed from Audit Alex to You. Restoration could
not be verified after the browser policy block; the actor may still be You.
The original saved view is identified in results, without publishing its payment
identifier. This is a cleanup limitation, not a claim that business data was lost.

No separate reviewer was invoked and self-review is not called independent review.
No real email/account, wallet, signing or funds were used. No repo-wide CI or
hosted GitHub Actions was run for this audit.

Next: repair SC-J01-001/002 within the integrated wrapper, decide the bounded
SC-J01-003 restart policy, then replay the same cases plus the six unexecuted
cases in isolated storage. Keep J01 blocked until that evidence exists.

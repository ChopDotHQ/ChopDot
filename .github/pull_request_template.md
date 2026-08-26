## Summary

What bounded outcome changed, why was it necessary, and which exact paths own
the result?

## Outcome traceability

- **Exact base SHA:**
- **Exact head SHA:** `CURRENT_PR_HEAD`
- **Change class:** product | implementation | UX | security/authority |
  incident repair | release | research | governance | documentation
- **Agent loop profile:** research | product-definition | implementation |
  ux-creation | security-authority | incident-repair | release-outcome |
  deterministic exemption
- **Run ID:**
- **OutcomePacketV1 path and digest:** `CI_GENERATED`
- **Terminal state:** succeeded | failed_verification | blocked |
  approval_required | budget_exhausted | cancelled
- **Requirement / assertion IDs:**
- **Affected product card IDs:**
- **Affected invariant IDs:**
- **ADRs added or updated:**
- **Investigations added or updated:**

`CURRENT_PR_HEAD` is allowed only in moving PR prose and is resolved by CI to
the pull-request event head. A literal 40-character SHA is also valid when it
matches that head. `CI_GENERATED` is allowed only for a succeeded moving PR:
the final PR-outcome job creates and validates the exact-head packet from the
same workflow run after all five prerequisite jobs pass. Immutable evidence,
release, and deployment records never use that token; they require literal
commit/tree and artifact identities.

If this is a trivial deterministic exemption, name the deterministic command,
why no agent loop is required, and the exact evidence produced. An exemption
cannot waive authority, security, product, or release gates.

## Expected outcome and artifact

- **Artifact contract:**
- **Objective expected outcome:**
- **Pass/fail assertions:**
- **Required real-environment observations:**
- **Known limitations:**

Subjective claims such as “looks good,” “finished,” or “improved” require
objective assertions and an evaluator before they can pass.

## Authority and effect analysis

- Who may read, create, change, confirm, recover, publish, or approve state
  after this change?
- Which permissions or participant authorities remain unchanged?
- Does this introduce a credential use, external write, custody path,
  privileged command, canonical store, or new recipient-authority path?
- List every external effect, idempotency key, approval record, before/after
  readback, and reconciliation state. Write `None` only after checking.
- Could the author be approving their own critical security, authority, money,
  privacy, recovery, credential, or release work?

Agent runs, tests, KGs, Repo Graph, CI, evidence indexes, and PR approval never
create participant, membership, organizer, money, recovery, product-law, or
release authority.

## Failure and recovery analysis

What happens on cancellation, stale context, wrong root, retry, duplicate
submission, offline use, unavailable capability, partial failure, corrupted
state, expired approval, interrupted dispatch, mismatched readback, rollback,
and budget exhaustion?

An unknown external effect blocks redispatch until environmental
reconciliation. A repeated attempt without a changed hypothesis is a consumed
retry, not progress.

## Claim-to-evidence table

| Requirement or assertion | Claimed outcome | Evidence level | Exact command, artifact, or readback | Literal candidate / artifact identity | Result or gap |
|---|---|---|---|---|---|
| | | source-only / unit / simulated-integration / simulated-host / exact-candidate / real-host-chain / live-user / release / local-blocked | | | |

Evidence level IDs come from
`governance/agent-system/policies/evidence-levels.json`. `local-blocked` is
non-promotable. A skipped job, simulator, Vercel status, registry snapshot,
older SHA, payer transaction, or knowledge recall must not be relabelled as
stronger evidence.

## Independent evaluation

- **Evaluator / reviewer identity:**
- **Independence from author:** independent | deterministic-only |
  not-independent-and-blocked
- **Evaluation packet / artifact:**
- **Pass / fail / skip counts:**
- **Hard failures:**
- **Repair iterations and changed hypotheses:**

Critical security, authority, money, privacy, recovery, credential, and release
packages require a separately identified reviewer. CODEOWNERS routing alone is not proof of independence.

## Side investigations

List adjacent uncertainty, the dated investigation paths, conclusions, and
remaining unknowns. Write `None — no trigger applies` only after checking
`docs/investigations/README.md`.

## Provider independence and privacy

- [ ] No provider, model, agent framework, KG, graph, wallet, chain service, or
      operated backend became product law or participant authority.
- [ ] Provider-specific behavior is behind an adapter or is explicitly bounded
      to tooling; core semantics do not branch on provider/version names.
- [ ] No active Supabase package, runtime/API/Auth/Edge Function, environment
      variable, CLI, migration, workflow secret, or supported setup path was
      introduced.
- [ ] Prompts, credentials, personal data, receipts, raw run ledgers, and
      unredacted traces are excluded from committed artifacts and release bytes.
- [ ] Any historical provider reference is inactive, labelled, and excluded
      from supported runtime/setup paths.

## Verification

- [ ] `npm run context:validate`
- [ ] `npm run agent:validate`
- [ ] `npm run agent:ci`
- [ ] Relevant focused tests passed against the exact candidate.
- [ ] Applicable production-entrypoint or real-environment observations ran.
- [ ] Negative, interruption, retry, and failure paths were exercised.
- [ ] `git diff --check`
- [ ] Complete Git status and unrelated/attributed dirty paths were recorded.
- [ ] Documentation and Product Cockpit impact are explicit.
- [ ] Outcome/evidence artifacts passed redaction before promotion.

## Product and release state

Report independently; do not infer later states from earlier ones:

- **Product card status:**
- **implemented:** true | false
- **tested:** true | false
- **committed:** true | false
- **pushed:** true | false
- **candidate_built:** true | false
- **staged:** true | false
- **promoted:** true | false
- **reachable:** true | false
- **user_owned:** true | false
- **user_proven:** true | false
- **knowledge_verified:** true | false
- **ci_enforced:** true | false
- **branch_protected:** true | false

Requested decision: ACCEPT | ACCEPT WITH CONDITIONS | READY FOR INDEPENDENT
VERIFY | HOLD | REJECT / REDESIGN

Why the evidence permits that decision:

## Remaining risk and next bounded proof

What remains untested, simulated, stale, blocked, host-specific,
network-specific, device-specific, user-unproven, knowledge-unverified,
unenforced, or operationally unresolved? Name the single next bounded proof.

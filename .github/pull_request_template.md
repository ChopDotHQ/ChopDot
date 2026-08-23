## Summary

What changed, why, and where did it land?

## Supervision traceability

- **Exact base SHA:**
- **Exact head SHA:**
- **Change class:** executable source | backend/data | contract | tests | release tooling | research | documentation
- **Affected invariant IDs:**
- **ADRs added/updated:**
- **Investigations added/updated:**

## Authority and failure analysis

- Who can create, change, confirm, recover, or publish state after this change?
- What happens on cancel, retry, stale state, duplicate submission, offline use,
  unavailable capability, partial failure, and rollback?
- Does this introduce custody, privileged execution, a new canonical store, or a
  new recipient-authority path?

## Claim-to-evidence table

| Claim | Evidence level | Exact command or artifact | Candidate SHA | Result / gap |
|---|---|---|---|---|
| | source-only / unit / simulated-integration / simulated-host / exact-candidate / real-host-chain / live-user / release | | | |

A green skipped job, simulator, Vercel status, registry snapshot, or older SHA
must not be described as stronger evidence.

## Side investigations

List the adjacent questions investigated, the dated files, conclusions, and any
remaining uncertainty. Write `None — no trigger applies` only after checking the
triggers in `SUPERVISION.md`.

## Supabase independence

- [ ] No active Supabase package, runtime/API/Auth/Edge Function, environment
      variable, CLI, migration, workflow secret, or supported setup path was
      introduced.
- [ ] Any historical reference is clearly inactive and archival.

## Verification

- [ ] `node --test scripts/tests/verify-supervision-contract.test.mjs`
- [ ] `node --test scripts/tests/verify-pr-supervision.test.mjs`
- [ ] `node scripts/verify-supervision-contract.mjs`
- [ ] Relevant focused tests passed on this exact head.
- [ ] Negative/failure paths were exercised.
- [ ] Evidence paths and known gaps were updated in the machine contract.

## Release state

Requested decision: ACCEPT | ACCEPT WITH CONDITIONS | READY_FOR_CODEX_VERIFY | HOLD | REJECT / REDESIGN

Requested promotion, if any:

Why the available evidence permits that promotion:

Public-beta release enforcement:
- [ ] `node scripts/verify-supervision-contract.mjs --release` passed on the
      exact clean candidate, or this PR explicitly makes no release-ready claim.

## Remaining risk

What is still untested, simulated, stale, blocked, host-specific, network-
specific, device-specific, user-unproven, or operationally unresolved?

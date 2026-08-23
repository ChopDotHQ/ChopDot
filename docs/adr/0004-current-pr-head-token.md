# ADR 0004: Resolve moving PR heads in CI; require literal SHAs in immutable evidence

- **Date:** 2026-08-23
- **Status:** ACCEPTED
- **Affected invariants:** EVIDENCE-INV-001, PROVENANCE-INV-001
- **Exact source SHA:** CURRENT_PR_HEAD
- **Supersedes / superseded by:** None

## Context

A pull request head changes whenever a commit is pushed. Requiring the PR body to
contain the new literal SHA creates an unavoidable event-snapshot race: the
`synchronize` event can capture the previous body before the new SHA is written.
GitHub also checks out a synthetic merge ref by default for `pull_request`
workflows, which can make a green job look like exact-head evidence when it is
not.

## Decision

Moving pull-request prose may declare `CURRENT_PR_HEAD`. The PR supervision gate
resolves that token to `pull_request.head.sha`, checks out that exact SHA, and
asserts the runtime Git HEAD against it. A literal 40-character SHA remains
accepted when it matches the event head.

Immutable evidence packets, deployment records, audit artifacts, and release
claims may not use the token. They require the literal full SHA, a clean
candidate, lockfile identities, build profile, checks, and timestamp.

## Alternatives considered

- Require contributors to update the literal SHA after each push: rejected
  because the event body can remain stale and creates a race rather than proof.
- Accept GitHub's merge ref as the candidate: rejected because it is not the
  source head and changes the meaning of exact-candidate evidence.
- Stop validating PR-head identity: rejected because stale evidence could be
  attached to newer source.

## Consequences

PRs remain easy to update while CI still binds every run to an exact source
commit. The workflow and token parser require regression tests. The PR body is a
moving traceability document; release evidence remains immutable and literal.

## Verification and evidence

- Runtime checkout assertion: `git rev-parse HEAD == pull_request.head.sha`.
- `scripts/tests/verify-workflow-exact-head.test.mjs` protects both workflow jobs.
- `scripts/tests/verify-pr-supervision.test.mjs` covers token resolution, matching
  literal SHAs, and stale declared/claim SHAs.

## Revisit trigger

Reopen if GitHub changes pull-request event or checkout semantics, or if the
project adopts a different immutable change-review system.

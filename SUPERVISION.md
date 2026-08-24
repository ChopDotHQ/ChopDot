# ChopDot Supervision Protocol

This is the operating system for building ChopDot without losing product truth,
security boundaries, prior decisions, known gaps, or the distinction between a
claim and its proof.

The human-readable protocol lives here. The machine-readable source is
`governance/supervision-contract.json`. `PRODUCT_TRUTH.md` remains the highest
product authority.

## Authority order

1. `PRODUCT_TRUTH.md` — durable product law.
2. `governance/supervision-contract.json` — invariant IDs, current proof state,
   required tests, evidence thresholds, and release blockers.
3. `SUPERVISION.md` — operating protocol for implementers and reviewers.
4. Dated ADRs in `docs/adr/` — revocable decisions with context and tradeoffs.
5. Dated investigations in `docs/investigations/` — questions, sources,
   experiments, conclusions, and unresolved uncertainty.
6. Evidence in `artifacts/` — immutable or reproducible proof tied to an exact
   candidate.
7. Plans, issue bodies, and chat — useful working context, never the final source
   of truth by themselves.

When documents conflict, do not silently choose. Record the conflict, establish
which authority applies, and create or update a dated ADR.

## The traceability chain

Every meaningful change must be traceable through:

```text
product law / decision
        -> invariant ID
        -> implementation paths
        -> automated checks
        -> exact-candidate evidence
        -> real-host / chain / user evidence where required
        -> release decision
```

A link may be incomplete. It may not be hidden. The machine contract records the
current state and the missing link.

## Promotion states

- `PROPOSED`: an idea, not accepted scope.
- `DOCUMENTED`: the invariant or decision is written, but not meaningfully tested.
- `AUTOMATED_PARTIAL`: focused automated checks exist, but candidate or real-host
  proof is still missing.
- `READY_FOR_CODEX_VERIFY`: implementation is ready for an independent exact-
  candidate verification pass.
- `VERIFIED_CANDIDATE`: required checks passed against the exact clean commit and
  dependency locks.
- `VERIFIED_REAL_HOST`: required real host, network, chain, device, or receiver
  proof passed with provenance.
- `RELEASED`: the published artifact and deployment record are tied to the exact
  verified candidate.

Promotion is monotonic only when evidence remains valid for the current source.
A source change can demote an invariant. A green check on an older SHA cannot
promote a newer SHA.

## Evidence ladder

These are deliberately different:

```text
source exists
< focused test executed
< integration executed against local/simulated dependencies
< host simulator executed
< exact clean candidate verified
< real host/network/chain verified
< receiver or live participant journey observed
< published release cryptographically tied to the candidate
```

A Vercel status is deployment-platform evidence, not Devnet proof. A skipped
browser job is not browser evidence. A host simulator is not a real host. A
finalized payer transaction is not receiver confirmation. A registry snapshot
is not proof that ChopDot was published or used.

## Supervisory review loop

For each meaningful PR or branch change, the reviewer records:

1. **Change** — executable source, backend/data, tests, deployment tooling,
   research, or documentation.
2. **Invariant impact** — IDs changed, challenged, or newly introduced.
3. **Authority impact** — who can create, change, confirm, recover, or publish
   state after the change.
4. **Failure behavior** — cancellation, stale data, retries, offline use,
   duplicate submission, rollback, partial success, and unavailable capability.
5. **Blast radius** — money, migration, identity, privacy, accessibility,
   network, custody, compatibility, and release provenance.
6. **Side investigation** — adjacent uncertainty checked before the change is
   accepted.
7. **Decision** — `ACCEPT`, `ACCEPT WITH CONDITIONS`,
   `READY_FOR_CODEX_VERIFY`, `HOLD`, or `REJECT / REDESIGN`.
8. **Next evidence** — the smallest proof required to advance.

The reviewer updates the machine contract when an invariant, state, check,
minimum release threshold, evidence path, or known gap changes.

## Exact money and conservation

Canonical money uses integer base units serialized without precision loss and an
explicit currency scale. All allocation, correction, refund, and settlement
operations conserve units exactly. No canonical financial decision may depend
on floating-point tolerance. Different currencies remain separate unless an
explicit conversion event records the rate, source, timestamp, rounding rule,
and responsible participant.

## Failure semantics

A failed, cancelled, unavailable, stale, unverified, or partially completed
remote, host, delivery, database, or chain action must not change canonical
financial state or be described as successful. Retry and idempotency behavior
must be explicit. Evidence attachment and state transition must be atomic where
they jointly establish a financial claim.

## Provider independence

The supported ChopDot path must not require Supabase for runtime, auth,
development, tests, migrations, CI, deployment, or operations. Active source and
configuration may not depend on Supabase packages, environment variables, APIs,
Edge Functions, CLI commands, or secrets. Historical material may remain only
inside clearly inactive archival locations and must not be imported, executed,
or presented as current setup.

The structural gate scans active source and configuration for reintroduction.
Negative test fixtures are narrowly allowlisted by path and pattern.

## Identity and recipient binding

A name, contact, QR code, pointer, registry entry, or typed address is a hint,
not permanent recipient authority. A payment path must bind the intended person
to the current account, network, and capability; handle rotation, revocation,
staleness, and cross-network confusion; and show the participant enough context
to approve safely.

## Persistence and migrations

Persisted schemas have explicit versions. Migrations are ordered, idempotent,
and deterministic. Before a financial migration, preserve a recoverable raw
backup. Ambiguous or corrupt records are quarantined with reasons rather than
silently rounded, dropped, or rewritten. Reloading an already migrated state
must not rerun or alter the migration.

## Accessibility and mobile proof

The exact candidate must pass narrow mobile viewports, keyboard-only operation,
visible focus, accessible names, status announcements, reduced-motion behavior,
large and long content, and safe-area behavior inside the actual embedded host.
A public beta also requires a recorded VoiceOver or TalkBack walkthrough of the
core money journey. Automated viewport simulation alone is not sufficient.

## Custody change control

Custody and escrow are open product decisions, not forbidden product law. They
may not be introduced incidentally. Any feature that can hold, pool, release,
redirect, freeze, or recover participant funds requires a dated ADR, legal and
regulatory review, a threat model, operational controls, explicit participant
consent, and release-specific approval before implementation is accepted.

## Side-investigation triggers

A side investigation is mandatory when a change introduces or alters:

- money types, precision, splitting, corrections, refunds, exchange rates, or
  migration behavior;
- identity, contacts, account rotation, names, recovery, signatures, or replay;
- a Product SDK, TrUAPI, host, network, asset, contract, registry, or chain fact;
- public or shared storage, delivery, synchronization, indexing, analytics, or
  retention;
- payment evidence, reversals, fees, custody, escrow, or release authority;
- a core journey, failure message, mobile layout, keyboard path, or assistive-
  technology behavior;
- a smart contract or privileged backend command.

The investigation must identify the question, why it matters, authoritative
sources, experiments, results, uncertainty, product impact, and the resulting
accept/hold/redesign recommendation. Use `docs/investigations/0000-template.md`.

## Adding a new feature without losing the system

Before coding, identify the affected invariant IDs. If none fit, add a new ID to
the machine contract before or with the implementation. Add or update the dated
ADR when authority, data ownership, custody, release semantics, or platform
boundaries change. Add the side investigation when one of the triggers applies.
Add focused tests and declare what evidence level they actually produce. Update
the PR claim-to-evidence table. Promote the invariant only after the required
proof exists on the exact current candidate.

## Commands

```bash
node --test scripts/tests/verify-supervision-contract.test.mjs
node --test scripts/tests/verify-pr-supervision.test.mjs
node scripts/verify-supervision-contract.mjs
node scripts/verify-pr-supervision.mjs
node scripts/verify-supervision-contract.mjs --release
```

The first two commands test the gates themselves. The structural verifier checks
the contract, traceability links, npm scripts, evidence-state claims, and
provider independence. The PR verifier checks that a pull request names exact
SHAs, affected invariant IDs, authority/failure analysis, claim/evidence rows,
side investigations, provider-independence attestations, a decision, and
remaining risk. The release command enforces every invariant's declared public-
beta minimum and is expected to fail until the release candidate has the
missing candidate, real-host, accessibility, chain, receiver, and release
evidence.

A passing structural gate means the memory system is internally consistent. It
is not a release claim.

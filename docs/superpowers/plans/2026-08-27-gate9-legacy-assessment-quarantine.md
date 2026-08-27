# Gate 9 legacy assessment and quarantine change pack

**Kind:** implementation plan
**Status:** active bounded change pack
**Owner:** core-authority
**Last reviewed:** 2026-08-27
**Applies to:** `chopdot-v1-launch`
**Authority:** bounded implementation routing only; Product Truth, current Cockpit, context manifest, and release state win

## Goal

Make every pre-authority local group deterministic and honestly reviewable
without converting an unsigned snapshot into signed membership, money,
payment, or closeout history.

## Current truth to preserve

- `ProductionAuthority` is the only production boundary for accepted shared
  money and membership changes.
- A legacy group without an authority journal is read-only.
- `migrateLegacyAppState` currently characterizes number-valued legacy money
  only in tests; it is not a production promotion path.
- Product Account keys present in a snapshot do not prove possession, consent,
  membership, organizer authority, payer authority, or a signature.

## Scope in

- Deterministic assessment of the exact legacy projection cache.
- Whole-group `ready_for_review`, `quarantined`, or
  `superseded_by_authority` verdicts with stable reason codes.
- Explicit-currency, exact-money, reference, roster, payer, split, identifier,
  status, orphan, conservation, and collision checks.
- Encrypted immutable persistence of the assessment and its exact redacted
  migration-source packet outside authority journals, keyed by assessed-source
  digest plus authority-context digest.
- Production bootstrap wiring and a read-only context result.
- Unit, restart/idempotency, corruption, and bootstrap tests.
- Exact-head portable knowledge record and recall for the accepted source,
  tests, and evidence. This is operational evidence only and cannot promote a
  legacy projection or create product authority.

## Scope out

- No automatic `ChopEventV1`, authority journal, group, membership, role,
  invitation, key grant, payment, confirmation, or close creation.
- No inference from global currency preference, local status labels, stored
  public-key strings, current user, wallet, personhood, or organizer labels.
- No partial import of a quarantined group and no silent deletion of source
  data.
- No participant-signed promotion ceremony or migration UI in this slice.

## Requirements

1. The assessor SHALL domain-separate and hash a canonical packet containing
   only the migration-relevant source subset. Finite fractional numbers SHALL
   use deterministic IEEE-754 encoding; non-finite values SHALL become typed
   quarantine findings. The same relevant source SHALL produce the same digest
   regardless of object insertion order.
2. Every expense SHALL carry an explicit supported currency and exact
   representable amount; global currency preference SHALL NOT fill a gap.
3. Every group, expense, split, user, member, and payer reference SHALL be
   internally consistent; any group-scoped failure SHALL quarantine the whole
   group without partial observations.
4. Legacy statuses and closed-record identifiers SHALL be retained only as
   labelled, non-authoritative claims.
5. An existing authority-journal identifier for the same group SHALL produce a
   provisional `superseded_by_authority` finding; the assessor SHALL NOT read,
   merge, or overwrite that journal, and normal hydration SHALL still validate
   it. Startup SHALL observe the exact journal-ID set before and after
   assessment, retry a bounded number of times when it changes, and fail closed
   rather than expose a stale ready verdict.
6. Assessment persistence SHALL be immutable, encrypted, and isolated outside
   the authority-journal object store. It SHALL preserve the exact redacted
   source packet whose digest was assessed, so later projection replacement
   cannot erase the evidence needed to reproduce the verdict. Its key and
   authenticated identity SHALL bind both the assessed-source digest and
   authority-context digest. An exact duplicate SHALL be idempotent; same-key
   different content SHALL be treated as corruption and never overwrite
   evidence.
7. Production startup SHALL capture the relevant immutable source subset before
   hydration or projection persistence and assess it before declaring authority
   ready. The assessment path SHALL NOT mutate any source row. Normal authority
   hydration MAY replace superseded projection-cache rows only after the exact
   redacted source packet is durably preserved in the encrypted assessment.
   Raw sessions, capabilities, wallet/payment details, and arbitrary activity
   data SHALL NOT enter that packet.
8. Invalid or corrupt assessment storage SHALL fail visibly and SHALL NOT
   weaken the authority boundary.
9. After the accepted source and evidence are committed, a clean exact-worktree
   Repo Graph packet SHALL cite the implementation, focused Node proof,
   real-browser proof, this change pack, and the accepted evidence file by
   current SHA-256. A valid independently accepted `OutcomePacketV1` SHALL be
   durably recorded and recalled through the provider-neutral Knowledge Context
   Port at the same root, branch, commit, and tree. Missing required citations,
   wrong lineage, stale state, fallback, or outcome-digest mismatch SHALL keep
   the scoped knowledge verdict false.

## GIVEN / WHEN / THEN

- GIVEN a complete explicit-currency conserved group, WHEN startup assesses
  it, THEN one deterministic `ready_for_review` packet is persisted and no
  authority event or journal is created.
- GIVEN missing currency, ambiguous money, unknown status, broken conservation,
  identifier mismatch, orphan row, or non-member payer/split, WHEN assessed,
  THEN the whole affected group is quarantined with stable reason codes.
- GIVEN public-key strings for every user, WHEN assessed, THEN membership,
  organizer, signer, and payer authority remain unproven.
- GIVEN a group ID already present in the authority journal, WHEN assessed,
  THEN it is marked `superseded_by_authority` and the journal is unchanged.
- GIVEN the journal-ID set changes during assessment, WHEN bootstrap rechecks
  it, THEN it retries boundedly and exposes no ready verdict until two
  consecutive exact sets match.
- GIVEN identical relevant source and authority context after restart, WHEN
  assessed again, THEN the same digests are returned without a duplicate
  assessment write.
- GIVEN an operator later chooses promotion, WHEN participant ceremonies have
  not supplied signed origin/membership/payer events, THEN the system stops at
  review and cannot claim migration complete.
- GIVEN a graph packet from another root, branch, commit, tree, or source hash,
  WHEN the Gate 9 outcome is read, recorded, or recalled, THEN the portable
  knowledge verifier rejects it and `gate9_kg_known` remains false.

## Expected evidence

- Exact source commit and tree.
- Focused assessment/store/bootstrap pass counts.
- Real-browser IndexedDB v2-to-v3 upgrade, encrypted-at-rest, immutable-add,
  AAD/tamper rejection, reset, and key-reenrollment proof.
- Full Node, TypeScript, build, wiki, Cockpit, and diff checks.
- Independent security/authority review with repairs and final verdict.
- Evidence packet, checkpoint, Repo Graph refresh, and cited recall status.
- Knowledge read, durable-record, and recall receipts bound to the accepted
  outcome digest; legacy KGv2 read status is reported separately from the
  provider-neutral scoped verdict.

## Failure and exit

Any fabricated authority, inferred currency, partial group import, plaintext
assessment, journal collision, nondeterministic digest, or false ready state
blocks this slice. The slice exits only when production bootstrap is wired,
tests prove zero authority creation, independent review has no P0/P1, and the
accepted exact-head outcome has current cited record-and-recall proof. A legacy
KG backend that cannot expose commit lineage remains explicitly partial rather
than being treated as a substitute for the portable verdict.

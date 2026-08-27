# Gate 9 legacy assessment and quarantine change pack

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
- Encrypted persistence of the assessment outside authority journals,
  idempotent by source digest.
- Production bootstrap wiring and a read-only context result.
- Unit, restart/idempotency, corruption, and bootstrap tests.

## Scope out

- No automatic `ChopEventV1`, authority journal, group, membership, role,
  invitation, key grant, payment, confirmation, or close creation.
- No inference from global currency preference, local status labels, stored
  public-key strings, current user, wallet, personhood, or organizer labels.
- No partial import of a quarantined group and no silent deletion of source
  data.
- No participant-signed promotion ceremony or migration UI in this slice.

## Requirements

1. The assessor SHALL hash a canonical source packet and produce the same
   assessment digest for the same source regardless of object insertion order.
2. Every expense SHALL carry an explicit supported currency and exact
   representable amount; global currency preference SHALL NOT fill a gap.
3. Every group, expense, split, user, member, and payer reference SHALL be
   internally consistent; any group-scoped failure SHALL quarantine the whole
   group without partial observations.
4. Legacy statuses and closed-record identifiers SHALL be retained only as
   labelled, non-authoritative claims.
5. An existing authority journal for the same group SHALL produce
   `superseded_by_authority`; the assessor SHALL NOT read, merge, or overwrite
   that journal.
6. Assessment persistence SHALL be encrypted and namespaced outside the
   authority-journal object store. An unchanged source digest SHALL be
   idempotent.
7. Production startup SHALL assess before declaring authority hydration ready
   and SHALL expose the read-only verdict without promoting any source row.
8. Invalid or corrupt assessment storage SHALL fail visibly and SHALL NOT
   weaken the authority boundary.

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
- GIVEN identical source bytes after restart, WHEN assessed again, THEN the
  same digest is returned without a duplicate assessment write.
- GIVEN an operator later chooses promotion, WHEN participant ceremonies have
  not supplied signed origin/membership/payer events, THEN the system stops at
  review and cannot claim migration complete.

## Expected evidence

- Exact source commit and tree.
- Focused assessment/store/bootstrap pass counts.
- Full Node, TypeScript, build, wiki, Cockpit, and diff checks.
- Independent security/authority review with repairs and final verdict.
- Evidence packet, checkpoint, Repo Graph refresh, and cited recall status.

## Failure and exit

Any fabricated authority, inferred currency, partial group import, plaintext
assessment, journal collision, nondeterministic digest, or false ready state
blocks this slice. The slice exits only when production bootstrap is wired,
tests prove zero authority creation, and independent review has no P0/P1.

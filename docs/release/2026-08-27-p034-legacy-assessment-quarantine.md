# P-034 legacy assessment and quarantine evidence

**Kind:** measurement
**Status:** accepted Gate 9 migration slice; P-034 remains building
**Owner:** core authority
**Measured:** 2026-08-27
**Worktree:** `/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch`
**Branch:** `codex/chopdot-v1-launch`
**Source commit:** `37c2ac134cb1d77b6f91ca3759f66270da6d61a1`
**Source tree:** `3a708f997ec665c431fd667112586294f4532467`

## Expected outcome

Every pre-authority local projection is assessed deterministically without
turning an unsigned cache into membership, money, payment, or closeout truth.
A complete explicit-currency group may become `ready_for_review`; any ambiguous
money, unsupported currency, malformed identifier, broken reference, missing
payer allocation, unknown status, orphan, nonconservation, or authority
collision fails closed for the whole group. Review never creates authority.

## Accepted boundary

- The assessed source is a domain-separated, canonical, redacted packet.
  Number values retain their exact IEEE-754 bytes. Sessions, capabilities,
  wallets, payment receipts, activity, presentation state, and raw keys are
  excluded.
- Supported legacy partitions are versioned: CHF, EUR, GBP, and USD use
  exponent 2; PAS uses product exponent 12. Unknown currencies are quarantined.
- Identifiers remain exact opaque strings. Whitespace or Unicode normalization
  is never used to manufacture a match.
- Every ready expense has one exact payer allocation, unique participants,
  conserved shares, supported money, and recomputed currency totals.
- The exact redacted packet, authority-ID set, findings, claims, observations,
  verdicts, and digests are stored immutably in a dedicated encrypted IndexedDB
  store. AES-GCM additional authenticated data binds each record key.
- Validation reconstructs the source packet, reassesses it independently, and
  canonical-compares the complete result. A re-digested 10-to-20 CHF semantic
  forgery is rejected before any row is written.
- Startup persists and reads back the assessment before authority hydration,
  consumes one bounded retry if journal IDs change, and exposes no ready state
  until hydration and the final collision check agree.
- Reset clears journals, deliveries, and assessment ciphertext before deleting
  the shared non-extractable key.

No `ChopEventV1`, authority journal, signer, participant key, membership,
payment, close, or compare-and-swap write is created by assessment.

## Verification newly executed

```text
npx tsc --noEmit
PASS, 0 diagnostics

node --import tsx --test tests/candidate-batch3-money-migration.test.ts
21 passed, 0 failed

npx playwright test \
  tests/candidate-batch3-legacy-assessment-indexeddb.spec.ts \
  --config=playwright.host-sim.config.ts --workers=1
2 passed, 0 failed

npx playwright test \
  tests/named-mode-multi-account-production-entrypoint.spec.ts \
  --config=playwright.host-sim.config.ts --workers=1
5 passed, 0 failed

npm run test:node
369 passed, 0 failed

npm run build
PASS

npm run security:baseline
PASS, 198 files checked

git diff --check
PASS
```

One adjacent-process browser run encountered a host-server lifecycle refusal
after its first test, and a concurrent reviewer run was interrupted by Vite
navigation while source files were changing. Neither run is counted as passing
evidence. The stable post-edit host-configured run passed 2/2, and the hostile
reviewer independently passed the unchanged suite 2/2 with an isolated held
Vite server.

## Independent review

Successive hostile reviews found and repaired:

1. format-only currency acceptance, missing payer allocation, identifier
   trimming, and shape-only readback validation;
2. source-cache replacement without reconstructable evidence, incomplete
   finding paths, locale-sensitive ordering, and technical error exposure;
3. assessment-ready exposure before the final journal collision check; and
4. re-digested source-packet semantics that did not match observations.

The final independent verdict is **PASS: 0 P0, 0 P1**. The synchronous
structural validator is internal; the only exported verifier performs full
structure, digest, and source-semantic replay validation.

## File fingerprints

```text
aed71d6e6ddbf6dd3e3018340abbaee66e079ecea8522b493499a8af89cf1356  src/core/legacyMoneyMigration.ts
80ccbc227ef3f9c228fa11c26506e534df5dde7a1d52d26c4729a8f12d4b3bf5  src/core/authority/browserAuthority.ts
f80f4cc735ab3dc0d2415c6c85dbed92f4733b8df15561ff6a7bc87ef6110a32  src/state/AppStateContext.tsx
291a407bf6a88558c0a2e1647aeb637127c394d544d86c7579f5dbe15cf7096a  tests/candidate-batch3-money-migration.test.ts
096178aa1a1b7c5942e0790770f947188dd52f73a01314bcebc3ffb1f887279f  tests/candidate-batch3-legacy-assessment-indexeddb.spec.ts
c336775d2c43127a5757b6140671fb4a982226c920b4f89f486cc4ce5ba07cd9  tests/named-mode-multi-account-production-entrypoint.spec.ts
54826399a9a575aa1cfefb64705840a7038c8fdb9805cf45037c4508411a8b11  docs/superpowers/plans/2026-08-27-gate9-legacy-assessment-quarantine.md
```

## Remaining P-034 work

This slice closes the fail-closed legacy assessment requirement. P-034 remains
open for the production-entrypoint successor delivery-failure retry proof,
exact PAS initiation, removal of reusable session secrets, and final parity
between the production authority projection and all remaining UI reducers.

One non-blocking collision-path evidence item remains for the later production
entrypoint assurance wave: a real browser with a valid existing authority
journal must prove encrypted source preservation, verified hydration, and
replacement of only the superseded legacy cache row.

## Documentation impact

`docs/wiki/03-state-models/one-chop-core.md` is updated with the assessment and
quarantine boundary. ADR 0001 does not change: this slice enforces its existing
rule that encrypted local projections are not shared authority.

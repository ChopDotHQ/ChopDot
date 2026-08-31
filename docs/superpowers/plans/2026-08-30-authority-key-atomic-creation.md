# Atomic browser authority-key creation

**Kind:** execution plan
**Status:** implemented and independently reviewed on the original slice; fresh release-base integration review pending
**Owner:** core authority implementation owner
**Last reviewed:** 2026-08-31
**Applies to:** `codex/authority-key-race-fix`
**Authority:** browser authority storage only; cannot change product, membership, money, or release policy

## Goal

Make first-use creation of the nonextractable browser authority encryption key
atomic so concurrent vault startups converge on one stored key and all ciphertext
written during that startup remains decryptable.

## Current truth to preserve

- Authority journals, deliveries, and legacy assessments remain encrypted with a
  nonextractable AES-GCM key stored by the browser origin.
- Authenticated decryption failure remains corruption and fails closed.
- Legacy assessment records remain metadata only and cannot create money,
  membership, organizer, or recovery authority.
- A malformed stored key is not permission to replace it and silently orphan
  existing ciphertext.

## Scope in

- Replace the non-atomic `get -> generate -> put` key path with atomic
  create-if-absent behavior.
- Re-read and validate the winning stored key after a genuine IndexedDB
  `ConstraintError`.
- Reject an existing malformed key without overwriting it.
- Add a browser regression that races two independent vault instances and proves
  one durable key decrypts both accepted legacy-assessment records.
- Rerun the StrictMode fixtures that exposed the startup race.

## Scope out

- UI copy, entrance behavior, accessibility timing, product cards, money rules,
  membership, recovery flows, workflow/Gitleaks changes, proof regeneration,
  deployment, commit, or push.

## Requirements

1. First key creation SHALL use IndexedDB add-if-absent semantics.
2. A concurrent loser SHALL proceed only after reading and validating the key
   that won the same database/key slot.
3. An existing non-`CryptoKey`, extractable key, wrong algorithm, wrong length,
   or wrong usage set SHALL fail closed and SHALL NOT be replaced.
4. Decryption/authentication failure SHALL continue to report bounded corruption
   and SHALL NOT retry with a newly generated key.
5. Two concurrent vault startups SHALL converge without creating unreadable
   legacy-assessment ciphertext.

## Authority and recovery failure contract

- **Expected outcome:** every concurrent caller encrypts with the single durable
  key stored at `journal-encryption-key`; accepted ciphertext survives later
  vault recreation and remains authenticated/decryptable.
- **Authority boundary:** key creation changes no group, event, money,
  membership, organizer, recovery, or release authority.
- **Recovery boundary:** the repair prevents first-start ciphertext orphaning;
  it does not recover ciphertext already encrypted under a lost or overwritten
  key and must not claim that it can.
- **Failure:** malformed stored key, unexpected IndexedDB error, missing winner
  after a creation race, or authenticated decryption failure returns an error
  and changes no authority state.
- **Owner:** core authority implementation owner; independent review remains
  required for acceptance.
- **Retry:** fix the exact storage/concurrency hypothesis and rerun the focused
  browser regression plus the previously failing StrictMode cases.
- **Exit:** concurrent regression passes repeatedly, relevant StrictMode cases
  no longer show the startup safety screen, and no unrelated tracked path is
  changed.

## Documentation impact

This plan records the bounded authority repair. No product wiki or ADR update is
required unless implementation changes authority semantics beyond atomic key
creation.

## Verification evidence

- The new simultaneous-start regression failed on the prior implementation with
  `Legacy assessment storage is corrupt.` (`1 failed`).
- `npm ci` hydrated this exact worktree; `node_modules`, the Playwright CLI,
  `@playwright/test`, Vite, and the running test server all resolved inside the
  authority-key worktree rather than another checkout.
- Focused concurrency, malformed-key classes, synchronous setup failure, and
  existing assessment encryption/tamper/reset suite: `8 passed`.
- Forced eight-writer distinct-record convergence, authenticated readback, and
  database-deletion stress repeated ten times: `10 passed`.
- The three StrictMode fixture specs were run with their generated screenshots
  redirected to a temporary working directory and an isolated exact-worktree
  server through the test-only `AUTHORITY_KEY_TEST_BASE_URL`: `10 passed`; no
  tracked proof output changed. Without the override, tests still default to
  `http://127.0.0.1:4177`.
- The production build completed successfully from the exact dependency tree.
- Exact-worktree `tsc --noEmit` completed successfully.

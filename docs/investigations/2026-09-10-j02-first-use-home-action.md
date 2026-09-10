# 2026-09-10 — J02 first-use Home action selection

**Kind:** investigation  
**Status:** concluded  
**Trigger:** Golden #1 J02 first-use Home contract; Product Card P-022; PR #39  
**Owner:** production integration worker  
**Independent reviewer:** none assigned; deterministic GitHub Actions only  
**Opened / concluded:** 2026-09-10 / 2026-09-10  
**Exact target root:** `ChopDotHQ/ChopDot`  
**Exact target branch:** `integration/golden-product-v1`  
**Exact starting commit / tree:** `60ee90574b9496d053f4f26933b5fbb3a200ebe9` / `632bf7bbd9ec9e593177e83bd50a2a98a0beb99f`  
**Complete starting Git status:** GitHub branch-ref/object evidence only; no local worktree was used. The exact starting Git object is recorded above, but this investigation makes no uncommitted-worktree cleanliness claim.  
**OutcomePacketV1 / evidence reference:** not yet produced for the final PR head  
**Supersedes / superseded by:** none

This investigation may inform the bounded implementation decision but cannot change `PRODUCT_TRUTH.md`, Product Cockpit priority, participant authority, Golden approval, or release state by itself.

## Question

Can ChopDot remove the duplicate receipt-capture path from the zero-group first-use Home state, preserving `New group` as the one useful first action while retaining receipt capture for returning users, without changing participant authority, money state, persistence, privacy boundaries, or approved Golden artifacts?

## Decision at risk

The decision is whether the first bounded production-integration slice for Golden #1 / J02 and Product Card P-022 is safe to keep on PR #39. The affected product behavior is first-use Home action selection only. No money, membership, signer, recovery, chain, custody, or release-authority invariant is proposed to change.

## Declared universe and exclusions

In scope:

- protected release baseline `codex/chopdot-v1-launch` at `dd2a1b16913f2524e81e58e585139d457deac1dc`;
- canonical UX branch `ux/experience-workbench` and Golden #1 J02 contract/checksum authority;
- Product Card P-022 on the release baseline;
- `src/components/Home.tsx`, `src/components/homePresentation.ts`, and `src/components/homePresentation.test.ts` on the integration branch;
- exact implementation commit `db09f8eb8853b3a7ed4ec55b9a3e89e8fc09978d`, tree `6cb8eff4121667c5b0e1a0e92ae742e36ea81d7e`;
- GitHub Actions run `34520310267` for exact implementation-commit application assurance.

Excluded from this conclusion:

- full J02 visual hierarchy and Golden parity;
- overall-position and compact-wallet work;
- caught-up/offline/loading state completion beyond the action-selection rule;
- J20/J21 implementation;
- production deployment, live-user evidence, release promotion, or protected-branch merge;
- Vercel Hobby quota state as acceptance evidence.

## Sources and provenance

| Source / experiment | Identity, version, and timestamp | SHA-256 / commit / artifact / run | Access and evidence level | Limitation |
|---|---|---|---|---|
| Canonical J02 Golden manifest/spec | `ux/experience-workbench`, read 2026-09-10 | Golden #1 artifact SHA-256 `578ff52775d7205b7f2262676f322807849e2f5788f219dc9eacbb9e5d3aec2f` | repository source, `source-only` | Establishes approved product/UX contract, not production implementation |
| Product Card P-022 and release governance | `codex/chopdot-v1-launch` at `dd2a1b16913f2524e81e58e585139d457deac1dc`, read 2026-09-10 | commit `dd2a1b16913f2524e81e58e585139d457deac1dc` | repository source, `source-only` | Establishes priority/requirements, not rendered acceptance |
| Starting Home implementation | integration branch before this slice | commit `60ee90574b9496d053f4f26933b5fbb3a200ebe9`, tree `632bf7bbd9ec9e593177e83bd50a2a98a0beb99f` | repository source, `source-only` | Static source observation only |
| Bounded Home implementation | `src/components/Home.tsx`, `homePresentation.ts`, `homePresentation.test.ts` | commit `db09f8eb8853b3a7ed4ec55b9a3e89e8fc09978d`, tree `6cb8eff4121667c5b0e1a0e92ae742e36ea81d7e` | exact Git candidate, `exact-candidate` | Later documentation commits require a final exact-head rerun |
| Application fast assurance | GitHub Actions `Agent canonical outcome CI`, run `34520310267`, 2026-09-10 | run `34520310267`; artifact ID `10169424660`; uploaded artifact ZIP SHA-256 `6b8a05422d0a7f05d9ebb6ee5076efe8674d668d003b6c49357114ab43f8eb2c` | hosted exact implementation candidate; `exact-candidate` plus unit evidence | Browser job was cancelled before production-entrypoint assurance completed; no browser clearance |

## Method

1. Read the protected release baseline, J02 Golden contract, P-022, product authority/security documents, and existing Home presentation code.
2. Compare the zero-group first-use actions against the approved J02/P-022 rule that the first-use state centers one useful next action.
3. Keep the existing `New group` primary action unchanged and move only the receipt-shortcut eligibility rule into the deterministic Home presentation layer.
4. Add a focused negative/alternate-state test: zero groups must return `false`; at least one open group must return `true`.
5. Run hosted assurance against the exact implementation commit through the repository’s existing GitHub Actions workflow.
6. Treat browser cancellation, governance metadata failure, and Vercel quota state separately from application fast-assurance evidence rather than relabelling them as product success or failure.

## Facts

1. The starting zero-group Home rendered the existing `New group` primary action and, later on the same screen, an unconditional `Scan a receipt` shortcut.
2. The approved J02 first-use contract and P-022 require a focused first-use Home with one useful next action rather than competing creation/capture paths.
3. Commit `db09f8eb8853b3a7ed4ec55b9a3e89e8fc09978d` changes only Home presentation code/tests for this slice: `shouldShowHomeReceiptShortcut()` returns true only for the returning Home state, and `Home.tsx` renders the receipt section only when that predicate is true.
4. The focused test proves both sides of that rule: empty Home hides the shortcut; returning Home makes it eligible.
5. GitHub Actions run `34520310267` checked out exact commit `db09f8eb8853b3a7ed4ec55b9a3e89e8fc09978d` and exact tree `6cb8eff4121667c5b0e1a0e92ae742e36ea81d7e`.
6. On that exact implementation commit, Application fast assurance passed TypeScript typecheck, Vite build, 378/378 Node tests with zero failures/skips, including the new Home test, and `security:baseline` over 200 files.
7. The same workflow’s repository-governance job failed because the then-current PR body did not use the canonical traceability template. That is process-evidence failure, not application-test failure.
8. The same workflow’s browser assurance was cancelled before its production-entrypoint browser step completed. It grants no browser clearance.

## Inferences

The smallest implementation change is consistent with the bounded first-use rule and preserves the returning-user receipt shortcut. Because the change is presentation-only and introduces no state mutation or external effect, it does not require a data migration or new authority path.

The evidence supports keeping this bounded slice for further exact-head verification. It does not support claiming full J02 Golden conformance, visual parity, browser acceptance, release readiness, or live behavior.

## Assumptions and unknowns

- Full J02 visual hierarchy remains knowingly incomplete on the release implementation.
- Exact final-PR-head browser assurance remains required because the previous browser job was cancelled.
- Later documentation commits must pass the same exact-head application/governance gates before this PR can advance beyond independent verification.
- No live-user or deployment observation is available or required for this bounded slice.

## Counterevidence and adversarial checks

The strongest product counterargument is that hiding receipt capture on first use could remove a legitimate capability. The focused alternate-state assertion addresses the bounded regression risk: receipt capture is not deleted and remains eligible immediately after an open group exists. This investigation does not claim the shortcut is reachable through any other first-use route.

The strongest process counterevidence is the failed governance job and cancelled browser job in run `34520310267`. They are preserved as gaps rather than ignored. The PR body is repaired separately, and a new exact-head run is required before promotion of evidence.

## Authority and effect impact

No actor gains or loses authority over money, membership, organizer actions, recipient confirmation, recovery, keys, signatures, chain execution, or release. The changed predicate only selects whether a local presentation shortcut is shown in an already-derived Home state. No credential, external write, idempotency key, approval record, custody path, persistence migration, before/after product readback, or reconciliation step is introduced.

## Product and build impact

Affected product card: P-022.  
Affected Golden: #1 / J02 Home / Orientation v1.4.  
Affected source/tests: `src/components/Home.tsx`, `src/components/homePresentation.ts`, `src/components/homePresentation.test.ts`.  
Affected acceptance documentation: `docs/GOLDEN_TO_IMPLEMENTATION_LEDGER.md` and PR #39.

Must remain unchanged: all approved Golden HTML/checksums, product authority/security contracts, money/membership/recovery behavior, protected branches, deployments, and J21 approval state.

## Decision

`ACCEPT WITH CONDITIONS`

Keep the bounded J02 first-use action slice on the integration PR because exact implementation-commit typecheck/build/unit/security evidence passes and the alternate returning state is covered. Do not promote the slice to full Golden conformance, mergeability, release, or live status until the final PR head passes repository governance and production-entrypoint browser assurance and produces the CI-generated exact-head outcome packet.

## Required follow-up evidence

Run the repository’s full exact-head `Agent canonical outcome CI` against the final integration-branch head after this investigation and ledger update. Required evidence level: `exact-candidate`. The run must include successful Application fast assurance, Application browser assurance, repository/context/product/wiki governance, agent-contract validation, secrets scan, and CI-generated OutcomePacketV1. Stop rather than merge/deploy if any gate fails; repair only a concrete failure within this bounded slice.

## Documentation and provenance updates

- Link this investigation from PR #39.
- Update `docs/GOLDEN_TO_IMPLEMENTATION_LEDGER.md` with the exact implementation-commit fast-assurance result and preserve browser/governance as open until a final exact-head run succeeds.
- Record the material integration state in issue #38 once the final exact-head result is known.
- Preserve the earlier failed/cancelled run as provenance; do not rewrite it as green evidence.

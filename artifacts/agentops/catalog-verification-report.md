# Products Devnet Catalog and KGv2 Verification Report

Verified: 2026-08-22
Result: **PASS for catalog completion and exact-worktree KGv2 adoption; NOT a deployment go-live result.**

## 1. Exact worktree

- Root: `/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch`
- Branch: `codex/chopdot-v1-launch`
- HEAD: `3519a894efbcee5144ecb0bcb9ebc44b888a0e7f`
- Git state: dirty, entirely untracked at the time of final verification.
- Complete file-level porcelain status is stored under
  `details.complete_git_status` in `catalog-machine-verification.json`.
- Repo Graph dirty evidence: 8 collapsed untracked paths, no truncation;
  dirty-status digest
  `7d780e1f2777344908b7effceb7f9f1f455796458aec085d8dce82e6c5c74159`.

No commit was created.

## 2. Catalog completeness

- Official Parity GitHub universe: 775 reported, 775 fetched, 775 unique,
  exact reconciliation.
- Repository classification: 33 relevant platform, 26 relevant
  product/reference, 83 core/infrastructure, 245 adjacent/excluded with
  reason, 88 generated/test, 300 archived.
- Products Devnet directory: 249 app records, 249 unique, exact
  reconciliation: 80 published, 113 deployed, 56 name-only.
- Deep source audit: 36 selected, 36 verified, 0 blocked; 35 commit-pinned
  repositories and one verified empty repository.
- Bounded ChopDot decisions: 16, with 45 resolved evidence citations.

Digests:

- Repository snapshot:
  `a0a24125f8de78748e9f932298ac97229c09661dd49bf3cd385e58e3d114df27`
- Devnet registry snapshot:
  `7dd760070407595236b45e98c6fb2585211508968e3a8b1117282d4b89a9a98e`
- Source deep audit:
  `668f291a433b3e126b366031e13cc9b4bf9e4d9bcd818512a49f36c830955635`
- Machine catalog:
  `5014fefd5f43ae317426a48dbd35bb7de838909f1391fff895b9abf01e8e458d`

All four digests were recomputed successfully by
`scripts/research/verify-products-devnet-catalog.mjs`.

## 3. Context Graph v2 recall

- Requested path: `v2`
- Active path: `context_graph_v2`
- Runtime: `current_interpreter` at
  `/Users/devinsonpena/Documents/AutoBots/proofmap/.venv/bin/python`
- Fallback path retained: `kg_v1`
- Fallback used: `false`
- Fallback reason: empty
- Recalled facts: 7
- Citations: 7
- Exact-root decision citations: 6
- KGv2 packet digest:
  `6675f6f2437d8b176b7c3407c2da49d7e78f1ae90a580e530eb990ccf014f224`

Cited source paths and verified hashes:

- `docs/research/CHOPDOT_PLATFORM_ADOPTION_DECISIONS.md` —
  `4ebe18d174e6e241017cce55e83eb56cb4c159e98e3cd430f9259cc9d4a0d36c`
- `docs/research/RESEARCH-002_PARITY_PRODUCTS_DEVNET_CAPABILITY_CATALOG.md`
  — `5c3bf2c12157fdbc76c866a78812eca9f55dec3de23bd90156afece2211f8b26`

Every citation passed registered-root, within-root, existence, hash, branch,
and commit checks. KGv2 therefore durably knows this launch worktree under the
bounded repo identity `chopdot-v1-launch`; it is no longer relying on the older
canonical-checkout packet for this outcome.

## 4. Repo Graph packet

- Repo ID: `chopdot-v1-launch`
- Root, branch, and commit: exact match to section 1.
- Status: `working`
- Limitations: none
- Graph digest:
  `8d479070cef801e26779c79c65cf0dfe1b861fe1af295daddd90e581f86fe454`
- Packet digest:
  `fa64ca6d6c81490c96f0f8bb91103fa388f03fd9ddf2f8362750b1c458ce0782`
- Final incremental ingest: 2 events journaled and accepted, 0 duplicates,
  0 quarantined, 0 projection failures; AGE, Jena, and Neo4j each applied 2.

This packet describes the exact launch worktree. The previously registered
`chopdot` manifest still points at `/Users/devinsonpena/ChopDot`; it was not
substituted for this packet.

## 5. Wave 1A preservation

All nine Wave 1A files exist and remain untracked:

| Path | SHA-256 |
| --- | --- |
| `src/contacts/verifiedContact.ts` | `766877514be25fb7db4d1ee00d346f91c3c6bfa63c40ad4497cfc35857d6f993` |
| `src/contacts/verifiedContact.test.ts` | `d9ad18714d60e2846b6a197ed8d05a11486abc8c3d10de2d3e47f7d3e7ea161d` |
| `src/contacts/verifiedContactLink.ts` | `04991bac4a065a3660eb01889f6988bdbb58cc3ef942450423a38a8507cb689a` |
| `src/contacts/verifiedContactLink.test.ts` | `8e0ec87ca457df3193109ea488069957c8aad00133b8092bb54a745c627fca13` |
| `src/contacts/verifiedContactRepository.ts` | `10d0d31691206e10615e2724f527b5ce6e67916017094bc1b3c9fcb83bd4adf0` |
| `src/contacts/verifiedContactRepository.test.ts` | `0355a97de138ee6b9e73f042c766a129675a273b6d89be8363072f7591517b0d` |
| `src/contacts/verifiedContactCeremonyService.ts` | `d7da62a4b4fa7c4fefad52f914e191e4a26c8f6b45a6351b1f93310d3aec8174` |
| `src/contacts/verifiedContactCeremonyService.test.ts` | `2f637963d45bcea493aaac816cbec8b97e9dd680c54c1c8561bbabe02f5b3151` |
| `tests/fixtures/verifiedContactFixture.ts` | `726942f85c565f9cd531cd04c0ab49acc0a3b7db25c54512f1b30307deade17f` |

The ordered `<path> <sha256>\n` aggregate is
`c434a9f5f405f942db0f6d96cc67013094e48514cdba15d6096ef21f9d34e345`,
an exact match to the requested digest.

`src/contacts/verifiedContactResolvers.ts` is absent.

The two AgentOps semantic policies are present and the bounded integration
preflight passed with zero findings:

- `chopdot-verified-contact-is-not-membership-authority`
- `chopdot-contact-proof-is-not-organizer-proof`

The corrected four-file Node test suite passed 8 and failed 0. The exact
command and runner correction are recorded in `catalog-contact-suite.json`.

## 6. Unchanged boundaries

`git diff HEAD` is empty for tracked product code. Explicit checks passed for:

- `src/membership/membershipBootstrapEntryService.ts`
- `package.json` and `package-lock.json`
- UI `.tsx` sources
- membership sources
- money sources
- payment sources
- `src/environment/accountBoundKeyEnvelope.ts`
- `src/environment/accountBoundProtectedGroupKeySink.ts`

The catalog task changed no tracked product source and installed no package.
The temporary Vitest result cache produced by the initially wrong runner was
removed before final verification.

## 7. State separation

- Catalog implemented: **yes**, as untracked worktree artifacts.
- Catalog verified: **yes**, all machine checks pass.
- KGv2 adopted for this exact outcome: **yes**, cited recall passes without
  fallback.
- Wave 1A implemented: **yes**, bounded source files exist.
- Wave 1A tested: **yes**, 8/8 corrected tests pass.
- Wave 1A committed: **no**, all nine files are untracked.
- Wave 1A UI-wired: **no**, no source outside `src/contacts/` references the
  capability.
- Wave 1A deployed: **no evidence**.
- Wave 1A user-reachable: **no evidence**.
- ChopDot v1 deployed from this worktree: **no**.

## 8. Plan re-review readiness

The evidence gate required before re-review is closed. The plan should now use
the responsibility-by-responsibility opportunity matrix and preserve these
open engineering gates:

1. aligned Product SDK/TrUAPI/host family compatibility;
2. fresh-device recovery and actor-bound isolation;
3. encrypted Bulletin receipt retention and recovery;
4. minimum shared-state decision before any contract;
5. first-time-user product completion and real-host acceptance;
6. explicit action-time approval before DotNS publication or deployment.

The exact worktree does not contain the current `docs/wiki/` or `docs/adr/`
system. Documentation reconciliation remains an integration obligation; no
generated wiki files were copied from another checkout.

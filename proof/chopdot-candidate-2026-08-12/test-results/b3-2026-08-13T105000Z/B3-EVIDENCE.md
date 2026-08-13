# Batch 3 fresh local evidence

Candidate: `b3-2026-08-13T105000Z`  
Delivery train: `chopdot-functional-candidate-2026-08-12`  
Run window: `2026-08-13T10:50:00Z` through `2026-08-13T11:00:30Z`  
Verdict: **LOCAL PASS / LIVE BLOCKED**

This packet proves the provider-neutral money/event and recovery foundation in
local unit tests and isolated actual-App browser contexts. It does not prove a
live Polkadot Desktop archive, locator, host entropy call, or three Product
Accounts. No live action or deployment occurred.

## Candidate identity

- Git HEAD: `81e56801a059253ca3daf667251239d4776e96f4`
- Source/test aggregate SHA-256: `0cafbb78653dd80263599cb8533e5f150fa35a23e808f6ac20ef8f813c7bdc55`
- `package-lock.json` SHA-256: `27dc2921197845c57dbba6556dde28892eef098acd591e3542b30315245a1c6c`
- Worktree clean: no; this is an intermediate batch snapshot. B6 owns the
  clean freeze and exact-final-candidate reruns.

## Controlled result

- Exact money is integer minor units with explicit currency/exponent. CHF 100
  split three ways conserves exactly and produces balanced postings.
- Signed canonical events bind event/command/group/actor/account/version,
  causal parent, accepted and occurred times, key version, encrypted-group
  visibility, stable payload digest, and signature.
- Duplicate, reordered, and concurrent delivery produces one state hash;
  conflicting ID reuse, tamper, stale causal parents, and wrong actors fail
  closed.
- Requested, marked paid, received, disputed, waived, closed, and successor
  record states remain distinct. Corrections, refunds, partials, fees,
  disputes, and waivers append facts without rewriting originals.
- Exact legacy portable-shell CHF migrates deterministically; ambiguous
  float/conservation cases quarantine the whole group without partial import;
  CHF and USD remain separate. The year-long app's normalized Supabase bigint
  rows adapt into the same MoneyV1 boundary; invalid conservation quarantines
  rather than making the database authoritative.
- The minimum-disclosure export omits account keys, signatures, recovery
  material, and custody fields.
- The encrypted checkpoint contains signed authority events, not a trusted
  state shortcut. Recovery decrypts, verifies every event, rebuilds the
  checkpoint state, then applies later events. Full replay and recovery replay
  match exactly.
- Account-bound key version 2 recovers on provider recreation after the
  five-minute delivery window. Wrong account, stale key, locator rollback,
  signature/ciphertext tamper, post-close mutation, and compacted replay fail.
- Archive, locator, outbox, and deferred inbox survive storage/provider
  recreation. Compaction is allowed only for the exact verified prefix.
- The actual ChopDot shell shows one plain-language action, then the exact CHF
  120 closed record, in isolated Leo and Nina profiles. A wholly new browser
  context restores again without copied return links or local group state.

## Visual review

Seven fresh screenshots cover desktop/mobile recovery, exact recovered record,
full restart, wrong account, and malformed route. The primary action is wholly
visible at 1280x720; the mobile record is unclipped at 390x844. No checkpoint,
frontier, entropy, Product Account, Statement Store, protocol, native, or
adapter language appears.

## Live boundary

`B3-LIVE-HOST-ENTROPY`, `B3-LIVE-LOCATOR`, and `B3-LIVE-BEYOND-300S` remain
**BLOCKED**. The normal production composition has no approved real Desktop
archive/locator adapter yet, and no live two/three-account recovery run was
performed. Local provider-injection evidence cannot satisfy that lane.

# Batch 4 fresh local evidence

Candidate: `b4-2026-08-13T111500Z`  
Delivery train: `chopdot-functional-candidate-2026-08-12`  
Run window: `2026-08-13T11:15:00Z` through `2026-08-13T11:24:00Z`  
Verdict: **LOCAL PASS / LIVE BLOCKED**

This packet proves the ordinary Catch → Management → Payout → History dinner
journey over the Batch 1–3 provider-neutral authority in the actual ChopDot App.
It does not prove live Polkadot Desktop delivery, a real payment reference, or
three live Product Accounts. No deployment, publication, payment, or devnet
write occurred.

## Candidate identity

- Git HEAD: `81e56801a059253ca3daf667251239d4776e96f4`
- Source/test aggregate SHA-256: `33312b5bdfa50fa322a6be46bd6223157ab4122f24eb864f7b0483d4a2841dce`
- `package-lock.json` SHA-256: `27dc2921197845c57dbba6556dde28892eef098acd591e3542b30315245a1c6c`
- Worktree clean: no; this is an intermediate delivery-train snapshot. Batch 6
  owns the clean freeze and exact-final-candidate reruns.

## Controlled result

- Catch is receipt/file first with a receipt-link path. Unsupported photos and
  incomplete links create a visible correction draft; parsing never creates
  money truth.
- Mina explicitly sends one CHF 120 dinner after review. Exact-money allocation
  produces three CHF 40 shares with no floating-point authority.
- All actions use the signed canonical event projection. The journey service has
  no second accounting reducer or Supabase authority.
- Leo and Nina see only their requested CHF 40 action. `I paid Mina` records a
  payer statement; it does not claim money movement or receiver confirmation.
- Mina alone confirms what arrived. Only the matching share advances from
  `marked paid` to `received`.
- Nina marks paid while her delivery edge is offline. The pending intent survives
  a browser-context/provider restart, reloads current history, and publishes
  exactly once after reconnect.
- Mina can close only after both required shares are received. Exactly one close
  event creates one immutable `CHF 120.00` saved record visible to Mina, Leo,
  and Nina after reload.
- Wrong-role receiver/close controls are absent in the actual App. Domain tests
  reject wrong roles and incomplete close without changing canonical truth.
- The Batch 4 delta verifier maps the touched year-long-app inheritance rows to
  the exact source and preserves deferred modes rather than claiming a wholesale
  merge.

## Fresh command results

- `src/journey/dinnerJourney.test.ts`: 3/3 PASS.
- Batch 4 authority/state command: 102/102 PASS.
- Actual-App three-person full-loop Playwright: 2/2 PASS.
- Capability-inheritance delta verifier: 10/10 PASS.
- Gate 0 / Batch 1 foundation: 66/66 PASS.
- Batch 2 and Batch 3 actual-App regression: 10/10 PASS.
- Batch 3 money/recovery/security regression: 25/25 PASS.
- Batch gate harness: 13/13 PASS.
- TypeScript/lint: PASS.
- Security baseline: PASS across 126 files.
- Production build: PASS. The existing >500 kB bundle warning remains and is
  not represented as a functional failure.

## Visual review

Eight fresh actual-App screenshots cover receipt-first Catch, draft review,
Leo's requested share, Nina's offline state, Mina's close readiness, desktop
and mobile saved records, and unreadable-receipt correction. The initial
action and desktop/mobile close states are unclipped after tightening desktop
vertical rhythm. Each screen has one obvious action, user-language statuses,
and no Product SDK, Statement Store, protocol, native, host, adapter, or raw
state language.

## Capability inheritance boundary

Inherited/adapted now: guest value entry, receipt/file/link-first Catch, manual
correction fallback, three-person exact split, payment request, payer mark,
receiver confirmation, offline retry, immutable History, and normalized
year-long-app money migration at the provider boundary.

Still deliberately deferred: savings circles, emergency pots, community funds,
exact observed-payment adapters, broad notification behavior, and live Desktop
archive/locator composition. Supabase is neither deleted nor promoted; normalized
legacy rows can migrate or quarantine while One Chop Core remains authority.

## Live boundary

`B4-LIVE-FULL-LOOP` and `B4-LIVE-PAYMENT-REFERENCE` remain **BLOCKED**. The
normal production composition does not yet supply the real Desktop delivery,
archive/locator, account recovery, or exact observed-payment adapters, and no
live three-account run was performed. Local provider injection cannot satisfy
that lane.


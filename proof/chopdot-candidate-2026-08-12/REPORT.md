# ChopDot candidate evidence report

Date initialized: 2026-08-12  
Verdict: **BLOCKED — LIVING EVIDENCE INDEX ONLY; NO CANDIDATE FROZEN**

## Decision

This folder is the evidence destination for one future local release candidate.
It does not claim that Gate 0, B1, B2, B3, B4, or live B5 has passed.

The complete current gate state and required evidence are indexed in
[`requirements-matrix.md`](./requirements-matrix.md).

## Current source/artifact state

At initialization:

- worktree: `/Users/devinsonpena/ChopDot/.worktrees/portable-shell-trial`
- branch: `codex/portable-shell-trial`
- HEAD: `81e56801a059253ca3daf667251239d4776e96f4`
- tracked changes above HEAD: 45
- untracked entries: 57
- exact candidate commit/tree: **not frozen**
- exact candidate build hash: **not recorded**
- exact candidate CAR/CID: **not created**

The existing `dist/`, `dist-dot-host/`, CARs, CIDs, screenshots, and reports are
historical or intermediate evidence. None is designated as the candidate.

## What is already useful

Fresh 2026-08-12 foundation work in the current, still-unfrozen tree now adds:

- account-bound group-key recovery envelopes using the official host entropy
  facade, with wrong-account/context/tamper rejection;
- an append-only accepted-event journal with verified signer/proof metadata,
  conflict rejection, restart persistence, and deterministic frontier hashing;
- a signed one-time P-256 ECDH handoff where the invited Product Account
  proves possession, the organizer encrypts one group key to that invitation,
  and wrong-account, substituted-key, wrong-organizer, expiry, and tamper cases
  fail closed;
- a typed invitation lifecycle where friendship remains pending until explicit
  account-bound acceptance, decline/revoke/expiry are terminally distinct, and
  limited no-app access cannot become membership.
- a provider-neutral signed membership-event journal where invite, acceptance,
  protected grant, decline, and revoke have separate sr25519-authenticated
  events; acceptance alone grants no membership, causal reordering is retryable,
  and the accepted sequence rebuilds after provider recreation;
- a versioned Polkadot chat custom-message adapter plus durable delivery outbox
  for existing-contact rooms. Chat is delivery metadata only and cannot grant
  membership.
- an honest CHF 120 Zurich Dinner preview with one enabled action above the fold
  at 1280x720 and 390x844, plus receipt-first Catch with manual entry retained
  only as a fallback correction path.

The fresh Batch 2 packet now records the membership regression at 54/54,
recipient-bootstrap domain at 6/6, limited-action domain at 8/8, request-link
regression at 4/4, router retirement at 2/2, actual participation at 5/5, and
actual limited-entry UI at 2/2. TypeScript, the security baseline, and the
production build also pass. Batch 1 and Batch 2 have schema-v2 local receipts at
12/12 and 14/14 controls respectively. Both live lanes remain blocked. These
are unfrozen local host-simulator results, not live or release-candidate proof.

These reports remain valuable characterization evidence and regression targets:

- `../general-shared-action-delivery/REPORT.md` — durable ordinary-action
  outbox, stored-session dispatch, Product Account identity migration, and
  restart-safe event ledger passed a bounded local/simulated-host slice.
- `../deferred-shared-action-restart/REPORT.md` — a causally early verified
  shared action survived complete hosted-app restart and applied after its actor
  prerequisite arrived.
- `../chopdotproof02-v0.5.6-native-readiness-2026-08-11/REPORT.md` — the real
  Desktop probe reached container, identity, and Statement Store service, then
  stopped safely at allowance before canary publish/readback.
- `../public-adversarial-group-2026-08-08/REPORT.md` — the old public deployment
  exposed sandbox-origin links, role collapse, repeat actions, repeat close,
  currency mismatch, and stale handoffs.
- `../../../../docs/chopdot-dot/devnet-product-code-and-journey-review-2026-08-09.md`
  records subsequent bounded local repairs for public-wrapper links, re-share,
  role/action validation, replay safety, CHF preservation, and immutable close.

These reports must be rerun or challenged on the exact candidate. Their old
pass counts and screenshots cannot be copied into this report as current proof.

## Fresh unfrozen-tree verification snapshot

These commands were rerun after the combined security, membership, entrance,
and receipt-first changes. They characterize the current dirty tree; they are
not frozen-candidate evidence:

- `npm run test:gate0-foundation`: **37/37 passed**, including real sr25519
  Product Account-compatible signatures, signed membership-event replay,
  restart-safe membership journal, chat codec seam, and durable membership
  delivery outbox.
- `npm run test:host-adapter`: **67/67 passed**.
- focused store/request-link/group-invite suite: **25/25 passed**.
- `npm run security:baseline`: passed, 81 files checked.
- `npm run lint`: passed.
- `npm run build`: passed; existing Rollup annotation and large-chunk warnings
  remain.
- entrance plus receipt-first Playwright: **4/4 passed**.
- two-person hosted convergence: **1/1 passed**.
- five-person isolated-host visible UI: **1/1 passed** after its stale
  manual-first test path was updated to choose the visible `Enter amount
  instead` fallback.
- automatic Leo-to-Mina payer sync without a return link: **1/1 passed**.
- offline payer outbox/public-link route: unit **9/9** and UI **1/1 passed**.
- late expense after a sent request: unit **5/5** and UI **1/1 passed**.

The product cockpit refreshed with 33 cards, 12 decisions, 33 decision
contracts, 0 errors, and 5 warnings. Full product validation remains red only
at the repo-wide wiki freshness gate; the current-product-state page itself is
updated, and the wiki indexes were regenerated. The stale pages were not
silently relabelled as reviewed.

Cloud Storage 0.10.0 is separately qualified in
`cloud-storage-qualification.md` as **PARTIAL**: it is a plausible replaceable
transport for an already-encrypted checkpoint, but it provides neither key
protection nor fresh-device object discovery, requires a separate Bulletin
allowance, and currently conflicts with the shell's Host SDK/TruAPI line. No
package was installed and no canary/write was attempted.

Existing-contact delivery is separately qualified in
`people-chat-membership-qualification.md`. The installed Host SDK chat surface
can carry already-signed custom membership events in an existing room, and the
local adapter/outbox pass. The current simulator does not model chat, no real
Desktop read/write proof exists, and the official People-chain/X25519 lookup
package belongs to another host-stack line. Batch 2 therefore remains partial.

## Current blocking gates

1. **Batch 1 / existing contact:** local authority and product-preview controls
   pass. The signed invitation, recipient decision, and organizer-protected key
   grant use an account-bound coordinator with durable retry/restart behavior.
   The live lane remains blocked because the installed Desktop surface does not
   provide a trusted contact-to-Product-Account resolver or a documented numeric
   chat payload ceiling.
2. **Batch 2 / link, QR, limited no-app:** **LOCAL PASS / LIVE BLOCKED.** The recipient-bound bootstrap,
   external organizer-root requirement, exact URL/QR payload, limited signed
   action, mixed local coordinator flow, and legacy-router retirement pass.
   The actual app now accepts a production-neutral entry-service dependency
   only through direct provider injection and otherwise fails closed. No URL,
   query, hash, or storage value can manufacture that authority. The service
   requires host-held signing, trusted recipient and organizer resolution,
   durable acceptance/grant delivery, CryptoKey-capable pending storage, and a
   protected key sink. The recipient entry supports signed Accept and
   Decline, persists the decision, stays pending until the organizer grant,
   makes no unverified identity or roster claim, and fails safely on provider
   errors. Isolated actual-App contexts now prove visible organizer link/copy/QR,
   exact QR decoding, recipient Accept/Decline, waiting across restart, separate
   organizer grant, and the limited-action happy and hard states. The normal app
   composition still safely lacks the live trust/delivery providers, so the two
   live controls remain blocked. See `receipts/B2.json` and the fresh evidence
   index.
3. **Batch 3 / recovery:** unlocked for local work by the Batch 2 local receipt. No integrated encrypted checkpoint,
   durable account-bound locator, safe compaction, or same-account new-device
   recovery beyond the 300-second delivery window is proved.
4. **Batch 4 / full loop and inheritance:** the end-to-end Catch -> Management
   -> Payout -> History candidate has not been rerun on the new membership
   authority and recovery model.
5. **Batch 5 / UX and cards:** the local entrance now has one enabled action and an honest CHF 120
   preview above the fold at both target viewports. The action still proceeds
   through identity into the empty real Home rather than continuing directly
   into the receipt/group draft, and the preview component is not yet reused
   through requested/paid/received/closed/saved states. Batch 5 remains pending.
6. **Batch 6 / freeze and prove:** the worktree is not clean/frozen, the exact artifact is unidentified,
   and the unified candidate regression, security, payload, accessibility, and
   evidence matrix has not run.
7. **Live release lane:** real Desktop publish/readback is externally blocked at allowance.
   Deployment and publication also require separate action-time approval.

## Payload warning

`../statement-notification-budget/report.json` measured five concurrent
encrypted statements at 1170 bytes against a 1024-byte per-user total. The host
simulator did not enforce that limit. The candidate must prove compact signals
or pointers and must not infer live quota safety from simulator acceptance.

## Stale and dead-end paths prohibited

- Do not retry the same Desktop allowance/signature loop before an upstream
  supported recovery path exists.
- Do not use `app.<name>.dev-dot.li` as a copied or public user URL. Use the root
  wrapper and retest the exact deployed candidate.
- Do not treat Chrome tabs or browser contexts with shared origin storage as
  separate people/devices.
- Do not treat links as synchronization or snapshot invitations as membership
  authority.
- Do not present old 37/37, 40/40, 47/47, or 52/52 totals as candidate results.
- Do not call the current dirty `dist/` or an older CAR/CID the candidate.
- Do not overwrite historical proof outputs when rerunning scripts.
- Do not call a local/simulated-host pass live `.dot` convergence.
- Do not run `polkadot-app-deploy` just to obtain a CAR/CID. The installed CLI
  defaults to another environment unless `--env devnet` is explicit, and prior
  work already recorded an accidental default-environment deployment attempt.
- Do not deploy, publish, list, transfer, or request showcase outreach without
  exact action-time approval.

## Candidate execution order

1. Preserve the passing B1 and B2 local receipts without treating them as live.
2. Complete Batch 3 beyond-window recovery and locator proof.
3. Continue the later full-loop and entrance/card implementation in order.
4. Freeze one clean candidate source tree.
5. Run the exact fresh command contract in `requirements-matrix.md`.
6. Store logs under `test-results/`, screenshots under `screenshots/`, and
   byte-identification under `artifact/`.
7. Update every matrix row with a fresh result and direct evidence path.
8. Award `candidate-ready-local` only if every controlled Gate 0/B1-B4 row is
   green. Otherwise keep this report `BLOCKED` and name the exact failing row.

## Evidence-boundary verdicts

- Current local engineering state: **PARTIAL**
- Exact candidate: **RED / NOT FROZEN**
- Candidate-ready-local: **NO**
- Live Desktop convergence: **BLOCKED**
- Public deployment/showcase-ready: **NO; not authorized by this report**

## Documentation impact

The current-product-state wiki must record the new local-only security,
membership, entrance, and receipt-first evidence. No new ADR is required: the
work implements the already-adopted One Chop Core authority boundary and does
not promote a new source of truth.

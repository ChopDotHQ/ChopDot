# ChopDot full-product `.dot` Devnet deployment execution plan

**Date:** 2026-08-22  
**Programme:** Programme A product delivery, constrained by Programme B native truth  
**Status:** active execution; Wave 0 and bounded Wave 1--3 slices in progress  
**Target worktree:** `/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch`  
**Target branch at review:** `codex/chopdot-v1-launch`  
**Target HEAD at review:** `3519a894efbcee5144ecb0bcb9ebc44b888a0e7f`  
**Supersedes for launch routing:** `2026-08-20-one-chopdot-v1-launch.md`  
**Does not supersede product law:** `PRODUCT_TRUTH.md`

## 1. Executive decision

**Decision: GO to a bounded full-product release train; NO-GO to calling the
current worktree deployed, user-ready, or full-product.**

ChopDot's target is one trustworthy group-money product that people can use
for a normal shared pot, a captured spend, a savings circle, private emergency
help, and a community fund. All modes share the same identity, membership,
exact-money, delivery, confirmation, recovery, privacy, and history laws. The
`.dot` Devnet is the first native distribution door and one payment/identity
environment; it is not ChopDot's product authority or permanent substrate.

The current worktree is a strong implementation candidate, not a releasable
full product. Its README still calls it a portable-shell trial, four named
modes have no generated behavior paths, fresh-device recovery and real-host
convergence remain open, the Product SDK family needs a compatibility spike,
and no exact candidate has been built, published, reached, or walked by real
first-time participants during this planning task.

This train is deliberately larger than a demo shortcut. It keeps one ordinary
dinner journey as the integration spine while requiring an honest out-of-box
lifecycle for every product mode before the **full-product** label.

## 2. Product end state

### 2.1 Who ChopDot is for

- Someone who paid for a group and needs to collect shares without becoming a
  bookkeeper.
- A group coordinating recurring contributions and rotating payouts.
- A trusted group pooling urgent help without exposing sensitive reasons.
- A community coordinating proposals, approvals, release, and handoff.
- Friends, couples, households, travel groups, clubs, diaspora groups, and
  informal money cultures using different payment methods.

### 2.2 The one product promise

> ChopDot helps a group catch what happened, agree who owes or contributes,
> move money through a method they choose, confirm what actually arrived, and
> keep a record everyone can recover and trust.

### 2.3 Shared product loop

```text
Catch -> Management -> Payout -> History
```

- **Catch:** photo, link, import, chat share, wallet evidence, or a short guided
  creation flow. Manual item entry is a correction/fallback path.
- **Management:** people, roles, exact amounts, splits/contributions, approvals,
  reminders, changes, delays, privacy, and exceptions.
- **Payout:** external/manual payment, Product SDK/native payment where proven,
  evidence matching, and receiver/authorized-release confirmation.
- **History:** immutable readable record, correction/amendment trail, export,
  recovery, and a clear open/closed state.

### 2.4 First-screen product gate

**User journey:** “I am Mina. I need to see which group needs me now, capture a
shared spend or contribution, and know what action moves it forward.”

**One next action:** **Scan a receipt.**

| Criterion | Score | Requirement |
| --- | ---: | --- |
| Friction | 3/3 | Camera/import/link may start locally before account ceremony |
| Trust | 2/3 | Capture creates only a local draft until Mina reviews and signs |
| Clarity | 3/3 | One dominant group card and one next action above the fold |
| Language | 1/1 | No host, SDK, DotNS, Statement Store, Bulletin, adapter, event-log, or chain jargon |
| **Total** | **9/10** | **PASS for implementation** |

Every user-facing slice must write its own journey, next action, and score. Stop
when the UI becomes a dashboard, ledger, protocol console, admin panel, lab, or
generic form dump.

## 3. Current truth and evidence boundary

### 3.1 Product law to preserve

- `claimed != received/cleared != approved/released != closed`.
- External/manual payment always needs the bound receiver's confirmation.
- An exact finalized matching transfer may clear only its exact item under an
  explicit policy; it cannot confirm unrelated items or close a group.
- The participant-held append-only signed event log is authority.
- A host, chain, wallet, URL, registry, server, cache, archive, or transport is
  a carrier or rail, never membership or money truth.
- One Chop Core owns membership, roles, exact money, conflicts, correction,
  confirmation, closeout, and recovery behavior.
- One engine serves normal pots, trips, couples, Spend Card capture, savings
  circles, emergency pots, and community funds.
- Plumbing remains invisible to normal users.

### 3.2 Evidence roots

| Root | Use | Trust boundary |
| --- | --- | --- |
| Launch worktree | Only implementation/deployment target | Dirty with untracked launch/research work; no commit contains this plan |
| Canonical `/Users/devinsonpena/ChopDot` | Read-only cockpit/product input | Different dirty branch/HEAD; not launch-worktree implementation evidence |
| Feature inheritance matrix | 15 families, 35 cards, 42 paths, analog grades | Registry-only rows remain discovery, not source/runtime proof |
| Platform adoption decisions | Bounded adapter decisions and experiments | Does not authorize packages, contracts, registry writes, or publication |
| Native runtime report | Dated regression inventory/gate definitions | June lab evidence is not fresh real-host promotion evidence |

### 3.3 Honest starting status

| Dimension | Current state | Required state |
| --- | --- | --- |
| Planned | PASS after this plan validates | Remains traceable to cards and paths |
| Implemented | PARTIAL | All work packages integrated in one candidate |
| Tested | PARTIAL/local | All exact-candidate local, simulator, browser, security, recovery, and live-host gates pass |
| Committed | NO for current untracked work | Exact reviewed tree committed on release branch |
| Merged | NO evidence | Reviewed release commit in selected canonical branch |
| Candidate built | NO | Byte-identified `dist-dot-host` artifact and CAR/CID |
| Published/deployed | NO | Human-approved DotNS/registry mapping to reviewed CID |
| Reachable | NO new candidate | Gateway and host container load exact build |
| User-proven | NO | First-time organizer and participants finish on isolated accounts/devices |

## 4. Scope

### 4.1 In scope

- Account, profile, verified contacts, payment instruments, membership,
  invitation, revocation, recovery, and same-person continuity.
- Group-card home with normal-language state and one next action.
- Normal pots plus trip/couple presets using the same core law.
- Receipt/spend capture with photo/link/import first and reviewed AI/OCR drafts.
- Exact money, multiple currencies without hidden FX, item/equal/custom splits,
  partials, fees, refunds, corrections, and concurrency.
- External/manual payment, payment requests, limited no-app payer action, PAS or
  another Devnet rail only where exact evidence is proved, and wallet isolation.
- Paid/observed/received/delayed/waived/disputed/reversed/closed/saved states.
- Offline outbox/inbox, signed encrypted delivery, deterministic replay,
  notifications, encrypted recovery, export, deletion semantics, and support.
- Baseline end-to-end Spend Card, savings-circle, emergency-pot, and
  community-fund lifecycles.
- SDK/host alignment, simulator, real host, content-addressed build, DotNS,
  rollback, monitoring, and real-user acceptance.
- Security, privacy, accessibility, responsive design, performance,
  documentation, cockpit evidence, and KGv2/Repo Graph refresh.

### 4.2 Explicitly out of scope

- Custody, escrow, pooled balances, stored value, yield, credit underwriting,
  automatic debits/FX, card issuing, or legal settlement.
- Treating a savings-circle default as technologically or legally enforced.
- DAO/token governance, token economics, or on-chain voting by default.
- A new blockchain, generic backend, or operated identity database.
- Direct TrUAPI without a reproduced Product SDK blocker.
- Copying GPL/AGPL/NOASSERTION donor code without review.
- Production/mainnet money or claims of audit/regulatory approval/finality.
- Mainnet publication, production funds, paid SaaS, user messaging, custody,
  destructive external deletion, or a PR merge.

### 4.3 2026-08-23 approval envelope

The user explicitly authorized exact-worktree edits, lockfile dependency
installation, tests, builds, documentation, commits, branch push, PR creation,
test-only keys/faucet tokens, Bulletin writes, recovery-contract testnet
deployment, DotNS registration, staging, public-testnet promotion, name
transfer, and rollback. Official interactive login remains a human ceremony;
no private key or credential may be requested in chat.

## 5. No-Supabase architecture decision lock

Supabase is not part of the v1 runtime or recovery design. This is not a claim
that Devnet offers a drop-in database. It separates the jobs a generic backend
used to blur together.

| Responsibility | v1 owner | Required proof | Must not become |
| --- | --- | --- | --- |
| Canonical truth | Participant-held signed `ChopEventV1` log + One Chop Core | Same event set/state hash; invalid actor/signature/version rejected | Host, chain, wallet, cache, archive row |
| Current view | Deterministic encrypted IndexedDB/host-local projection | Full replay/checkpoint replay converge; corruption visible | Second mutable authority |
| Active delivery | Encrypted, signed, idempotent envelope via proved host route | Distinct accounts exchange, ack, dedupe, reorder, restart, converge | Acceptance, membership, permanence |
| Short signal | Statement Store after budget measurement | Payload, TTL, quota, LWW, delay/loss/fallback tests | Event log or archive |
| Invitations | Signed scoped expiring/revocable in-app/chat/link/QR capability | Forward/wrong-person/replay/expiry/revoke; organizer grant required | State snapshot or reusable key |
| Working secrets | Per-member wrapped versioned group key; host signer/entropy | Wrong account/group/member/version/tamper tests | Plaintext URL/app-state secret |
| Same-account recovery | Encrypted checkpoint + frontier + later events + account-bound envelope + proved locator | Fresh device after TTL restores once | Local cache alone |
| Lost-account recovery | Host recovery or explicit social re-grant | Old signatures remain; future authority/key rotates | Silent identity merge |
| Receipt/blob retention | Local encrypted blob; Bulletin only after R2 | Encryption/retrieval/retention/renewal/loss/deletion/cost/recovery | Plaintext public archive |
| Discovery | DotNS points to byte-identified app; private locator only if privacy passes | Ownership/signer/update/rollback/resolver/cache/gateway | Person/organizer authority |
| Payment movement | External rail or Product SDK payment adapter | Exact payer/receiver/amount/currency/network/finality | ChopDot custody or confirmation |
| Notifications | Derived minimum-disclosure hint/pointer | No secret leakage; stale hint cannot mutate | Money action or record |
| Export/support | Readable minimum-disclosure export and redacted support bundle | Restore/readability/secret/build-ID/deletion tests | Private log in analytics |

### 5.1 Required architecture experiments

**R1 — Durable recovery locator.** Compare an account-authorized encrypted
locator to a content-addressed checkpoint, participant recovery/re-grant, and a
user-held encrypted recovery kit. The release needs same-account recovery plus
one lost-account fallback. If Devnet lacks a durable confidential locator,
record the gap and make a product decision; do not silently add a backend.

**R2 — Bulletin encrypted blob.** Store/retrieve/hash an encrypted redacted
receipt/checkpoint; test expiry, renewal, loss, deletion, quota, wrong key,
wrong account, cost/funding, and recovery. Adopt only if the contract passes.

**R3 — Minimum shared-state/contract need.** Name the user requirement signed
coordination and external payment cannot satisfy before assessing Asset Hub
contract/CDM. Prior escrow labs are research, not production custody proof.

**R4 — Product SDK family compatibility.** Align address, host, Statement
Store, and host-test SDK together in an isolated change. Run API diff,
typecheck, unit, simulator, payload-budget, build, and real-host smoke. Roll the
family back together on regression. Direct TrUAPI remains deferred unless a
user-critical API gap is reproduced.

## 6. Full-product mode contract

Every mode is a policy/configuration over the same event and membership core.

| Mode | Out-of-box lifecycle | Distinct policy | Never implied |
| --- | --- | --- | --- |
| Normal pot/trip/couple | create -> expense -> split -> request -> pay -> receiver confirm -> resolve -> close -> recover | labels, roles, split presets | mode-specific authority |
| Spend Card | import transaction -> attach/scan receipt -> review -> split -> request -> normal confirmation/history | matching and reversals | issuing, custody, feed-as-truth |
| Savings circle | rules/order -> accept -> contribute -> payout evidence -> recipient confirm -> next round -> close cycle | rounds, contributions, delay/default visibility | guaranteed payout/credit/automatic debit |
| Emergency pot | private request -> trusted roles/threshold -> contribute -> approve/release -> recipient confirm -> redacted record | minimal disclosure, urgency, threshold | public reason or automatic fund control |
| Community fund | roles -> contribute/propose -> approve -> release -> recipient/handoff confirm -> report | proposal threshold, steward handoff, public summary | DAO/token voting or unilateral release |

## 7. Feature-family workstreams

| Workstream | Feature family | Primary cards | Release result |
| --- | --- | --- | --- |
| WS-01 | Identity, people, membership, recovery | P-025, P-032, P-035 | Stable person, explicit membership, wallet isolation, revocation, key rotation, two recovery routes |
| WS-02 | Group cards, home, language | P-005, P-011, P-019, P-033 | One coherent home; every card shows state and one next action |
| WS-03 | Normal pots, trips, couples | P-001, P-018, P-022 | Ordinary group is integration spine; trips/couples are presets |
| WS-04 | Capture, spend, receipts | P-001, P-005, P-012, P-020, P-027 | Photo/link/import/chat/transaction produces a reviewed draft |
| WS-05 | Exact money, splits, corrections | P-003, P-018, P-022, P-034 | Minor units, currency isolation, deterministic splits/conflicts/migration |
| WS-06 | Requests, guest, invitations | P-002, P-021, P-022, P-032 | All routes converge on one signed membership/action model |
| WS-07 | Payment rails and wallets | P-003, P-023, P-024, P-035 | External/manual works; supported native rail is exact evidence; wallet is instrument |
| WS-08 | Confirmation, resolution, closeout | P-003, P-004, P-022, P-034 | Receiver/approver authority and immutable closeout |
| WS-09 | History, privacy, export | P-004, P-007, P-008, P-025, P-032 | Readable record, redaction, export/deletion semantics, support bundle |
| WS-10 | Sync, offline, chat, notifications | P-010, P-020, P-022, P-032 | Encrypted delivery, ack, restart, reorder, dedupe, offline convergence |
| WS-11 | Savings circles | P-006 | One full round and cycle record with delay/default visibility |
| WS-12 | Emergency pots | P-007 | Private-help lifecycle and redacted recovery/history |
| WS-13 | Community funds | P-008 | Proposal, threshold approval, release, confirmation, handoff/report |
| WS-14 | Native delivery and hosting | P-010, P-023, P-024, P-030, P-032 | Simulator + real host + CID/DotNS/rollback proof |
| WS-15 | Assurance, research, operations | P-009, P-013--P-017, P-026, P-028, P-029, P-031 | Traceability, adversarial proof, docs, monitoring, real-user evidence |

The machine-readable companion is the coverage authority for the exact 15
families, 35 current cards, and 42 current paths. A validation failure is a plan
failure, not a documentation warning.

## 8. Ordered execution waves

### Wave 0 — Reconcile product and release truth

**Depends on:** none.  
**Outcome:** one release branch owns its product law, architecture contracts,
card/path plan, and status language.

Tasks:

1. Preserve the launch worktree; inspect every dirty/untracked path before any
   integration or commit.
2. Reconcile the trial README with the full ChopDot product end state.
3. Port, rewrite, or explicitly supersede the current identity/recovery,
   security, money/event, native-delivery, and decision docs into this branch.
   Never wholesale-copy the dirty canonical checkout.
4. Create/refresh cockpit cards and add four missing behavior maps before
   implementing those modes.
5. Freeze `PRODUCT_TRUTH.md` hash, source branch/HEAD/status, dependencies,
   environment, release claim, owners, and open decisions.
6. Decide v1 non-custodial policy explicitly. Future custody is a separate
   legal/security/product programme.

**Exit:** governing source docs exist in target; 15/15 families, 35/35 cards,
and 42/42 paths have owner/wave; future-mode path requirements exist; stale
trial/Supabase language is removed or superseded.  
**Evidence:** `artifacts/release/wave-0-decision-lock.json` and product checkpoint.  
**Stop:** unresolved product-law conflict or uncertain dirty-file ownership.

### Wave 1 — One Chop Core and exact-money foundation

**Depends on:** Wave 0.  
**Outcome:** every surface and mode consumes one deterministic money/event core.

Tasks:

1. Characterize state/store, payment-intent, dinner, membership, recovery, and
   UI adapters against CME-01--CME-16.
2. Complete `MoneyV1`, `ChopEventV1`, canonical bytes, signature verification,
   expected version/frontier, idempotency, and state hashing.
3. Enforce balanced obligations, currency partitions, deterministic remainder,
   safe bounds, and no floating point at authority boundaries.
4. Resolve concurrent add/close, correction/correction, remove/act, cancel/pay,
   duplicate/reorder, partial/refund/fee, waiver, delay, and dispute.
5. Implement append-only correction/amendment and immutable closeout/successor.
6. Build read-only legacy migration fixtures; quarantine ambiguous money.
7. Bind mode policies through ports; retire competing reducers only after
   parity proof.

**Scenarios:** CME S1--S10 plus property/model fuzzing for conservation,
idempotency, reorder, conflicts, state-hash convergence, and bounds.  
**Exit:** replay/checkpoint replay match; all money exact/currency-isolated;
wrong actor/version/signature/currency changes nothing; migration is
deterministic/idempotent; UI hides core jargon.  
**Evidence:** `artifacts/release/wave-1-core-contract.json`.  
**Stop:** second authority survives or recovery canonizes legacy floats.

### Wave 2 — Identity, contacts, membership, and payment instruments

**Depends on:** Waves 0--1.  
**Outcome:** one human joins intentionally, acts only within role, changes
payment instruments safely, and can be revoked/re-granted without drift.

Tasks:

1. Integrate verified-contact provenance without granting membership,
   organizer, key, money, or delivery authority.
2. Implement guest-to-Product-Account atomic migration and collision failure.
3. Integrate signed invite offer/accept/decline plus organizer grant.
4. Complete recipient-bound one-time key handoff and immediate account-bound
   sealing; remove reusable plaintext group secrets from URLs/general state.
5. Route standing member, friend, contact, link/QR, and limited no-app action
   through one participant/grant/event model.
6. Add expiry, resend, revoke, wrong-person, forwarding, replay, duplicate
   identity, removal, and future-key rotation.
7. Add profile and payment-instrument add/verify/change/remove. Instrument
   change must never change person, membership, payer, receiver, or organizer.
8. Keep Product Account keys in host and secrets out of source/logs/reports.

**Scenarios:** IAC S1--S10; verified-contact safety-code/link/QR parity;
acceptance alone cannot grant; removed member loses future access.  
**Exit:** two accounts verify contact without group mutation; mixed routes
converge on one membership/key; privileged actions are signed/role checked;
secret scans and sign-out/return pass.  
**Evidence:** `artifacts/release/wave-2-identity-membership.json`.  
**Stop:** contact becomes membership, acceptance becomes organizer grant, or
wallet becomes identity.

### Wave 3 — Delivery, offline convergence, privacy, and recovery

**Depends on:** Waves 1--2 and R1.  
**Outcome:** participants converge after restart/offline periods and recover on
a fresh device without a generic backend or mutable snapshot truth.

Tasks:

1. Define encrypted signed envelope, outbox, deferred inbox, ack, retry,
   idempotency, replay, expiry, and minimum-disclosure notification formats.
2. Select/prove real-host active delivery. Statement Store carries only
   measured-fit payloads/pointers; loss is expected.
3. Persist encrypted journal/projection locally; test corruption, quota,
   cleared storage, private mode, and partial writes.
4. Implement `EncryptedGroupCheckpointV1` with frontier/state hash, membership
   digest, schema/key versions, issuer, and encrypted payload.
5. Restore membership, key envelope, checkpoint, outbox/inbox, and later events
   exactly once after >300 seconds and on fresh device through R1.
6. Implement lost-account recovery/social re-grant plus recovery-kit fallback.
7. Run R2 and adopt bounded encrypted blobs or leave full-product gate blocked.
8. Implement removal, rotation, history visibility, export, local deletion,
   key destruction, and redacted support bundle.

**Exit:** three accounts converge under duplicate/reorder/loss/restart;
fresh-device and lost-account routes pass; checkpoint cannot roll back/invent;
revoked member loses future access; carrier has no plaintext secrets; failure
is honest queued/read-only/retry.  
**Evidence:** `artifacts/release/wave-3-delivery-recovery.json`.  
**Stop:** checkpoint/carrier becomes authority or “recovery” reuses same
browser storage.

### Wave 4 — Normal group and group-card product spine

**Depends on:** Waves 1--3.  
**Outcome:** a first-time organizer and payer complete the ordinary group
journey from a clear group-card home.

Tasks:

1. Build meaningful group cards, not a dashboard. Each card shows mode, people,
   exact/currency-aware summary, state, privacy-safe context, and one next action.
2. Make normal pot creation obvious; dinner/trip/couple are labels/presets, not
   separate models.
3. Complete N-001--N-024 and the P-022 coherence gate.
4. Cover add/edit expense, exact splits, request, changed balance, add/remove
   member, late expense, partial/wrong payment, delay, waiver, dispute,
   confirmation, closeout, and saved-record return.
5. Restrict organizer, payer, receiver, guest, removed member, and observer UI.
6. Make offline/loading/error/reconnect/recovery visible and actionable.

**Exit:** N-001--N-024 have implementation, proof, screenshot, risk, owner;
Mina/Leo/Nina finish through visible UI; closed record survives recovery;
desktop/mobile pass product gate.  
**Evidence:** `artifacts/release/wave-4-normal-group.json`.  
**Stop:** card polish hides authority/recovery gaps or a preset forks core.

### Wave 5 — Capture, requests, payments, resolution, and history

**Depends on:** Waves 1--4.  
**Outcome:** paid-moment capture becomes a reviewed request that closes through
the same lifecycle.

Tasks:

1. Implement photo/link/import/chat/transaction-first capture and honest
   camera/permission/file fallbacks. Manual entry is correction/fallback.
2. Treat OCR/AI as draft: redact where possible, show confidence, require human
   review, permit correction/retry/cancel, and mutate nothing before acceptance.
3. Complete C-001--C-018: OCR failure, duplicate, mismatch, late receipt,
   sensitive item, offline sync, refund/reversal, dispute, and closeout/history.
4. Create exact payment intent before native movement. Match payer, receiver,
   amount, asset/currency, network, nonce/reference, expiry, and finality.
5. Keep external/manual methods usable. Prove at least one Devnet native rail;
   hide DOT/USDC/PAS controls without current asset/network/decimal proof.
6. Keep observed/finalized evidence separate from receipt confirmation/close.
7. Implement readable activity/history, private receipt visibility, redacted
   record/export/correction/support bundle.

**Exit:** C-001--C-018 have proof/risk review; capture requires human review;
manual/external plus one native path finish; evidence cannot confirm wrong item
or close; privacy tests pass.  
**Evidence:** `artifacts/release/wave-5-capture-payment.json`.  
**Stop:** AI/OCR/feed/tx/adapter creates money truth without human/core check.

### Wave 6 — Complete all product modes

**Depends on:** Waves 1--5 and four approved behavior maps.  
**Outcome:** every named mode has one honest out-of-box lifecycle.

#### Spend Card map (SP-001--SP-008)

1. SP-001 import supported transaction; SP-002 match receipt.
2. SP-003 review mismatch; SP-004 split and request.
3. SP-005 duplicate/late receipt; SP-006 refund/reversal.
4. SP-007 privacy/export; SP-008 confirm/close through normal history.

#### Savings circle map (SC-001--SC-012)

1. SC-001 create rules; SC-002 invite/accept.
2. SC-003 approve order/contribution; SC-004 open round.
3. SC-005 record contributions; SC-006 delayed/missed contribution.
4. SC-007 dispute/correct; SC-008 payout evidence.
5. SC-009 recipient confirms; SC-010 advance once/idempotently.
6. SC-011 exit/replacement/recovery; SC-012 close/export cycle.

#### Emergency pot map (EP-001--EP-010)

1. EP-001 create private request; EP-002 visibility/roles/threshold.
2. EP-003 invite trusted group; EP-004 contribute by mixed methods.
3. EP-005 redact sensitive reason/recipient; EP-006 collect approvals.
4. EP-007 release evidence; EP-008 recipient confirms/disputes.
5. EP-009 recover/revoke safely; EP-010 close with redacted record/export.

#### Community fund map (CF-001--CF-010)

1. CF-001 create fund/roles; CF-002 invite/accept.
2. CF-003 contribute; CF-004 propose use with bounded disclosure.
3. CF-005 threshold approvals; CF-006 reject/expire/amend.
4. CF-007 release; CF-008 recipient confirms.
5. CF-009 steward handoff/recovery; CF-010 close/report/export.

Cross-mode acceptance:

- every path has GIVEN/WHEN/THEN, owner, transition, authority, privacy,
  failure/offline/recovery case, unit/integration/UI proof, and screenshot;
- group-card state and next action are clear without a lab;
- currencies remain partitioned and contributions are not custody balances;
- circle default is a visible social obligation, not guaranteed;
- emergency privacy survives notification/export/recovery/support;
- community threshold cannot be bypassed by organizer, adapter, or payment;
- every mode closes through the same immutable history core.

**Evidence:** one artifact per mode plus
`artifacts/release/wave-6-mode-parity.json`.  
**Stop:** mode creates parallel authority or unproved custody/enforcement claim.

### Wave 7 — Native host and deployable artifact

**Depends on:** Waves 0--6 and R4.  
**Outcome:** one exact full-product build works in simulator and real supported
`.dot` host with native infrastructure invisible.

Tasks:

1. Lock Devnet, SDK family, capability matrix, identity, payment rails,
   Statement Store budget, storage decision, DotNS name, origins/iframe, and
   fallback behavior.
2. Add/restore `build:dot-host`, `preview:dot-host`,
   `e2e:dot-host-preview`, and `verify:dot-host`; absent from target manifest at
   plan time.
3. Prove host signing with distinct Mina/Leo/Nina accounts; one shared address
   cannot represent multiple participants.
4. Prove live delivery and recovery separately; simulator is not real-host proof.
5. Prove supported native payment from intent to finalized exact evidence and
   receiver confirmation. Hide unsupported rails.
6. Build production assets, deterministic manifest, CAR, CID, SBOM/license
   report, commit/tree hash, package versions, environment, and build ID.
7. Preview exact CAR/CID locally and through official host/gateway.
8. Prepare DotNS/registry transaction, previous mapping, rollback CID, signer,
   allowance, cost, and action-time approval packet.

**Exit:** fresh real-host evidence covers Identity, Transport, Archive/recovery,
CloseoutProof, PayoutEvidence, HybridRemoval, and UX without lab substitution;
build reproduces from reviewed commit; UI has no platform jargon/dev controls;
rollback is verified.  
**Evidence:** `artifacts/release/wave-7-native-candidate.json`.  
**Stop:** fallback masquerades as host success, name/signer uncertain, secret
exposed, build unreproducible, or allowance unresolved.

### Wave 8 — Full-product quality, security, and operations

**Depends on:** exact Wave 7 candidate.  
**Outcome:** supportable real product, not only a working demo.

Quality matrix:

- unit/property/model tests for core, money, identity, membership, crypto,
  recovery, capture, payments, and each mode;
- integration tests for adapters, storage, migrations, retries, quotas,
  capability loss, wallet/network change, and provider failure;
- browser tests at 320, 375, 390, tablet, 1280, and 1440 widths;
- keyboard, focus, semantics, screen-reader names, contrast, zoom/reflow,
  reduced motion, errors/timeouts, and touch targets;
- cold/warm load, bundle budget, interaction latency, slow network, offline,
  retry storms, five-person stress, and long event history;
- dependency/license/SBOM, secret/CSP/origin/frame, XSS/injection, capability
  replay, signature/canonicalization, crypto/privacy/log, and supply-chain review;
- incident, rollback, credential rotation, Devnet reset, dependency outage,
  corrupted storage, recovery support, and export procedures.

Adversarial matrix:

- wrong actor/account/member/role/currency/receiver/amount/network/signature;
- duplicate, reorder, stale version, replay, partial write, clock skew, expired
  capability, forwarded link, removed member, old key, and tamper;
- concurrent add/close, correct/correct, cancel/pay, remove/act,
  payout/advance, proposal/release, and refund/close;
- storage/transport/payment/host unavailable, quota exhausted, archive missing,
  DotNS stale, and gateway cache stale;
- emergency reason or receipt appearing in notification, URL, screenshot,
  analytics, export, log, public summary, or support bundle.

**Exit:** zero critical/high release finding without owner/proof/disposition;
all requirements map to fresh exact-candidate artifacts; no primary-journey
accessibility blocker; runbooks rehearsed; docs/cockpit/graphs current.  
**Evidence:** `artifacts/release/wave-8-release-evidence-index.json`.  
**Stop:** any authority, privacy, recovery, money, secret, accessibility, or
rollback blocker returns candidate to owning wave.

### Wave 9 — Private acceptance and release freeze

**Depends on:** Wave 8.  
**Outcome:** real people—not only agents—use the exact candidate without coaching.

Tasks:

1. Freeze commit, lockfile, build ID, CAR/CID, environment, and evidence index.
2. Use at least one organizer and two participants on isolated accounts/devices.
3. Complete normal pot, captured spend, one savings round, emergency privacy,
   and community approval/release.
4. Include wrong payment, delay, offline/reconnect, fresh-device recovery,
   sign-out/return, notification, export, and saved-record return.
5. Record success, hesitation, intervention, time, trust/confusion, defects,
   screenshots, and build ID with consent/redaction.
6. Fix through a new fingerprint and rerun impacted plus regression gates.

**Exit:** no infrastructure coaching; money/actor/privacy/recovery understood;
all five baselines complete on same candidate; release authority signs evidence
verdict.  
**Evidence:** `artifacts/release/wave-9-human-acceptance.json`.  
**Stop:** serious trust misunderstanding or facilitator rescue is a defect.

### Wave 10 — Approved publication, verification, and monitoring

**Depends on:** Waves 0--9 and fresh action-time approval.  
**Outcome:** accepted bytes are reachable through intended `.dot` Devnet door
and can be rolled back.

Pre-approval packet:

- source commit/tree and clean status;
- build hash, CAR hash, CID, manifest, SDK/dependency/SBOM versions;
- Devnet, DotNS/registry name, current/proposed mapping, signer,
  allowance/cost, origins, and rollback CID;
- evidence index and unresolved low/medium findings;
- public claim, privacy/support/incident owner, and rollback trigger.

Only after approval:

1. publish exact CAR/CID;
2. update approved DotNS/registry mapping;
3. read back mapping and CID independently;
4. load direct gateway, DotNS URL, and host on desktop/mobile;
5. verify content/build ID, assets, origin, and capabilities;
6. rerun smoke, normal-pot, recovery, native-payment, all-mode, privacy, and
   rollback checks on live URL;
7. monitor capability/gateway health without group content;
8. roll back on wrong CID, broken assets, authority/privacy regression,
   unrecoverable data, or misleading state.

Final verdicts are independent booleans:

```text
implemented
tested
committed
merged
candidate_built
published
reachable
user_proven
```

Never compress them into “done.”

## 9. Current-path closure ledger

### Normal pot: N-001--N-024

| Paths | Waves | Closure |
| --- | --- | --- |
| N-001--N-004 | 1, 4 | create/add/edit/split exact state |
| N-005--N-006 | 2, 4, 5 | signed request and scoped payer entry |
| N-007--N-013 | 5 | cannot-pay, native/manual pay, partial/wrong evidence, receiver response |
| N-014--N-017 | 1, 2, 4 | late expense, follow-up, add/remove with conflict/key rules |
| N-018--N-020 | 1, 3, 4 | waiver, delay, return/recovery |
| N-021--N-022 | 2, 4 | guest link and wrong-actor denial |
| N-023--N-024 | 1, 3, 4, 5 | immutable close and recovered record |

### Receipt/capture: C-001--C-018

| Paths | Waves | Closure |
| --- | --- | --- |
| C-001--C-005 | 4, 5 | capture, OCR failure, review, correction before truth |
| C-006--C-009 | 1, 5, 6 | transaction/receipt ordering, mismatch, dedupe |
| C-010--C-012 | 1, 4, 5 | exact items/tip/tax split and request |
| C-013--C-015 | 1, 5 | late receipt, dispute, sensitive privacy |
| C-016 | 3, 5 | offline capture and exact later sync |
| C-017--C-018 | 1, 5 | reversal/refund and normal confirmation/history |

Every `critical`, `high`, and `unreviewed` path must be reviewed and closed or
explicitly blocked on the exact candidate.

## 10. Verification command contract

Commands present in the target manifest at plan time:

```bash
npm run lint
npm run build
npm run security:baseline
npm run test:receipt-draft
npm run test:payment-intents
npm run test:host-adapter
npm run test:gate0-foundation
npm run test:membership-lifecycle
npm run test:signed-membership
npm run test:wallet
npm run test:late-expense
npm run test:guest-link
npm run test:live-payer-sync
npm run test:statement-budget
npm run test:session-quota
npm run test:host-sim
npm run test:host-stress
npm run test:host-ui
npm run test:host-wallet
npm run proof:host-capabilities
npm run proof:group-invite
npm run proof:agent-settlement
npm run proof:full-loop
node --import tsx --test tests/candidate-batch1-foundation.test.ts tests/candidate-batch3-*.test.ts
npx playwright test tests/candidate-batch2-*.spec.ts tests/candidate-batch4-full-loop.spec.ts tests/candidate-batch5-*.spec.ts --config=playwright.host-sim.config.ts --workers=1
```

Commands Wave 7 must add or reconcile:

```bash
npm run build:dot-host
npm run preview:dot-host
DOT_HOST_PREVIEW=1 npm run e2e:dot-host-preview
npm run verify:dot-host
npx playwright test
```

These are requirements, not claims that missing scripts exist. Each report
records command, cwd, redacted environment, time, exit code, pass/fail/skip,
candidate fingerprint, and artifact paths. Package install/change is not
authorized by this plan.

## 11. Ownership and approval

| Accountability | Owns | Cannot self-approve |
| --- | --- | --- |
| Product owner / Dev | Scope, promise, release claim, external actions | Evidence not inspected |
| One Chop Core owner | Money/event/membership authority and migration | User comprehension or live-host truth |
| Identity/recovery owner | Accounts, keys, grants, rotation, recovery | Security review of own work |
| Native adapter owner | SDK, host, transport, payment, build, DotNS packet | Publication/native promotion alone |
| Mode owners | Spend, savings, emergency, community slices | Parallel authority exceptions |
| Security/privacy reviewer | Threat, adversarial, privacy, secret gates | Product acceptance |
| Accessibility/product reviewer | First action, language, responsive/a11y | Money/security correctness |
| Evidence reviewer | Requirement/artifact/fingerprint coverage | Deployment |
| Release operator | Artifact, publish/readback/rollback/monitor | Action without Dev approval |

## 12. Critical path and parallel execution

```text
Wave 0 decision lock
  -> Wave 1 exact core
  -> Wave 2 identity/membership
  -> Wave 3 delivery/recovery
  -> Waves 4 and 5 ordinary product loop
  -> Wave 6 mode parity
  -> Wave 7 native candidate
  -> Wave 8 hardening
  -> Wave 9 human acceptance
  -> Wave 10 publication under the recorded approval envelope
```

After Wave 1 stabilizes, R1/R2/R4, group-card design, four behavior maps,
security/a11y harnesses, docs/runbooks, and mode adapters can proceed in
parallel. Parallelism cannot waive dependencies or fork authority.

“Usable today” is execution pressure, not evidence. A private local candidate
may precede public release, but the full-product public label stays blocked
until every wave's evidence exists.

## 13. Definition of full-product release

The `.dot` Devnet release is **full-product usable** only when all are true:

1. A new organizer understands the home and opens/creates the right group.
2. Normal pot, capture, Spend Card, savings circle, emergency pot, and community
   fund each complete their baseline lifecycle without developer controls.
3. Trip/couple language works as normal-pot presets.
4. In-app/friend and scoped link/QR routes work; contact proof and membership
   remain separate.
5. Exact money, partials, wrong payments, corrections, delay, waiver, dispute,
   reversal, confirmation, closeout, and history behave deterministically.
6. External/manual payment works and at least one Devnet native rail is proved;
   unsupported rails are hidden.
7. Offline/restart/reorder/loss converge; fresh-device and lost-account
   recovery have honest working routes.
8. Emergency/receipt/private data remains encrypted and minimally disclosed
   across carrier, notification, history, export, support, and recovery.
9. Accessibility, responsive, performance, security, dependency, and operations
   gates pass on one exact build.
10. Reviewed commit, CAR/CID, DotNS mapping, live bytes, and build ID match.
11. Real first-time people finish without infrastructure coaching.
12. Publication is within the recorded approval envelope and rollback is ready.

Anything less gets a narrower label: `local prototype`,
`candidate-ready-local`, `real-host proof partial`, or `deployed pilot`.

## 14. Documentation and graph impact

Implementation must:

- update source wiki pages and ADRs in the reconciled launch branch;
- regenerate/validate wiki and cockpit views;
- attach card evidence and checkpoints after each wave;
- refresh exact-worktree Repo Graph after each accepted wave;
- query KGv2 for no-Supabase authority, mode-path status, recovery/native gates,
  and release fingerprint;
- downgrade KG claims when its packet targets another checkout/commit or lacks
  citations to accepted artifacts.

The KG does not make the plan true. It makes accepted evidence recallable.

## 15. Immediate next move

Close Wave 0 with isolated dependencies, committed contact provenance, product
cards, source wiki/ADRs, native playbooks, evidence, and an exact-worktree graph
refresh. In parallel, independently review the bounded Wave 1 core and Wave 3
recovery slices, then wire the accepted authority through the production
entrypoint before candidate construction.

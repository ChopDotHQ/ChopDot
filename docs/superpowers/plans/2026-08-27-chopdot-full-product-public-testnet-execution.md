# ChopDot Full-Product Public-Testnet Execution

**Kind:** decision
**Status:** active
**Owner:** release integrator
**Last reviewed:** 2026-08-27
**Applies to:** `chopdot-v1-launch`
**Authority:** current full public-testnet execution route; it cannot change product law or expand the recorded external approval envelope
**Branch:** `codex/chopdot-v1-launch`
**Exact worktree:**
`/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch`
**Programme:** Programme A — full public-testnet product release
**Supersedes:**
`2026-08-24-context-authority-and-live-first-use-repair.md` as the complete
execution route; that plan remains accepted evidence for its bounded repair

## Goal

Ship and prove a participant-held ChopDot public beta that a normal person can
use out of the box across Catch -> Management -> Payout -> History for normal
pots, trips and couples; receipt capture; Spend Card; savings circles;
emergency pots; and community funds.

Build one clean immutable frontend candidate, stage it on Products Devnet, and
promote the identical CAR/CID to every supported public-testnet `.dot` surface.
Verify live bytes and product journeys, preserve a tested rollback, transfer
the release names to Devinson, and make the exact outcome recallable through a
conforming cited knowledge adapter.

## Meaning of 100% deployment

`100% deployed` is true only when all 21 gates below have accepted outcomes and
all of these verdicts are independently reported:

```text
implemented
tested
committed
pushed
candidate_built
staged
promoted
reachable
user_owned
user_proven
kg_known
```

An upload, transaction, CID, gateway response, local green suite, staged name,
or agent claim cannot substitute for the complete terminal contract.
`kg_known` names the verdict for compatibility; acceptance depends on the
portable Knowledge Context Port, not a backend version called KGv2 or KGv3.

## Current truth to preserve

- `PRODUCT_TRUTH.md` is the only product-law source.
- The Product Cockpit selects current jobs and priorities.
- Participant-signed `ChopEventV1` events with exact integer `MoneyV1` remain
  membership and money authority.
- Contact proof, personhood, account ownership, membership, organizer
  authority, payment evidence, receiver confirmation, and closeout remain
  separate.
- Receipt capture creates a local reviewed draft before shared mutation.
- Encrypted local projections, delivery, Bulletin data, Statement Store hints,
  recovery indexes, wallets, chains, and hosts are adapters, not a second
  product authority.
- Manual/external settlement remains usable; native PAS support is additive.
- Recovery preparation is optional and its retention/account-loss limits are
  stated honestly.
- Native infrastructure stays invisible in normal user language.
- Products Devnet and public-testnet promotion use byte-identical release
  bytes. Polkadot mainnet is outside this release.

## Product gate

Every user-facing package first maps its applicable stable outcomes from
`product/benchmark-baseline.md`, names the ChopDot differentiated outcome,
separates bounded experiments, and preserves its current E1/E2/E3 evidence
state. No single scenario or score is the product-wide gate.

The following is the bounded P-012 Catch example only:

```text
User journey:
"I just paid for the group and need ChopDot to capture the receipt
so everyone gets the right next action."

One next action: Scan a receipt
Friction: 3/3
Trust: 2/3
Clarity: 3/3
Language: 1/1
Total: 9/10 PASS
```

This action applies when the observed participant state contains a receipt or
spend to capture; it is not the universal Home action or operator priority.
Scanning may begin locally before account ceremony. No membership or money
mutation occurs until the responsible participant reviews and signs. Camera/OCR failure retains an
image-first or manually correctable draft.

## Architecture and approval locks

### Architecture

- No Supabase or other operated ChopDot database, private relay, custodial
  balance, or private backend authority.
- One signed append-only event core configures every product mode.
- IndexedDB/host storage is encrypted replayable projection state.
- Encrypted signed envelopes provide bounded delivery and acknowledgements.
- Bulletin carries encrypted availability blobs; Statement Store carries
  bounded wake-up hints only.
- `RecoveryHeadIndex` is the sole custom recovery contract and has no admin,
  upgrade, delegate, membership, money, delete, custody, or external-call
  authority.

### Approved release envelope

Allowed: exact-worktree edits; lockfile installation; tests; builds;
documentation; commits; release-branch push; PR update; test-only keys and
faucet tokens; bounded recovery-contract deployment; Bulletin writes; DotNS
registration; public-testnet staging/promotion; ownership transfer; and
rollback.

Not allowed: paid SaaS; a private backend; mainnet funds; custody; unrelated
repository mutation; destructive external deletion; or PR merge.

## Operating loop for every gate

Every gate records:

```text
intent and exact candidate
-> owner and authority boundary
-> expected outcome
-> proving evidence
-> focused and production-entrypoint verification
-> independent review where required
-> failure/blocker outcome
-> bounded retry with a changed hypothesis
-> commit/fingerprint/checkpoint
-> portable cited record and recall
```

A retry does not turn flaky behavior into a pass. Three repetitions of the same
external blocker produce a blocker packet and one next action; they do not
permit an architecture change or a success claim.

## The 21 execution gates

### 1. Exact-worktree baseline

- **Owner:** release integrator.
- **Expected outcome:** exact root, branch, HEAD, tree, upstream, complete Git
  status, dependency isolation, protected hashes, and starting failures are
  reproducible.
- **Evidence:** Git commands, dependency paths, SHA-256 manifest, and baseline
  command counts.
- **Failure/exit:** wrong root, escaped dependencies, or unexplained paths stop
  all later work until reconciled.

### 2. PR OutcomePacket and provenance

- **Owner:** CI governance; independently reviewed by another actor.
- **Expected outcome:** exact branch HEAD is distinct from synthetic merge-ref
  evidence; base-to-HEAD authors/committers, PR submitter, deterministic
  evaluator, and their limits are explicit; missing or aliased provenance
  fails closed.
- **Evidence:** focused governance tests, workflow structural validation, and
  generated packet fields. Deterministic separation does not imply human or
  CODEOWNER review.
- **Failure/exit:** stale head, dirty tree, missing base, missing job, or false
  independence produces no accepted packet.

### 3. Representative loop pilots

- **Owner:** loop-profile owners plus different evaluators.
- **Expected outcome:** research, product definition, incident repair, UX,
  implementation, and security profiles produce typed, immutable, cited
  outcomes with explicit local/live limits.
- **Evidence:** exact pass/fail counts, trajectory grades, artifact manifests,
  OutcomePackets, and exact-source recall receipts.
- **Failure/exit:** a missing observation, false hash comparison, wrong actor,
  or unsupported live claim ends `failed_verification` and informs a successor.

### 4. Evaluator and compiler containment

- **Owner:** runner core; independent evaluator.
- **Expected outcome:** any failed deterministic command rejects evaluation;
  generated run helpers cannot silently enter the production TypeScript
  project; interruption resumes only through a bounded successor.
- **Evidence:** rejecting regression, core tests, TypeScript, context/wiki
  validation, predecessor continuation, successor outcome, and recall.
- **Failure/exit:** no outcome promotion until every command and hard assertion
  passes on one clean candidate.

### 5. Security repair successor

- **Owner:** security reviewer; different evaluator.
- **Expected outcome:** the original governance High is resolved with no
  critical/high finding in that reviewed scope; every Medium/Low and dependency
  advisory remains named, owned, and release-gated.
- **Evidence:** source hashes; 0/0 reviewed critical/high; exact tests; security
  baseline; dependency-audit counts; accepted outcome and recall.
- **Failure/exit:** a critical/high, author-review collision, unbounded claim,
  or failed declared command blocks the successor. A bounded profile pass does
  not close the later dependency or release findings.

### 6. One authority hierarchy

- **Owner:** release integrator and product assurance.
- **Expected outcome:** law, Cockpit decisions/contracts/roadmap, exact source,
  release evidence, portable recall, ADRs, wiki, playbooks, and historical plans
  have one typed order and no competing active release plan.
- **Evidence:** this plan, context-authority manifest hashes, decision records,
  generated wiki/Cockpit views, and green context/product/wiki validation.
- **Failure/exit:** missing, stale, cross-worktree, generated-as-authority, or
  same-level conflict stops product edits.

### 7. Governed branch and review state

- **Owner:** release integrator and repository administrator.
- **Expected outcome:** every dirty path is classified; logical commits are
  pushed; PR #13 describes the exact head; `main` requires the named checks,
  CODEOWNER approval, last-push approval, stale-review dismissal, resolved
  conversations, and current-base validation. The still-moving release branch
  rejects force-push and deletion but remains writable for the remaining gates.
  Both rulesets are installed and read back; no merge occurs.
- **Evidence:** Git status, commit/tree, remote ref, PR fields, separate governed
  merge-boundary and release-continuity packets, ruleset readbacks, and CI run
  IDs.
- **Failure/exit:** bypass actors, excluded governed refs, advisory `main`
  checks, destructive release-branch mutation, or a moving unproven head block
  candidate use. Full pull-request enforcement on the release branch is deferred
  only until the immutable freeze in Gate 17 so governance cannot deadlock the
  remaining authorized commits.

### 8. Portable knowledge synchronization

- **Owner:** knowledge/repository integration.
- **Expected outcome:** Repo Graph and the active Knowledge Context adapter read,
  record, and recall the accepted exact worktree commit with citations, no
  disallowed fallback, and no stale reason.
- **Evidence:** requested/active path, runtime, fallback, fact/citation counts,
  packet digest, source identities, and recall receipts.
- **Failure/exit:** another checkout/commit or backend-only label keeps
  `kg_known=false`; direct inspection cannot be substituted as a KG fact.

### 9. One Chop Core

- **Owner:** core authority.
- **Expected outcome:** MoneyV1, ChopEventV1, ModePolicyV1, signing bytes,
  frontiers, state hashes, corrections, reversals, refunds, partials, fees,
  waivers, disputes, closeout successors, and deterministic migration form one
  production authority.
- **Evidence:** unit/property/model/reorder/idempotency/migration tests and
  `src/main.tsx` replay parity.
- **Failure/exit:** invalid actor/signature/version/currency/frontier changes
  nothing; ambiguous legacy money is quarantined.

### 10. Identity, contact, and membership

- **Owner:** identity/membership.
- **Expected outcome:** guest/account/login/wallet choices, verified contacts,
  signed offer/accept/grant/decline/expiry/resend/revoke, profile instruments,
  removal, role transfer, and key rotation remain separate authorities.
- **Evidence:** two-account and restart/replay/wrong-recipient production tests.
- **Failure/exit:** contact, wallet, personhood, or acceptance alone never grants
  membership or organizer authority.

### 11. Delivery, privacy, and recovery

- **Owner:** recovery/native.
- **Expected outcome:** encrypted journal/projection, outbox/inbox,
  acknowledgement/retry/dedupe/expiry, checkpoints/directory, Bulletin data,
  RecoveryHeadIndex, fresh-device recovery, social re-grant, and optional kit
  survive reorder/restart/loss within documented limits.
- **Evidence:** multi-account/device tests, contract tests/live readback, wrong
  key/account/group/rollback tests, and honest failure screens.
- **Failure/exit:** plaintext secret, revoked future access, same-browser-only
  recovery, or hidden retention failure is release-blocking.

### 12. Contextual first-use product shell

- **Owner:** product/UX.
- **Expected outcome:** Home exposes one dominant working action for the
  observed participant state, prioritized group cards, one New Group path,
  plain account setup, and actionable failure states on mobile and desktop.
  A participant entering Catch with a spend sees Scan a receipt; a participant
  starting the first shared group sees Create my group. Neither action is a
  universal Home default.
- **Evidence:** production-entrypoint click-through, real screenshots at required
  widths, accessibility tree, state/action matrix, and first-time product
  review.
- **Failure/exit:** dashboard, lab, ledger, protocol language, duplicate action,
  universal-action drift, or dead-end creation returns to
  design/implementation.

### 13. Normal product journey

- **Owner:** product and core authority.
- **Expected outcome:** organizer, payer, receiver, guest, observer, and removed
  member complete Catch -> Management -> Payout -> History for pot/trip/couple,
  including edit, exact split, request, partial/wrong payment, delay, waiver,
  dispute, late expense, confirmation, close, history, and recovery.
- **Evidence:** separate-context Playwright through `src/main.tsx`, state hashes,
  and role screenshots.
- **Failure/exit:** fixture-only proof, wrong-role action, hidden failure, or
  mutable competing authority blocks completion.

### 14. Payment, history, and support

- **Owner:** payment/history.
- **Expected outcome:** cash, bank, TWINT/manual and supported link routes remain
  usable; one exact PAS route works where available; payer/receiver/amount/
  asset/network/reference/finality match; history/export/support are readable
  and redacted.
- **Evidence:** manual and real-host-chain testnet settlement, immutable history,
  and leak scans.
- **Failure/exit:** observed, cleared, receiver-confirmed, and closed cannot be
  conflated; unsupported rails are hidden.

### 15. Every named mode

- **Owner:** mode owners over the common core.
- **Expected outcome:** Spend Card, savings circle, emergency pot, and community
  fund each complete authority, privacy, offline, correction, recovery,
  failure, payout/confirmation, closeout, history, and export paths.
- **Evidence:** unit/integration/production-UI/multi-account tests and screenshots
  for each required state.
- **Failure/exit:** no parallel authority, custody, automatic debit, guaranteed
  payout, credit, public emergency reason, or token-governance shortcut.

### 16. Full assurance

- **Owner:** independent product, security, accessibility, contract, and release
  reviewers.
- **Expected outcome:** zero unresolved release-blocking authority, money,
  privacy, recovery, accessibility, dependency, contract, or release finding.
- **Evidence:** static/build/unit/property/model/contract/Playwright;
  multi-account/device; offline/reconnect; 320/375/390/tablet/1280/1440;
  keyboard/screen-reader/contrast/reflow/motion/touch; secret/CSP/XSS/signature/
  replay/license/dependency/privacy; performance/quota/retry/long-history runs.
- **Failure/exit:** retries do not erase failures. The current 2 Medium, 1 Low,
  release canary 0/1, and 57 dependency advisories require explicit resolution
  or accepted non-blocking disposition before `tested=true`.

### 17. Deterministic candidate freeze

- **Owner:** release integrator.
- **Expected outcome:** a clean commit produces `dist-dot-host`, manifest,
  `release.json`, SBOM/licenses, genesis-to-contract map, build ID, CAR, CID, and
  reproducible rebuild with the same aggregate. After its final push and
  exact-current CI proof, the release branch is upgraded from continuity rules
  to the same full governed merge boundary and read back before staging.
- **Evidence:** commit/tree, dependency versions, file hashes, CAR SHA-256,
  root/app CIDs, simulator/host preview, and clean rebuild comparison.
- **Failure/exit:** source change, dirty path, non-determinism, stale deploy
  environment, preview failure, or a release branch that remains directly
  writable creates or blocks the candidate; bytes are never patched after
  freeze.

### 18. Recovery contract on both networks

- **Owner:** contract/recovery release.
- **Expected outcome:** reviewed identical source/bytecode behaves correctly on
  Products Devnet and Paseo and is mapped by exact chain genesis.
- **Evidence:** source/bytecode hashes, deploy transactions, code readback,
  addresses, geneses, ABI/adversarial tests, and live readHead/advanceHead proof.
- **Failure/exit:** uncertain signer/genesis/address/code or unexpected authority
  blocks frontend publication.

### 19. Products Devnet stage

- **Owner:** release integrator.
- **Expected outcome:** the frozen CAR/CID is staged under the selected testnet
  name and works through `.dev-dot.li`, direct gateway, host, and Polkadot
  Desktop Dev while public remains unchanged.
- **Evidence:** scoped approval/effect record, transaction/readback, root/app
  CIDs, release metadata, screenshots, live smokes, and rollback CID.
- **Failure/exit:** any source fix produces a new commit/CAR and full restage;
  public promotion does not proceed.

### 20. Byte-identical public promotion

- **Owner:** release integrator; independent byte/readback reviewer.
- **Expected outcome:** the stage CAR is promoted without rebuilding to Paseo
  and every supported public-testnet `.dot` surface, including independently
  proven `.dot.li` and Desktop Dev.
- **Evidence:** unchanged CAR SHA-256; equal root/app CIDs; public gateway,
  `.paseo.li`, `.dot.li`, browser-host and Desktop readbacks; every-mode live
  smoke; rollback verification.
- **Failure/exit:** mismatch, uncertain alias, wrong environment, or failed live
  smoke returns the name to the reviewed maintenance/rollback CID.

### 21. Ownership, real use, and durable handoff

- **Owner:** Devinson for wallet signatures and real acceptance; release
  integrator for evidence and handoff.
- **Expected outcome:** `chopdot.dot` is used only when Full personhood permits;
  otherwise `chopdotapp01.dot` ships and remains an explicit migration item.
  Network names are transferred and ownership read back. One real organizer
  and two real participants complete normal pot, receipt, savings, emergency
  privacy, and community approval without infrastructure coaching. The final
  outcome is recalled against the exact release commit.
- **Evidence:** public recipient address, personhood result, ownership readback,
  real-user observations, URLs, screenshots, commit/tree/build/CAR/CID,
  contract addresses/geneses, test counts, PR, rollback command, and cited
  recall receipts.
- **Failure/exit:** upload or agent/fixture evidence cannot set `user_proven`.
  An external personhood blocker uses the fallback name and keeps branded-name
  migration open instead of blocking the usable public beta.

## Historical snapshot at plan adoption

The original adoption snapshot was taken before the category-baseline repair
and is intentionally not maintained here. This plan defines ordered gates; it
does not own current completion state. Never infer a current gate verdict from
this section or from the age of the plan.

Current status belongs to Git, Product Cockpit, immutable
OutcomePackets, `docs/release/current-release-state.json`, live readback, and
portable recall. This plan must not be used as proof that its own steps ran.

## Hard stops

- Conflicting product-law or same-level current-decision source.
- Competing mutable production authority or reusable secret in source/URL/log.
- Fresh-device recovery that depends only on the same browser storage.
- Custody, guaranteed payout, automatic debit/credit, or unilateral release.
- Unresolved release-blocking finding or unreviewed dependency exposure.
- Stage/public byte, CID, build-ID, contract, genesis, signer, or owner mismatch.
- `.dot.li` claim without independent CID/build/browser proof.
- Real-person acceptance replaced by an agent, fixture, or coached protocol
  console flow.

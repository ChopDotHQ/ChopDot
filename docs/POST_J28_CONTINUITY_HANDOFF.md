# ChopDot Post-J28 Continuity Handoff

**Purpose:** single public-safe restart page for a new ChatGPT thread, agent session, or engineer picking up the post-J28 work.

**Snapshot date:** 2026-09-15  
**Important:** this file is a routing/index document, not product authority. **Live GitHub evidence outranks this snapshot.** Before acting, re-read the current canonical workbench state, issue #38, issue #43, live automation roster, and `docs/CHATGPT_FACTORY_WORKER_REGISTRY.md`.

---

## 1. Canonical product baseline

- Repository: `ChopDotHQ/ChopDot`
- Canonical UX branch at post-J28 completion: `ux/experience-workbench`
- Exact validated canonical head at post-J28 closeout: `ec67add06888ab99212f3a4a533951195259030b`
- Registered journeys: **28/28 Golden and exact-head validated**
- `current_journey: null`
- Production implementation remains intentionally held until the gates in this document are satisfied.

The 28 validated journeys remain product truth unless an exact post-J28 successor is independently reviewed and explicitly human-approved.

---

## 2. Human product decisions already made

Authoritative public-safe decision history is mirrored in issue #38.

Key authority comments:

- `#38` comment `5678939496` — user approval of **GUEST-01** and **SPEND-01 at the rail-neutral state-model level**.
- `#38` comment `5679654905` — durable public-safe decision summary and Polkadot/CASH interpretation.
- `#38` comment `5679711494` — explicit authority to execute the documented Phase C1 selective contract/prototype package.

### GUEST-01 — approved

Introduce a durable group-scoped `Participant / MemberIdentity` concept so a person can participate without first creating a full ChopDot/Polkadot account.

Required semantics:

- stable Participant ID survives account linking/upgrading;
- `guest`, `account_backed`, `linked`, `unresolved` identity states/capabilities;
- no silent identity merge by display name, email, username, or similar label;
- guest → account linking must be explicit, verifiable and recoverable;
- historical financial/member references remain attached to the same Participant;
- account/signing/payment/admin capabilities may require account-backed identity without invalidating basic guest ledger participation.

### SPEND-01 — approved at state-model level only

Introduce a **rail-neutral `SpendIntent`** so ChopDot can coordinate money **before/during** a purchase rather than permanently assuming one person paid first and debt came afterward.

Core rules include:

- authorization is not execution/capture;
- exact operation identity and replay/idempotency protection;
- lifecycle supports draft/reviewed/authorized/pending/captured/partial/unknown/failed/reversed/cancelled semantics;
- unknown outcome never creates fresh spend authority;
- partial/refund/reversal lineage must be preserved;
- confirmed spend may derive canonical financial state exactly once;
- payment/card/pot mechanisms attach behind an adapter boundary.

### Explicitly NOT approved

The following remain research-first / future-mode unless later separately authorized:

- generic Visa/Mastercard-style merchant card issuance;
- joint/shared bank account or custodial pot as ChopDot product law;
- issuer/BaaS dependency;
- Apple/Google wallet provisioning;
- concrete split-at-purchase provider implementation;
- Journey 29 solely because a competitor/platform has a card feature;
- production implementation;
- protected merge or deployment.

---

## 3. Polkadot platform interpretation to preserve

User-supplied Polkadot app screenshots plus current official platform research clarified an important distinction:

- the Polkadot Pocket currently uses **card-shaped UI surfaces** for things such as ID, CASH balance and collectibles;
- current Devnet CASH/Coinage is a promising future payment/execution primitive;
- this does **not** currently prove generic merchant-card issuance, acquiring, Apple/Google Pay provisioning, or a group-funded merchant card;
- current Product SDK/host primitives should be treated as platform adapters, not as ChopDot product law;
- Polkadot identity/personhood/per-application aliases may later back an `account_backed` Participant;
- true no-full-account guest participation remains ChopDot-owned.

Architecture consequence:

> ChopDot owns group-money meaning and durable state. Execution rails are replaceable adapters.

A future `polkadot_cash`/host-payment adapter should plug into the rail-neutral SpendIntent boundary without redesigning ChopDot.

---

## 4. Phase C1 — selective post-J28 product-contract integration

Phase C1 is active post-J28 contract work, **not production implementation** and not a new generic Journey 29.

The selective package is expected to contain:

1. shared `Participant / MemberIdentity` contract;
2. successor guest-capable J01/J04 flows;
3. minimum required consuming identity semantics in J09/J24/J25/J27;
4. shared rail-neutral `SpendIntent` contract;
5. durable public-safe product-rationale/decision record;
6. exact regression proof that unrelated Goldens remain unchanged.

### C1 review/approval sequence

`Contract Builder` → sealed exact review request  
`Contract Reviewer` → independent `REVISE`, `REVIEWABLE`, or `GOLDEN-READY / CONTRACT-READY`  
`Contract Supervisor` → exact human approval request only after all required evidence is clear  
Human exact approval → selective materialization/re-lock → resulting-state verification

The earlier J26–J28 standing approval **does not apply** to new post-J28 bytes/contracts.

---

## 5. Production-readiness preflight — issue #43

Issue **#43 — “Production Readiness Preflight — implementation seams + adversarial security model”** is the durable coordination surface for work that can proceed in parallel while Phase C1 is being resolved.

This preflight is read-only against production behavior until later authority.

### Lane A — Production Readiness Mapper

Build a production seam map over `codex/chopdot-v1-launch`, draft PR #39 / `integration/golden-product-v1`, exact current tests and Polkadot adapters.

For each important concept classify current code as:

- `REUSE`
- `ADAPT`
- `REPLACE`
- `REMOVE`
- `DEFER`

Required coverage includes:

- Participant/User/account/membership identity;
- guest → account-backed linking;
- group/expense/split/history references;
- invites/request links/no-app actions;
- payment methods/receiving destinations;
- existing PaymentIntent settlement-after-debt machinery;
- new SpendIntent before/during-spend boundary;
- settlement/proof/receipt confirmation;
- storage/sync/backup/recovery/export;
- Product SDK/host/account/signing/statement-store/payment boundaries;
- legacy/speculative code such as old `spend_card` modes;
- draft PR #39 salvage/rebase strategy;
- migrations and exact test ownership.

Important known production seam requiring careful treatment:

- legacy identity migration can rewrite `userId` references throughout groups, expenses, splits, payment methods and saved history;
- final architecture must preserve stable Participant identity and attach account bindings/capabilities without rewriting historical ownership.

Important domain distinction:

- existing `PaymentIntent` machinery is **settlement after debt exists**;
- `SpendIntent` is **coordination before/during spend**;
- reusable machinery may include operation IDs, versioning, idempotency, audit/evidence patterns, but the domain meanings must not be collapsed into one overloaded concept.

### Lane B — Security Attacker

An independent read-only adversarial lane uses **public ChainSecurity reports/audit subject areas as a pattern library** plus current Polkadot/Parity security/runtime semantics.

It must attack ChopDot as a financial/identity state machine:

- forward;
- backward;
- mid-transition;
- during retry;
- during partial/unknown outcomes;
- after restart/offline;
- after backup restore;
- during identity linking;
- with malicious/buggy adapters or privileged actors.

It must never imply ChainSecurity audited ChopDot and must not implement fixes it certifies.

Required outputs:

1. Trust & Authority Model
2. Security Invariant Register
3. J01–J28 Security Coverage Matrix
4. Attack Sequence Matrix
5. Temporal Transition Matrix
6. Migration Threat Model
7. deterministic/property/stateful/fuzz/browser/integration/on-chain test plan
8. severity-ranked production blockers

Finding classes:

- `VERIFIED DEFECT`
- `ARCHITECTURE RISK`
- `TEST GAP`
- `TRUST ASSUMPTION`
- `HYPOTHESIS`

---

## 6. Mandatory J01–J28 security + implementation crosswalk

Issue #43 comment `5680158640` defines the per-journey classification rule.

**Every validated Golden J01–J28 must receive both:**

1. a security disposition / landing layer;
2. an implementation ownership row.

Security landing layers are:

- `GOLDEN / PRODUCT-CONTRACT CHANGE`
- `SHARED PRIMITIVE / ARCHITECTURE INVARIANT`
- `IMPLEMENTATION / ACCEPTANCE TEST ONLY`
- `ADAPTER / PLATFORM BOUNDARY`
- `NO NEW ACTION / ALREADY COVERED`

For each journey, the crosswalk should record at minimum:

- critical assets/state;
- actors and authority;
- trust boundary;
- attacker goals;
- temporal failure points;
- inherited/new invariant(s);
- whether current Golden is sufficient;
- landing layer;
- production UI/domain/storage/adapter owners;
- migration implications;
- exact test ownership;
- implementation order;
- evidence/blocker state.

### Critical rule

**J28 does not substitute for security analysis of J01–J27.**

J28 defines user-facing recovery patterns; individual journeys still need their own safe state/authority semantics.

### Another critical rule

If the same security concern affects many journeys, lift it into a shared invariant rather than duplicating product copy/logic in every Golden.

Examples of cross-cutting invariants already central to the architecture:

- stable Participant ID across account linking;
- failed linking must not partially mutate prior authority/history;
- display name/email/username is not identity proof;
- organizer authority cannot substitute for participant authority;
- `authorized != executed != captured`;
- unknown external result never grants fresh execution authority;
- one external spend maps to one SpendIntent lineage;
- restore/import cannot manufacture money, membership, signing authority or duplicate identity;
- external host/payment callbacks are observations until exact proof/reconciliation promotes them into canonical financial truth.

Any material `GOLDEN / PRODUCT-CONTRACT CHANGE` finding is a **production blocker** until an exact successor contract is independently reviewed and explicitly human-approved.

---

## 7. Known existing production surfaces worth reusing or auditing

The current production baseline is not a blank rebuild. It already contains useful primitives and tests, including:

- Polkadot Product SDK host/account/statement-store/transaction dependencies;
- membership/group key/signature infrastructure;
- request links and signed limited no-app actions;
- payment/settlement tests and wallet handling;
- PaymentIntent contract/kernel with command IDs/versioning/replay/evidence concepts;
- host simulation and browser tests;
- storage/event delivery/recovery infrastructure;
- Golden → Production acceptance ledger;
- draft integration PR #39.

Reuse must be earned by exact semantic fit. Existing code is evidence of implementation history, not proof of current product authority.

---

## 8. Private strategy artifacts — do not publish into GitHub

Private research/strategy files exist outside the public repo and are intentionally kept private:

- `ChopDot_Post_J28_Gap_Placement_Plan_2026-09-15.md`
- `ChopDot_SPEND01_GUEST01_Research_2026-09-15.md`
- private competitive workbook `ChopDot_Private_Competitive_Feature_Matrix_2026-09-14.xlsx` / newest suffixed copy

These informed the public-safe product decisions, but competitor/workbook evidence must not be copied into public GitHub issues/docs.

If a new thread needs the private rationale, retrieve the newest matching private artifacts from the user’s uploaded files/File Library rather than reconstructing them from public issue summaries.

---

## 9. Production-start gate

`ChopDot Product Integrator` must remain disabled until **all** of the following are true:

1. Phase C1 successor package is exact independently reviewed;
2. user explicitly approves the exact C1 bytes/contracts;
3. C1 is selectively re-locked/materialized and resulting-state verification is green;
4. every J01–J28 has a security disposition;
5. every J01–J28 has a production implementation ownership row;
6. no unresolved `GOLDEN / PRODUCT-CONTRACT CHANGE` security blocker exists;
7. issue #43 Production Start Packet is sufficiently complete;
8. a separate explicit human authority transition starts production implementation.

Completion of the preflight alone does **not** authorize production.

---

## 10. Intended implementation direction after production authority

Exact order may be refined by the Production Start Packet, but current architecture favors:

1. Participant / identity foundation and migration
2. group/member state and authority
3. expense/obligation canonical state
4. SpendIntent core and exact-once derivation boundary
5. settlement / PaymentIntent / proof / recovery
6. storage / sync / backup / portability
7. Polkadot account/signing/identity adapters
8. Polkadot CASH/payment adapter when current platform evidence supports it
9. additional payment/execution rails later behind the same adapter boundary

Security runs throughout design, implementation, integration and release rather than as an end-only audit.

---

## 11. Live factory routing

The exact enabled worker roster can change. Never recreate or add workers from this document alone.

Before changing automation topology:

1. inspect the live automation roster;
2. read `docs/CHATGPT_FACTORY_WORKER_REGISTRY.md`;
3. read live issue #38 and issue #43 state;
4. reuse existing workers first;
5. preserve one-writer + independent-review + authority separation;
6. keep Product Integrator locked until the production-start gate above is satisfied.

Current Phase C1 design uses the contract Builder/Reviewer/Supervisor chain plus carefully gated pickup opportunities, Production Readiness Mapper, Security Attacker, Control Tower, Polkadot Platform Watch and Capability Radar.

---

## 12. New-thread restart procedure

When opening a new ChatGPT thread, the shortest safe restart is:

1. Say: **“Continue ChopDot from `docs/POST_J28_CONTINUITY_HANDOFF.md`; re-read live #38, #43, the canonical UX registry/head, and the live automation roster before acting.”**
2. Have the new thread verify the current canonical head and exact Phase C1 candidate/review state rather than trusting this snapshot.
3. Have it inspect issue #43 for latest security/seam-map progress and any production blockers.
4. Retrieve the private post-J28 strategy/research artifacts only if strategic rationale is needed.
5. Continue from the single live next owner/state transition.

Do not ask the user to reconstruct the project from chat memory if these durable sources remain accessible.

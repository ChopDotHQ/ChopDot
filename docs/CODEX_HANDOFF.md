# ChopDot Codex Handoff

> **Prepared:** 2026-08-20  
> **Repository:** `ChopDotHQ/ChopDot`  
> **Parallel work branch:** `chatgpt/chopdot-v1-completion`  
> **Original branch base:** `codex/portable-shell-trial` at `81e56801a059253ca3daf667251239d4776e96f4`  
> **Known DevNet product:** `chopdotproof02.dot`  
> **Known deployed version from prior issue context:** `0.5.6`

This document is the persistent handoff from the ChatGPT build session to Codex. It exists so the work does not depend on chat memory.

As of this handoff, GitHub reports `chatgpt/chopdot-v1-completion` as **140 commits ahead** of `codex/portable-shell-trial` and not behind it. That count will age; resolve the live head before doing any work.

---

## 1. What Codex must do first

Do **not** immediately merge, cherry-pick, or continue coding.

First establish the actual source situation:

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git log -1 --oneline
git fetch origin --prune
git rev-parse origin/chatgpt/chopdot-v1-completion
git rev-parse origin/codex/portable-shell-trial
```

Then determine which branch/commit produced the currently deployed/local `.dot` build. The exact current local source may contain newer Codex work that was never pushed or reconciled with this branch.

Compare before deciding what to port:

```bash
git diff --stat <CURRENT_TRUE_SOURCE>...origin/chatgpt/chopdot-v1-completion
git log --left-right --cherry-pick --oneline \
  <CURRENT_TRUE_SOURCE>...origin/chatgpt/chopdot-v1-completion
```

If useful, create a dedicated reconciliation branch from the **true current source**, not from this parallel branch:

```bash
git switch <CURRENT_TRUE_SOURCE_BRANCH>
git switch -c codex/reconcile-chatgpt-v1
```

The rule is:

> **Compare slice by slice, keep the stronger implementation, and never blindly merge 140 commits into current source.**

---

## 2. Mandatory reading order

Before touching runtime code, read:

1. `docs/CODEX_HANDOFF.md`
2. `docs/CHOPDOT_V1_EXECUTION_BOARD.md`
3. `docs/PRODUCT_EXPERIENCE.md`
4. `docs/SECURITY_TRUST_MODEL.md`
5. `docs/ARCHITECTURE_DECISIONS.md`
6. `docs/DATA_ARCHITECTURE.md`
7. `docs/ENGINEERING_STANDARDS.md`
8. `docs/QUALITY_GATE.md`
9. `docs/FOUNDATION_DEBT.md`
10. the relevant `docs/slices/*_PREFLIGHT.md`

For Polkadot/data-sensitive work also read:

- `docs/research/RESEARCH-001_PARITY_REFERENCE_ARCHITECTURE.md`
- `SECURITY_FOUNDATION.md`
- `PAYMENT_INTENT_CONTRACT.md`
- `PAYMENT_INTENT_SERVICE_FOUNDATION.md`
- `HOSTS.md`
- `PORTABLE_SHELL_TRIAL.md`

No implementation should begin from this summary alone. The preflight and guardrail documents contain the acceptance rules and known contradictions.

---

## 3. Product objective

Build the simplest complete version of ChopDot that normal people can trust for shared-money coordination:

```text
local or Polkadot identity
→ add/reuse people
→ create/manage a group
→ add an expense
→ edit or correct it safely
→ understand balances
→ request one payer for one creditor at a time
→ settle by cash/external rail/native Polkadot/USDC when genuinely supported
→ preserve evidence
→ receiver confirms under current v1 policy
→ show human-readable activity history
→ reload/recover the same financial truth
```

Polkadot should improve authority, signing, settlement, proof and portability. It must not force protocol terminology into ordinary consumer screens.

The intended product experience is closer to a strong consumer money app than a blockchain dashboard:

- one obvious next action;
- cheap, reversible mistakes before finality;
- progressive disclosure;
- human money language;
- recipient experience treated as first-class;
- crypto offered contextually rather than forced;
- no fake sync, payment, verification, recovery, or chain support.

---

## 4. Accepted target architecture

The current pushed shell still persists one local `AppState` through browser/host local storage. That is a prototype/local execution model, not the accepted production shared architecture.

The accepted target is:

```text
POLKADOT APP / HOST
identity + product account + user approval + signing
                ↓
CHOPDOT CLIENT (.dot / web)
UI + drafts + local cache/offline projection
                ↓ authorized/idempotent commands
CHOPDOT SERVICE
pure domain rules + authentication + idempotency + DB transactions
                ↓
POSTGRES
canonical shared operational state + append-only audit events
        ↙                         ↘
POLKADOT CHAIN                STATEMENT STORE
canonical chain facts         optional tiny wakeup/version hint
and finality                   never financial truth
        ↓
BULLETIN / CLOUD STORAGE
optional encrypted content-addressed artifacts
```

Authority rules:

- **Postgres/service** is canonical for what ChopDot believes people owe and the application lifecycle.
- **Polkadot chain** is canonical for actual on-chain transaction/finality facts.
- **Polkadot Host/App** is the user-side identity/product-account/signing boundary.
- **Local KV** is drafts/cache/prototype persistence, not multi-user truth.
- **Statement Store** is optional notification/invalidation transport, never the ledger.
- **Bulletin** is optional artifact storage, never the relational ledger.
- The backend never stores user seed phrases or private signing keys.
- Production financial writes go through trusted commands, not direct client table mutation.

This architecture came from a first-party Parity reference review rather than assuming every byte should live on-chain.

---

## 5. Non-negotiable financial and security rules

1. Money truth beats UI convenience.
2. Confirmed/payment history is append-only; corrections create new truth.
3. Crypto is a settlement rail, not a separate accounting model.
4. Payer attestation or verified payment evidence moves a split to `marked_paid`.
5. Receiver confirmation moves it to `confirmed` under the current v1 policy.
6. A button press, opened link, or submitted transaction is not automatically final settlement.
7. Names are presentation, never identity or financial keys.
8. Manually entered addresses/payment destinations are not equivalent to host-authenticated identity.
9. One payment action pays **one creditor at a time**.
10. PAS/Paseo DevNet evidence must never be called DOT production evidence.
11. Mainnet USDC metadata must never be reused as an invented Paseo asset registration.
12. Duplicate callbacks, retries and replayed commands must not duplicate financial state.
13. Failures should leave financial truth unchanged or explicitly recoverable.
14. Private keys never enter ChopDot.

The current local status model is still:

```text
open → request_sent → marked_paid → confirmed
```

The intended production domain is:

```text
Expense
→ ExpenseSplit
→ Obligation
→ PaymentIntent
→ SettlementAttempt
→ SettlementEvidence
→ application confirmation / closed obligation

Every important transition
→ append-only ActivityEvent
```

---

## 6. Work completed on the parallel branch

Statuses mean:

- `READY_FOR_CODEX_VERIFY`: implementation/tests are written and reviewable, but required local typecheck/build/device/chain evidence has not been fully executed here.
- `DONE`: evidence exists and the work has been reconciled with true current source.

### Foundation and architecture

| Slice | Status | What exists |
|---|---|---|
| FOUNDATION-000 | DONE | canonical execution board and status discipline |
| FOUNDATION-001 | DONE | product, security, architecture, engineering and quality guardrails |
| RESEARCH-001 | DONE | first-party Parity reference architecture review |
| DATA-001 | DONE (design) | canonical hybrid Postgres + Polkadot data architecture |

### Money and group product foundations

| Slice | Status | Main result |
|---|---|---|
| MONEY-001 | READY_FOR_CODEX_VERIFY | expense list/detail; atomic edit/delete before counterparty payment activity; validation and tests |
| MONEY-002 | READY_FOR_CODEX_VERIFY | safe correction after requests/payments; stale request replacement; additive refund/amount-due adjustments; immutable paid history |
| GROUP-001 | READY_FOR_CODEX_VERIFY | rename/add/reuse/remove members with unresolved-obligation safety and historical attribution preserved |
| PEOPLE-001 | READY_FOR_CODEX_VERIFY | reusable friend detail and receive preferences without allowing arbitrary friend wallet text to become trusted authority |

### Settlement lifecycle

| Slice | Status | Main result |
|---|---|---|
| SETTLEMENT-001 | READY_FOR_CODEX_VERIFY | common rail/evidence contract across cash, bank, payment link, native Polkadot and USDC |
| SETTLEMENT-002 | READY_FOR_CODEX_VERIFY | manual payer acknowledgement, undo before confirmation, receiver confirmation, persistent local settlement events |

Important behavior:

```text
request_sent
→ payer marks paid OR verified evidence arrives
→ marked_paid
→ receiver confirms
→ confirmed
```

Chain-evidenced payments cannot use the manual Undo path.

### Polkadot identity and payment adapters

| Slice | Status | Main result |
|---|---|---|
| POLKADOT-001 | READY_FOR_CODEX_VERIFY | explicit host-authenticated product-account provenance, bind/unbind, capability-aware Profile, no private keys |
| POLKADOT-002 | READY_FOR_CODEX_VERIFY | native PAS/Paseo Product SDK transaction adapter using authenticated product accounts, signer, chain client, `Balances.transfer_keep_alive`, finality evidence |
| POLKADOT-003 | READY_FOR_CODEX_VERIFY / EXECUTION BLOCKED | verified USDC config/evidence/executor seam; deliberately no fake live USDC execution |

Important limitations:

- The exact deployed Product SDK `productId` still needs real-host reconciliation before product-account derivation is treated as production authority.
- Current reviewed Product SDK chain preset supports Paseo; production Polkadot support was not claimed.
- No verified current Paseo USDC asset registration/id was found.
- Mainnet USDC metadata is known (`assetId 1337`, `6 decimals`) but execution stays disabled until the supported production path is real.

### History and profile lifecycle

| Slice | Status | Main result |
|---|---|---|
| HISTORY-001 | READY_FOR_CODEX_VERIFY | real money activity timeline plus finished-group archive; human wording distinguishes payer evidence from receiver confirmation |
| IDENTITY-001 | READY_FOR_CODEX_VERIFY | one honest local onboarding path, explicit name save, Polkadot connect/disconnect, honest recovery limitations |

### Validation and recovery quality

| Slice | Status | Main result |
|---|---|---|
| QUALITY-001 | READY_FOR_CODEX_VERIFY | strict decimal parsing, currency precision rules, hardened split inputs, UUID IDs, truthful scoped payment-request sharing |
| QUALITY-002 | BUILDING | shared mobile/accessibility primitives started; detailed status below |

QUALITY-001 fixed several real correctness problems:

- rejected partial numeric parsing such as `12abc`;
- rejected exponent, negative and excess-precision inputs;
- validated exact/percentage/share splits at explicit currency precision;
- replaced `Date.now() + Math.random()` entity identifiers with UUIDs;
- changed Request Payment from a lying `Send / Copy link` button into a real, scoped, expiring request packet;
- one payer→receiver→currency request gets one stable request ID/expiry across the exact split scope;
- financial state changes only after Share/Clipboard succeeds;
- unavailable delivery fails closed rather than claiming a request was sent.

---

## 7. Current exact position: QUALITY-002 is BUILDING

Preflight: `docs/slices/QUALITY-002_PREFLIGHT.md`

Already implemented:

- shared `Button` defaults to `type="button"`;
- approximately 44px minimum touch targets;
- visible `focus-visible` keyboard ring;
- stronger disabled behavior;
- icon-button target sizing;
- `ScreenHeader` respects `env(safe-area-inset-top)`;
- balanced 44px header side slots;
- decorative back icon marked `aria-hidden`;
- `ScreenContent` renders as the primary `<main>` landmark and contains overscroll;
- a GitHub Actions workflow exists at `.github/workflows/quality-002.yml` for typecheck, quality tests, identity regressions, production build and future Playwright mobile/a11y acceptance.

Next QUALITY-002 work, in order:

1. bottom navigation safe-area behavior around home indicators;
2. selected-tab semantics (`aria-current`) and accessible tab names;
3. async status messaging for loading/success/failure, including `aria-live` where appropriate;
4. long-name, long-group-title and large-money layout stress cases;
5. narrow viewport acceptance at 320/375/390px;
6. keyboard-only walkthrough;
7. screen-reader semantic spot checks;
8. reduced-motion/high-contrast fixes only where a real usability issue exists;
9. update the execution board and do not mark DONE without runtime evidence.

Do not use QUALITY-002 as an excuse to reopen financial authority or architecture unless testing exposes a real correctness defect.

---

## 8. Known foundation debt and blockers

Canonical register: `docs/FOUNDATION_DEBT.md`.

### Must be reconciled deliberately

- `DEBT-MONEY-001`: local canonical money still uses JavaScript `number`; migrate to integer minor/base units in DATA-002.
- `DEBT-PERSIST-001`: local persistence has no explicit versioned migration chain/corruption recovery UI.
- `DEBT-SECURITY-001`: legacy internal `RECORD_MATCHED_PAYMENT` still directly confirms; live paths no longer use it, but Codex must safely remove/rewrite it and update regressions.
- `DEBT-SYNC-001`: many new actions are intentionally local-only until canonical backend authority exists.
- `DEBT-POLKADOT-IDENTITY-001`: resolve the exact current/deployed `productId` and derived product account on the real host.
- `DEBT-POLKADOT-SDK-001`: reconcile Product SDK package-family versions and prove install/type/build/host compatibility.

### Platform constraints

- Real Desktop Statement Store allowance remains blocked upstream by `paritytech/polkadot-desktop-community#29`.
- Canonical shared correctness must not depend on Statement Store.
- Statement Store should eventually carry only tiny invalidation/version hints after a canonical DB commit.
- Bulletin should not store plaintext personal receipts merely to maximize Polkadot usage.

---

## 9. What has not been implemented yet

### DATA-002 — integer money + persistence migrations

Do this only after current-source reconciliation. It changes canonical persisted shapes and needs explicit migration and invariant tests.

### BACKEND-001 — shared service + Postgres foundation

Accepted initial scope:

- Postgres migrations;
- TypeScript service/repository boundary;
- users, identities, groups, memberships, expenses, splits and activity first;
- authenticated/idempotent command boundary;
- paginated/indexed query boundary;
- no private keys server-side.

### BACKEND-002 — obligations + durable payment intents

- formal obligation projection;
- durable payment intents;
- optimistic concurrency/versioning;
- idempotency records;
- append-only events;
- transactional tests.

### SYNC-001

Correctness should come from API/database reconciliation first. Statement Store is an optional wakeup/version signal, not financial transport.

### RELEASE-001

Required acceptance journey:

```text
fresh user
→ local/Polkadot identity
→ people/group
→ add/correct expense
→ balances
→ request
→ cash settlement
→ native PAS DevNet settlement
→ USDC only if capability is verified
→ receiver confirmation
→ explainable history
→ restart/reload
→ same money truth
```

Shared-mode extension:

```text
two devices
→ same canonical group
→ authorized mutation
→ peer refresh/reconcile
→ no duplicate or conflicting financial truth
```

---

## 10. Verification commands

Start with dependency and source reconciliation. Then run the relevant commands available in `package.json`:

```bash
npm ci
npm run lint
npm run test:quality
npm run test:identity
npm run test:history
npm run test:settlement
npm run test:native-payment
npm run test:people
npm run test:group-safety
npm run test:wallet
npm run test:host-adapter
npm run build
```

Then run applicable Playwright/host checks:

```bash
npm run test:host-sim
npm run test:host-wallet
npm run test:guest-link
npm run test:late-expense
```

Do not treat compilation or simulation as real host/chain proof. For Polkadot slices, record actual product ID, product account, network, asset, transaction hash, finality evidence and receiver-confirmation behavior.

For QUALITY-002 also verify:

- 320px, 375px and 390px widths;
- standalone/embedded safe areas;
- keyboard-only navigation;
- selected bottom-navigation semantics;
- status/error announcements;
- long names and large amounts;
- at least a screen-reader semantic spot check.

---

## 11. Recommended reconciliation sequence

1. Preserve all current local work; do not overwrite uncommitted files.
2. Identify the exact branch/commit deployed to `.dot`.
3. Compare true current source with `origin/chatgpt/chopdot-v1-completion`.
4. Read the guardrails and preflights.
5. Reconcile foundation docs first so future work has one canonical process.
6. Reconcile the domain/test commits before UI commits where practical.
7. Remove/rewrite legacy direct-confirm semantics.
8. Resolve Product SDK product ID and dependency-family compatibility.
9. Run all non-device checks.
10. Finish QUALITY-002 on the reconciled source.
11. Verify the entire local product journey.
12. Decide whether DATA-002 or BACKEND-001 comes next based on the true current source—not chat assumptions.
13. Only then prepare deployment/PR evidence.

Avoid a giant merge commit if modular cherry-picks or deliberate ports produce a more reviewable result.

---

## 12. What Codex must not do

- Do not blindly merge the parallel branch.
- Do not call `READY_FOR_CODEX_VERIFY` work DONE without evidence.
- Do not claim PAS DevNet as production DOT.
- Do not expose a USDC payment option without verified network/asset/runtime support.
- Do not let a payer-only event directly assert receiver confirmation.
- Do not treat Statement Store or a URL packet as the financial ledger.
- Do not allow manually typed friend addresses to become authenticated payment authority.
- Do not store private keys or seed material.
- Do not opportunistically migrate money/persistence inside an unrelated UI slice.
- Do not rewrite paid history to make corrected totals look convenient.
- Do not aggregate debts owed to different creditors into one payment action.
- Do not hide errors merely to simplify screens.
- Do not ship broad AI-generated refactors without small reviewable commits and tests.

---

## 13. Expected first response from Codex

Before coding, Codex should report:

1. current branch, HEAD and working-tree status;
2. exact branch/commit believed to produce the current `.dot` deployment;
3. comparison summary against `origin/chatgpt/chopdot-v1-completion`;
4. overlapping work already solved in current source;
5. conflicts or architectural contradictions;
6. proposed reconciliation branch and commit strategy;
7. commands/tests it can execute now;
8. the next smallest safe vertical slice.

The first goal is not “merge everything.” The first goal is **establish the truth of the current source and produce a safe reconciliation plan**.

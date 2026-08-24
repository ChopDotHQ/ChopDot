# ChopDot Context Authority and Live First-Use Repair

**Kind:** decision
**Status:** active
**Owner:** release integrator
**Last reviewed:** 2026-08-24
**Applies to:** chopdot-v1-launch
**Authority:** current bounded execution plan; it cannot change product law or expand external approval
**Branch:** `codex/chopdot-v1-launch`
**Programme:** Programme A — public-testnet product release
**Supersedes:** no product law; narrows the current release critical path

## Goal

Make ChopDot's operative context fail closed: one explicit authority hierarchy,
one exact-worktree routing manifest, a Cockpit that selects the highest-priority
current blocker instead of file order, and validation that rejects missing,
stale, cross-checkout, generated-as-authority, or unclassified references.

Then repair the live first-use failure reported on the frozen public candidate:
a guest must not reach an enabled group-creation action that can only fail with
internal `Product Account` language, and the empty Home must present one clear
next action instead of a dashboard of modes and duplicate actions.

No promotion of the current candidate may resume. A source repair requires a
new clean commit, build ID, CAR, CID, assurance pass, and live readback.

## Current truth to preserve

- `PRODUCT_TRUTH.md` is the only product-law source.
- Participant-signed events remain membership and money authority.
- Contact proof, account ownership, personhood, membership, organizer
  authority, and payment authority remain distinct.
- Receipt capture creates a local reviewed draft before shared mutation.
- Native infrastructure remains invisible in normal user language.
- Stage and public promotion must use byte-identical immutable release bytes.
- Implemented, tested, committed, pushed, built, staged, promoted, reachable,
  user-owned, user-proven, and KG-known remain separate verdicts.

## Facts observed at plan start

These measurements explain why the package was opened; they are not a current
status surface after the package changes. Current status belongs to the
Cockpit, exact Git state, tests, and `docs/release/current-release-state.json`.

1. The launch worktree contains product law, cards, decisions, contracts, and
   roadmap, but is missing `AGENTS.md`, `PROJECT_DIRECTIVES.md`,
   `docs/CHOPDOT_OPERATING_LOOPS.md`, and `docs/CHOPDOT_LOOP_RUNNER.md`.
2. `scripts/product-cockpit.mjs` currently selects the first `building` card in
   source-file order for `next`; it has no priority, blocker, evidence,
   review-date, or worktree-applicability gate.
3. Generated Cockpit and wiki files are correctly labelled read models, but
   current validation only checks rendering equality and a small set of fields.
4. `PRODUCT_TRUTH.md` records the source-of-truth system as unresolved while
   `product/cards.md` says the cards govern the launch worktree.
5. The live public candidate allows a guest to attempt group creation, then
   fails later at the account-authority boundary with internal terminology.
6. The live empty Home exposes repeated capture actions, duplicate group
   creation actions, and an equally weighted mode catalog.

## Product gate

```text
User journey:
"I am Mina, I need to begin a shared group without understanding account
infrastructure, so the group can intentionally join and coordinate money."

One next action:
Create my group

Friction score /3: 3
Trust score /3: 3
Clarity score /3: 3
Language score /1: 1
Total /10: 10
Decision: PASS
```

The setup action behind `Create my group` may establish the required signed
account binding, but the interface must describe the user's outcome rather
than the adapter or account product.

## Scope in

### Context authority

- Add an exact-worktree `AGENTS.md` routing file that points only to files that
  exist in this worktree and keeps product law separate from scaffolding.
- Add a context authority manifest naming every default read path, its kind,
  scope, owner, review date, and authority boundary.
- Add substantive operating-loop and loop-runner source documents.
- Add one bounded inner agent-execution contract to those existing loop files:
  architecture choice, authority/approval boundary, budget, exits, trajectory
  evaluation, regression cases, and a durable checkpoint. Do not create a
  competing agent-process authority document.
- Type and date current cards, decisions, decision contracts, roadmap, wiki
  start page, and active execution plan.
- Make current live blockers and explicit priority first-class Cockpit fields.
- Make `product:validate` fail on missing operative paths, invalid kinds,
  ambiguous priorities, missing review dates, stale generated views, invalid
  applicability, `next` disagreement, or a blocking release card while another
  card is selected as next.
- Keep Repo Graph/KGv2 a cited recall layer that must report exact root, commit,
  fallback, staleness, and source paths; never promote it to product authority.
- Remove superseded documents from the default read order without deleting
  historical evidence.

### Live first-use repair

- Record the live failure against P-035, P-022, and P-030.
- Model whether signed shared-group authority is ready before presenting the
  final create action.
- Preserve the typed group name while establishing or retrying setup.
- Provide guest-to-account upgrade from Home, Profile, and Create Group.
- Report real account state in Profile.
- Reduce empty Home to a compact receipt-first action, prioritized group cards,
  and one New Group action.
- Move the mode catalog behind New Group and remove duplicate calls to action.
- Verify mobile and desktop layouts through the production entrypoint.

## Scope out

- Weakening signed membership or organizer authority.
- Requiring Proof of Personhood for ordinary capture, group creation,
  membership, or payment.
- Deleting research, ADR, or historical plan evidence.
- Rewriting every historical document to match today's release.
- Retrying or promoting the currently broken frozen candidate.
- Supabase, a private ChopDot backend, custody, mainnet, or paid services.

## Authority hierarchy

```text
1. PRODUCT_TRUTH.md
   Invariants only. It cannot name the current priority or claim deployment.

2. product/cards.md + dated decisions/contracts/roadmap
   Current product intent, priority, acceptance, scope, and revocable choices.

3. source code + tests
   Implementation truth for an exact commit/tree. Tests prove only their
   exercised boundary.

4. release evidence + CAR/CID + live browser/chain readback
   Candidate and deployed truth. No local artifact can substitute for it.

5. Repo Graph packet + KGv2
   Cited navigation and recall. It must expose exact-worktree identity,
   citations, staleness, and fallback; it cannot create product facts.

6. research, ADRs, old plans, generated views, and agent scaffolding
   Typed supporting material. Historical or generated material cannot silently
   override levels 1-5.
```

## Required document metadata

Every default-read source must expose or be registered with:

- `kind`: law, decision, measurement, guardrail, exploration, or read-model;
- `status`: active, accepted, superseded, historical, or generated;
- `owner`;
- `last_reviewed`;
- `applies_to`;
- `authority` or explicit non-authority boundary;
- `supersedes` / `superseded_by` when relevant;
- `sources` for measurements and derived statements.

## Behaviour contracts

### DC-CTX-001 — Exact-worktree routing

**GIVEN** an agent starts inside the launch worktree
**WHEN** it follows the default read order
**THEN** every referenced path exists in that worktree, identifies its kind and
freshness, and no absolute path silently redirects product authority to another
checkout.

### DC-CTX-002 — Cockpit next work

**GIVEN** multiple cards are `building`
**WHEN** one card contains a P0 live blocker
**THEN** `product:query -- "next"` selects that card by explicit priority and
blocker severity, independent of file order.

### DC-CTX-003 — Stale or ambiguous context

**GIVEN** a required document is missing, generated output is stale, a review
date is absent, two active cards share the same top priority, or a card applies
to another checkout
**WHEN** `npm run product:validate` runs
**THEN** validation fails with the exact source and reason.

### DC-CTX-004 — KG boundary

**GIVEN** KGv2 recalls a claim
**WHEN** its packet root or commit differs from the release worktree
**THEN** the claim is labelled stale/cross-worktree and `kg_known=false`; direct
source inspection may report a repo fact but may not be substituted as a KG
fact.

### DC-CTX-005 — Bounded agent execution

**GIVEN** a non-trivial agent run begins
**WHEN** it chooses deterministic, single-agent, parallel-worker,
orchestrator-worker, or evaluator-optimizer execution
**THEN** it records why that is the simplest adequate architecture, names
read/write/approval boundaries, sets bounded exits and retries, grades the
tool/handoff trajectory separately from the product result, and leaves an
exact cited checkpoint.

### DC-UI-001 — Guest group creation

**GIVEN** Mina entered a valid group name but shared-action authority is not
ready
**WHEN** she continues
**THEN** ChopDot offers one plain-language setup action, preserves the name,
and never lets an apparently final create action fail with infrastructure
terminology.

### DC-UI-002 — Retry and reload

**GIVEN** account setup is rejected, interrupted, or later resumed
**WHEN** Mina retries or reloads
**THEN** the UI accurately reports state, retains safe local draft data, and
does not create duplicate groups or authority events.

### DC-UI-003 — Empty Home hierarchy

**GIVEN** Mina has no groups
**WHEN** Home opens on mobile or desktop
**THEN** Scan a receipt is the dominant product action, one New Group action is
available, modes are discoverable only inside creation, and no dashboard-like
catalog or duplicate action competes for attention.

## Ordered execution

1. Commit the independently reviewed release-tool ABI fix separately.
2. Add this plan and context authority manifest.
3. Reconcile product cards, decisions, decision contracts, roadmap, routing,
   operating loops, and wiki sources.
4. Harden Cockpit parsing, ordering, validation, generated resume, and tests.
5. Run product/wiki validation and inspect the generated Cockpit.
6. Obtain an independent governance review; repair any P0/P1 findings.
7. Implement the P-035/P-022 first-use repair from the accepted contracts.
8. Run focused state tests and production-entrypoint browser tests.
9. Capture and review mobile/desktop first, action, error, and after states.
10. Run full regression, accessibility, security, recovery, contract, and
    release gates.
11. Commit and push logical slices with clean-tree evidence.
12. Freeze a replacement candidate; stage and promote identical bytes only
    after every local and host gate passes.
13. Refresh the exact-worktree Repo Graph packet and require active KGv2 recall
    with exact-root/commit citations and no fallback.

## Acceptance

- One command reports the operative source hierarchy and validates every path.
- `product:query -- "next"` returns the live P0 repair while it is unresolved.
- File reordering cannot change priority.
- Missing/stale/cross-worktree/untyped context fails validation.
- Hidden extra read-order entries, untracked/symlink evidence, string verdict
  booleans, fake Git identities, stale hashes, and unbounded agent loops fail
  validation or the declared execution gate.
- Generated files say they are read models and cannot be edited as authority.
- The first-use group journey succeeds or offers one understandable recovery
  action without `Product Account`, host, adapter, chain, or protocol language.
- Empty Home passes the 10/10 product gate in real screenshots.
- The broken candidate remains unpromoted; any release after the repair has a
  new commit, build ID, CAR, CID, live readback, and separate status verdicts.

## Documentation impact

Required. This package changes product governance, agent workflow, release
gating, Cockpit semantics, known limitations, and the user journey. Update
source files under `product/`, `docs/wiki/`, and `docs/adr/` where durable
architecture consequences exist; regenerate and validate read models after
source changes.

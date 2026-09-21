# Generated Gate B Construction Packet

**Derived view — not product authority or implementation authorization. Pre-Gate-B readiness: READY_FOR_HUMAN_AUTHORIZATION.**

## Authority recoveries

- **RECOVERY-J05-GOLDEN-01** — Use the pinned recovered full candidate for Gate B Golden-fidelity review while preserving the frozen branch and its incomplete structured-source record unchanged.

## Authority blockers

- None

## Product decisions required

- None

## Resolved authority interpretations

- **RESOLVED-J05-ARTIFACT-01** — The recovered standalone J05 V1 candidate is the Gate B fidelity artifact because its exact 27-state / 98-link fingerprint and required paths match the frozen approved state inventory and visual-QA record.
- **RESOLVED-EXPENSE-LOCK-01** — Settlement-in-progress is a Group-level expense-mutation lock for create/edit/delete. The later dependent-item dispute rule governs settlement eligibility and does not override this mutation lock.
- **RESOLVED-EXPENSE-REVIEW-01** — A successful persisted Expense change resets current prior reviews to needs-review-again while preserving review history; owner correction does not resolve an issue without reviewer action in J07.

## Construction order

1. J08 — Group Home
2. J05 — Add an Expense
3. J06 — Review / Correct an Expense
4. J07 — Review / Agree / Raise an Issue

## Inherited accepted Gate A constraints

- **GATEA-MONEY-EQUAL-01** — Equal allocation uses canonical integer MoneyV1, unique trimmed participant IDs in stable sorted order, floor division for the base share, deterministic +1 minor-unit remainder assignment to the first stable-sorted IDs, the same currency/exponent partition, and exact conservation.

## Render scope

Rendered in Gate B: `view.group_home`
Refreshed downstream only: `view.position` → Gate C, `view.activity` → Gate D

## Journey construction requirements

### J08 — Group Home
- **REQ-J08-HIERARCHY** (ordered_hierarchy): ["group_identity","what_needs_you","your_position","recent","people_settle_handoffs","global_bottom_navigation"]
- **REQ-J08-STATES** (required_states): ["active_needs_review","nothing_needs_you","new_empty_group","settlement_in_progress","everyone_square","offline"]

### J05 — Add an Expense
- **REQ-J05-DEFAULTS** (defaults): {"required_user_input":["amount","description"],"payer":"you","participants":"everyone","split_method":"equal","date":"today","receipt":"none"}
- **REQ-J05-DETAIL-PATHS** (editable_paths): {"payer":true,"participants":true,"split_methods":["equal","exact","shares"],"date":true,"receipt":true,"no_common_path_review_page":true}
- **REQ-J05-RECOVERY** (required_states): ["missing","duplicate","offline","offline_saved","error","locked"]
- **REQ-J05-LOCK** (effect_guard): {"scope":"group","locked_when":"settlement_in_progress","blocked_operations":["expense.create","expense.edit","expense.delete"],"entered_details_preserved":true}

### J06 — Review / Correct an Expense
- **REQ-J06-DETAIL** (ordered_detail): ["amount","name","review_change_status","payer_personal_share_date","split","receipt_history","contextual_actions"]
- **REQ-J06-PERMISSIONS** (permission_boundary): {"edit_delete":["expense_owner","authorized_role"],"other_member_handoff":"07","fake_edit_controls":false}
- **REQ-J06-RECOVERY** (required_states): ["saving","save_error","locked","no_permission","offline_detail","offline_edit","offline_saved","conflict","loading","not_found"]
- **REQ-J06-REVIEW-RESET** (dependent_state_transition): {"on_successful_persisted_edit":"reset_current_reviews_to_needs_review_again","preserve_review_history":true,"open_issue_requires_j07_resolution":true,"owner_edit_cannot_mark_agreed":true}

### J07 — Review / Agree / Raise an Issue
- **REQ-J07-LANGUAGE** (literal_language): {"prompt":"Does this look right?","agree":"Looks right","issue":"Something's off","defer":"Not now","reassess_negative":"Still off"}
- **REQ-J07-ISSUE-LOOP** (resolution_loop): {"issue_input":["reason","optional_note"],"owner_actions":["edit_via_J06","reply"],"reviewer_actions":["looks_right","still_off","withdraw_issue"],"resolution_owner":"07"}

## Gate A qualified reuse

- `ctx.group` — one local group fixture/state continuity
- `ctx.expense_draft` — bounded draft Back/reopen/reload continuity
- `ctx.expense` — common equal-split expense subset only
- `ctx.position` — Home/common-expense position demonstration only; not J10 integration
- `ctx.activity` — Home attention/task-continuity demonstration only; not J18 integration

Provenance caveat: J05 stylesheet is preview-owned reconstruction; approved Golden HTML is unchanged.

## Continuity contracts

- **CONT-EXP-01** — J05 creates the same Expense lineage consumed by J08/J06/J07.
- **CONT-EXP-02** — J06 mutates the existing Expense and appends accepted history; it never creates a correction-copy Expense.
- **CONT-EXP-03** — J07 review/issue/reply/withdraw state remains attached to the same Expense and reviewer/issue lineage.
- **CONT-EXP-04** — Group Home refreshes Attention/Group Recent/Position from canonical underlying state; the standalone J10 Position and J18 Activity screens remain outside Gate B.

## Composition laws

- **COMP-01** — The same underlying object identity survives adjacent journey handoffs; routes do not create replacement domain objects.
- **COMP-02** — Only an operation owner may mutate its semantic object; projections/read models cannot mutate source truth.
- **COMP-03** — Derived views refresh from accepted underlying state; no journey manually overwrites Position, Activity, Insights or history to simulate an outcome.
- **COMP-04** — Possible-effect recovery preserves the original operation identity and returns to the owning journey after verified outcome/safe retry/explicit stop.
- **COMP-05** — Gate A partial capability coverage is not promoted to full journey integration.
- **COMP-06** — Approved Goldens define experience projection; the schema references them and does not duplicate or redesign their visual hierarchy/copy.

## Build constraints

- **BUILD-01** — Do not infer full J05/J08 coverage from the bounded Gate A expense demonstration.
- **BUILD-02** — Do not redesign Golden hierarchy, copy, actions, permission boundaries, or recovery meaning.
- **BUILD-03** — Do not introduce production storage, real authentication, financial execution, provider selection, Product Integrator, protected merge, or deployment as Gate B work.
- **BUILD-04** — Do not use Product IR/funding/conformance research branches as product authority.


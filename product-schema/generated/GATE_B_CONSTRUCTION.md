# Generated Gate B Construction Packet

**Derived view — not product authority or implementation authorization. Pre-Gate-B readiness: READY_FOR_HUMAN_AUTHORIZATION.**

## Approved post-Golden product decisions

- **DEC-EXPENSE-SETTLEMENT-LOCK-01** — approved_then_clarified; resolves POLICY-EXPENSE-LOCK-SCOPE
- **DEC-EXPENSE-SETTLEMENT-LOCK-02** — approved; clarifies DEC-EXPENSE-SETTLEMENT-LOCK-01

## Recorded Golden impacts

- **GOLDEN-IMPACT-J05-LOCK-02** — J05 `locked`: J05 locked remains a Gate B recovery state and is triggered when a proposed Expense mutation would change an unresolved settlement dependency.
- **GOLDEN-IMPACT-J08-SETTLEMENT-02** — J08 `settlement_in_progress`: The historical blanket-unavailable Add Expense state is superseded for ordinary settlements and is not a Gate B required state. Revisit it when a dedicated whole-group closeout surface is approved.

## Authority blockers

- None

## Product decisions required

- None

## Construction order

1. J08 — Group Home
2. J05 — Add an Expense
3. J06 — Review / Correct an Expense
4. J07 — Review / Agree / Raise an Issue

## Journey construction requirements

### J08 — Group Home
- **REQ-J08-HIERARCHY** (ordered_hierarchy): ["group_identity","what_needs_you","your_position","recent","people_settle_handoffs","global_bottom_navigation"]
- **REQ-J08-STATES** (required_states): ["active_needs_review","nothing_needs_you","new_empty_group","everyone_square","offline"]
- **REQ-J08-REFRESH** (canonical_refresh): {"after_expense_create":["position","group_recent","attention"],"after_expense_edit":["position","group_recent","attention","change_history"],"after_expense_delete":["position","group_recent","attention","change_history"],"deleted_expense_not_present_as_current_recent_expense":true,"no_second_fixture_store":true}
- **REQ-J08-SETTLEMENT-GOLDEN-IMPACT** (post_golden_decision_impact): {"historical_state":"settlement_in_progress","gate_b_required":false,"ordinary_settlement_add_action":"available_until_effect_time_guard_evaluates_proposed_mutation","future_closeout":"revisit_historical_blanket_unavailable_state_when_closeout_surface_is_approved"}

### J05 — Add an Expense
- **REQ-J05-DEFAULTS** (defaults): {"required_user_input":["amount","description"],"payer":"you","participants":"everyone","split_method":"equal","date":"today","receipt":"none"}
- **REQ-J05-DETAIL-PATHS** (editable_paths): {"payer":true,"participants":true,"split_methods":["equal","exact","shares"],"date":true,"receipt":true,"no_common_path_review_page":true}
- **REQ-J05-RECOVERY** (required_states): ["missing","duplicate","offline","offline_saved","error","locked"]
- **REQ-J05-LOCK** (effect_guard): {"policy":"dependency_scoped_economic_guard","ordinary_settlement_create":"block_if_proposed_state_changes_active_settlement_dependency","unresolved_guard_input":"fail_closed","locked_state":"retained_when_dependency_guard_blocks_save","entered_details_preserved_if_blocked":true,"group_closeout":"future_semantic_only_outside_gate_b"}

### J06 — Review / Correct an Expense
- **REQ-J06-DETAIL** (ordered_detail): ["amount","name","review_change_status","payer_personal_share_date","split","receipt_history","contextual_actions"]
- **REQ-J06-PERMISSIONS** (permission_boundary): {"edit_delete":["expense_owner","authorized_role"],"other_member_handoff":"07","fake_edit_controls":false}
- **REQ-J06-RECOVERY** (required_states): ["saving","save_error","locked","no_permission","offline_detail","offline_edit","offline_saved","conflict","loading","not_found"]
- **REQ-J06-REVIEW-RESET** (dependent_state_transition): {"trigger":{"path":"Save changes","persistence":"accepted"},"affected_review_set":"reviewers_current_at_edit_acceptance","include_participants_removed_by_edit":true,"result":"needs_review_again","preserve_review_history":true,"open_issue_requires_j07_resolution":true,"owner_edit_cannot_mark_agreed":true}
- **REQ-J06-LOCK** (effect_guard): {"policy":"dependency_scoped_economic_guard","ordinary_settlement_edit":"block_if_current_or_proposed_state_changes_active_settlement_dependency","ordinary_settlement_delete":"block_if_current_state_changes_active_settlement_dependency","unrelated_expense_edit_delete":"allow_only_when_economically_independent","unknown_effect":"fail_closed_until_authoritative_reconciliation","open_partial_remainder":"keep_dependency_locked","group_closeout":"future_semantic_only_outside_gate_b"}

### J07 — Review / Agree / Raise an Issue
- **REQ-J07-LANGUAGE** (literal_language): {"prompt":"Does this look right?","agree":"Looks right","issue":"Something's off","defer":"Not now","reassess_negative":"Still off"}
- **REQ-J07-ISSUE-LOOP** (resolution_loop): {"issue_input":["reason","optional_note"],"owner_actions":["edit_via_J06","reply"],"reviewer_actions":["looks_right","still_off","withdraw_issue"],"resolution_owner":"07"}

## Gate B law set

- **LAW-EXP-01** — An explicit custom split must add to the Expense total within the exact money partition.
- **LAW-EXP-02** — Journey 06 owns expense mutation; Journey 07 owns agreement/question/issue semantics. Owner correction does not fabricate reviewer agreement.
- **LAW-EXP-03** — Every allocation entry is bound to a selected participant_id in the Expense's Group and carries MoneyV1 in the Expense partition. Correct total conservation never substitutes for correct per-participant attribution.
- **LAW-EXP-GUARD-01** — For ordinary settlements, block Expense create/edit/delete only when the current state or proposed post-state would change financial truth used by an unresolved settlement. Dependency includes frozen source lineage, payer/recipient pair, currency partition, current eligible balance, dispute eligibility and any open partial remainder. Guard inputs fail closed when unresolved; unknown-effect takes precedence over an optimistic terminal label.
- **LAW-EXP-HISTORY-01** — Important accepted Expense changes remain readable as old→new history derived from accepted prior/current revisions. History is read-only and storage-neutral.
- **LAW-ISSUE-01** — An unresolved expense issue blocks only dependent payment items, not unrelated actionable balances.
- **LAW-POS-01** — Position is a read model; mixed currencies remain separate and source group/item lineage stays explainable.
- **LAW-ACT-01** — Activity is read-only; unread is not unresolved; notification delivery/read cannot mutate the underlying domain result.
- **LAW-EXP-REVIEW-01** — Any Expense edit accepted by the Journey 06 Save changes path resets the reviews that were current at edit acceptance to `needs review again`, including a reviewer who the edit removes from the split. Review history remains readable. An open issue remains unresolved until Journey 07 records reviewer resolution.
- **LAW-OP-01** — Pending/unknown/partial/too-late cancellation states remain bound to the same operation identity until authoritative reconciliation.
- **LAW-OP-02** — A possible-effect unknown result cannot expose a replacement effect attempt until the original operation is proven no-effect.
- **LAW-PAY-03** — A partial payment closes only the confirmed portion; the remainder preserves source lineage and stays open.
- **LAW-PAY-04** — A prepared or authorized settlement may not execute when current eligible balance or source eligibility has drifted from the resolved scope. The amount cannot exceed current eligible balance; dependency-changing Expense mutations are blocked, while a newly raised dispute invalidates the dependent prepared intent for re-resolution.
- **LAW-GROUP-02** — Removal, leave, transfer, rename, archive and delete prerequisites cannot silently rewrite expense attribution, balances, historical ledger facts or other memberships.
- **LAW-MONEY-01** — Canonical financial conservation uses integer minor units with currency and exponent; cross-partition values never combine silently and display decimals are non-authoritative.
- **LAW-OP-03** — Back, reload, route changes or time alone never convert unknown/pending state into success, failure, cancellation or receipt.
- **LAW-HIST-01** — Accepted history is append-only/replay-safe; replay rebuilds projections and never repeats external/payment/signing/receipt/closure effects.
- **LAW-OP-04** — Stale/conflicting reviewed state refreshes current owner truth and requires re-review rather than overwriting it.

## Gate boundary

Rendered in Gate B: `view.group_home`
Refreshed downstream only: `view.position` → Gate C, `view.activity` → Gate D

Whole-group closeout is semantic-only and intentionally absent from this packet until an approved user surface exists.


# ChopDot User Path Map

This is the living source map for ChopDot user decisions, product states, next
actions, dead ends, and proof coverage.

Purpose:

- help product, engineering, and agent operators see where a user can go next
- reveal paths that end without a valid next action
- connect user paths to cockpit cards and evidence
- keep mini-app surfaces aligned to the same ChopDot journey
- make dead-end discovery systematic instead of accidental

This is not normal-user UI. It is an operator artifact for building and review.

## Operating contract

The useful cockpit question is:

```text
Which user path is most likely to fail next, and what proof is missing?
```

This map should stay small enough to maintain manually, but structured enough to
power generated cockpit views later.

Map rules:

- Every path names one actor, one starting state, one action, and one resulting
  state.
- Every non-terminal path lists the next available actions.
- Every terminal path explains why ending there is valid.
- Every dead-end risk names the failure condition plainly.
- Every path is owned by at least one product card.
- Every path has explicit surface status.
- Every path has explicit proof status.
- No mini-app surface is allowed to invent a separate product truth.
- Payment requests are snapshots, not locks.
- Groups stay editable until they are closed.
- Sent requests do not silently mutate.
- Groups close only when every item is resolved.

Surface statuses:

- `works`: reviewed and proven on that surface
- `partial`: some of the path works, but the complete path is not yet proven
- `known_gap`: reviewed and currently broken or incomplete
- `unknown`: not reviewed yet
- `not_started`: surface has no implementation yet
- `not_applicable`: path does not belong on that surface

Proof statuses:

- `missing`: no proof yet
- `partial`: some proof exists, but not enough for done
- `reviewed`: manually reviewed with evidence
- `automated`: covered by repeatable test
- `strong`: screenshot/manual review plus automated coverage

## Canonical product states

These are product states, not necessarily database states.

```yaml
states:
  no_group:
    meaning: "Mina has not started a Chop yet."
  group_open_empty:
    meaning: "A group exists but has no captured money moment."
  group_open_expense_captured:
    meaning: "At least one expense exists and the group can still change."
  split_review:
    meaning: "Mina is checking who owes what before sending a request."
  payment_request_sent:
    meaning: "A request snapshot was shared with one or more payers."
  payer_viewing_amount_due:
    meaning: "A payer sees their amount, receiver, and available payment actions."
  payment_started:
    meaning: "A payer started a payment path but ChopDot has not accepted it as settled."
  payment_pending_receiver_confirmation:
    meaning: "The payer has marked/produced evidence, but the receiver has not confirmed."
  payment_confirmed:
    meaning: "The receiver confirmed the exact payment item."
  delayed:
    meaning: "An item remains open but is intentionally deferred."
  waived:
    meaning: "The receiver/organizer intentionally forgave an amount."
  disputed:
    meaning: "The amount, payer, receiver, or evidence is contested."
  group_open_new_balance:
    meaning: "The group changed after a request, creating a new open balance or request need."
  all_items_resolved:
    meaning: "Every item is confirmed, delayed, waived, or explicitly annotated."
  record_saved:
    meaning: "The group has closed into readable history."
```

## Journey: Normal pot complete state map

Actor set:

- Mina: organizer / receiver
- Leo: payer
- Nina: payer
- Guest: payer without full account or app context

Goal:

Mina captures a shared money moment, requests payment, tracks what remains open,
confirms what arrived, and closes with a readable saved record.

### N-001: Start normal pot

```yaml
id: "N-001"
journey: "normal-pot"
actor: "Mina"
entry_state: "no_group"
action: "start_group"
result_state: "group_open_empty"
terminal: false
owner_cards: ["P-022", "P-001"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "Mina starts a group but has no obvious way to add the first money moment."
```

Next available actions:

- Add expense
- Capture receipt
- Invite payer after at least one amount exists

Dead-end checks:

- FAIL if the first screen feels like a dashboard instead of one action.
- FAIL if Mina must understand settlement before adding a money moment.
- FAIL if the visible next action is not capture/add.

### N-002: Add first expense

```yaml
id: "N-002"
journey: "normal-pot"
actor: "Mina"
entry_state: "group_open_empty"
action: "add_first_expense"
result_state: "group_open_expense_captured"
terminal: false
owner_cards: ["P-022", "P-001"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "An expense is captured but the app does not make the request-payment step obvious."
```

Next available actions:

- Review split
- Request payment
- Add another expense
- Edit or remove expense

Dead-end checks:

- FAIL if request/payment action is hidden.
- FAIL if adding another expense requires restarting the group.
- FAIL if the captured amount is not visible before requesting payment.

### N-003: Add another expense before request

```yaml
id: "N-003"
journey: "normal-pot"
actor: "Mina"
entry_state: "group_open_expense_captured"
action: "add_another_expense_before_request"
result_state: "group_open_expense_captured"
terminal: false
owner_cards: ["P-022", "P-001"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "Mina can add one expense but cannot continue building the group before requesting payment."
```

Next available actions:

- Review updated split
- Request payment
- Edit expense
- Remove expense

Dead-end checks:

- FAIL if only one expense can exist in a normal pot.
- FAIL if totals do not update visibly.
- FAIL if the group loses earlier expenses.

### N-004: Review or edit split

```yaml
id: "N-004"
journey: "normal-pot"
actor: "Mina"
entry_state: "group_open_expense_captured"
action: "review_or_edit_split"
result_state: "split_review"
terminal: false
owner_cards: ["P-022"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "Mina cannot understand who owes what before sending a request."
```

Next available actions:

- Send payment request
- Add member
- Remove member before request
- Adjust split
- Return to group

Dead-end checks:

- FAIL if split review hides payer amounts.
- FAIL if Mina cannot return without losing data.
- FAIL if editing a split silently changes already-sent requests.

### N-005: Send payment request

```yaml
id: "N-005"
journey: "normal-pot"
actor: "Mina"
entry_state: "split_review"
action: "send_payment_request"
result_state: "payment_request_sent"
terminal: false
owner_cards: ["P-022", "P-002"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "known_gap", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "The request is sent but Mina loses correction paths or sees close too early."
```

Next available actions:

- Copy/share request
- Add forgotten expense
- Review open amount
- Mark delayed
- Wait for payer action

Dead-end checks:

- FAIL if sending a request removes Add expense.
- FAIL if Finish group appears while money is still open.
- FAIL if a sent request can be silently changed without a new request.

### N-006: Payer opens request

```yaml
id: "N-006"
journey: "normal-pot"
actor: "Leo"
entry_state: "payment_request_sent"
action: "open_payment_request"
result_state: "payer_viewing_amount_due"
terminal: false
owner_cards: ["P-002", "P-022"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "Leo opens the request but cannot tell who to pay, how much, or what happens after payment."
```

Next available actions:

- Pay Mina
- Mark paid if external payment happened
- Ask Mina or return later

Dead-end checks:

- FAIL if Leo sees organizer controls.
- FAIL if Leo must create an account before understanding the request.
- FAIL if amount, receiver, or purpose is unclear.

### N-007: Payer cannot pay now

```yaml
id: "N-007"
journey: "normal-pot"
actor: "Leo"
entry_state: "payer_viewing_amount_due"
action: "cannot_pay_now"
result_state: "delayed"
terminal: false
owner_cards: ["P-002", "P-004", "P-022"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "Leo cannot pay now and the app provides no honest delayed/open state."
```

Next available actions:

- Return later
- Mina marks delayed
- Mina waives
- Mina keeps group open

Dead-end checks:

- FAIL if delay looks like payment.
- FAIL if Mina cannot distinguish delayed from confirmed.
- FAIL if delayed items block saved history without explanation.

### N-008: Payer starts native/app payment

```yaml
id: "N-008"
journey: "normal-pot"
actor: "Leo"
entry_state: "payer_viewing_amount_due"
action: "start_payment"
result_state: "payment_started"
terminal: false
owner_cards: ["P-002", "P-023", "P-024", "P-025"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "partial", circles_gnosis: "not_started" }
proof: { status: "partial", screenshot: "missing", e2e: "missing" }
dead_end_risk: "Payment starts but the app treats started, submitted, finalized, and received as the same state."
```

Next available actions:

- Wait for payment evidence
- Retry failed payment
- Mark paid manually if external payment happened
- Return to request status

Dead-end checks:

- FAIL if starting a wallet/payment flow clears the obligation.
- FAIL if failed payment has no retry or manual fallback.
- FAIL if protocol/adapter language appears in normal UI.

### N-009: Payer marks paid or evidence is observed

```yaml
id: "N-009"
journey: "normal-pot"
actor: "Leo"
entry_state: "payer_viewing_amount_due"
action: "pay_or_mark_paid"
result_state: "payment_pending_receiver_confirmation"
terminal: false
owner_cards: ["P-002", "P-003", "P-025"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "A payer action is treated as final receipt before Mina confirms what arrived."
```

Next available actions:

- Mina confirms received
- Mina marks not received
- Leo returns to request status

Dead-end checks:

- FAIL if Leo can confirm receipt for Mina.
- FAIL if payment evidence closes unrelated shares.
- FAIL if the app hides that Mina still needs to confirm.

### N-010: Partial payment

```yaml
id: "N-010"
journey: "normal-pot"
actor: "Leo"
entry_state: "payer_viewing_amount_due"
action: "pay_partial_amount"
result_state: "payment_pending_receiver_confirmation"
terminal: false
owner_cards: ["P-002", "P-003", "P-025"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "A partial payment is accepted as full settlement or disappears from the open balance."
```

Next available actions:

- Mina confirms partial amount
- Keep remaining balance open
- Send follow-up request for remainder
- Mark remainder delayed or waived

Dead-end checks:

- FAIL if partial equals paid in full.
- FAIL if remaining balance is hidden.
- FAIL if Mina cannot confirm only what arrived.

### N-011: Wrong amount, wrong receiver, or wrong currency

```yaml
id: "N-011"
journey: "normal-pot"
actor: "Leo"
entry_state: "payment_started"
action: "submit_mismatched_payment"
result_state: "disputed"
terminal: false
owner_cards: ["P-003", "P-023", "P-024", "P-025"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "A mismatched payment clears the wrong item."
```

Next available actions:

- Show mismatch to Mina
- Keep original balance open
- Let payer retry
- Record dispute note

Dead-end checks:

- FAIL if mismatched evidence confirms payment.
- FAIL if dispute cannot return to open balance.
- FAIL if wrong currency is treated as equivalent without explicit rule.

### N-012: Receiver confirms payment

```yaml
id: "N-012"
journey: "normal-pot"
actor: "Mina"
entry_state: "payment_pending_receiver_confirmation"
action: "confirm_received"
result_state: "payment_confirmed"
terminal: false
owner_cards: ["P-003", "P-004", "P-025"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "Mina confirms one payment but the group does not clearly show whether anything remains open."
```

Next available actions:

- Confirm another payer
- Add forgotten expense
- Mark delayed or waived
- Close record when nothing remains open

Dead-end checks:

- FAIL if close is available while unresolved items remain.
- FAIL if confirmed, delayed, waived, and open states blur together.
- FAIL if Mina cannot return to the group record.

### N-013: Receiver marks not received

```yaml
id: "N-013"
journey: "normal-pot"
actor: "Mina"
entry_state: "payment_pending_receiver_confirmation"
action: "mark_not_received"
result_state: "disputed"
terminal: false
owner_cards: ["P-003", "P-022", "P-025"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "Mina cannot reject or question a claimed payment."
```

Next available actions:

- Ask payer to retry
- Keep balance open
- Add dispute note
- Mark delayed or waived later

Dead-end checks:

- FAIL if payer claim is irreversible.
- FAIL if disputed state looks closed.
- FAIL if the app hides who needs to act next.

### N-014: Add forgotten expense after request sent

```yaml
id: "N-014"
journey: "normal-pot"
actor: "Mina"
entry_state: "payment_request_sent"
action: "add_forgotten_expense"
result_state: "group_open_new_balance"
terminal: false
owner_cards: ["P-022", "P-003", "P-004"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "known_gap", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "Known gap: after a request is sent, Add expense can disappear and Finish group can appear too early."
```

Next available actions:

- Send new request for the new balance
- Review open balance
- Mark delayed
- Keep group open

Dead-end checks:

- FAIL if Add expense disappears after a request is sent.
- FAIL if Finish group is available while money is still open.
- FAIL if an already-sent request silently mutates instead of creating a new request or open balance.

### N-015: Send follow-up request after balance changes

```yaml
id: "N-015"
journey: "normal-pot"
actor: "Mina"
entry_state: "group_open_new_balance"
action: "send_follow_up_request"
result_state: "payment_request_sent"
terminal: false
owner_cards: ["P-022", "P-002", "P-025"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "A follow-up request overwrites the earlier request without explaining what changed."
```

Next available actions:

- Share follow-up request
- Review total open balance
- Keep original request history visible
- Wait for payer action

Dead-end checks:

- FAIL if previous sent request silently mutates.
- FAIL if payer cannot tell what changed.
- FAIL if Mina cannot distinguish original and follow-up amounts.

### N-016: Add member before request

```yaml
id: "N-016"
journey: "normal-pot"
actor: "Mina"
entry_state: "split_review"
action: "add_member_before_request"
result_state: "split_review"
terminal: false
owner_cards: ["P-022"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "Adding a member breaks the split or hides who now owes."
```

Next available actions:

- Review updated split
- Send request
- Remove member
- Edit member share

Dead-end checks:

- FAIL if totals no longer reconcile.
- FAIL if new member has no payable amount view.
- FAIL if existing members' requests change after being sent without a new request.

### N-017: Remove member before request

```yaml
id: "N-017"
journey: "normal-pot"
actor: "Mina"
entry_state: "split_review"
action: "remove_member_before_request"
result_state: "split_review"
terminal: false
owner_cards: ["P-022"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "Removing a member leaves orphaned balances or unclear totals."
```

Next available actions:

- Review updated split
- Send request
- Add member back
- Edit split

Dead-end checks:

- FAIL if removed member still receives a request.
- FAIL if totals no longer reconcile.
- FAIL if the action cannot be undone before sending.

### N-018: Waive amount

```yaml
id: "N-018"
journey: "normal-pot"
actor: "Mina"
entry_state: "payment_request_sent"
action: "waive_amount"
result_state: "waived"
terminal: false
owner_cards: ["P-004", "P-022"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "A waived amount looks like a payment or disappears from the final record."
```

Next available actions:

- Review resolved item
- Close if all items resolved
- Reopen/annotate before close if needed

Dead-end checks:

- FAIL if waived means paid.
- FAIL if final record hides the waiver.
- FAIL if the wrong actor can waive receiver-owned money.

### N-019: Mark delayed

```yaml
id: "N-019"
journey: "normal-pot"
actor: "Mina"
entry_state: "payment_request_sent"
action: "mark_delayed"
result_state: "delayed"
terminal: false
owner_cards: ["P-004", "P-022"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "Delayed money blocks closure without a readable explanation or appears as confirmed."
```

Next available actions:

- Keep group open
- Close with delayed annotation if allowed
- Send reminder
- Waive later

Dead-end checks:

- FAIL if delayed state has no next action.
- FAIL if delayed is indistinguishable from confirmed.
- FAIL if history cannot explain delayed items.

### N-020: Payer returns after delay

```yaml
id: "N-020"
journey: "normal-pot"
actor: "Leo"
entry_state: "delayed"
action: "return_and_pay"
result_state: "payment_pending_receiver_confirmation"
terminal: false
owner_cards: ["P-002", "P-003", "P-022"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "A delayed payer cannot return to the payment path."
```

Next available actions:

- Mina confirms received
- Mina marks not received
- Keep remainder open if partial

Dead-end checks:

- FAIL if delayed items are terminal by accident.
- FAIL if Leo cannot find the request again.
- FAIL if Mina cannot see that delayed changed to pending confirmation.

### N-021: Guest opens link

```yaml
id: "N-021"
journey: "normal-pot"
actor: "Guest"
entry_state: "payment_request_sent"
action: "open_guest_link"
result_state: "payer_viewing_amount_due"
terminal: false
owner_cards: ["P-002", "P-025"]
surfaces: { web: "unknown", telegram: "not_applicable", dot_paseo: "unknown", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "A guest cannot understand or act without creating a full account first."
```

Next available actions:

- Pay or mark paid
- Return later from same link
- Contact organizer outside app

Dead-end checks:

- FAIL if guest sees organizer controls.
- FAIL if guest can edit amounts, confirm receipt, or close group.
- FAIL if guest link cannot recover the same request state.

### N-022: Wrong actor attempts restricted action

```yaml
id: "N-022"
journey: "normal-pot"
actor: "Guest or payer"
entry_state: "any_open_state"
action: "attempt_restricted_action"
result_state: "unchanged_with_visible_denial"
terminal: false
owner_cards: ["P-025"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "A wrong actor can edit balances, confirm receipt, waive money, or close the group."
```

Next available actions:

- Return to allowed payer action
- Ask organizer
- Sign in or switch account if appropriate

Dead-end checks:

- FAIL if unauthorized action mutates state.
- FAIL if denial is technical or confusing.
- FAIL if the user gets trapped after denial.

### N-023: Close record

```yaml
id: "N-023"
journey: "normal-pot"
actor: "Mina"
entry_state: "all_items_resolved"
action: "close_record"
result_state: "record_saved"
terminal: true
owner_cards: ["P-004", "P-022"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "The record closes without clearly explaining what was paid, delayed, waived, or still unresolved."
```

Valid terminal condition:

- Every required item is paid and confirmed, delayed, waived, or explicitly annotated.

Dead-end checks:

- FAIL if close is available before all items are resolved.
- FAIL if the saved record is not readable by a normal group member.
- FAIL if the record hides unresolved money.

### N-024: Return to saved record

```yaml
id: "N-024"
journey: "normal-pot"
actor: "Mina or payer"
entry_state: "record_saved"
action: "return_to_history"
result_state: "record_saved"
terminal: true
owner_cards: ["P-004"]
surfaces: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
proof: { status: "missing", screenshot: "missing", e2e: "missing" }
dead_end_risk: "History exists but cannot answer what happened or why a balance was closed."
```

Valid terminal condition:

- The saved record remains readable and does not require live app state to explain the outcome.

Dead-end checks:

- FAIL if history loses confirmed/delayed/waived/disputed distinctions.
- FAIL if payers cannot understand their final status.
- FAIL if the saved record exposes private/internal implementation language.

## Actor maps

### Mina: organizer / receiver

Primary loop:

```text
Start group -> Capture expense -> Review split -> Send request -> Track open items -> Confirm / delay / waive / dispute -> Close when resolved -> Return to saved record
```

Mina must always be able to answer:

- What happened?
- Who owes what?
- Who acted?
- What still needs my action?
- Can this close safely?

Mina dead-end risks:

- request sent removes correction path
- premature close action
- payer claim is irreversible
- delayed/waived/disputed states blur together
- final record is unreadable

### Leo: payer

Primary loop:

```text
Open request -> Understand amount and receiver -> Pay / mark paid / delay -> See waiting-for-Mina status -> Return if needed
```

Leo must always be able to answer:

- Who am I paying?
- How much do I owe?
- What happens after I pay?
- Am I done, or waiting for Mina?
- What if I cannot pay now?

Leo dead-end risks:

- account setup before understanding the request
- organizer controls visible to payer
- no delayed path
- no return path after failed payment
- paid status looks final before receiver confirmation

### Nina: second payer

Primary loop:

```text
Open own request -> Pay or delay -> Avoid seeing Leo-private details -> Return to status
```

Nina must always be able to answer:

- What is my amount?
- What is my action?
- What group context do I need without seeing private details?

Nina dead-end risks:

- sees another payer's private payment evidence
- her payment clears Leo's share
- group-level close hides her unresolved item

### Guest: no-app payer

Primary loop:

```text
Open link -> Understand request -> Take low-risk action -> Return later from same link
```

Guest must always be able to answer:

- Is this for me?
- What can I do without installing the full app?
- What can I not do?

Guest dead-end risks:

- link requires full account before showing amount
- guest can mutate organizer-owned state
- guest cannot recover the same request later

## Surface matrix

This matrix is for routing, not status theater.

```yaml
surfaces:
  web:
    purpose: "baseline browser product"
    current_role: "primary product proving ground"
    map_rule: "must support the normal-pot path before surfaces claim parity"
  telegram:
    purpose: "chat-native mini-app distribution"
    current_role: "portable shell proof path"
    map_rule: "may optimize entry and sharing, but cannot fork state semantics"
  dot_paseo:
    purpose: "Polkadot host and native-capability proof"
    current_role: "live proof surface with known product dead-end"
    map_rule: "native capability is observed evidence only unless Chop Core accepts it"
  circles_gnosis:
    purpose: "future Circles/Gnosis CRC and community-money adapter"
    current_role: "not started"
    map_rule: "adapter spike only until payment-intent and receiver-confirmation paths are proven"
```

Surface support by path:

```yaml
path_surface_review:
  N-001: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
  N-002: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
  N-003: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
  N-004: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
  N-005: { web: "unknown", telegram: "unknown", dot_paseo: "known_gap", circles_gnosis: "not_started" }
  N-006: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
  N-007: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
  N-008: { web: "unknown", telegram: "unknown", dot_paseo: "partial", circles_gnosis: "not_started" }
  N-009: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
  N-010: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
  N-011: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
  N-012: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
  N-013: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
  N-014: { web: "unknown", telegram: "unknown", dot_paseo: "known_gap", circles_gnosis: "not_started" }
  N-015: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
  N-016: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
  N-017: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
  N-018: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
  N-019: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
  N-020: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
  N-021: { web: "unknown", telegram: "not_applicable", dot_paseo: "unknown", circles_gnosis: "not_started" }
  N-022: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
  N-023: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
  N-024: { web: "unknown", telegram: "unknown", dot_paseo: "unknown", circles_gnosis: "not_started" }
```

## Dead-end register

### D-001: Request sent removes correction path

```yaml
id: "D-001"
path: "N-014"
severity: "high"
status: "known_gap"
owner_card: "P-022"
observed_on: ["dot_paseo"]
problem: "After Mina sends a payment request, she can lose the ability to add a forgotten expense."
expected: "The group remains open and Add expense remains available until the record is actually closed."
```

### D-002: Premature close action

```yaml
id: "D-002"
path: "N-005"
severity: "high"
status: "known_gap"
owner_card: "P-022"
observed_on: ["dot_paseo"]
problem: "Finish group can appear while Leo still owes money."
expected: "Finish group appears only when all required items are resolved."
```

### D-003: Partial payment treated as full payment

```yaml
id: "D-003"
path: "N-010"
severity: "high"
status: "unreviewed_risk"
owner_card: "P-025"
observed_on: []
problem: "A partial payment could clear the whole obligation."
expected: "Only the received amount is confirmed; the remainder stays open, delayed, or waived."
```

### D-004: Mismatched payment clears wrong share

```yaml
id: "D-004"
path: "N-011"
severity: "critical"
status: "unreviewed_risk"
owner_card: "P-025"
observed_on: []
problem: "Wrong payer, receiver, amount, currency, or reference could clear a share."
expected: "Mismatched evidence is rejected or disputed and the original balance stays open."
```

### D-005: Guest can mutate organizer-owned state

```yaml
id: "D-005"
path: "N-021"
severity: "critical"
status: "partly_mitigated_backend_unproven_ui"
owner_card: "P-025"
observed_on: ["static_repo_audit"]
problem: "Backend settlement routes enforce active membership and payer/receiver checks, but guest-link UX proof is not mapped for low-risk payer-only recovery, return, and denial states."
expected: "Guest authority is scoped to low-risk payer actions only, and wrong-actor denial returns to a useful payer path."
evidence:
  - "backend/src/routes/settlements.ts"
  - "backend/src/auth/authorizePotMember.ts"
  - "src/routing/screen-props/pot-screens.tsx"
```

### D-006: Normal settlement state model cannot express delay, waiver, dispute, rejection, or expiry

```yaml
id: "D-006"
paths: ["N-007", "N-011", "N-013", "N-018", "N-019", "N-020"]
severity: "critical"
status: "not_built"
owner_card: "P-025"
observed_on: ["static_repo_audit"]
problem: "Normal settlement legs only support pending, paid, and confirmed, while the product map needs delayed, waived, disputed, rejected/not received, expired, duplicate, and wrong-payment paths."
expected: "Normal pot obligations have explicit non-happy-path states or documented fallback paths before mini-app expansion."
evidence:
  - "src/types/app.ts"
  - "backend/prisma/schema.prisma"
  - "src/services/data/services/SettlementService.ts"
```

### D-007: Backend confirmation can auto-close before readable closeout review

```yaml
id: "D-007"
paths: ["N-012", "N-023", "N-024"]
severity: "critical"
status: "built_wrong_order"
owner_card: "P-004"
observed_on: ["static_repo_audit"]
problem: "The backend marks the pot completed and writes chapter_closed when the final leg is confirmed, but the product journey expects Mina to review and close a readable record after all items resolve."
expected: "Final receiver confirmation moves the group to all_items_resolved; Close record remains a separate user-visible review action."
evidence:
  - "backend/src/routes/settlements.ts"
  - "backend/src/__tests__/settlements.routes.test.ts"
  - "src/components/closeout/CloseoutReview.tsx"
```

### D-008: Close with note can hide unresolved money instead of requiring an explicit resolution type

```yaml
id: "D-008"
paths: ["N-018", "N-019", "N-023", "N-024"]
severity: "high"
status: "built_ambiguous"
owner_card: "P-004"
observed_on: ["static_repo_audit"]
problem: "CloseoutReview allows open paid/pending items to close with a freeform note, but it does not force the user to classify each item as delayed, waived, disputed, or unresolved."
expected: "Every open item must have a visible resolution type before the saved record can claim closure."
evidence:
  - "src/components/closeout/CloseoutReview.tsx"
```

### D-009: Settle flow records payment intent/chapter proposal, not payer completion

```yaml
id: "D-009"
paths: ["N-005", "N-008", "N-009"]
severity: "high"
status: "built_ambiguous"
owner_card: "P-002"
observed_on: ["static_repo_audit"]
problem: "SettleHome primary action says Mark paid or Mark received, but useSettlementActions proposes pending settlement legs. Payment completion still requires a separate ChapterPanel mark-paid action, creating two competing meanings for request, mark paid, and settlement."
expected: "Request/propose, payer marked paid, receiver confirmed, and record close are separate visible states with one next action."
evidence:
  - "src/components/screens/SettleHome.tsx"
  - "src/hooks/useSettlementActions.ts"
  - "src/hooks/useChapterState.ts"
```

### D-010: Partial payment has no normal-pot representation

```yaml
id: "D-010"
path: "N-010"
severity: "high"
status: "not_built"
owner_card: "P-025"
observed_on: ["static_repo_audit"]
problem: "Settlement legs store one amount and only transition pending to paid to confirmed. There is no first-class partial amount, remaining balance, or partial confirmation state in normal pot settlement."
expected: "Partial payment confirms only the amount received and leaves the remainder open, delayed, or waived."
evidence:
  - "src/types/app.ts"
  - "backend/prisma/schema.prisma"
  - "src/services/data/services/SettlementService.ts"
```

### D-011: Add/remove member after request is not represented as a safe follow-up path

```yaml
id: "D-011"
paths: ["N-016", "N-017", "N-015"]
severity: "high"
status: "not_built_or_unproven"
owner_card: "P-022"
observed_on: ["static_repo_audit"]
problem: "Members can be added/removed in the pot UI, but the map has no proven behavior for membership changes after requests or settlement legs exist."
expected: "Member changes after a request create a new review/follow-up state without mutating already-sent requests or orphaning obligations."
evidence:
  - "src/components/screens/PotHome.tsx"
  - "src/routing/screen-props/pot-screens.tsx"
```

### D-012: Wrong payment is tested in capture/PAS lane, not normal settlement lane

```yaml
id: "D-012"
path: "N-011"
severity: "high"
status: "lane_mismatch"
owner_card: "P-025"
observed_on: ["static_repo_audit"]
problem: "Wrong-currency/missing-funds protection exists in capture/PAS tests, but the normal settlement backend accepts method/reference and has no typed wrong-amount, wrong-currency, duplicate, or expired payment state."
expected: "The normal settlement lane has its own negative-path proof, not only capture-wallet proof."
evidence:
  - "tests/e2e/capture-pas-payment-link.spec.ts"
  - "backend/src/routes/settlements.ts"
  - "backend/prisma/schema.prisma"
```

## Cockpit integration target

The cockpit should eventually generate:

- path coverage by product card
- dead-end register by severity
- surface support matrix by path
- proof gaps by journey
- next unreviewed branch
- actor-specific path summaries
- red/yellow/green visual graph from `product/user-path-map.mmd`

The cockpit should not ask agents to maintain multiple copies of the same truth.
The markdown map is the source. The visual is a review surface.

## Current highest-risk paths

```yaml
highest_risk_paths:
  - id: "N-014"
    reason: "Known live .dot gap: request sent removes Add expense path."
    owner_card: "P-022"
    needed_proof: "screenshot plus walkthrough after fix"
  - id: "N-005"
    reason: "Known live .dot gap: close can appear before balances resolve."
    owner_card: "P-022"
    needed_proof: "screenshot plus close-gating check"
  - id: "N-012/N-023"
    reason: "Backend confirmation can auto-close the pot before the user performs readable closeout review."
    owner_card: "P-004"
    needed_proof: "state-model correction plus closeout review proof"
  - id: "N-007/N-018/N-019"
    reason: "Normal settlement state model cannot express delayed or waived outcomes."
    owner_card: "P-025"
    needed_proof: "state-machine support or explicit product fallback"
  - id: "N-011"
    reason: "Money-safety risk: normal settlement lane has no wrong-payment state, even though capture/PAS has a separate negative proof."
    owner_card: "P-025"
    needed_proof: "normal settlement negative-path payment-intent test"
  - id: "N-021"
    reason: "Guest-link low-risk payer-only recovery and wrong-actor denial are not mapped/proven in the normal path."
    owner_card: "P-025"
    needed_proof: "guest link UI walkthrough plus wrong-actor mutation denial test"
```

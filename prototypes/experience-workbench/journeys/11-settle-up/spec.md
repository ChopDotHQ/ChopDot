# Journey 11 — Settle Up

**Priority:** P0  
**Status:** V1.1 Golden Candidate / contract review pending  
**Prototype:** `v1.1-golden-candidate.html`

## User goal

Turn an understood balance into one clearly scoped payment without losing sight of who is paid, the exact amount and currency, which groups and expense/payment items are included, the selected method, or what happens next.

## Existing design direction preserved

The approved interaction model remains:

`Review → Method → Amount → Pay`

Journey 11 still owns:

- canonical payer and recipient;
- exact amount;
- one currency;
- person-scoped or group-scoped source lineage;
- included expense/payment items;
- selected payment method;
- final human review before payment starts.

Journey 12 still owns:

- external-app return;
- wallet/provider submission progress;
- payer-marked-sent status;
- waiting for receipt or confirmation;
- received or cleared status;
- receiver confirmation where required;
- failure, expiry, cancellation, reversal and safe retry;
- closure and the resulting balance refresh.

A payment being requested, prepared, authorized, started, submitted or marked sent, received or cleared, receiver-confirmed, and closed are distinct events. A payer saying **I paid** or **I sent it** never closes the payment.

## Primary Journey 11 path

`Overall Position → Settle with Jeanine → Resolve exact CHF scope → Choose TWINT → Choose full amount → Review payment → Open TWINT → Journey 12`

Default example:

- payer: Devinson;
- recipient: Jeanine;
- exact amount: CHF 54.30;
- currency: CHF;
- source: Apartment and Ski Trip;
- included items: the exact reviewed items contributing to the eligible balance;
- method: TWINT;
- amount choice: full balance.

## Payment and Agentic Compatibility Contract

This section is an internal implementation contract. Its terms must not appear as technical architecture in the normal product UI.

1. **Overall Position is read-only.** Journey 10 is a derived read model. Selecting Settle never edits that display value. The backend resolves it into a concrete payment scope.

2. **Settlement scope is canonical and exact.** Before payment can be authorized, the backend resolves and persists the payer, recipient, amount, one currency, source groups, source expense/payment items, selected method, expiry and unique idempotency key.

3. **Journey 11 prepares or authorizes; it does not complete.** The final Journey 11 action creates or authorizes the scoped payment intent. It does not mark the payment received, receiver-confirmed or closed.

4. **States remain typed and persisted.** The internal model distinguishes prepared, authorized, started, submitted or payer-marked-sent, awaiting confirmation, received or cleared, receiver-confirmed, closed, failed, expired, cancelled, partial, disputed and reversed. A method may skip states it cannot meaningfully produce, but no method may collapse them dishonestly.

5. **Authority is explicit.** The payer authorizes or marks sent. A payment provider or chain reports execution or finality. The receiver confirms external or manual receipt. Deterministic backend rules decide whether the exact payment item may close.

6. **Agents prepare by default.** A future agent may assemble the scope, compare methods and recommend the next action. Without valid delegation it cannot execute the payment.

7. **Delegation is narrowly scoped.** Any delegated action is constrained to the exact recipient, amount, currency, source items, allowed method, expiry and unique nonce/idempotency key. The agent cannot expand scope, approve itself, confirm receipt, close unrelated items or reuse an expired/revoked authorization.

8. **Critical verification is deterministic.** Authorization, signature, balance, replay, idempotency and state-transition checks are backend logic. An LLM does not decide whether a payment is valid or complete.

9. **Payment systems remain replaceable.** Web2 and Web3 implementations sit behind replaceable connectors. Payment credentials, wallet secrets and private keys never become ChopDot domain data.

10. **Retries are idempotent.** A timeout, page refresh or repeated click reuses the original idempotency scope. It cannot create a duplicate payment intent or duplicate transfer.

## State and closure rules

### External or manual payment

TWINT, bank, PayPal, cash or another external method follows this semantic path when ChopDot cannot independently verify receipt:

`Prepared → Authorized → Started → Payer marked sent → Waiting for receiver → Receiver confirmed → Closed`

The payer's sent claim is useful status, not proof of receipt.

### Exact finalized transfer

A provider or chain may report an exact finalized transfer. Deterministic matching may close only the exact payment item when all of the following match:

- canonical payer;
- canonical recipient;
- exact amount;
- currency or selected settlement asset;
- source payment item;
- final transfer identity;
- expected authorization and idempotency scope.

It may not close a broader person balance, another group, another currency or an unrelated payment item.

### Partial payment

A partial payment closes only the confirmed partial amount. The remainder stays open with preserved source lineage and its own future settlement path.

### Disputed source item

A disputed expense blocks only payment items that depend on that expense. Other people, groups, currencies and independent payment items remain actionable.

## Scope rules

### Person-scoped settlement

A person balance may combine multiple groups only when:

- the payer and recipient are the same pair;
- the currency is the same;
- every included source item is eligible and not disputed;
- the group-level lineage remains available before payment.

### Group-scoped settlement

When a group contains several payable people:

`Group Home → Settle → Choose person → Resolve exact source items → Review payment`

### Multiple currencies

Currencies settle independently. An estimated home-currency amount is orientation only and can never become a payment instruction.

## Amount rules

Full payment remains the default.

A partial payment must show:

- amount paid now;
- remaining balance;
- included source items;
- that a later settlement remains necessary.

The amount cannot exceed the current eligible balance.

## Method rules

Candidate methods remain:

- TWINT;
- bank transfer;
- wallet payment;
- cash or paid elsewhere;
- PayPal.

The recipient's preferred available method appears first. Journey 20 owns method maintenance. Journey 21 owns wallet/account management. Journey 11 consumes available methods without making any method or network part of ChopDot's product truth.

## Visible UI rules

- Keep one obvious next action.
- Show person, exact amount, currency and source scope before payment starts.
- Separate Payment method and Amount.
- Use human labels: **Open TWINT**, **I've sent it**, **Waiting for Jeanine**, **Payment received**, **Payment failed**, **Settlement complete**.
- Do not show internal architecture terms.
- Do not imply that opening an app, marking sent or receiving a request completes the settlement.
- Do not imply atomic cross-currency or cross-method settlement.

## Small correction to earlier Golden assumptions

Journey 07 previously documented that an unresolved issue could block settlement for the affected group. Journey 10 and this contract establish the narrower rule:

> Block only payment items whose amount depends on the disputed expense.

This is a wording and dependency-scope correction, not a Journey 07 redesign. Its review/issue flow remains unchanged.

Journey 10's optional estimated CHF view remains valid only as orientation. It cannot be selected as Journey 11's amount or currency source.

## Approval rule

Journey 11 may become Golden only when:

1. the actual HTML, updated specification and QA files exist on `ux/experience-workbench`;
2. all Journey 11 screens and primary actions pass the contract mapping check;
3. sent, waiting, received, failed and complete are visually distinct at both target phone sizes;
4. the workbench gate passes on the branch;
5. the candidate is approved by the user.

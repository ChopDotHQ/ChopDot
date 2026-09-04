# Journey 11 — Settle Up

**Priority:** P0  
**Status:** V1 Golden Candidate / Review pending  
**Prototype:** `v1-golden-candidate.html.gz.b64`

## User goal

Turn an understood debt into one clear payment without losing sight of who is paid, what amount is being settled, which balances are included, or what happens next.

## Entry

- Overall Position → Settle with a person
- Group Home → Settle group balance
- Home attention → Settle task
- People → Person balance
- Existing settlement → View progress

## Journey boundary

Journey 11 owns:

- who is being paid;
- settlement scope;
- currency;
- amount;
- payment method;
- payment details;
- final review before payment starts.

Journey 12 owns:

- external-app return;
- wallet approval progress;
- transaction pending;
- recipient confirmation;
- success;
- failure;
- proof and finality;
- updated balances.

## Primary path

`Overall Position → Settle with Jeanine → Confirm amount and method → Review payment → Start payment → Journey 12`

Default example:

- You pay Jeanine
- CHF 54.30
- Across two CHF groups
- TWINT is preferred
- Full balance is selected

## Scope rules

### Person-scoped

A person balance may combine multiple groups only when:

- both sides are the same two people;
- all included balances use the same currency.

The user can open the group breakdown before paying.

### Group-scoped

If a group has more than one person to pay:

`Group Home → Settle → Choose person → Review settlement`

### Multiple currencies

Currencies settle separately.

`Choose currency → Settle that currency`

No cross-currency settlement or silent conversion is allowed.

## Amount rules

Full balance is the default.

Partial payment is available but must show:

- amount paid now;
- balance remaining afterward;
- that another settlement will still be needed.

The amount cannot exceed the current eligible balance.

## Method rules

Available candidate methods:

- TWINT
- Bank transfer
- Wallet
- Cash / paid elsewhere
- PayPal

A recipient's preferred available method appears first and is labeled recommended.

Payment-method maintenance belongs to Journey 20. Journey 11 consumes available methods and may request missing details.

## External payment methods

For TWINT, bank, PayPal, or cash:

- ChopDot does not pretend it moved the money.
- The user sees the amount, recipient, reference, and expected next step.
- External methods hand off to Journey 12 for return and confirmation.
- Cash / paid elsewhere explicitly says that it only records what happened.

## Wallet payment

The original balance and currency remain the source of truth.

A wallet payment may use an agreed DOT or USDC equivalent when both people support it.

Before wallet approval, show:

- asset and amount;
- recipient address;
- estimated fee;
- original balance being settled;
- quote freshness;
- connected account.

ChopDot tracks a wallet payment automatically after approval.

The user never chooses between product-internal labels such as `normal`, `smart`, `onchain`, or `offchain`.

## Readiness and safety

A settlement cannot start when:

- the affected balance has an unresolved expense issue;
- the balance changed after the review screen opened;
- a settlement for the same balance is already in progress;
- no usable payment method exists;
- the device is offline;
- the required wallet is not connected;
- the wrong wallet is connected;
- the recipient address is invalid;
- funds are insufficient;
- the network fee cannot be estimated;
- the wallet quote expired.

Wallet cancellation must clearly state that nothing was sent.

Unaffected balances remain actionable.

## Product decisions

- Keep one clear payer, recipient, currency, and amount per settlement.
- Show why the amount exists before payment.
- Full payment is default; partial payment is deliberate.
- Put the recipient's preferred method first.
- Never pretend an external app payment completed automatically.
- Track wallet payments automatically when possible.
- Avoid exposing infrastructure modes.
- Stop and refresh when the eligible balance changes.
- Open issues block only the affected settlement.
- An existing in-progress settlement must reopen rather than duplicate.
- Every payment-start action hands off to Journey 12.

## Approval rule

If approved:

1. freeze as Golden Journey #9;
2. promote Settlement Summary, Payment Method, Partial Settlement, Payment Review, and Settlement Blocker patterns;
3. continue to Journey 12 — Complete Settlement.

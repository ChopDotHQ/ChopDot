# Journey 11–12 GIVEN / WHEN / THEN Coverage

## 1. Human-present external or manual payment

**GIVEN** Devinson owes Jeanine exactly CHF 54.30 across two eligible CHF groups and selects TWINT, bank transfer or cash.  
**WHEN** Devinson authorizes the scoped payment and later taps **I've sent it** or **Record as sent**.  
**THEN** the payment becomes payer-marked-sent and waits for Jeanine; the balance is not closed until Jeanine confirms receipt.

## 2. Exact finalized on-chain payment

**GIVEN** a wallet payment was authorized for one exact payment item with canonical payer, recipient, amount, selected asset, currency lineage, expiry and idempotency key.  
**WHEN** the network reports finality and deterministic verification matches the exact transfer to that item.  
**THEN** only that exact item may become received/cleared and close; unrelated groups, items and currencies remain untouched.

## 3. Failure followed by safe retry

**GIVEN** an authorized payment attempt times out or fails before completion.  
**WHEN** the payer taps **Try again** or repeats the action after a timeout.  
**THEN** ChopDot reuses the original idempotency scope, does not create a duplicate intent or transfer, and either resumes the existing attempt or starts one safe retry.

## 4. Partial payment

**GIVEN** Devinson owes Jeanine CHF 54.30 and deliberately selects CHF 20.00.  
**WHEN** the CHF 20.00 payment is confirmed by the correct authority.  
**THEN** only CHF 20.00 closes and CHF 34.30 remains open with its original group/item lineage.

## 5. Disputed source expense

**GIVEN** Marc's person balance contains one payment item derived from Dinner and Dinner has an unresolved issue.  
**WHEN** Devinson opens Overall Position or Settle Up.  
**THEN** only the payment items dependent on Dinner are marked **May change** and blocked; unrelated Marc items and all unrelated people/groups remain actionable.

## 6. Agent prepares a payment for human approval

**GIVEN** a future agent can read the derived position and available payment methods but has no execution delegation.  
**WHEN** the agent prepares a recommended CHF 54.30 TWINT payment to Jeanine.  
**THEN** it may populate the exact scope and present the review screen, but the human payer must authorize the payment.

## 7. Expired, revoked or replayed delegated authorization

**GIVEN** a delegated agent authorization is expired, revoked, already used, or presented again with the same nonce/idempotency key.  
**WHEN** the agent attempts to execute the payment.  
**THEN** deterministic backend verification rejects the action before transfer, records no duplicate payment, and exposes a safe human recovery path.

## 8. One person across several groups

**GIVEN** Devinson owes Jeanine CHF 74.30 in Apartment and Jeanine owes Devinson CHF 20.00 in Ski Trip.  
**WHEN** Devinson selects Settle from the CHF person balance.  
**THEN** the resolved payment is CHF 54.30 to Jeanine, both source groups/items remain inspectable, and EUR or DOT balances are excluded.

## 9. Estimated converted balance

**GIVEN** Journey 10 shows an optional estimated CHF orientation across CHF, EUR and DOT.  
**WHEN** the user selects Settle.  
**THEN** ChopDot resolves one original currency and exact eligible source scope; the estimate cannot become the payment amount or instruction.

## 10. Receiver cannot self-expand closure

**GIVEN** Jeanine receives a request to confirm an external CHF 54.30 payment.  
**WHEN** she confirms receipt.  
**THEN** only that exact payment item becomes eligible to close; her confirmation cannot close a different amount, currency, person or unrelated item.

<!-- J11_COMPATIBILITY_CLOSEOUT:START -->
## Wallet approval request before authorization

**GIVEN** an exact wallet payment is prepared. **WHEN** the payer taps **Approve in wallet**. **THEN** ChopDot records `PaymentApprovalRequested` and waits; no authorization exists until a valid wallet result is verified and accepted.

## Wallet approval result unknown and recovery

**GIVEN** the wallet result is lost or times out. **WHEN** the outcome cannot be determined. **THEN** ChopDot shows **Still checking**, blocks a second payment and reconciles the existing request with the same idempotency key.

## Realtime update missed

**GIVEN** a transition was durably accepted but the realtime message was lost. **WHEN** the user reconnects or refreshes. **THEN** the screen rebuilds from accepted history.

## Durable outbox retry

**GIVEN** delivery was not acknowledged. **WHEN** the outbox retries. **THEN** consumers deduplicate the event and no transfer or closure happens twice.

## Replay-safe history

**GIVEN** a read model must be rebuilt. **WHEN** accepted history is replayed. **THEN** the same state is reconstructed without payment side effects.

## Saved record acceptance is unknown

**GIVEN** persistence acknowledgement timed out. **WHEN** acceptance is unknown. **THEN** the result is reconciled by event/idempotency identity rather than assumed successful, failed or replaced.
<!-- J11_COMPATIBILITY_CLOSEOUT:END -->

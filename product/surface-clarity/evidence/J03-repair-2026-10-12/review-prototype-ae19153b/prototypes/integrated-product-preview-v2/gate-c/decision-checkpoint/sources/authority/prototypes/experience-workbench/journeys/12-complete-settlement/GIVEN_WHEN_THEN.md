# Journey 12 — GIVEN / WHEN / THEN Coverage

## External/manual payment

**GIVEN** Devinson started a CHF 54.30 TWINT payment to Jeanine.  
**WHEN** Devinson taps `Yes, I sent it`.  
**THEN** the payment becomes Sent and waits for Jeanine; it does not close.

**GIVEN** the same payment is waiting.  
**WHEN** Jeanine confirms CHF 54.30 arrived.  
**THEN** only that exact payment item becomes eligible to close, and affected balances are recomputed.

**GIVEN** Jeanine has not received it.  
**WHEN** she chooses `Not yet`.  
**THEN** the payment remains open and Devinson’s balance remains unchanged.

## Exact wallet payment

**GIVEN** a wallet approval was requested for one exact payment scope.  
**WHEN** a verified provider result reports the exact transfer finalized and all deterministic checks pass.  
**THEN** only the matching payment item may close and unrelated items remain unchanged.

## Failure and safe retry

**GIVEN** a trusted result proves that the prior attempt did not execute.  
**WHEN** the payer chooses `Try again`.  
**THEN** ChopDot reuses the existing payment and idempotency identity for one eligible retry. An unknown timeout is not this scenario and requires recovery first.

## Unknown result

**GIVEN** a timeout or missing result means ChopDot cannot prove whether the selected payment completed.  
**WHEN** the user opens recovery.  
**THEN** the UI says not to start another payment and reconciles the existing payment identity.

## Partial payment

**GIVEN** CHF 54.30 is open and CHF 20.00 was sent.  
**WHEN** Jeanine confirms CHF 20.00 arrived.  
**THEN** CHF 20.00 closes, CHF 34.30 remains, and source lineage is preserved.

**GIVEN** the recipient reports that only CHF 40.00 of CHF 54.30 arrived.  
**WHEN** the recipient confirms CHF 40.00.  
**THEN** only CHF 40.00 closes and CHF 14.30 remains open.

## Disputed dependency

**GIVEN** a source expense becomes disputed after payment starts.  
**WHEN** the payment would otherwise close.  
**THEN** dependent payment items remain open while unrelated payments remain unaffected.

## Reversal

**GIVEN** an exact completed payment is later reversed.  
**WHEN** a verified provider result is accepted.  
**THEN** only the exact affected item reopens and all derived balances are recomputed.

## Saved record

**GIVEN** a payment is closed.  
**WHEN** the user opens its Saved record.  
**THEN** the record is retrievable through an ordinary authenticated web path using a stable ChopDot identifier.

**GIVEN** the payment is closed but the readable record is delayed.  
**WHEN** the user refreshes the record.  
**THEN** ChopDot retries record retrieval/materialization without reopening or repeating the payment.

## Offline and replay

**GIVEN** realtime delivery was lost or duplicated.  
**WHEN** the app reconnects.  
**THEN** status is rebuilt from accepted durable history and duplicate events do not repeat side effects.

## Continuity regression scenarios (V1.1)

### C01 — full payment return
GIVEN the exact TWINT or bank CHF 54.30 payment is closed, WHEN the payer opens balances, Overall Position, the payment record, history, Done or browser Back, THEN CHF 0.00 and the original payment method remain, with no new confirmation or payment.

### C02 — cash recipient continuity
GIVEN Nina has confirmed the CHF 30.00 cash payment, WHEN the payer returns to balances and reopens it, THEN Nina, Cash and CHF 0.00 remain; the flow never becomes Jeanine/TWINT.

### C03 — partial result
GIVEN CHF 20.00 was confirmed against CHF 54.30, WHEN the payer leaves the partial result and later reopens it, THEN CHF 34.30 remains. GIVEN CHF 40.00 arrived instead, THEN CHF 14.30 remains. Source items and the accepted payment identity persist.

### C04 — waiting payer
GIVEN no recipient confirmation has been accepted, WHEN the payer refreshes repeatedly, THEN the payer remains waiting and cannot see or invoke recipient confirmation controls; the amount remains open.

### C05 — separate recipient confirmation
GIVEN that waiting payment, WHEN the canonical recipient separately confirms the correct scope, THEN the backend may accept receipt and close the exact amount. The next payer read displays that accepted result; the read did not create it.

### C06 — unknown timeout
GIVEN an execution result is unknown, WHEN the payer refreshes, reconnects or requests retry, THEN only reconciliation of the same payment occurs. No execution retry is created, even after multiple clicks.

### C07 — known non-execution after recovery
GIVEN recovery is running for an unknown attempt, WHEN a trusted result proves that exact attempt was not executed, THEN retry may become available. WHEN tapped twice, THEN only the first eligible request starts a retry with the original person, amount, method and payment identity.

### C08 — recovered receipt instead of retry
GIVEN an unknown wallet payment, WHEN exact receipt is verified during recovery, THEN the existing item closes and its result is read. No retry becomes available.

### C09 — reversed return
GIVEN the wallet payment was reversed, WHEN balances, Saved record, Done or browser Back are opened, THEN only CHF 54.30 is reopened and the original wallet method remains; history does not display the item as currently complete.

### C10 — review handoff
GIVEN a bank payment selected in Journey 11, WHEN Not yet opens the payment-review handoff and Back returns, THEN it remains a bank payment in the same scope.

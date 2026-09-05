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

**GIVEN** a payment attempt failed or timed out.  
**WHEN** the payer chooses `Try again`.  
**THEN** ChopDot reuses the existing payment and idempotency identity rather than creating a duplicate.

## Unknown result

**GIVEN** ChopDot cannot prove whether a wallet payment completed.  
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

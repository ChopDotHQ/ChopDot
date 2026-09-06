# Journey 15 — Settlement History

V1 · Design approved · Golden #15 (recovered durable artifact)

## Purpose
Verify what was paid, when, how, and whether it is final.

## Approved product rules
- One stable payment record per payment identity; retries, checks, confirmation, completion, reversal and cancellation remain inside its timeline.
- History is read-only. It cannot send, confirm, retry execution, reverse, edit balances or change payment method.
- Waiting, Partial, Failed, Complete, Reversed and Cancelled remain distinct.
- Partial payments show original, confirmed and still-open amounts.
- Reversal appends history and reopens only the exact affected amount.
- Currencies remain separate; converted estimates are not payment instructions.
- Participants may retain a minimal readable payment record after losing access to a source group, without regaining current private group access.
- Refreshing a delayed user-readable record cannot repeat payment execution.

## Recovery provenance
The temporary review HTML from the previous chat session was not durably committed to `ux/experience-workbench`. The retained review screenshots, accepted product decisions, and review handoff survived. This file and `v1-recovered.html` re-materialize that approved screen-level design as the durable workbench artifact. The recovery artifact is now checksum-locked; it must not be described as byte-identical to the lost temporary HTML.

## Decision history
### J15-D01 — Read-only canonical payment history
**Decision:** One canonical record per payment, with lifecycle events in its timeline and no write authority in history.
**Why:** Users need to understand what happened without history becoming another payment state machine UI.
**Alternatives:** One row per attempt; editable ledger history. Rejected because they create duplicate-looking payments or mutate truth.
**Tradeoffs:** Detailed execution recovery remains in Journey 12.
**Revisit when:** Research shows users cannot distinguish payment identity from attempts, or legal retention requirements demand additional fields.
**Approval/version:** V1, Golden #15.

### J15-D02 — Durable recovery of the reviewed artifact
**Decision:** Preserve the approved product decisions and reviewed visual evidence in a new durable artifact because the temporary review HTML was not committed.
**Why:** The workbench must be restartable from GitHub rather than this chat.
**Tradeoff:** The recovered artifact has a new checksum and is not claimed to be the lost byte sequence.
**Revisit when:** The original temporary HTML is later recovered and can be compared safely.

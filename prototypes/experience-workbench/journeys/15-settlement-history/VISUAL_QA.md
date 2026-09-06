# Journey 15 — Visual / continuity QA

Durable recovery artifact SHA-256: `0915e060314e06471d5039e735dca4f2e708940f3a33f2a5890b8758671584e0`.

The recovery preserves the reviewed hierarchy: payment list, read-only payment detail, partial amounts, waiting, failed and reversed states. It uses the same inherited ChopDot foundation stylesheet as Journeys 14–17.

This recovery is evidence-backed but is **not** claimed to be byte-identical to the temporary review HTML from the prior session.

Checks in the current-state gate:
- artifact checksum is locked as Golden #15;
- all earlier Golden locks remain unchanged;
- Journey 15 remains read-only;
- TYPO-01 stays deferred.

Prototype only. No payment or balance is executed by this file.

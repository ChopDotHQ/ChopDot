## Decision history

**Coverage:** Selected source-supported decisions, backfilled 2026-09-06 from commit `f403b02d05a50d13f556b3edfb949f92b24488a9`. Not a complete conversation or alternatives audit. Earlier candidate labels in the spec body describe its drafting stage; the registry/approval sources below establish the recorded status. Revisit triggers below are maintenance notes added now, not claims about past discussion or permission to redesign.

### J12-D01 — Outcome continuity and recovery before execution retry

**Decision:** Keep sent, waiting, received and complete distinct. Preserve the actual payment method, person, source items and resulting balance on every exit. Payer refresh is read-only; unknown timeouts require recovery before execution retry.

**Why:** The recorded goal explicitly avoids mistaking sent for complete. The V1.1 correction prevents navigation from resetting outcomes to a default TWINT example or manufacturing receiver confirmation.

**Alternatives:** Retry from a transport timeout alone, payer self-confirmation and a replacement payment created by refresh are explicitly rejected.

**Tradeoffs:** Partial receipt leaves a traceable remainder; reversal reopens only the affected item. A delayed Saved record must not undo payment completion. Session/demo storage is not production durability.

**Revisit when:** A return loop changes method/amount, refresh opens receiver controls, or execution retries without a trusted non-executed result.

**Approval / version:** v1.1 — Golden #10 / design-approved, as recorded at the source commit. This documentation update does not create or expand approval. TYPO-01 shared typography/readability remains deferred.

**Sources:** [Spec: failure and recovery](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/12-complete-settlement/spec.md#failure-and-recovery); [Spec: v11 continuity pass  review pending](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/12-complete-settlement/spec.md#v11-continuity-pass--review-pending); [Spec: refresh is a read not a receipt](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/12-complete-settlement/spec.md#refresh-is-a-read-not-a-receipt); [Spec: unknown timeout is not failure](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/12-complete-settlement/spec.md#unknown-timeout-is-not-failure); [version and approval registry](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/journeys.json). [Explicit approval](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/approvals/12-v1.1.json).

## Decision history

**Coverage:** Selected source-supported decisions, backfilled 2026-09-06 from commit `f403b02d05a50d13f556b3edfb949f92b24488a9`. Not a complete conversation or alternatives audit. Earlier candidate labels in the spec body describe its drafting stage; the registry/approval sources below establish the recorded status. Revisit triggers below are maintenance notes added now, not claims about past discussion or permission to redesign.

### J14-D01 — One-recipient sharing with explicit export

**Decision:** Propose a private 24-hour link for one selected authenticated ChopDot user, owner-only creation/stopping, and a separate deliberate copy export. Stopping access does not cancel a request, recall copies or change a balance.

**Why:** The source explicitly gives the 24-hour rationale: asynchronous sharing without a short countdown pressuring payment. General copy is the alternative for someone outside ChopDot.

**Alternatives:** Public/group-wide sharing by default and link possession as access authority are excluded. Raw copy is retained as an explicit export, not rejected. Other expiry durations are not evaluated in the inspected sources.

**Tradeoffs:** Authentication adds a recipient requirement. External copies/screenshots cannot be recalled. Changed destination versions invalidate prior review. The local QR encodes an inert sharing reference, not a provider payment code.

**Revisit when:** Review finds recipient selection or expiry confusing; tests reveal stale destinations, excess exported fields or confusion between stopping access and cancelling payment.

**Approval / version:** v1 — current candidate / review-pending at the recorded source commit. This entry captures the proposal stage; J14-D02 records the later approval. TYPO-01 shared typography/readability remains deferred.

**Sources:** [Spec: candidate policies for approval](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/14-receive-money/spec.md#candidate-policies-for-approval); [Spec: exact context and destination](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/14-receive-money/spec.md#exact-context-and-destination); [Spec: prototype behavior and limits](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/14-receive-money/spec.md#prototype-behavior-and-limits); [version and approval registry](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/journeys.json).

### J14-D02 — Approve V1 as Golden #14 without changing the reviewed artifact

**Decision:** Approve Journey 14 V1 as Golden #14 with its private one-recipient 24-hour link, owner-only link control, deliberate external copy, exact method/currency/network context, and recovery-before-retry rules. Preserve the reviewed HTML byte-for-byte.

**Why:** The user explicitly approved the reviewed candidate after the candidate and its exact artifact had passed the Journey 14 verification. The approved experience provides a safe handoff for receiving details without implying that sharing, copying, stopping or expiry settles money.

**Alternatives:** Redesigning the flow, changing the 24-hour window, adding public or group-wide sharing, and adding new happy-path screens were not requested or authorized. Those remain possible future version proposals only when new evidence warrants them.

**Tradeoffs:** One-recipient authentication adds a deliberate step. External copies and screenshots remain outside ChopDot’s recall control. The history must therefore preserve what was shared and which destination version was used without exposing secrets.

**Revisit when:** User research shows that the recipient requirement or 24-hour duration causes material failure; security review requires a different access model; or a future payment method cannot preserve exact destination versioning and the approved authority boundaries.

**Approval / version:** v1 — design-approved as Golden #14 on 2026-09-06. HTML SHA-256 `5ce877d89157a4203a2e4a2c5fad795a4ecfabf5388dbaecb00bbf28f2f31e1d`; HTML changes were not authorized. TYPO-01 remains deferred.

**Sources:** [Journey 14 approval record](https://github.com/ChopDotHQ/ChopDot/blob/ux/experience-workbench/prototypes/experience-workbench/registry/approvals/14-v1.json); [verified candidate specification](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/14-receive-money/spec.md); [Journey 14 validation](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/14-receive-money/validation.json).

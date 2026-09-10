## Decision history

**Coverage:** Reformatted on 2026-09-10 from the existing Journey 18 Golden specification and retained QA. The decision substance below was already recorded; this canonical source adds the required structure without changing Journey 18 product behavior or Golden HTML.

### J18-D01 — Keep Activity ChopDot-only

**Decision:** Show meaningful ChopDot changes and suppress chain/provider technical noise.

**Why:** Existing readiness material explicitly called for a simple ChopDot-only activity feed and no chain-wide transaction spam; technical refreshes would make the feed harder to trust.

**Alternatives:** Full chain/provider event stream. Rejected for the user-facing feed.

**Tradeoffs:** Technical diagnostics need a separate engineering surface.

**Revisit when:** A user-facing technical event itself becomes a meaningful decision or safety signal.

**Approval / version:** V1 behavior, Design Approved as part of current V1.1 Golden #18.

**Sources:** [Journey 18 specification](../spec.md); [Journey 18 visual QA](../VISUAL_QA.md).

### J18-D02 — Separate attention from unread

**Decision:** Unresolved tasks and unread delivery copies are independent states.

**Why:** Reading a message does not confirm receipt, settle money, agree to an expense, or resolve a request.

**Alternatives:** Clear attention when opened/read. Rejected because it conflates UI consumption with domain resolution.

**Tradeoffs:** Two counts can coexist and need clear labels.

**Revisit when:** Research shows the distinction is still confusing despite explicit wording.

**Approval / version:** V1 behavior, Design Approved as part of current V1.1 Golden #18.

**Sources:** [Journey 18 specification](../spec.md); [state and authority record](../STATE_AND_AUTHORITY.md).

### J18-D03 — Activity routes; canonical journeys mutate

**Decision:** Activity is read-only and hands off to Journeys 04/05/06/07/08/11/12/13/15/16 as applicable.

**Why:** Mutation authority is already designed and frozen in those journeys. Duplicating actions in the feed would create inconsistent recovery and authorization behavior.

**Alternatives:** Inline approve/pay/settle controls. Rejected for V1.

**Tradeoffs:** Some actions take one extra tap.

**Revisit when:** A later version can reuse the exact canonical action contract without duplicating authority or recovery logic.

**Approval / version:** V1 behavior, Design Approved as part of current V1.1 Golden #18.

**Sources:** [Journey 18 specification](../spec.md); [UI-to-domain events](../UI_TO_DOMAIN_EVENTS.md).

### J18-D04 — Re-check notification state on open

**Decision:** Notification text is a snapshot; opening it resolves against current canonical state and current access.

**Why:** Delivery can be delayed or stale, and access can change after delivery.

**Alternatives:** Replay the notification's original destination/action unconditionally. Rejected as unsafe and confusing.

**Tradeoffs:** The opened view can differ from the notification text, so the UI must explain why.

**Revisit when:** Notification infrastructure can guarantee atomic current-state deep links without weakening access checks.

**Approval / version:** V1 behavior, Design Approved as part of current V1.1 Golden #18.

**Sources:** [Journey 18 specification](../spec.md); [Given/When/Then coverage](../GIVEN_WHEN_THEN.md).

### J18-D05 — Preserve exact asset separation in the feed

**Decision:** Never combine CHF and DOT into a converted activity total or instruction.

**Why:** This follows the frozen money rules from settlement and savings journeys.

**Alternatives:** Display a converted aggregate. Rejected because estimates can be mistaken for payable amounts.

**Tradeoffs:** Cross-asset activity is less compressible into one number.

**Revisit when:** Only for an explicitly informational analytics journey with clearly non-instructional estimates.

**Approval / version:** V1 behavior, Design Approved as part of current V1.1 Golden #18.

**Sources:** [Journey 18 specification](../spec.md); [Journey 18 visual QA](../VISUAL_QA.md).

### J18-D06 — Omit search until it is functional and justified

**Decision:** V1 uses four compact filters and intentionally ships no search control.

**Why:** A static search-looking surface would be a dead control; the current example volume is navigable without it.

**Alternatives:** Decorative/inert search or a larger search implementation in this journey. Rejected for V1.

**Tradeoffs:** Very large histories will eventually need stronger retrieval.

**Revisit when:** Real feed volume makes filters insufficient.

**Approval / version:** V1 behavior, Design Approved as part of current V1.1 Golden #18.

**Sources:** [Journey 18 specification](../spec.md); [Journey 18 visual QA](../VISUAL_QA.md).

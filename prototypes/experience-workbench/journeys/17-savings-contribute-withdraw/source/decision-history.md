## Decision history

**Coverage:** Backfilled on 2026-09-10 from the existing Journey 17 Golden specification, approval records, review/QA evidence and Golden validation. This preserves recorded decisions only; where an inspected source did not record an alternative or revisit trigger, that gap is stated rather than reconstructed.

### J17-D01 — Pending money never changes Available

**Decision:** Only confirmed contribution/removal results mutate the derived savings position.

**Why:** The group should never plan against money that was merely promised or submitted.

**Alternatives:** Optimistic progress; self-report closes immediately. Rejected.

**Tradeoffs:** More waiting/recovery states.

**Revisit when:** A custody method can prove finality atomically.

**Approval / version:** V1 behavior, retained through current V1.4 Golden #17.

**Sources:** [Journey 17 specification](../spec.md); [Journey 17 Golden validation](../golden-validation.json).

### J17-D02 — Own-position withdrawal is the default authority boundary

**Decision:** Owner/admin status does not grant withdrawal power over another member's confirmed position.

**Why:** Savings coordination should not silently create custodial authority.

**Alternatives:** Group owner controls pooled total. Rejected unless a separately configured shared-account rule explicitly grants it.

**Tradeoffs:** Group-controlled accounts need an explicit approval rule.

**Revisit when:** The savings custody/control model is separately changed with explicit authority rules.

**Approval / version:** V1 behavior, retained through current V1.4 Golden #17.

**Sources:** [Journey 17 specification](../spec.md); [state and authority record](../STATE_AND_AUTHORITY.md).

### J17-D03 — Unknown means recover, not retry

**Decision:** A timeout blocks re-execution until the original operation result is deterministically recovered.

**Why:** Prevent duplicate contributions/withdrawals.

**Alternatives:** Immediate retry. Rejected because the first execution may have succeeded.

**Tradeoffs:** Temporary waiting state, safer money movement.

**Revisit when:** Execution/finality can be proven atomically without a result-unknown state.

**Approval / version:** V1 behavior, retained through current V1.4 Golden #17.

**Sources:** [Journey 17 specification](../spec.md); [Given/When/Then coverage](../GIVEN_WHEN_THEN.md).

### J17-D04 — Isolate savings status timelines from inherited settlement layout

**Decision:** V1.1 resets layout only for `.status-card .timeline-row`; the shared/inherited Golden stylesheet is not edited.

**Why:** A fresh standalone browser rerun exposed text overlap caused by Journey 12's grid-based timeline rule leaking into Journey 17's vertical status timeline.

**Alternatives:** Edit the inherited/shared timeline rule, which could change approved Goldens; rewrite the timeline markup, which was unnecessary. Both rejected.

**Tradeoffs:** One small journey-scoped override remains until a future shared component cleanup.

**Revisit when:** A deliberately approved shared typography/layout pass replaces the common timeline primitive.

**Approval / version:** V1.1 correction; V1.1 was Design Approved as Golden #17 on 2026-09-07 and is preserved as predecessor history after V1.4 approval.

**Sources:** [Journey 17 specification](../spec.md); [V1.1 approval record](../../../registry/approvals/17-v1.1.json); [Journey 17 visual QA](../VISUAL_QA.md).

### J17-D05 — Approve V1.1 as Golden #17

**Decision:** Freeze the reviewed V1.1 standalone HTML byte-for-byte as Golden #17, including the scoped timeline fix and the original money/authority rules.

**Why:** The user explicitly approved the corrected standalone review after fresh two-size browser QA, zero network requests, timeline-overlap checks, and exact-head verification.

**Alternatives:** Reopen the design or roll back to V1. Rejected because V1.1 fixed a real layout defect without changing product behavior.

**Tradeoffs:** The journey kept one scoped CSS override until a later shared component/typography pass.

**Revisit when:** A deliberately approved shared component/typography pass replaces that primitive without changing the approved behavior.

**Approval / version:** V1.1 — Design Approved as Golden #17 on 2026-09-07. SHA-256 `d4ac9fbc8b6c30a5d09f97b9d2dac3c9ff6f3ae9798a725fd8b8a757cf4c7054`. Preserved as predecessor history after V1.4 approval.

**Sources:** [Journey 17 specification](../spec.md); [V1.1 approval record](../../../registry/approvals/17-v1.1.json).

### J17-D06 — Preserve exact amounts and separate recovery outcomes

**Decision:** The chosen CHF amount and projected totals carry through every downstream state, and “Check original result” remains distinct from simulated service outcomes.

**Why:** The prior candidate could fall back to hard-coded CHF 180/100 examples and could turn checking into a false “not executed” result.

**Alternatives:** Not recorded in inspected sources.

**Tradeoffs:** More explicit operation state in the prototype.

**Revisit when:** Not recorded in inspected sources.

**Approval / version:** V1.2 continuity correction; not itself frozen as Golden.

**Sources:** [Journey 17 specification](../spec.md); [Journey 17 Given/When/Then coverage](../GIVEN_WHEN_THEN.md).

### J17-D07 — Refine Savings visuals without weakening continuity

**Decision:** Keep the corrected behavior while aligning contribution/withdrawal hierarchy with the approved ChopDot group/create experience; remove internal architecture wording from normal UI.

**Why:** The continuity model was correct but the Savings surfaces still felt visually disconnected from the established app.

**Alternatives:** Not recorded in inspected sources.

**Tradeoffs:** Visual-only candidate layer before the final operation-continuity correction.

**Revisit when:** Not recorded in inspected sources.

**Approval / version:** V1.3 visual candidate; preserved as the visual predecessor of V1.4.

**Sources:** [Journey 17 specification](../spec.md); [Journey 17 visual QA](../VISUAL_QA.md).

### J17-D08 — Approve V1.4 as the updated Golden #17

**Decision:** Freeze the published V1.4 candidate byte-for-byte as the current Golden #17 while preserving the V1.1 Golden file and approval history.

**Why:** V1.4 preserves the approved V1.3 visuals and fixes the three independently reproduced operation-continuity defects: reload recovery, same-operation retry through final submission, and unresolved-operation protection. The user explicitly approved it after Codex independently passed all 16 focused checks at both phone sizes using native file and localhost loading.

**Alternatives:** Keep V1.1 as current Golden; accept V1.3 without reload continuity; redesign the journey. Rejected because V1.4 is the reviewed continuity-corrected artifact and no redesign was requested.

**Tradeoffs:** Browser storage exists only as prototype continuity cache; production persistence/authority remains intentionally out of scope.

**Revisit when:** Production persistence is implemented, a new payment authority model changes the operation lifecycle, or a separately approved shared component/typography pass can replace visual primitives without altering these semantics.

**Approval / version:** V1.4 — Design Approved as updated Golden #17 on 2026-09-08. SHA-256 `a5dad1dc659955d4b70acaa13eced199dd778ff628ab8998d4c7ae83055d4915`. HTML changes not authorized. TYPO-01 remains deferred.

**Sources:** [V1.4 approval record](../../../registry/approvals/17-v1.4.json); [V1.1 approval record](../../../registry/approvals/17-v1.1.json); [Savings review candidate registry](../../../registry/review-candidates/savings-j16-v1.2-j17-v1.4.json); [Journey 17 V1.4 QA](../review-v1.4/results/VISUAL_QA.md).

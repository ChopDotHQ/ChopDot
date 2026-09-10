## Decision history

**Coverage:** Journey 19 V1 candidate decisions recorded from the current specification and QA during candidate creation, plus the V1.1 continuity correction found during fresh review. This is not an approval record; Journey 19 remains review-pending.

### J19-D01 — Read-only patterns instead of a second ledger

**Decision:** Summarize useful group/spend patterns and route to canonical destinations rather than reproduce raw transactions.

**Why:** The registry goal is understanding useful patterns rather than raw transactions, while Settlement History and Activity already own event/history surfaces.

**Alternatives:** A transaction-style analytics feed was considered and rejected for V1 because it duplicates Journeys 15 and 18.

**Tradeoffs:** V1 is deliberately selective and will not answer every reporting question.

**Revisit when:** Real usage shows that people need deeper analytics rather than clearer summary patterns.

**Approval / version:** V1 review candidate; not approved or Golden. TYPO-01 remains deferred.

**Sources:** [Journey 19 specification](../spec.md) [Journey 19 visual QA](../VISUAL_QA.md) [Journey registry](../../../registry/journeys.json)

### J19-D02 — Compare only like-for-like currencies and complete periods

**Decision:** CHF and DOT remain separate, and incomplete comparison windows suppress increase/decrease deltas.

**Why:** Frozen money journeys require exact asset separation and prohibit estimates from becoming payment instructions.

**Alternatives:** Converted cross-asset totals and partial-period trend percentages were rejected for V1.

**Tradeoffs:** Some overview states intentionally show less comparison information when the data is incomplete.

**Revisit when:** A later informational analytics layer can label non-instructional estimates unambiguously.

**Approval / version:** V1 review candidate; not approved or Golden.

**Sources:** [Journey 19 specification](../spec.md) [Model tests](./test-model.cjs)

### J19-D03 — Current access constrains current insight

**Decision:** Recompute current insights from groups the viewer may currently access and omit inaccessible private group contribution.

**Why:** Insights must not become a privacy bypass after group access changes.

**Alternatives:** Preserving hidden historical group contribution inside the current aggregate was rejected for V1.

**Tradeoffs:** Historical-looking totals can change when access changes because the current insight is authorization-scoped.

**Revisit when:** A future export or audit policy explicitly defines retained aggregate rights.

**Approval / version:** V1 review candidate; not approved or Golden.

**Sources:** [Journey 19 specification](../spec.md) [Browser QA](../visual-qa/browser-qa.json)

### J19-D04 — Insights inherits the frozen global navigation shell

**Decision:** Journey 19 V1.1 uses the established global navigation vocabulary and hierarchy: Pots, People, raised Add, Activity, You. Insights remains a feature and does not rename global tabs or create a new global destination.

**Why:** Fresh rendered review of V1 found that it had quietly changed the shell to Home, Groups, Add, Activity, You and flattened the center Add action. That contradicted the cross-journey Golden system and made Insights feel like a different app.

**Alternatives:** Keep the V1 Home / Groups footer because the links worked, or promote Insights into its own global tab. Both were rejected because working links are not enough when the shared product shell has already been established, and the Journey 19 specification explicitly keeps Insights out of global navigation.

**Tradeoffs:** The standalone prototype needs lightweight adjacent-surface previews for global navigation destinations it does not own. Those previews are boundaries only and must not redesign the adjacent journeys.

**Revisit when:** The global ChopDot navigation itself is deliberately reopened as a separately scoped cross-product decision.

**Approval / version:** V1.1 review candidate; not approved or Golden. V1 remains preserved. TYPO-01 remains deferred.

**Sources:** [Journey 19 V1.1 builder](./build-v1.1.mjs) [Journey 17 Golden candidate](../../17-savings-contribute-withdraw/v1.4-review-candidate.html) [Journey 18 Golden candidate](../../18-activity-notifications/review-v1.1/j18-v1.1-continuity-candidate.html) [Journey 19 specification](../spec.md)

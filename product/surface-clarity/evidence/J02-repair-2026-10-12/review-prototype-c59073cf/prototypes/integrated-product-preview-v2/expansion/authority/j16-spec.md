# Journey 16 — Savings Group

V1.2 · Design Approved · updated Golden #16. The prior V1 recovered Golden artifact and approval record remain preserved as history.

## User goal
Pool money toward a shared goal without losing clarity over what is actually available, who controls it, and who owns each position.

## Approved product rules
1. **Recorded is not received.** Planned, submitted or self-reported money does not increase Available.
2. **Goal progress uses confirmed Available only.** Pending contributions are separate.
3. **One exact currency or asset per savings group.** Converted estimates never become contribution or withdrawal instructions.
4. **Custody is explicit before money moves.** The group states whether money remains with members or sits in a group-controlled external account. ChopDot itself never holds funds.
5. **No automatic yield claim.** Earnings appear only with a verified source, period and status; no return is guaranteed.
6. **Member positions remain member-owned.** An owner/admin cannot withdraw another member's funds by default.
7. **Add and Withdraw are Journey 17 handoffs.** Opening them does not mutate group Available, goal progress or member positions.
8. **Unknown execution requires recovery before retry.**

## Main experience
Dedicated savings entry → set goal → choose people → choose where the money stays → review → create → Savings Group Home.

The approved reference is `Alps House Fund`: goal CHF 3000.00, target 1 June 2027, members Dev/Jeanine/Marc, track-together mode, confirmed Available CHF 1240.00.

V1.2 keeps the Savings overview inside the established ChopDot group-home visual language, gives Add money the clear primary role, keeps settings/activity secondary, removes internal architecture wording from normal UI, and preserves the behavioral handoff boundaries to Journey 17. TYPO-01 remains deferred.

## Recovery provenance
The original V1 temporary review HTML was not durably committed. `v1-recovered.html` remains preserved as the evidence-backed Golden #16 artifact that was approved on 2026-09-07; no byte-identity claim is made to the lost temporary file. V1.2 is a separately reviewed, exact durable artifact and supersedes V1 as the current Golden version without deleting that history.

## Decision history
### J16-D01 — Savings is confirmed-position coordination, not a mutable pooled balance
**Decision:** Available and goal progress are derived only from confirmed contributions/removals; individual positions remain explicit.
**Why:** A promise or UI click must not fabricate money.
**Alternatives:** Editable pooled total; progress including pending contributions. Rejected as dishonest.
**Tradeoffs:** More states must be shown around pending/failed changes.
**Revisit when:** A future custody model can prove funds atomically while preserving the same authority boundaries.
**Approval/version:** V1, Golden #16.

### J16-D02 — No default yield or protocol branding
**Decision:** Savings does not imply investment or APY. Infrastructure is invisible unless verified and relevant.
**Why:** Saving together and investing are different user decisions.
**Alternatives:** The older implementation showed named protocol/APY panels. Rejected for product truth and clarity.
**Tradeoffs:** Fewer speculative “growth” cues; stronger trust boundary.
**Revisit when:** A separately approved investment product exists with verified disclosures.
**Approval/version:** V1, Golden #16.

### J16-D03 — Durable recovery
**Decision:** Lock the recovered evidence-based V1 artifact because the prior temporary HTML was not committed.
**Why:** GitHub must hold the restartable truth.
**Tradeoff:** New checksum; no claim of byte identity to the lost file.
**Approval/version:** V1, Golden #16. Preserved as predecessor history after V1.2 approval.

### J16-D04 — Approve V1.2 as the updated Golden #16
**Decision:** Freeze the published V1.2 review candidate byte-for-byte as the current Golden #16 while preserving V1 and its approval record.
**Why:** The user explicitly approved the focused visual refinement after continuity correction and two-size QA. The updated overview matches the established ChopDot group experience, prioritizes contributing, removes internal copy, and preserves the confirmed-money/authority rules.
**Alternatives:** Keep the recovered V1 as the current Golden; redesign Savings again. Rejected because V1.2 is the reviewed refinement and no further redesign was requested.
**Tradeoffs:** V1.2 becomes the current locked reference while V1 remains historical evidence rather than the active prototype.
**Revisit when:** New user evidence changes the Savings group hierarchy or a separately approved shared typography/component pass replaces the current primitives without weakening the approved behavior.
**Approval / version:** V1.2 — Design Approved as updated Golden #16 on 2026-09-08. SHA-256 `dc920000fc4120accab588413ee79095093f8e4223066d7d3a94fb524e5cd0de`. HTML changes not authorized. TYPO-01 remains deferred.
**Sources:** `registry/approvals/16-v1.2.json`, `registry/approvals/16-v1.json`, `registry/review-candidates/savings-j16-v1.2-j17-v1.4.json`, Journey 16 review-v1.2 QA evidence.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

**Coverage:** Backfilled on 2026-09-10 from the existing Journey 16 Golden specification, approval records, review evidence and Golden validation. This records only rationale already supported by inspected sources and does not reconstruct the lost temporary V1 review conversation.

### J16-D01 — Savings is confirmed-position coordination, not a mutable pooled balance

**Decision:** Available and goal progress are derived only from confirmed contributions/removals; individual positions remain explicit.

**Why:** A promise or UI click must not fabricate money.

**Alternatives:** Editable pooled total; progress including pending contributions. Rejected as dishonest.

**Tradeoffs:** More states must be shown around pending/failed changes.

**Revisit when:** A future custody model can prove funds atomically while preserving the same authority boundaries.

**Approval / version:** V1, Golden #16; preserved as predecessor history after V1.2 approval.

**Sources:** [Journey 16 specification](../spec.md); [Journey 16 Golden validation](../golden-validation.json); [V1 approval record](../../../registry/approvals/16-v1.json).

### J16-D02 — No default yield or protocol branding

**Decision:** Savings does not imply investment or APY. Infrastructure is invisible unless verified and relevant.

**Why:** Saving together and investing are different user decisions.

**Alternatives:** The older implementation showed named protocol/APY panels. Rejected for product truth and clarity.

**Tradeoffs:** Fewer speculative growth cues; stronger trust boundary.

**Revisit when:** A separately approved investment product exists with verified disclosures.

**Approval / version:** V1, Golden #16; preserved as predecessor history after V1.2 approval.

**Sources:** [Journey 16 specification](../spec.md); [V1 approval record](../../../registry/approvals/16-v1.json).

### J16-D03 — Durable recovery

**Decision:** Lock the recovered evidence-based V1 artifact because the prior temporary HTML was not committed.

**Why:** GitHub must hold the restartable truth.

**Alternatives:** Not recorded in inspected sources.

**Tradeoffs:** New checksum; no claim of byte identity to the lost file.

**Revisit when:** The original temporary V1 HTML is recovered and can be compared safely.

**Approval / version:** V1, Golden #16; preserved as predecessor history after V1.2 approval.

**Sources:** [Journey 16 specification](../spec.md); [recovered V1 artifact](../v1-recovered.html); [V1 approval record](../../../registry/approvals/16-v1.json).

### J16-D04 — Approve V1.2 as the updated Golden #16

**Decision:** Freeze the published V1.2 review candidate byte-for-byte as the current Golden #16 while preserving V1 and its approval record.

**Why:** The user explicitly approved the focused visual refinement after continuity correction and two-size QA. The updated overview matches the established ChopDot group experience, prioritizes contributing, removes internal copy, and preserves the confirmed-money/authority rules.

**Alternatives:** Keep the recovered V1 as the current Golden; redesign Savings again. Rejected because V1.2 is the reviewed refinement and no further redesign was requested.

**Tradeoffs:** V1.2 becomes the current locked reference while V1 remains historical evidence rather than the active prototype.

**Revisit when:** New user evidence changes the Savings group hierarchy or a separately approved shared typography/component pass replaces the current primitives without weakening the approved behavior.

**Approval / version:** V1.2 — Design Approved as updated Golden #16 on 2026-09-08. SHA-256 `dc920000fc4120accab588413ee79095093f8e4223066d7d3a94fb524e5cd0de`. HTML changes not authorized. TYPO-01 remains deferred.

**Sources:** [V1.2 approval record](../../../registry/approvals/16-v1.2.json); [V1 approval record](../../../registry/approvals/16-v1.json); [Savings review candidate registry](../../../registry/review-candidates/savings-j16-v1.2-j17-v1.4.json); [Journey 16 V1.2 QA](../review-v1.2/results/VISUAL_QA.md).
<!-- JOURNEY_DECISION_HISTORY:END -->

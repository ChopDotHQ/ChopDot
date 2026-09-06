# Journey 16 — Savings Group

V1 · Design approved · Golden #16 (recovered durable artifact)

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
Dedicated savings entry → set goal → choose people → choose control model → review → create → Savings Group Home.

The reviewed reference is `Alps House Fund`: goal CHF 3000.00, target 1 June 2027, members Dev/Jeanine/Marc, track-together mode, confirmed Available CHF 1240.00.

## Recovery provenance
The previous session retained review screenshots and the accepted product handoff, but its temporary HTML was not committed to the durable branch. `v1-recovered.html` re-materializes the reviewed visual hierarchy and approved rules. Its new checksum is the durable Golden checksum; it is not represented as byte-identical to the missing temporary HTML.

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
**Decision:** Lock the recovered evidence-based artifact because the prior temporary HTML was not committed.
**Why:** GitHub must hold the restartable truth.
**Tradeoff:** New checksum; no claim of byte identity to the lost file.

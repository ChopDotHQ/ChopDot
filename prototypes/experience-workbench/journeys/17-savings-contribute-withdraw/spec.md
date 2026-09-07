# Journey 17 — Contribute / Withdraw Savings

V1.1 · Golden #17 · Design Approved. Prototype only; reviewed HTML is checksum-locked.

## Position and handoff
Journey 16 V1 is Golden #16. Journey 17 owns the money-changing workflow after a member chooses **Add money** or **Withdraw** from a savings group. It exits to the updated savings group, Activity & Notifications (18), or Wallet & Crypto (21) when an external wallet approval is required.

## User goal
Add or remove savings safely, knowing exactly what will change and when it becomes real.

## Main paths
**Add:** Savings group → amount → review → contribution prepared / self-reported or provider-submitted → waiting → confirmed → updated group.

**Withdraw:** Savings group → amount from your confirmed position → review → authorization / group rule → waiting → confirmed → updated group.

## Approved product rules
1. **One scoped operation.** A contribution or withdrawal binds member, savings group, exact amount, one currency/asset, control model, source position/version and a unique operation id.
2. **No optimistic money.** Prepared, self-reported, submitted, waiting and unknown states do not change Available or goal progress.
3. **Tracking mode needs confirmation.** “I added it” records the member's statement but cannot make the contribution final by itself. The configured confirmation authority must confirm it.
4. **Shared-account mode uses the account's real authority.** A provider/wallet may report execution/finality; a group rule may require approvals. ChopDot never holds keys or funds.
5. **Own-position withdrawal by default.** A member can prepare a withdrawal only from their own confirmed position. Group owner/admin status does not grant authority over another member's position.
6. **Group-controlled withdrawals obey the configured group rule.** The UI cannot bypass or self-approve that rule.
7. **Unknown result before retry.** Timeout/result-unknown blocks another execution until the original operation is recovered. A verified failed/not-executed result can then be retried idempotently.
8. **Exact currency.** CHF, EUR, DOT, etc. remain separate. No converted estimate becomes an instruction.
9. **Reversal/return appends history.** A returned confirmed contribution reopens only that exact amount and keeps the earlier confirmation in history.
10. **No yield implication.** Contributing to a savings group does not imply investment, return or earnings.

## Authority
- Member: chooses amount, authorizes their own contribution/withdrawal, may mark an external contribution as added.
- Confirmation authority: confirms external/tracking-mode receipt/removal.
- External provider or wallet: can report execution/finality for its own action.
- Group rule: may authorize group-controlled withdrawals.
- ChopDot UI: prepares, displays, retries only when safe, and derives balances. It cannot fabricate confirmation.
- LLM/agent: may prepare/recommend only; no execution without valid delegated authority. Deterministic backend/provider verification governs amount, balance, replay and transitions.

## Recovery cases
Offline; insufficient confirmed position; changed group version; confirmation delayed; user rejects approval; provider failure; result unknown; safe retry after recovered failure; returned contribution; access loss; mixed currency.

## Visual inheritance
Uses the established fixed phone frame, neutral cards, green savings/action semantic, compact headers, inline line icons, and short copy. V1.1 adds only a scoped timeline-layout reset to prevent an inherited settlement grid from affecting savings status timelines. No shared typography changes. TYPO-01 remains deferred.

## Decision history
### J17-D01 — Pending money never changes Available
**Decision:** Only confirmed contribution/removal results mutate the derived savings position.
**Why:** The group should never plan against money that was merely promised or submitted.
**Alternatives:** Optimistic progress; self-report closes immediately. Rejected.
**Tradeoffs:** More waiting/recovery states.
**Revisit when:** A custody method can prove finality atomically.

### J17-D02 — Own-position withdrawal is the default authority boundary
**Decision:** Owner/admin status does not grant withdrawal power over another member's confirmed position.
**Why:** Savings coordination should not silently create custodial authority.
**Alternatives:** Group owner controls pooled total. Rejected unless a separately configured shared-account rule explicitly grants it.
**Tradeoffs:** Group-controlled accounts need an explicit approval rule.

### J17-D03 — Unknown means recover, not retry
**Decision:** A timeout blocks re-execution until the original operation result is deterministically recovered.
**Why:** Prevent duplicate contributions/withdrawals.
**Alternatives:** Immediate retry. Rejected because the first execution may have succeeded.
**Tradeoffs:** Temporary waiting state, safer money movement.

### J17-D04 — Isolate savings status timelines from inherited settlement layout
**Decision:** V1.1 resets layout only for `.status-card .timeline-row`; the shared/inherited Golden stylesheet is not edited.
**Why:** A fresh standalone browser rerun exposed text overlap caused by Journey 12's grid-based timeline rule leaking into Journey 17's vertical status timeline.
**Alternatives:** Edit the inherited/shared timeline rule, which could change approved Goldens; rewrite the timeline markup, which was unnecessary. Both rejected.
**Tradeoffs:** One small journey-scoped override remains until a future shared component cleanup.
**Revisit when:** A deliberately approved shared typography/layout pass replaces the common timeline primitive.

### J17-D05 — Approve V1.1 as Golden #17 unchanged
**Decision:** Freeze the reviewed V1.1 standalone HTML byte-for-byte as Golden #17, including the scoped timeline fix and all ten money/authority rules above.
**Why:** The user explicitly approved the corrected standalone review after fresh two-size browser QA, zero network requests, timeline-overlap checks, and exact-head verification.
**Alternatives:** Reopen the design or roll back to V1. Rejected because V1.1 fixes a real layout defect without changing product behavior.
**Tradeoffs:** The journey keeps one scoped CSS override until a later shared component/typography pass.
**Revisit when:** New user evidence changes the contribution/withdrawal authority model, or a separately approved shared component pass can replace the scoped override without altering the Golden behavior.
**Approval / version:** V1.1 — Design Approved as Golden #17 on 2026-09-07. SHA-256 `d4ac9fbc8b6c30a5d09f97b9d2dac3c9ff6f3ae9798a725fd8b8a757cf4c7054`. HTML changes not authorized. TYPO-01 remains deferred.
**Sources:** `registry/approvals/17-v1.1.json`, `registry/exact-head-gate.json`, Journey 17 V1.1 validation and fresh review evidence.

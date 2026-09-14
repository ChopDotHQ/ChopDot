## Decision history

**Coverage:** Journey 26 V1 candidate decisions proposed for independent review. None of these entries are human-approved until the exact candidate is reviewed and explicitly approved.

### J26-D01 — Initialize Journey 26 from canonical authority

**Decision:** J26 starts only after Journey 25 is validated Golden #25 and exact-head verification is green.

**Why:** Preserve sequential product authority.

**Approval / version:** Process initialization only; unchanged from canonical seed.

### J26-D02 — Owner writes, member self-leave

**Decision:** Owner authority covers rename, future-default configuration, archive/unarchive, ownership transfer and conservative delete. A regular member can inspect settings and leave their own membership. Stale owner permission never authorizes a write.

**Why:** Keeps group-wide mutation authority explicit without widening it to payment/account authority.

**Alternatives:** Allowing every member to change group-wide settings or silently selecting a new owner were rejected for V1.

**Tradeoffs:** Some actions require a role handoff before the user can proceed.

**Revisit when:** A separately approved role/permission model changes group-wide authority.

### J26-D03 — Configuration is future-default currency only

**Decision:** The V1 configurable financial default is the currency preselected for **future expense entry**. Existing expenses, balances, settlements and history are never converted/recalculated by this setting.

**Why:** Satisfies the registry's configure job with a bounded, understandable group setting while preserving ledger/history truth.

**Alternatives:** Broad member-role/invite/payment configuration was rejected because adjacent journeys own those domains; retroactive currency conversion was rejected as financially unsafe and outside lifecycle scope.

**Tradeoffs:** J26 does not attempt to be a complete settings surface for every future product capability.

**Revisit when:** Add Expense or another approved owner defines richer group defaults.

### J26-D04 — Archive is reversible organization state, not settlement

**Decision:** Archive removes the group from the active list and blocks new expense/invite creation while retaining history and outstanding positions. It may be reversed with unarchive. Archive never means settled/deleted/forgiven.

**Why:** Preserves user access to money/history while providing a safe way to retire an inactive group.

**Alternatives:** Deleting on archive or forcing all balances to zero before archive were rejected because they conflate organization with financial finality.

**Tradeoffs:** Archived groups can still contain unresolved positions and therefore need honest status copy.

**Revisit when:** Product law separately defines archival retention or read/write behavior.

### J26-D05 — Ownership transfer belongs here; roster editing stays J09

**Decision:** J26 owns the ownership mutation. The recipient must already be an eligible active member. Member removal/invitation/roster management remains Journey 09.

**Why:** J09 explicitly reserves ownership transfer/lifecycle for J26, while J26 should not duplicate member management.

**Alternatives:** J26 adding/removing members as a side effect was rejected.

**Tradeoffs:** Delete/leave may route to Manage People first.

**Revisit when:** J09's approved roster contract changes.

### J26-D06 — Leave is blocked by ownership or open-item truth

**Decision:** A regular member may leave only when no unresolved/open items involving them remain. An owner must transfer ownership before leaving. Historical attribution and ledger facts remain unchanged after verified leave.

**Why:** Leaving access must not silently forgive or rewrite money truth.

**Alternatives:** Allowing leave with unresolved items and clearing them locally was rejected.

**Tradeoffs:** Some users must resolve money/ownership before leaving.

**Revisit when:** A separately approved financial contract defines a safe post-leave representation for unresolved items.

### J26-D07 — Delete is conservative and scoped

**Decision:** Delete is owner-only, requires archived status, sole active membership and no open items, plus typed group-name confirmation and a separate final review. Verified deletion is scoped to this ChopDot working state; no external/global erasure claim is made.

**Why:** Destructive action needs strong safeguards and precise erasure claims.

**Alternatives:** One-click delete, archive+delete in one effect, deleting with members/open items, or claiming external-copy erasure were rejected.

**Tradeoffs:** Deletion can require prior J09 and money-resolution work.

**Revisit when:** Runtime architecture defines stronger multi-party deletion/retention semantics.

### J26-D08 — Stable operation identity and reconcile-before-retry

**Decision:** Rename/config/archive/unarchive/transfer/leave/delete all distinguish pending, cancelled, known no-effect failure, unknown, reconciliation, safe retry and verified success. Unknown blocks duplicate effects until the exact operation is reconciled.

**Why:** Prevent duplicate or contradictory lifecycle mutations and keep user-facing truth honest.

**Alternatives:** Blind retry and intent-as-success were rejected.

**Tradeoffs:** The fixture exposes more recovery states, but each state answers what happened, what is still true and what can happen next.

**Revisit when:** Production mutation APIs provide stronger transactional/finality semantics.

### J26-D09 — Factory v1.1 requires caller reachability

**Decision:** Exact QA must reach every material J26 state through clicked UI paths from the owner/member settings entries, or classify it as a named owner/system boundary. Direct state injection counts only for render coverage.

**Why:** Prevent mechanically complete but unreachable candidate states.

**Alternatives:** Screenshot-only direct state loading was rejected as insufficient evidence.

**Tradeoffs:** QA is larger, but continuity defects should be caught before formal review.

**Revisit when:** Canonical factory configuration changes the evidence contract.

### J26-D10 — Preserve Golden shell and TYPO-01 deferral

**Decision:** Reuse the approved Group Home / recent workbench shell, navigation language, spacing/status/action hierarchy and owner-boundary treatment. Do not edit approved Golden HTML or locally solve TYPO-01.

**Why:** Shared design rules require Golden reuse and keep shared typography work outside active journey scope.

**Revisit when:** A dedicated shared-system pass is explicitly authorized.

## Sources

- canonical `registry/progress.json`, `active-candidate.json`, `exact-head-gate.json`, `journeys.json`;
- `DESIGN_CONTRACT.md` and `REVIEW_PROTOCOL.md`;
- Journey 08 Group Home Golden contract;
- Journey 09 Manage People Golden contract;
- `shared/improvements.md` (`TYPO-01` deferred);
- repo-owned Factory v1.1/evolution guidance.

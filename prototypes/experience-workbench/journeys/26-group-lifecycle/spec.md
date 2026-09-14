# Journey 26 — Group Lifecycle V1

Status: **candidate build on dedicated non-canonical branch**. Journey 25 is validated Golden #25 and Journey 26 is authoritative. This contract is proposed for J26 V1 review only; it is not approved product authority.

## Goal

Rename, configure, archive, transfer ownership, leave, or delete a group without hiding permission, money, concurrency, or outcome truth.

## Entry

- **Group Home → Group settings** for an active owner or member.
- **Archived group → Group settings** for an owner restoring or deleting an archived group.

## Exit

One of these truthful outcomes:
- Group Home with an unchanged or verified-updated group;
- Home after a verified leave or delete;
- Manage People when another member must be selected or group membership must change;
- settlement/issue resolution when open items block leave/delete;
- Journey 28 recovery when a lifecycle operation remains unresolved after reconciliation.

## Product contract

### 1. Role is explicit and scoped
The current group owner may rename the group, change the future-expense default currency, archive/unarchive, transfer ownership, and request deletion when deletion prerequisites are met. A regular member may inspect lifecycle settings and leave their own membership. Group ownership does not grant payment, wallet, signing, or authority over another member's account.

If permission changes while a screen is open, the stale action is invalidated. The UI returns to current role truth instead of completing under old authority.

### 2. Rename changes identity, not history
Renaming changes only the group display name. It does not rewrite expense labels, balances, settlement history, member identity, or stable group identity. Empty/whitespace-only names are blocked. A concurrent rename invalidates a stale review and requires refresh.

### 3. Configuration is deliberately narrow in V1
The configurable financial default in this candidate is **default currency for future expenses**. Changing it affects only new expense entry after the accepted change. Existing expenses, balances, settlements, exports, and historical currency labels are never converted or recalculated by this setting.

This journey does not redesign member roles, invitation policy, payment methods, settlement execution, or account-wide preferences. Those remain with their owning journeys.

### 4. Archive is reversible organization state, not settlement
Archiving removes the group from the active-group list and blocks new expense/invite creation while preserving readable history and outstanding positions. It does not forgive, net, settle, delete, or convert balances. Existing settlement/review paths remain available where their owning journeys permit them. Unarchive restores active-group status; it does not mutate history.

### 5. Ownership transfer is a lifecycle mutation
The current owner may transfer ownership only to an already-active member surfaced through the existing member roster. Selecting/managing members remains Journey 09; the ownership change itself is J26. Transfer does not change balances, expense attribution, payment preferences, or other memberships.

The old owner becomes a regular member after verified success. If the result is unknown, the UI reconciles the exact transfer operation before any retry.

### 6. Leave never forgives open obligations
A regular member may leave only when this group has no unresolved/open items involving that member. A non-zero or unresolved position routes to the existing settlement/issue owner instead of silently clearing it. An owner cannot leave while still owner; ownership must first be transferred to an active member. A sole owner with no eligible successor may archive or, when deletion prerequisites are met, delete instead.

A verified leave removes future group access while historical attribution and every ledger fact remain unchanged.

### 7. Delete is conservative and exact
Delete is owner-only, irreversible inside this candidate, and available only when:
- the group is already archived;
- the current owner is the only active member;
- no open/unresolved group items remain.

If members remain, membership management is owned by Journey 09. If open items remain, resolution is owned by the relevant money/issue journey. Final deletion requires an explicit typed group-name confirmation and a separate final review.

Verified deletion removes the group workspace from this ChopDot working state. It does **not** claim erasure of another person's retained/exported copy, an external backup, payment-provider history, chain history, or other independently controlled records.

### 8. Stable operations and unknown-result reconciliation
Each write uses a stable logical operation identity. Pending, cancelled-before-effect, known failure, unknown result, verified no-effect, and verified success remain distinct.

An unknown rename/config/archive/unarchive/transfer/leave/delete result must reconcile before retry. Retry is exposed only after the exact operation is verified to have had no effect. If the original effect is found, the existing accepted result is reused rather than duplicated.

### 9. Cancellation never masquerades as success
Cancelling before the first effect returns to the relevant review/settings context with no-effect copy and neutral status treatment. Verified success uses success treatment only after the modeled operation is established.

### 10. Offline and stale data cannot authorize lifecycle writes
Cached settings may remain readable offline, but all lifecycle writes require current role/version truth. Loading, unavailable, offline, stale-role, concurrent-edit, known failure, cancellation, partial/blocked, unknown, reconciliation, safe-retry, and verified-result states are explicit.

## First-effect boundaries

| Effect | Before effect | First effect | Unknown handling |
|---|---|---|---|
| Rename | edit → review | `Save name` | reconcile exact rename operation before retry |
| Change future default currency | edit → review | `Save default` | reconcile exact config operation before retry |
| Archive / unarchive | impact review → confirmation | `Archive group` / `Restore group` | reconcile exact lifecycle operation before retry |
| Transfer ownership | eligible-member review → confirmation | `Transfer ownership` | reconcile exact transfer before retry |
| Leave | eligibility review → confirmation | `Leave group` | reconcile exact leave before retry |
| Delete | prerequisites → typed name → final review | `Delete group` | reconcile exact delete before retry |

## Owner / adjacent-journey boundaries

- **J26-B01 — Journey 08 Group Home:** caller and normal return after non-terminal lifecycle work.
- **J26-B02 — Journey 09 Manage People:** roster changes and choosing/managing eligible members when lifecycle prerequisites require it.
- **J26-B03 — Money / issue resolution owner:** settlement or issue resolution when open items block leave/delete; J26 never edits ledger facts to make the block disappear.
- **J26-B04 — Home:** verified leave/delete exits when the current user no longer has the group workspace.
- **J26-B05 — Journey 28 Things Go Wrong / Recovery:** unresolved operation truth that J26 reconciliation cannot safely decide.

## Factory v1.1 evidence contract

Enabled capabilities for the live J26 authority are applied as follows:
- sustained Builder execution;
- compressed current-work packet at `source/current-work-packet.md`;
- caller-reachability evidence for every registered material state.

Every material state must be reached in exact browser QA by clicking a truthful path beginning at an authorized J26 entry, or be explicitly classified as one of the owner/system boundaries above. Direct hash/state rendering is used for screenshot coverage only and does **not** satisfy caller reachability.

## Prototype claim boundary

This candidate is a deterministic standalone UX fixture. It does **not** prove:
- production permission enforcement or persistence;
- backend/group database writes;
- real settlement, payment, signing, wallet, provider, or chain effects;
- actual deletion from independently controlled copies or external systems;
- real-time multi-device conflict transport;
- production recovery/finality.

All group/member/money facts in the prototype are synthetic fixture facts used to test UX continuity.

## Review gate

Builder evidence must bind exact branch/head, candidate HTML SHA-256, current-work packet, registered state/boundary counts, caller-reachability coverage, deterministic/model assertions, browser interactions/layout at `393×852` and `430×890`, actual rendered PNGs, page/console/network results, artifact/run IDs, and exact CI/Coverage/Smoke/E2E status. Independent Reviewer must inspect all five review lenses and the actual renders. Explicit Devinson approval of unchanged exact bytes remains required before Golden freeze.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

Canonical candidate decisions live in [`source/decision-history.md`](source/decision-history.md). J26 V1 remains unapproved until independent review and explicit human approval.
<!-- JOURNEY_DECISION_HISTORY:END -->

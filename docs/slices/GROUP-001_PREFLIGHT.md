# GROUP-001 Preflight — Group editing + member safety

Status: READY_FOR_CODEX_VERIFY
Branch: `chatgpt/chopdot-v1-completion`

## User goal

A group owner/user should be able to keep a group accurate over time: rename it, add another person, and remove someone who no longer belongs — without deleting history or breaking unresolved money.

## Current model facts

- `Group` currently contains only `id`, `name`, and active `memberIds`.
- Historical attribution lives independently in `users`, `expenses`, and `splits`.
- Therefore removing a user from `group.memberIds` can preserve history as long as their `User`, `Expense`, and `Split` records are not deleted.
- Shared/cross-device mutation authority is not yet production-ready on this branch, so GROUP-001 remains local prototype authority like MONEY-001/002.

## Safety rules

1. Renaming a group changes only the display name; financial records remain untouched.
2. Adding a member never creates or rewrites money.
3. A user record may be reused when a normalized name matches an existing known person; otherwise a new stable user id is created by the UI before dispatch.
4. Removing a member means removing them from the active roster only. Never delete the user or their historical expenses/splits.
5. A member cannot be removed while any unresolved financial relationship in that group involves them.
6. “Net balance = 0” is not sufficient proof that removal is safe. Two opposite unsettled obligations can net to zero and still require resolution.
7. The current user cannot remove themselves in this first local-shell slice.
8. The group cannot be left with zero members.
9. Historical confirmed expenses remain readable after a former member leaves.
10. No group mutation in this slice claims cross-device/shared authority.

## What counts as unresolved involvement

Removal is blocked if the target member is involved in any group expense where:

- they are the payer and at least one counterparty split is not `confirmed`; or
- they own a split that is not `confirmed` and the expense payer is someone else.

The payer's own bookkeeping split does not count as an external obligation.

This rule intentionally checks raw obligations, not only derived net balance.

## UI behavior

Group Detail now has one unobtrusive manage/settings entry point.

Manage group allows:

- rename group;
- add a person by name;
- reuse an existing known person by normalized name;
- remove eligible active members;
- show a plain-language reason when removal is blocked: `Settle this person's open money first.`

A former member disappears from the active member roster but remains in `users`, expenses, splits, and historical expense rendering.

## Implementation

- `src/groups/groupSafety.ts` owns removal/rename/add safety helpers.
- `src/groups/groupSafety.test.ts` covers the key financial invariants.
- `src/components/GroupSettings.tsx` provides the consumer-facing manage flow.
- `src/components/GroupDetail.tsx` exposes the settings entry point.

The current local shell persists the updated `Group` through the existing `CREATE_GROUP` state action. That action is still a prototype persistence primitive, not a claim that canonical shared group authorization exists. Backend owner/admin authorization remains future shared-mode work.

## Deferred

- Backend/shared authorization roles (owner/admin) — BACKEND/POLKADOT identity work.
- Cross-device propagation — SYNC-001.
- Dedicated archived-group schema — current Close Group / SavedRecord behavior remains the existing finish mechanism until its lifecycle is reconciled with the current source.
- Deleting people globally — out of scope; historical attribution must remain intact.
- Self-leave/ownership-transfer behavior — requires explicit role/authority design.

## Acceptance cases

1. Rename `Weekend` -> `Berlin Weekend`; expenses/balances unchanged.
2. Add Nina; she appears in active roster with zero balance and existing money remains unchanged.
3. Remove Nina when she has never participated; active roster changes, user record remains.
4. Remove Leo after all of Leo's historical splits are confirmed; history remains readable.
5. Block removing Leo when Leo owes an open/requested/marked-paid split.
6. Block removing Leo when Leo paid an expense and another person still owes Leo.
7. Block removal even when Leo's derived net balance is zero but two unresolved obligations offset one another.
8. Reject duplicate member add.
9. Reject empty group name.
10. Reject self-removal in this slice.

## Quality status

Required gate: G2 local-flow evidence.

Implementation and tests are **WRITTEN / NOT EXECUTED HERE**. Codex/local runtime still needs to run typecheck, `groupSafety.test.ts`, broader state tests, production build, and mobile flow before this becomes `DONE`.
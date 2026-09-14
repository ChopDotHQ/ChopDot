# Journey 26 — Group Lifecycle V1 Edge Cases

Status: candidate contract for review; no Golden authority is created by this file.

## Permission and ownership

### Permission changes during a flow
If an owner opens rename/config/archive/transfer/delete and loses owner authority before effect, the stale review cannot complete. Show `permission-changed`, preserve the user's intended action as context, refresh role truth, and return to the member-safe settings surface.

### Owner tries to leave
An owner cannot leave while still owner. Route to `leave-owner-blocked`, explain that ownership must move first, and offer the Journey 26 transfer flow when an eligible active member exists. Do not silently promote another member.

### Sole owner / no eligible successor
Do not invent a successor. The person can keep the group, archive it, or—only after the conservative delete prerequisites are true—delete it. Roster changes stay with Journey 09.

### Ownership transfer recipient changes
If the selected recipient is removed, becomes ineligible, or the roster/version changes before effect, invalidate the stale transfer review and return to a fresh eligible-member review. Display names alone are not authority.

## Money and historical truth

### Open items when leaving
Any unresolved/open item involving the current member blocks leave. A zero-looking net produced by opposing unsettled items is insufficient. Route to the existing money/issue owner. J26 never edits, forgives, nets, or settles the ledger to make leave eligible.

### Open items when deleting
Any open/unresolved group item blocks delete, even if the current owner is the only active member. Deletion is not a settlement shortcut.

### Archive with outstanding positions
Archive may proceed because it is organization state, not financial completion. Outstanding positions/history remain readable and owned by their existing journeys. Copy must not say the group is “finished,” “settled,” or “closed” merely because it is archived.

### Rename/configuration effects on history
Rename changes current display identity only. Future-default currency changes only future entry defaults. Neither operation rewrites historical expense titles, amounts, currencies, balances, settlement history, export records, or payment evidence.

## Concurrency and stale data

### Concurrent rename/config change
If source version changes between edit/review and effect, reject stale acceptance. Show the newly observed fact and require a new review.

### Concurrent archive/unarchive
Do not toggle blindly. Reconcile the exact operation identity and resulting lifecycle status. If another actor already established the requested status, reuse that truth rather than applying a duplicate inverse transition.

### Concurrent ownership transfer
Unknown or conflicting owner truth blocks leave/delete/transfer until reconciled. Never show two owners because of a fixture race.

### Stale cached settings
Cached/offline settings may be read, but write CTAs are unavailable until fresh role/version truth returns. Cached owner role never authorizes a mutation.

## Rename

### Empty, whitespace, or unchanged name
Empty/whitespace is invalid. An unchanged name produces no write; return to settings with no-effect copy rather than a fake success.

### Very long name
Input may wrap/clip in fixture, but required actions and current/next fact must stay readable at both canonical viewports. The candidate should constrain the accepted display length rather than create horizontal overflow.

### Unknown rename result
Block duplicate save. Reconcile the original operation. If accepted, show the accepted name. If verified no-effect, expose safe retry of the same logical operation. If still unknowable, hand off to J28.

## Future default currency configuration

### Existing mixed/history currency
Changing the future default does not convert old records or claim a unified balance. The review and success state repeat this constraint.

### Unsupported currency/default disappears
Fail before effect or invalidate stale review. Do not substitute another currency silently.

### Unknown config result
Reconcile exact operation before retry; current default remains unknown until observed.

## Archive / unarchive

### Cancel before archive effect
Return to archive review/settings with neutral cancelled/no-effect treatment. Do not use verified-success styling.

### Archive write known failure
Group remains active. Explain what remains true and allow retry only because no effect is verified.

### Archive unknown result
Do not show active or archived as fact until reconciliation. Retry is blocked.

### Archived group actions
New expense/invite creation is unavailable in J26's archived fixture. History/outstanding positions remain accessible through their owners. Rename/config/transfer are not offered from archived state in V1; unarchive first, except deletion prerequisites which intentionally require archived state.

### Unarchive unknown result
Reconcile exact operation; never bounce to active settings based on intent alone.

## Ownership transfer

### Transfer cancelled
Owner remains owner; neutral no-effect state.

### Transfer known failure / unknown result
Known failure keeps current owner and may retry. Unknown blocks any leave/delete action until reconciled. Verified transfer makes prior owner a regular member and does not mutate balances/history/preferences.

## Leave

### Member cancels
Membership remains and the group remains accessible. Neutral cancelled treatment.

### Known failure
Membership remains; retry is allowed because no effect is verified.

### Unknown result
Do not expose group-sensitive content based on stale assumptions after the user leaves the pending screen. Reconcile first. If leave is verified, route to Home boundary; if no effect, restore member settings.

### Back after verified leave
Do not re-expose the group via browser/hash Back in the fixture. Verified leave exits to Home owner boundary.

## Delete

### Group is active
Delete requires archived state. Route back to archive review; do not offer a one-click archive+delete composite.

### Other active members remain
Delete is blocked and routes to Journey 09 Manage People. J26 does not remove members as a side effect.

### Open items remain
Delete is blocked and routes to money/issue resolution. J26 does not clear them.

### Typed name mismatch
No effect button. The screen says exactly what must match without leaking secret material.

### Cancel at typed or final review
Return to archived settings with neutral no-effect status. No deletion attempt exists.

### Known failure
Archived group remains. Safe retry is allowed only after verified no effect.

### Unknown deletion outcome
Presence/absence of the group is not guessed. Reconcile the exact delete operation. If accepted, route to verified deleted/Home; if no effect, allow exact safe retry; if unresolved, J28 owns recovery.

### External copies and erasure claims
Verified delete is scoped to this ChopDot working state only. Do not claim deletion from exports, backups, other people's independently controlled copies, payment providers, or chain history.

## Loading / unavailable / recovery

### Group disappeared or access revoked during refresh
Show unavailable and route outward; do not fall back to cached settings as if access still exists.

### Generic load failure
Retry only the read. No mutation is attempted.

### J28 recovery boundary
Use only when J26's exact-operation reconciliation cannot safely decide effect/no-effect. The boundary must carry group identity, operation type and logical operation identity without carrying secrets or creating new authority.

## Idempotency rule

Every write path follows:

`review → first effect → pending → {verified success | verified no effect | unknown}`

Only `verified no effect` can expose a write retry. `unknown` always reconciles first. Repeated clicks cannot rename/configure/archive/unarchive/transfer/leave/delete twice.

## Visual / copy edge rules

- pending uses progress, not success iconography;
- cancelled/no-effect is neutral and visually distinct from success;
- known failure uses failure treatment and says what remains true;
- unknown/reconciling uses warning treatment and blocks duplicate effect;
- destructive delete/leave confirmations use explicit danger hierarchy without making every settings row red;
- meaning never depends on color alone;
- required actions stay at least practical touch size and visible at `393×852` and `430×890`;
- `TYPO-01` remains deferred and no approved Golden typography is edited.

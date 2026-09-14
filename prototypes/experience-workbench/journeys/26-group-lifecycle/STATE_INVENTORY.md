# Journey 26 — Group Lifecycle V1 State Inventory

Status: candidate definition for review. Every material state below must be rendered at both canonical viewports and proven reachable by a truthful clicked caller path in exact-head QA. Boundary states are named owner/system handoffs, not implementations of adjacent journeys.

## Entry, role and freshness

| Code | State id | Truth / purpose |
|---|---|---|
| J26-S01 | `settings-entry-owner` | Group Settings caller with current user = owner. |
| J26-S02 | `settings-entry-member` | Group Settings caller with current user = regular member. |
| J26-S03 | `settings-loading` | Current role/version facts are loading; no lifecycle write available. |
| J26-S04 | `settings-offline` | Cached settings readable, writes disabled until fresh role/version truth exists. |
| J26-S05 | `settings-load-failed` | Fresh lifecycle facts could not be loaded; retry is read-only. |
| J26-S06 | `group-unavailable` | Group is no longer available to this user; stale Back must not re-expose it. |
| J26-S07 | `settings-overview-owner` | Owner overview: name, future default, archive, transfer, leave/delete prerequisites. |
| J26-S08 | `settings-overview-member` | Member overview: read-only group facts + leave; owner-only controls unavailable. |
| J26-S09 | `permission-changed` | Role changed while screen was open; stale owner action invalidated. |
| J26-S10 | `stale-settings` | Group version changed; refresh required before write review. |

## Rename

| Code | State id | Truth / purpose |
|---|---|---|
| J26-S11 | `rename-edit` | Owner edits display name; stable group identity/history unchanged. |
| J26-S12 | `rename-invalid` | Empty/whitespace name rejected before review/effect. |
| J26-S13 | `rename-review` | Exact old/new name + current group version shown before first effect. |
| J26-S14 | `rename-saving` | Rename operation submitted; duplicate write disabled. |
| J26-S15 | `rename-cancelled` | User cancelled before first effect; group unchanged. |
| J26-S16 | `rename-failed` | Known pre-acceptance failure; exact operation verified not accepted. |
| J26-S17 | `rename-unknown` | Result unknown; do not retry blindly. |
| J26-S18 | `rename-reconciling` | Exact rename operation status being checked. |
| J26-S19 | `rename-no-effect-retry` | Reconciliation proves no effect; same logical operation may retry safely. |
| J26-S20 | `rename-success` | Verified accepted rename; history/balances unchanged. |
| J26-S21 | `rename-conflict` | Concurrent rename/version change invalidated stale review. |

## Configuration — future expense default currency only

| Code | State id | Truth / purpose |
|---|---|---|
| J26-S22 | `config-edit` | Owner chooses default currency for **future** expense entry. |
| J26-S23 | `config-review` | Old/new default and no-retroactive-conversion rule shown. |
| J26-S24 | `config-saving` | Stable config operation pending; duplicate write disabled. |
| J26-S25 | `config-failed` | Known pre-acceptance failure; current default remains true. |
| J26-S26 | `config-unknown` | Result unknown; current default not guessed. |
| J26-S27 | `config-reconciling` | Exact config operation status being checked. |
| J26-S28 | `config-no-effect-retry` | Verified no effect; safe retry offered. |
| J26-S29 | `config-success` | New future default verified; old expenses/balances not recalculated. |
| J26-S30 | `config-stale` | Group/default version changed since review; refresh required. |
| J26-S31 | `config-cancelled` | Cancelled before first effect; no default changed. |

## Archive / unarchive

| Code | State id | Truth / purpose |
|---|---|---|
| J26-S32 | `archive-review` | Owner sees exact archive impact: hidden from active list, no new expenses/invites, history/positions retained. |
| J26-S33 | `archive-confirm` | Separate explicit confirmation before archive effect. |
| J26-S34 | `archiving` | Archive operation pending; duplicate effect disabled. |
| J26-S35 | `archive-cancelled` | Cancelled before first effect; group remains active. |
| J26-S36 | `archive-failed` | Known no-effect failure; group remains active. |
| J26-S37 | `archive-unknown` | Archive outcome unknown; active/archived truth not guessed. |
| J26-S38 | `archive-reconciling` | Exact archive operation status being checked. |
| J26-S39 | `archive-no-effect-retry` | Reconciliation proves group remained active; safe retry offered. |
| J26-S40 | `archived` | Archive verified; history and outstanding positions remain, new expense/invite creation disabled. |
| J26-S41 | `unarchive-review` | Owner reviews restoring active-group status; history remains unchanged. |
| J26-S42 | `unarchiving` | Unarchive pending; duplicate operation disabled. |
| J26-S43 | `unarchive-unknown` | Restore-active outcome unknown. |
| J26-S44 | `unarchive-reconciling` | Exact unarchive operation status being checked. |
| J26-S45 | `active-restored` | Active status verified restored; no historical rewrite. |
| J26-S76 | `unarchive-failed` | Verified no-effect restore failure; group remains archived and safe retry is allowed. |
| J26-S77 | `unarchive-cancelled` | Restore cancelled before first effect; group remains archived. |

## Ownership transfer

| Code | State id | Truth / purpose |
|---|---|---|
| J26-S46 | `transfer-review` | Owner sees eligible active member and exact role change; member management remains J09. |
| J26-S47 | `transfer-confirm` | Explicit transfer confirmation; balances/history/preferences unchanged. |
| J26-S48 | `transfer-saving` | Stable ownership-transfer operation pending. |
| J26-S49 | `transfer-failed` | Known no-effect transfer failure; current owner unchanged. |
| J26-S50 | `transfer-unknown` | Transfer outcome unknown; owner identity not guessed. |
| J26-S51 | `transfer-reconciling` | Exact transfer operation status being checked. |
| J26-S52 | `transfer-success` | New owner verified; current user becomes regular member. |
| J26-S78 | `transfer-cancelled` | Transfer cancelled before first effect; owner remains unchanged. |

## Leave

| Code | State id | Truth / purpose |
|---|---|---|
| J26-S53 | `leave-review` | Regular member reviews leave impact and current open-item eligibility. |
| J26-S54 | `leave-blocked-open-items` | Open/unresolved items block leave; ledger is not edited to bypass block. |
| J26-S55 | `leave-owner-blocked` | Current owner cannot leave while still owner; transfer required first. |
| J26-S56 | `leave-confirm` | Eligible member explicitly confirms loss of future group access. |
| J26-S57 | `leaving` | Stable leave operation pending; duplicate leave disabled. |
| J26-S58 | `leave-cancelled` | Cancelled before first effect; membership remains. |
| J26-S59 | `leave-failed` | Known no-effect leave failure; membership remains. |
| J26-S60 | `leave-unknown` | Leave outcome unknown; access state not guessed. |
| J26-S61 | `leave-reconciling` | Exact leave operation status being checked. |
| J26-S62 | `left-group` | Leave verified; future access removed, historical attribution/ledger facts unchanged. |

## Delete

| Code | State id | Truth / purpose |
|---|---|---|
| J26-S63 | `delete-review` | Owner sees deletion scope and prerequisites; delete is not broad external erasure. |
| J26-S64 | `delete-blocked-active-members` | Other active members remain; J09 owns membership changes. |
| J26-S65 | `delete-blocked-open-items` | Open/unresolved items remain; money/issue owner must resolve them. |
| J26-S66 | `delete-type-confirm` | User must type the exact group name before final review. |
| J26-S67 | `delete-mismatch` | Typed name does not match; delete unavailable. |
| J26-S68 | `delete-final-review` | Exact irreversible in-product effect summarized before first effect. |
| J26-S69 | `deleting` | Stable delete operation pending; duplicate delete disabled. |
| J26-S70 | `delete-cancelled` | Cancelled before first effect; archived group remains. |
| J26-S71 | `delete-failed` | Known no-effect failure; group remains archived. |
| J26-S72 | `delete-unknown` | Delete outcome unknown; presence/absence not guessed. |
| J26-S73 | `delete-reconciling` | Exact delete operation status being checked. |
| J26-S74 | `delete-no-effect-retry` | Reconciliation proves no effect; safe retry available. |
| J26-S75 | `deleted` | Delete verified for this ChopDot working state; external copies/history owners are not claimed erased. |

## Named owner/system boundaries

| Code | State id | Owner |
|---|---|---|
| J26-B01 | `group-home-boundary` | Journey 08 — Group Home caller / normal return. |
| J26-B02 | `manage-people-boundary` | Journey 09 — roster/member management needed for transfer/delete prerequisites. |
| J26-B03 | `money-resolution-boundary` | Existing settlement/issue owner resolves open items; J26 cannot mutate ledger facts. |
| J26-B04 | `home-boundary` | Home after verified leave/delete. |
| J26-B05 | `recovery-boundary` | Journey 28 — unresolved lifecycle operation truth after J26 reconciliation. |

## Caller-reachability rule

Exact QA starts only from `settings-entry-owner` or `settings-entry-member`. For each non-boundary state it must compute and click a real sequence of rendered controls from one of those entries. A state fails reachability if no such path exists or if any claimed edge is not rendered/clickable. Boundaries are separately classified and their handoff callers must also be clickable.

Direct hash loads are allowed only for exhaustive render/layout/screenshot checks; they do not count as reachability evidence.

## Durable facts checked across paths

- role (`owner` vs `member`) cannot silently widen;
- current group name/version survives review/recovery paths until a verified rename changes it;
- future-default currency changes never rewrite prior expense/balance facts;
- archive does not imply settlement or deletion;
- transfer success changes owner role only after verification;
- leave/delete blocks never clear money or membership facts locally;
- unknown results reconcile before retry;
- cancelled/no-effect states remain visually/copy-distinct from verified success;
- `TYPO-01` remains deferred.

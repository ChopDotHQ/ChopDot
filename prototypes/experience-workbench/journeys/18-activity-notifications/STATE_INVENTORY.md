# Journey 18 — State inventory

## Primary / filter states
- `activity` — default Activity tab, attention + recent activity
- `notifications` — unread notification delivery copies
- `notifications-read` — all delivery copies marked read while attention remains
- `filter-attention` — unresolved attention projection
- `filter-payments` — payment/request projection
- `filter-groups` — group/membership/savings projection

## Meaningful item detail states
- `payment-waiting`
- `request-received`
- `expense-review`
- `savings-confirmed`
- `payment-complete`
- `member-joined`
- `request-sent`
- `expense-updated`

## Recovery / privacy / edge states
- `stale-notification`
- `access-changed`
- `offline`
- `loading`
- `error`
- `empty-activity`
- `empty-notifications`
- `mixed-currency`
- `deduped-payment`

## Adjacent-journey previews
- `handoff-j12`
- `handoff-request`
- `handoff-j07`
- `handoff-j16`
- `handoff-j15`
- `handoff-j09`
- `handoff-j13`
- `handoff-j06`

## Navigation previews
- `pots`
- `people`
- `you`
- `add-preview`

## Workshop
- `demo`

Total: **36** hash-addressable prototype states. Adjacent and navigation previews are not claims that those complete journeys are implemented inside Journey 18.

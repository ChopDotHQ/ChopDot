# Journey 22 — QR Flows V1 State Inventory

Status: **definition complete enough for first candidate build; not-reviewed**. These states define J22 transport/resolution behavior only. Consequential membership, receiving-detail disclosure, payment authorization/execution and wallet states remain in their owning journeys.

## A. Scanner lifecycle

| ID | State | Required behavior |
| --- | --- | --- |
| J22-S01 | Scanner entry | Preserve caller/return context; explain that scanning identifies a supported ChopDot target and does not act by itself. |
| J22-S02 | Camera permission requested | Ask only for camera access needed to scan; do not imply account/payment permission. |
| J22-S03 | Camera permission denied | No fake camera view. Offer retry permission or safe return; caller context remains intact. |
| J22-S04 | Camera unavailable | Explain that this device/browser cannot scan now; offer safe return and any supported non-camera re-entry owned by the caller. |
| J22-S05 | Scanner ready | Camera/scanner frame ready; Cancel remains reachable. No target/action is assumed. |
| J22-S06 | Code detected / reading | Freeze or debounce repeated reads while the exact payload is being classified. No handoff yet. |
| J22-S07 | Resolving reference | Show neutral progress while current type/status/access are checked. Do not expose stale cached success as current truth. |
| J22-S08 | Resolution network error | Explain that the code was read but could not be checked; Retry reuses the same payload/caller context, or Rescan/Return. |
| J22-S09 | Offline after read | Preserve the scanned reference locally only as needed for retry; do not claim current invite/share/access status. |
| J22-S10 | Duplicate scan suppressed | Same code read again during active resolution/handoff does not create another action; keep one deterministic path. |

## B. Recognized ChopDot targets

| ID | State | Required behavior |
| --- | --- | --- |
| J22-S11 | Person recognized | Minimal identity preview plus `View person`; no balances, raw payment details or wallet state. Continue hands to J09. |
| J22-S12 | Own person code recognized | Say it is your own ChopDot code; offer return/show-my-code, not a fabricated another-person detail. |
| J22-S13 | Person unavailable / access changed | Do not reuse prior identity detail if resolution says it is unavailable; safe return/rescan. |
| J22-S14 | Group invite recognized | Show only J04-permitted pre-join context and `Continue to invite`; never auto-join. |
| J22-S15 | Invite already joined | Explain current membership truth and hand to the appropriate group/return path owned by J04; do not offer a second join. |
| J22-S16 | Invite expired/revoked | No join action. Explain that the invite is no longer usable and offer return/rescan. |
| J22-S17 | Private receive/share recognized | Minimal owner/share status; raw destination stays hidden until J14 authenticates the intended audience and current destination version. |
| J22-S18 | Receive/share expired/stopped/stale | No receiving-detail disclosure. Explain that a new share/review is needed through J14. |
| J22-S19 | Receive/share wrong audience | Possession of the QR does not grant access; show non-sensitive mismatch and safe exit. |
| J22-S20 | Settlement-matched receive/share | Preserve exact settlement scope; hand the recognized share to J14/J11 for their own revalidation and review. J22 itself cannot pay. |
| J22-S21 | Settlement context mismatch | Recipient/currency/asset/destination/network or caller context does not match. Block shortcut; return/rescan without substitution. |

## C. Invalid / unsupported input

| ID | State | Required behavior |
| --- | --- | --- |
| J22-S22 | Unreadable / malformed QR | Plain failure, no routing. Offer Rescan or Return. |
| J22-S23 | Unsupported ChopDot type | A syntactically valid ChopDot reference uses a target type not supported in V1; do not guess its owner. |
| J22-S24 | Unsupported version | Explain that this code version cannot be opened safely; no downgrade/guessing. |
| J22-S25 | External URL/text payload | Never auto-open arbitrary external content. Treat as unsupported/inert with safe return. |
| J22-S26 | Sensitive/raw-data payload rejected | If payload shape exposes secrets or unsupported raw payment data, do not promote it into a ChopDot action or echo sensitive content into the UI. |

## D. Code display / sharing transport

| ID | State | Required behavior |
| --- | --- | --- |
| J22-S27 | My person QR | Render only an opaque own-person identity reference. Copy/share language must not imply payment destination or public profile permission. |
| J22-S28 | Existing invite QR displayed | Render the invite reference supplied by J04; J22 does not create/extend the invite or change audience/status. |
| J22-S29 | Existing receive/share QR displayed | Render only an accepted private-share reference supplied by J14; never raw receiving fields. |
| J22-S30 | Displayed code became expired/revoked | On current-status refresh/resolution, show stopped/expired truth; Back cannot revive it. |
| J22-S31 | Display loading | Neutral loading state before the safe reference is available; never show placeholder data as a usable code. |
| J22-S32 | Display/load error | Explain code could not be prepared/read; retry or return without creating a new invite/share/payment object. |

## E. Continuity / recovery

| ID | State | Required behavior |
| --- | --- | --- |
| J22-S33 | Cancelled before scan | Return to the exact caller with no mutation. |
| J22-S34 | Cancelled after recognition | Discard the handoff attempt only; do not cancel the underlying invite/share/settlement. |
| J22-S35 | Session/access changed after recognition | Re-resolve before continue; stale preview cannot be used as authority. |
| J22-S36 | Return from owner journey | Restore the original caller/scan context where useful without converting owner-journey cancellation/failure into success. |
| J22-S37 | Rescan | Clear only transient scan/result UI and keep caller scope; do not duplicate or retry an owner-domain action. |
| J22-S38 | Initial journey loading | Show shell/loading honestly; scanner/code target is not assumed before required local context is ready. |
| J22-S39 | Initial journey load error | No scanner-success or code-success implication; retry load or return safely. |

## State boundary rules

- Reading pixels, parsing a payload, resolving a reference, previewing a target and completing an owner-journey action are separate events.
- J22 never owns `joined`, `payment authorized`, `payment submitted`, `payment final`, `share created`, `destination disclosed`, `wallet connected` or `wallet signed` as success states.
- A target-specific owner journey may have richer pending/unknown/failure states. J22 preserves and returns their result/context rather than duplicating them.
- Material candidate evidence must render every J22-owned state that is relevant to the implemented paths at 393×852 and 430×890; states delegated to approved Goldens should be tested as boundary handoffs rather than copied screens.

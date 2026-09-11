# Journey 22 — QR Flows V1 Edge Cases

Status: **definition-stage contract; not-reviewed**. J22 fails closed when target, access or caller context is uncertain. A scan/display event never proves a domain action succeeded.

| ID | Edge case | V1 behavior / invariant |
| --- | --- | --- |
| J22-E01 | QR cannot be decoded | No route or guessed target. Offer Rescan / Return. |
| J22-E02 | Looks like ChopDot but type is unknown | Mark unsupported; do not infer invite/person/payment semantics from fields. |
| J22-E03 | Known type with unsupported payload version | Block with version-safe message; do not silently downgrade or parse as another type. |
| J22-E04 | Arbitrary external URL, deep link, text or app intent | Never auto-open/execute. Treat as inert unsupported content unless a future reviewed target type explicitly permits it. |
| J22-E05 | Payload appears to contain a secret or unexpected raw bank/wallet data | Reject as unsupported; avoid echoing the sensitive value into visible copy/log-style evidence. A ChopDot code should resolve an opaque reference instead. |
| J22-E06 | Invite expired/revoked between scan and Continue | Re-resolution/current status wins; no Join action. |
| J22-E07 | User already belongs to invite group | Do not join twice; route only through J04's current-membership behavior. |
| J22-E08 | Invite resolves for wrong account/session | Do not expose additional private group data or join. Require correct authenticated context through J04. |
| J22-E09 | Person code resolves to signed-in user | Identify as `You`; do not manufacture another-person balances/preferences. |
| J22-E10 | Person deleted/unavailable/access revoked after preview | Invalidate stale preview and block continue to old data. |
| J22-E11 | Private receive/share scanned by someone other than selected audience | Possession is not access. No raw destination details; safe non-sensitive exit. |
| J22-E12 | Private receive/share expired or stopped after QR was rendered | Current J14 status wins. Back/screenshot/cached QR cannot revive access. |
| J22-E13 | Receiving destination edited/removed after share created | Old destination version is stale per J14/J20; require new review/share rather than silently following the new details. |
| J22-E14 | Settlement caller recipient does not match scanned share owner | Block shortcut and preserve original settlement. Never replace recipient automatically. |
| J22-E15 | Settlement currency/asset is incompatible with scanned receiving method | Block; no conversion or method substitution. J11/J20 compatibility rules remain authoritative. |
| J22-E16 | Crypto receiving network does not match the destination required by the payment context | Block the receiving shortcut. This is destination compatibility, not wallet-session switching; J21 remains the wallet owner. |
| J22-E17 | Settlement amount/source scope changed while scanner open | Old caller review is stale; return to J11 for fresh exact review. J22 never carries an old amount as authority. |
| J22-E18 | Same QR is read repeatedly in camera frames | Debounce/suppress while active. At most one reference-resolution/handoff attempt exists. |
| J22-E19 | User scans same code again after Back | Re-resolve current status. Do not reuse a stale success or create a duplicate domain command. |
| J22-E20 | Camera permission denied | No coercive loop. Explain and allow retry/return. |
| J22-E21 | Camera permission revoked or camera becomes unavailable mid-scan | Stop scanning and show unavailable state; no phantom detected code. |
| J22-E22 | Offline before scan | Scanner may still read pixels, but opaque target is unresolved unless trustworthy local metadata is sufficient for a non-consequential preview. Never show join/payment/share success offline by inference. |
| J22-E23 | Network drops after code detection | Preserve exact payload/caller for Retry; do not trigger owner-domain action until resolution succeeds. |
| J22-E24 | Resolver timeout/unknown result | Stay unresolved/recovering. Retry checks the same reference; no alternate guessed route. |
| J22-E25 | Auth/session changes while resolving | Revalidate target access under the new session before Continue; stale authorized preview is not reusable. |
| J22-E26 | Cancel scanner from settlement/invite/receive context | Return to exact caller; cancellation does not cancel the underlying settlement/invite/share. |
| J22-E27 | Cancel after target preview | End only the QR handoff attempt. No owner-domain success/failure is fabricated. |
| J22-E28 | Displayed invite/private-share QR copied or screenshotted externally | J22 cannot recall the image. Security comes from opaque references plus owner-journey expiry/revocation/auth checks; code image possession is not access. |
| J22-E29 | My person QR is mistaken for a payment QR | Copy and preview language must call it a ChopDot identity/person code and avoid receiving/payment claims. |
| J22-E30 | Legacy production payment-request/quick-add QR encountered | V1 treats it as unsupported unless it maps to one of the three explicitly approved reference types. Historical implementation behavior does not create product authority. |
| J22-E31 | QR references a real provider payment code | J22 V1 does not execute or claim validation of provider payment QRs. It must not present provider-specific success or bypass J11 review. |
| J22-E32 | Resolver returns contradictory type or changed resource identity | Fail closed and require rescan/review; never continue under the old preview label. |
| J22-E33 | Initial J22 load fails | No scanner/code target is assumed. Retry load or return; preserve caller scope. |

## Recovery principles

- Retry means **re-resolve/re-read the same QR transport state**, not repeat a join/share/payment/wallet command.
- When an owning journey has a pending/unknown command, its recovery contract wins; J22 carries the user back to that journey rather than starting another action.
- Cancellation, Back and reload never convert pending/unknown/failed owner-domain work into success.
- No edge-case recovery may broaden audience, reveal raw payment details, change settlement scope, auto-connect a wallet or weaken a Golden boundary.

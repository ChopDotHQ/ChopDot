# Journey 14 — State and authority

No action in Journey 14 may emit PaymentIntentAuthorized, PaymentReceived, ReceiverConfirmed or SettlementClosed. No request/expense or mutable-balance write occurs.

| Internal state / outcome | Authority | Visible outcome / next action |
|---|---|---|
| Method selected | Current viewer, readable receiving destination | Details; no new share |
| Sharing reviewed | Owner; exact method, version, audience and context | Review sharing |
| SharingCreateRequested / pending | Owner action requests service acceptance | Preparing link |
| SharingCreateAccepted | Deterministic service result, correct command and scope | Ready; not delivered or paid |
| Unknown / recovering | Missing outcome; read-only query | Still checking; no execution retry |
| Verified not-saved | Service confirms non-acceptance | Same-command retry while review remains valid |
| SharingStopRequested / pending | Destination owner only | Stopping; do not assert stopped |
| SharingStopAccepted | Verified service result for exact record | Link stopped; preserve payload and financial data |
| Expired / stopped | Authoritative expiry or accepted stop | No future detail retrieval through link |
| Changed / unavailable | Version, identity, access or currency/network mismatch | Block old link; review again or safe exit |
| Clipboard write succeeded | Browser clipboard result | Demo details/link copied; not delivered |
| Clipboard blocked | Browser API rejection or unavailable | Select text or show code; no false copied claim |
| Share handoff returned / cancelled / failed | External handoff observation only (simulated here) | Return; delivery and payment not confirmed |
| Recipient detail retrieval | Matching authenticated audience plus current share/destination | Minimal receiving fields, optional exact amount; no source lineage leakage |
| Financial state | Journey 11/12 authorities, outside this journey | Unchanged by sharing, copying, expiry or stop |

Prototype data is synthetic and in-memory. Its service-result controls are testing fixtures, not a security boundary. Production repeats all authority and scope checks on the server; client route guards are insufficient by themselves.

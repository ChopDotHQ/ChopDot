## Decision history

**Coverage:** Journey 22 definition decisions recorded 2026-09-11 before candidate build from canonical J22 registry authority, the shared Design/Review contracts, adjacent Goldens J04/J09/J11/J14/J20/J21, and inspected current QR implementation evidence. These are proposed V1 definition decisions only; none grants human approval.

### J22-D01 — Initialize Journey 22 from the canonical registry

**Decision:** Journey 22 becomes the current definition-stage journey only after Journey 21 is checksum-locked as Golden #21.

**Why:** Preserve sequential authority and prevent candidate implementation from outrunning the approved Golden chain.

**Alternatives:** Starting QR implementation before the J21 freeze was not authorized.

**Tradeoffs:** Definition work starts later, but authority remains auditable and deterministic.

**Revisit when:** The canonical registry is explicitly revised or a separately authorized journey-order change is approved.

**Approval / version:** V1 process initialization — current / not-reviewed. J21 Golden #21 is the prerequisite; J22 remains unapproved.

**Sources:** [Journey registry](../../registry/journeys.json); [review protocol](../../REVIEW_PROTOCOL.md); [Journey 21 specification](../21-wallet-crypto/spec.md).

### J22-D02 — QR is typed transport, never domain authority

**Decision:** J22 may read/render a QR, classify a supported ChopDot reference, resolve its current state and offer an explicit handoff. The scan/display event itself never joins a group, grants receiving-detail access, authorizes or completes payment, changes a balance, or grants wallet authority.

**Why:** The shared contract requires controls to reflect actual authority, while adjacent Goldens already assign membership to J04, settlement authority to J11, receiving disclosure to J14, saved destinations to J20 and wallet execution to J21. Treating QR as transport preserves those boundaries.

**Alternatives:** A magic-scan model where QR contents directly mutate membership/payment state was rejected for V1 because it would bypass approved owner-journey review and consent boundaries. Current production Scan behavior is implementation evidence only.

**Tradeoffs:** Some QR tasks require one explicit preview/Continue step instead of instant action. The user gets a truthful checkpoint and the product retains one authority owner for each consequential action.

**Revisit when:** A future reviewed target type can prove that an atomic scan action preserves equivalent consent, exact scope and recovery without bypassing its owning journey.

**Approval / version:** V1 definition — proposed / not-reviewed. Recorded 2026-09-11 before candidate build; this entry does not grant approval.

**Sources:** [Design contract](../../DESIGN_CONTRACT.md); [Journey 04 specification](../04-invite-join/spec.md); [Journey 11 specification](../11-settle-up/spec.md); [Journey 14 specification](../14-receive-money/spec.md); [Journey 21 specification](../21-wallet-crypto/spec.md).

### J22-D03 — V1 recognizes person, group-invite and private receive-share references, then routes to the owning Golden

**Decision:** The first candidate supports three typed ChopDot reference families: person → J09, group invite → J04, and private receive/share → J14. J22 shows only a minimal typed preview and then hands off; it does not reproduce the owner journey's full screens or states.

**Why:** The canonical J22 goal/entry/exit points to identity, joining and receiving, and the registry's next journeys are J04, J09 and J14. Production also exposes My QR / Scan surfaces, but the Goldens define the safe product semantics those surfaces must route into.

**Alternatives:** Promoting legacy payment-request/quick-add QR behavior from production documentation directly into product truth was rejected because no current approved owner contract was found for those QR types. They remain unsupported until deliberately defined.

**Tradeoffs:** V1 supports fewer QR types than historical implementation ideas. In return, every recognized type has a clear owner, privacy boundary and return contract.

**Revisit when:** A current journey explicitly defines another QR-consumable reference and registry authority adds or approves its J22 handoff.

**Approval / version:** V1 definition — proposed / not-reviewed. Recorded 2026-09-11 before candidate build.

**Sources:** [Journey registry](../../registry/journeys.json); [Journey 04 specification](../04-invite-join/spec.md); [Journey 09 specification](../09-manage-people/spec.md); [Journey 14 specification](../14-receive-money/spec.md); [current MyQR implementation evidence](https://github.com/ChopDotHQ/ChopDot/blob/main/src/components/screens/MyQR.tsx); [current ScanQR implementation evidence](https://github.com/ChopDotHQ/ChopDot/blob/main/src/components/screens/ScanQR.tsx).

### J22-D04 — ChopDot QR payloads use opaque references and minimum-safe previews

**Decision:** J22 codes use versioned typed opaque references (or an equivalent safe identifier), not raw receiving credentials, wallet secrets, private expenses or arbitrary executable content. A private receive/share scan still requires J14's intended-audience authentication and current destination/share checks before any raw detail can appear.

**Why:** J14 already establishes that QR is an inert private-share reference and that link possession is not access. J20 keeps raw destination details out of broad directory views, and the Design Contract requires minimum sensitive information for the current task.

**Alternatives:** Embedding raw IBAN/phone/PayPal/address data as the default ChopDot QR payload and auto-opening arbitrary external URLs were rejected for V1. Provider-specific payment QR formats are not treated as validated ChopDot actions.

**Tradeoffs:** Opaque references generally require online resolution and cannot provide full offline disclosure. They allow expiry, revocation, audience checks and destination-version truth to remain enforceable after an image has been copied or screenshotted.

**Revisit when:** A future offline product requirement has a reviewed privacy/integrity model that can safely carry limited signed data without widening access or embedding secrets.

**Approval / version:** V1 definition — proposed / not-reviewed. Recorded 2026-09-11 before candidate build.

**Sources:** [Journey 14 specification](../14-receive-money/spec.md); [Journey 20 specification](../20-payment-methods/spec.md); [Design contract](../../DESIGN_CONTRACT.md).

### J22-D05 — Settlement-context QR preserves exact payment scope and fails closed on mismatch

**Decision:** When J22 is invoked from settlement, a recognized receiving-share reference is only a candidate handoff. The original payer/recipient/amount/currency-or-asset/source/method context remains authoritative under J11. Recipient, destination version, currency/asset or network incompatibility blocks the QR shortcut; J22 never substitutes values to make a scan fit.

**Why:** J11 owns exact payment scope and final review, J20 requires compatibility-scoped destinations, and J14 binds private shares to one destination version/audience. J21's account/network rules apply only when wallet execution is later invoked; J22 must not copy wallet-session semantics into scanning.

**Alternatives:** Replacing the settlement recipient/method/asset from whatever a scanned code contains, or treating a scan as payment authorization, were rejected because they would let transport override product authority.

**Tradeoffs:** A mismatched QR may require returning to settlement or rescanning rather than continuing. This prevents convenient-looking but incorrect payment substitutions.

**Revisit when:** Cross-journey testing shows a safe equivalence rule can be made explicit without changing J11/J14/J20 authority or hiding a material difference from the user.

**Approval / version:** V1 definition — proposed / not-reviewed. Recorded 2026-09-11 before candidate build.

**Sources:** [Journey 11 specification](../11-settle-up/spec.md); [Journey 14 specification](../14-receive-money/spec.md); [Journey 20 specification](../20-payment-methods/spec.md); [Journey 21 specification](../21-wallet-crypto/spec.md).

### J22-D06 — Permission, unknown/external content, offline resolution and duplicate scans recover without hidden action

**Decision:** Camera denial/unavailability, malformed or unsupported codes, arbitrary external payloads, offline/network failure, duplicate reads, cancellation and session/access changes remain explicit recoverable states. Unknown/external payloads never auto-open, and duplicate reads cannot create duplicate domain actions.

**Why:** The Design Contract requires pending/unavailable/offline/unknown states to be honest and retry to preserve context/idempotency. Current `ScanQR` is only a scanner UI, so production presence does not justify implicit routing or authority beyond what the V1 contract defines.

**Alternatives:** Automatically opening unknown URLs, silently treating network failure as a bad QR, or processing every camera frame as a new action were rejected because each can surprise the user or duplicate consequential work.

**Tradeoffs:** The scanner carries more explicit recovery states and may require a retry/rescan. It remains deterministic, testable and safe across unreliable camera/network conditions.

**Revisit when:** Browser/platform capabilities provide a reviewed safe external-target model or deterministic local verification sufficient to collapse a recovery state without weakening authority/privacy.

**Approval / version:** V1 definition — proposed / not-reviewed. Recorded 2026-09-11 before candidate build.

**Sources:** [Design contract](../../DESIGN_CONTRACT.md); [review protocol](../../REVIEW_PROTOCOL.md); [current ScanQR implementation evidence](https://github.com/ChopDotHQ/ChopDot/blob/main/src/components/screens/ScanQR.tsx); [current Scan quick-action implementation notes](https://github.com/ChopDotHQ/ChopDot/blob/main/src/docs/implementation/quick-actions.md).

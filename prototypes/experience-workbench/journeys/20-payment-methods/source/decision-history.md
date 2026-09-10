## Decision history

**Coverage:** Journey 20 starting decisions recorded 2026-09-10 before candidate build from the current registry, frozen adjacent-journey specifications, the payment compatibility contract, and inspected production payment-method screens. These decisions are not yet user-approved Journey 20 behavior; V1 is current / not-reviewed.

### J20-D01 — Saved destinations stay separate from payment execution and wallet authority

**Decision:** Journey 20 manages the user's saved payment/receiving destination records and their presentation settings. Journey 11 continues to own settlement review/authorization, Journey 14 continues to own private receiving-detail sharing, and Journey 21 continues to own wallet connection, signing and chain execution. A crypto record in Journey 20 may contain only a public receiving address, network and label; it is not a connected wallet session or signing authority.

**Why:** Frozen adjacent journeys already define those authority boundaries. The payment compatibility contract keeps card/bank/wallet execution and credentials outside ChopDot's product authority, while Journey 09 explicitly hands own-method editing to Journey 20 and treats another person's preference as read-only.

**Alternatives:** Combining saved methods, settlement execution, receiving-detail sharing and wallet connection into one Payment Methods journey was rejected because it would duplicate and weaken the already approved boundaries of Journeys 11, 14 and 21.

**Tradeoffs:** Some tasks require a clear handoff to another journey instead of being completed on the Payment Methods screen. In return, a saved destination cannot accidentally become payment authorization or a wallet secret store.

**Revisit when:** Cross-journey testing shows the handoffs create material confusion, or a future payment integration cannot preserve the same separation of saved destination, execution authority and wallet secrets.

**Approval / version:** V1 definition — current / not-reviewed. Recorded 2026-09-10 before candidate build. TYPO-01 remains deferred.

**Sources:** [Journey 09 specification](../../09-manage-people/spec.md); [Payment compatibility contract](../../11-settle-up/PAYMENT_AND_AGENTIC_COMPATIBILITY_CONTRACT.md); [Journey 14 specification](../../14-receive-money/spec.md); [current production PaymentMethods screen](https://github.com/ChopDotHQ/ChopDot/blob/main/src/components/screens/PaymentMethods.tsx).

### J20-D02 — Visibility means contextual availability, not directory-wide exposure

**Decision:** A saved method may be marked available for relevant payment/receiving handoffs, but raw receiving details are not browsable by everyone in a pot merely because the record exists. Other-person surfaces may show only the approved masked preference/context needed to begin settlement. Exact receiving details are disclosed only through the relevant authorized payment or Journey 14 sharing flow.

**Why:** Journey 09 already hides raw account numbers, phone numbers, keys and addresses when viewing another person. Journey 14 uses deliberately scoped receiving-detail access rather than public or group-wide sharing. Journey 20 must not bypass those privacy decisions.

**Alternatives:** Automatically exposing every saved payment detail to all shared-pot members, as suggested by older production copy, was rejected for the V1 product definition.

**Tradeoffs:** Paying someone may require one extra handoff before exact destination details appear. This keeps a convenience setting from becoming broad disclosure of bank, phone, PayPal or wallet identifiers.

**Revisit when:** User testing shows the contextual disclosure model prevents ordinary settlement completion, or a specific provider requires a different safe discovery mechanism.

**Approval / version:** V1 definition — current / not-reviewed. Recorded 2026-09-10 before candidate build.

**Sources:** [Journey 09 specification](../../09-manage-people/spec.md); [Journey 14 specification](../../14-receive-money/spec.md); [current production PaymentMethods screen](https://github.com/ChopDotHQ/ChopDot/blob/main/src/components/screens/PaymentMethods.tsx).

### J20-D03 — Preferred methods are compatibility-scoped suggestions, never global payment authority

**Decision:** A preferred method is only a suggestion among methods compatible with the current asset and context. It never authorizes payment, overrides exact settlement scope, converts currencies, or makes an incompatible method selectable. Journey 11 must revalidate the actual payment method at settlement time.

**Why:** Journey 09 already states that a displayed method is a fixture suggestion rather than authorization and that DOT never silently becomes TWINT. The current production model has one global preferredMethodId, which is too weak for exact asset/network behavior.

**Alternatives:** One global preferred method across all assets and payment contexts was rejected because it can imply that a CHF-oriented method is valid for DOT or that preference equals authorization.

**Tradeoffs:** Preference state is slightly more structured and may require separate suggestions for fiat and crypto contexts. The user gets fewer surprising defaults and no cross-asset shortcut.

**Revisit when:** The supported method set proves that one preference can remain unambiguous across every supported asset and provider, or user research shows the scoped model is unnecessarily complex.

**Approval / version:** V1 definition — current / not-reviewed. Recorded 2026-09-10 before candidate build.

**Sources:** [Journey 09 specification](../../09-manage-people/spec.md); [payment compatibility contract](../../11-settle-up/PAYMENT_AND_AGENTIC_COMPATIBILITY_CONTRACT.md); [current production PaymentMethods screen](https://github.com/ChopDotHQ/ChopDot/blob/main/src/components/screens/PaymentMethods.tsx).

### J20-D04 — Approve the exact reviewed V1 artifact as Golden #20

**Decision:** Freeze the exact Journey 20 V1 review artifact as Golden #20 without modifying its HTML, after complete mechanical/semantic evidence, independent direct inspection of all 118 rendered screenshots, and explicit Devinson approval. Advance only to Journey 21 Wallet & Crypto definition.

**Why:** The exact candidate passed 59-state deterministic/model/browser coverage, 118/118 layouts, 598/598 product interactions, privacy/secret checks and direct visual review. No blocking product, hierarchy, clipping, CTA, mobile-order or Golden-consistency defect remained.

**Alternatives:** Freezing before direct visual inspection, mutating the reviewed HTML during freeze, or beginning Journey 21 before explicit human approval were rejected because each would bypass the workbench review/authority contract.

**Tradeoffs:** The approved V1 retains non-blocking shared typography debt under TYPO-01 rather than reopening a reviewed journey. In return, the exact artifact remains reproducible and the next journey can inherit a stable payment-method boundary.

**Revisit when:** New user evidence or an explicitly authorized shared-system pass justifies a separately reviewed J20 version; never edit this Golden in place.

**Approval / version:** v1 — design-approved as Golden #20 on 2026-09-10. HTML SHA-256 `02620eb85888d2e7abac3fbd06e82b7e03e42caff2064cc259f59421864406ab`; HTML changes after approval are not authorized.

**Sources:** [J20 QA summary](../review-v1/QA_SUMMARY.json); [J20 visual QA](../review-v1/VISUAL_QA.md); [J20 human-approval checkpoint](../../../registry/checkpoints/2026-09-10-j20-v1-human-approved.json); [J20 approval record](../../../registry/approvals/20-v1.json).

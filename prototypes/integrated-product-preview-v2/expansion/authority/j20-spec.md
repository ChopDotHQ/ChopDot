# Journey 20 — Payment Methods

V1 · Design Approved · Golden #20. Prototype only; approved artifact is checksum-locked.

## Goal and route contract

**Goal:** Manage bank and crypto payment methods and visibility without turning a saved preference into payment authority.

**Entry:** You, settlement, receive/share, or person detail.

**Exit:** Previous context, settlement review, receive/share, or Wallet & Crypto when connection/signing is required.

Journey 20 owns the user's saved payment/receiving destination records, add/edit/remove, compatibility-scoped preference, and whether a method is available to an authorized payment handoff. It does not own payment execution or confirmation, private share creation, connected-wallet authority, or account/security settings.

## Adjacent ownership

- **Journey 09 — Manage People:** another person's payment preference is read-only and masked; no raw destination details are exposed there.
- **Journey 11 — Settle Up:** owns exact settlement scope, method revalidation, human review/authorization and payment handoff.
- **Journey 14 — Receive / Share Payment Details:** owns deliberate disclosure/copy/private-link behavior for receiving details.
- **Journey 21 — Wallet & Crypto:** owns wallet connection, switching, signing, chain execution and finality.
- **Journey 27 — Account & Preferences:** owns broader identity, notification, appearance, security and deletion settings.

## V1 method model

The first candidate should support the saved destination types already represented in the product without making those implementations permanent product truth:

- Bank transfer / CHF — account holder + IBAN + optional reference note.
- TWINT / CHF — Swiss phone number and/or supported handle.
- PayPal — email and/or username where supported.
- Crypto receiving destination — public address + exact network + optional label.

Cash is a settlement option but not a saved destination, so it does not need a Journey 20 record. A crypto receiving address is not a wallet session. No seed phrase, private key, signing credential, provider password or wallet secret may enter the Journey 20 domain.

## Main candidate path

**Payment methods overview → choose existing method or Add method → enter/edit destination → review exact details + visibility/preference impact → save → accepted state → return to the originating context.**

From settlement or receive/share, the return context must survive. Adding a method from a CHF settlement must not silently change the amount, recipient, source items or settlement authorization. Adding a receiving method from Journey 14 must not create or deliver a share by itself.

## Candidate policies

1. **Owner-only configuration.** Only the signed-in destination owner can create, edit, remove or change preference/availability for their method.
2. **Saved destination ≠ authority.** A method record can suggest where/how payment may occur. It never authorizes a transfer, confirms payment or modifies balances.
3. **Contextual visibility, not pot-wide disclosure.** Raw bank/phone/PayPal/address fields are not generally browsable by shared-pot members. Other-person views may show only masked preference/context. Exact details appear only through an authorized settlement or Journey 14 receive/share handoff.
4. **Compatibility-scoped preference.** Preferred means suggested among compatible methods for the current asset/context. A CHF preference cannot make itself valid for DOT; a network mismatch cannot be hidden by the same asset ticker. Journey 11 revalidates the actual method.
5. **Exact versioning.** Editing a destination creates a new destination version. Active shares/reviews bound to the old version become stale and require explicit re-review; they never silently point to the new details.
6. **Removal is not payment cancellation.** Removing a method stops future use/disclosure of that destination but does not cancel a request, reverse a payment, erase settlement history or change a balance. Historical records retain the method/version metadata they originally used without retaining secrets.
7. **No secrets in ChopDot payment-method data.** Public receiving identifiers may be stored as necessary. Provider/wallet credentials and signing secrets stay with the provider/wallet.
8. **Accepted save and readable record are distinct.** Save pending/unknown/failed states use recovery-before-retry. Repeated clicks cannot create duplicate destination records or apply the same destructive change twice.
9. **Validation is method-specific and honest.** The UI may normalize presentation, but must not claim an IBAN, phone, email/username, address or network is valid when only a superficial length check was performed. Production validation belongs to deterministic/provider-specific code rather than an LLM.
10. **No cross-asset conversion.** Payment-method selection never converts or aggregates CHF, DOT or another asset to make a method appear compatible.

## Information hierarchy for V1

The overview should answer four questions quickly:

1. What methods have I saved?
2. Which one is suggested for this compatible context?
3. Which methods are available when someone needs to pay me?
4. Is anything incomplete, stale or needs my attention?

Raw destination details should remain masked on the overview. Full values appear only when the owner opens/edit/reviews that specific method.

## Starting state inventory

Required before review: populated overview, empty state, method detail, add Bank, add TWINT, add PayPal, add crypto destination, edit, review-before-save, save pending, save accepted, save unknown/recovery, save failed, invalid field, duplicate method, set/unset preference, visibility/availability change, remove confirmation, remove pending/accepted/unknown/failed, old-share invalidated by edit/remove, incompatible asset/network handoff, offline cached read, offline write-blocked, access/session changed, loading and load error.

## Prototype constraints

The candidate remains standalone, synthetic and risk-free. No real IBAN, phone number, email, wallet address, provider account, payment, share, wallet session, database write or chain action is created. Demo values must be unmistakably synthetic. Boundary previews preserve context but do not redesign adjacent Golden journeys.

The canonical `Pots / People / raised Add / Activity / You` shell and inherited icon language remain unchanged. Journey 20 does not gain a new global tab. TYPO-01 remains deferred.

## Review focus

The V1 review should decide whether the overview feels calm rather than like a settings form; whether masked details + availability/preference are understandable; whether editing/removing clearly explains stale-share impact; and whether the separation between a saved crypto destination and a connected signing wallet is obvious without over-explaining infrastructure.

<!-- JOURNEY_DECISION_HISTORY:START -->
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
<!-- JOURNEY_DECISION_HISTORY:END -->

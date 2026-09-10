# Journey 20 — Payment Methods

V1 · Definition stage · Current. Prototype only; candidate not built yet.

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

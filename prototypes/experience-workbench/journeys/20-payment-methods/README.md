# Journey 20 — Payment Methods

Status: **Design Approved — Golden #20** on 2026-09-10. Exact reviewed V1 artifact is checksum-locked; HTML was unchanged during freeze.

Goal: manage your own saved receiving/payment destinations and their availability without turning a preference into payment authority.

Entry: You, settlement, receive/share, or person detail.

Exit: previous context or settlement/receive handoff.

## Boundaries

Journey 20 owns saved payment-destination records, add/edit/remove, compatibility-scoped preference, and whether a method is available for a relevant payment handoff.

It does **not** own settlement authorization/execution (Journey 11), private sharing of receiving details (Journey 14), wallet connection/signing/finality (Journey 21), or broader account/security settings (Journey 27).

The production code is implementation evidence, not product truth. Current production exposes Bank, TWINT, PayPal and crypto records; the V1 product contract below is intentionally stricter about privacy, authority, versioning and recovery.

TYPO-01 remains deferred.

# Normal pot, trip, and couple journey

**Kind:** decision
**Status:** active
**Owner:** product
**Last reviewed:** 2026-08-24
**Applies to:** `chopdot-v1-launch`
**Sources:** P-012, P-022, DC-001, DC-007

GIVEN Mina paid for a group, WHEN she scans or imports the receipt and reviews
the draft, THEN only her signed action creates the expense and exact splits.
Supported browsers may extract text on-device to prefill that draft. The image
is not uploaded by the extraction path, extracted fields are never accepted as
truth without review, and an unavailable or failed detector leaves the original
image-first draft open for manual correction.
Payment requests, payer claims, cleared evidence, receiver confirmation, and
group close remain separate events. Trip and couple presets change labels and
defaults, not authority.

# Spend Card journey

**Kind:** reference
**Status:** active
**Owner:** product
**Last reviewed:** 2026-08-24
**Applies to:** `chopdot-v1-launch`
**Authority:** scoped journey reference derived from Product Truth, current Cockpit decisions and contracts, ADRs, and exact mode evidence; it cannot make Spend Card the universal product entry
**Sources:** P-005, DC-004, production-entrypoint mode tests

GIVEN a transaction import, WHEN the cardholder matches a receipt and reviews amount,
currency, date, and group, THEN ChopDot creates a normal reviewed spend. A feed
never implies acceptance. Duplicate transactions, late receipts, mismatches,
refunds, and reversals remain visible immutable history. ChopDot does not issue
a card or hold funds in this release.

The production group opens on one action: **Add this card purchase**. The
cardholder then captures or imports a receipt locally, reviews the extracted or
manually corrected total, and signs `SPEND_RECEIPT_REVIEWED`. A match or
mismatch is computed from exact minor units. Only after review does **Split this
purchase** enter the ordinary expense, request, payment, receiver-confirmation,
and saved-record path. `SPEND_TRANSACTION_LINKED` then binds the reviewed card
transaction to that one canonical expense on the same signed frontier. The
expense must belong to the cardholder and exactly match the reviewed total and
currency; neither side of the link can be reused. Refund and full-remaining
reversal actions append to the same signed group history; transaction, receipt,
and adjustment references cannot be reused.

Before any share is settled, a refund or reversal creates a durable pending
correction and the cardholder applies its exact total to the linked canonical
expense. Group close and complete export remain blocked if that second signed
event has not succeeded. After a share is settled, ChopDot never rewrites its
payment or receiver-confirmation evidence. The refund or reversal instead
creates an immutable successor follow-up with an exact amount, reason, type,
external reference, and deterministic per-participant allocations. Every
affected participant signs the exact allocation after the external follow-up
is resolved. Until all required confirmations arrive, another adjustment and
group close remain blocked.

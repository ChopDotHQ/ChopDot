# Spend Card journey

GIVEN a transaction import, WHEN Mina matches a receipt and reviews amount,
currency, date, and group, THEN ChopDot creates a normal reviewed spend. A feed
never implies acceptance. Duplicate transactions, late receipts, mismatches,
refunds, and reversals remain visible immutable history. ChopDot does not issue
a card or hold funds in this release.

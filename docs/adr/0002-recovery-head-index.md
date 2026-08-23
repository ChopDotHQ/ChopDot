# ADR 0002: RecoveryHeadIndex is the sole custom contract

Status: accepted for public beta, 2026-08-23.

The contract records only owner, stream, sequence, and checkpoint digest with
compare-and-swap advancement. It deliberately has no admin, upgrade, delegate,
membership, money, custody, deletion, or external-call behavior. Encrypted
checkpoint content remains outside the contract and is independently verified.

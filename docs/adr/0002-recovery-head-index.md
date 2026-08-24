# ADR 0002: RecoveryHeadIndex is the sole custom contract

Status: accepted for public beta, 2026-08-23.

The contract records only owner, stream, sequence, and checkpoint digest with
compare-and-swap advancement. It deliberately has no admin, upgrade, delegate,
membership, money, custody, deletion, or external-call behavior. Encrypted
checkpoint content remains outside the contract and is independently verified.

The production UI keeps protection optional and states that Bulletin retention
is bounded. **Protect this group** publishes only for an active member whose
current account-bound envelope opens. **Recover this group** verifies the
checkpoint and signed event frontier, then atomically calls
`ProductionAuthority.importRecoveredEvents`; success is not shown before that
import commits. If the account is lost, recovery may still require another
participant's explicit social re-grant or an optional recovery kit.

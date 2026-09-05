# ADR 0002: RecoveryHeadIndex is the sole custom contract

**Kind:** decision
**Status:** active
**Owner:** architecture
**Last reviewed:** 2026-08-24
**Applies to:** chopdot-v1-launch
**Authority:** dated recovery architecture decision subordinate to product law and explicit supersession

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

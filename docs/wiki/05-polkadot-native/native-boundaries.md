# Native boundaries

**Kind:** decision
**Status:** active
**Owner:** native release
**Last reviewed:** 2026-08-24
**Applies to:** `chopdot-v1-launch`
**Sources:** DEC-003, DEC-005, ADR 0002, ADR 0003

Programme A publishes a usable immutable frontend. Programme B proves that
native rails reduce friction or increase trust without becoming product truth.
The same CAR must be staged on Products Devnet and promoted without rebuilding
to supported public-testnet surfaces.

`RecoveryHeadIndex` is the only custom contract. It records an owner-scoped
monotonic sequence and digest with optimistic concurrency. It has no admin,
upgrade, delegate, membership, money, custody, delete, or external-call surface.
Encrypted Bulletin blobs are bounded content availability; Statement Store is
only a wake-up hint.

Proof of Personhood/Humanity is an optional context-scoped anti-Sybil primitive,
not identity, contact proof, account ownership, membership, organizer authority,
or payment authority. It is not required for ordinary capture, group creation,
membership, or payment.

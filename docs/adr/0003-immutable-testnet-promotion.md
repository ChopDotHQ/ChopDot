# ADR 0003: Promote one immutable testnet artifact

Status: accepted for public beta, 2026-08-23.

Build once from a clean commit. Stage the resulting CAR on Products Devnet,
verify it, and promote the identical CAR to every supported public-testnet
surface. A source fix creates a new commit and CAR; promotion never rebuilds.
DotNS ownership is transferred only after live verification.

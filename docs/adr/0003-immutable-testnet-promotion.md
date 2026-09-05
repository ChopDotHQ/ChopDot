# ADR 0003: Promote one immutable testnet artifact

**Kind:** decision
**Status:** active
**Owner:** release-integrator
**Last reviewed:** 2026-08-24
**Applies to:** chopdot-v1-launch
**Authority:** dated release architecture decision; current blockers and release state determine eligibility

Build once from a clean commit. Stage the resulting CAR on Products Devnet,
verify it, and promote the identical CAR to every supported public-testnet
surface. A source fix creates a new commit and CAR; promotion never rebuilds.
DotNS ownership is transferred only after live verification.

The candidate frozen on 2026-08-24 is immutable and byte-reachable but not
promotion-eligible because live first-use acceptance failed. A repair requires
a new commit, CAR, and CID; this ADR does not authorize retrying the old bytes.

Post-freeze release tooling may be committed after the candidate only when it
attests the frozen candidate and the later clean tooling commit separately and
does not change the CAR. A public-testnet worker fallback must finish every
manifest write before handoff, then atomically reassign each executable
subname and restore its anchored resolver before transferring the base name.
Completion requires registrar base ownership, registry base ownership, and
every executable-subname owner to equal the user; a base-only transfer leaves
mutable worker authority and is rejected.

Because the pinned public testnet worker credential is shared, worker fallback
publication and handoff run as one uninterrupted command. Release dependencies
execute only from a fresh lockfile-installed snapshot after a built-ins-only
bootstrap proves an externally pinned tooling commit and ordered source
aggregate. Tracked inputs come from that exact Git commit; ignored candidate
artifacts are separately hash-verified after copy. DotNS mutations require
independently verified finalized transaction
evidence. Bulletin storage is reported separately as finalized immutable-CID
state plus exact gateway byte equality because the pinned storage API does not
surface finalized transaction receipts.

On retry after a lost acknowledgement, exact finalized authority and release
state may substitute for unavailable historical transaction attribution, but
the attestation must label that boundary and must not claim a recovered receipt.

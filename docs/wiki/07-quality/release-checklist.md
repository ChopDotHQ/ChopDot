# Release checklist

The candidate must independently prove: implemented, tested, committed, pushed,
candidate built, staged, promoted, reachable, user owned, user proven, and KG
known. Fixture-only tests cannot prove the release: Playwright must exercise
`src/main.tsx` across separate contexts, responsive sizes, offline/restart,
wrong actors, recovery, accessibility, privacy, and every named mode.

The current accepted local-source status and exact verification counts are
recorded in `docs/release/2026-08-24-local-release-assurance.md`. That record
sets implemented, locally tested, committed, and pushed independently from the
still-false candidate, stage, promotion, reachability, ownership, real-user,
and KG-recall booleans.

The embedded `release.json` binds the commit, tree, dependency and compiler
inputs, build ID, chain geneses, recovery-contract source/ABI/artifacts, and the
two deployed recovery-contract addresses. Deployment also requires a fresh
script-disabled `npm ci` outside the ChopDot ancestry and an exact aggregate of
every installed runtime dependency byte; the release and deploy log bind that
closure before a write. It cannot contain its own enclosing
CAR hash or CID without creating a circular build. A separately generated,
independently read-back promotion attestation binds those exact embedded bytes
to the CAR SHA-256, root/app CID, finalized update transactions, live owners,
and gateway byte hashes. Stage and public bytes must match. A maintenance CID
is the rollback target.

When an independently attested testnet worker is required, ownership proof is
triple rather than inferred: the registrar's base token owner, the registry's
base-node owner, and every executable-subname owner must all equal the explicit
user address. Subname reassignment must also restore and re-read the anchored
resolver without changing contenthash or manifest text before the base token
moves. The worker must retain no mutable node authority afterward.

A shared public testnet worker may be used only within one uninterrupted
publish-to-handoff command. The command must start from an externally pinned,
clean tooling commit and ordered source aggregate, install the lockfile into a
fresh isolated runtime, and use an environment allowlist. Distinguish finalized
DotNS transaction proof from Bulletin's narrower finalized-CID plus immutable
gateway-byte proof; do not call the latter transaction attribution.
When a retry observes an already-landed write, record exact finalized state as
the retry boundary and do not imply a historical transaction receipt.

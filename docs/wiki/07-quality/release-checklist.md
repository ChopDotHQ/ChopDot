# Release checklist

The candidate must independently prove: implemented, tested, committed, pushed,
candidate built, staged, promoted, reachable, user owned, user proven, and KG
known. Fixture-only tests cannot prove the release: Playwright must exercise
`src/main.tsx` across separate contexts, responsive sizes, offline/restart,
wrong actors, recovery, accessibility, privacy, and every named mode.

The release manifest binds commit, tree, dependency versions, build ID, CAR
SHA-256, root/app CID, chain geneses, and recovery-contract addresses. Stage and
public bytes must match. A maintenance CID is the rollback target.

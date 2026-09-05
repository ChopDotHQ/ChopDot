# Live first-use findings — frozen public candidate

**Kind:** measurement
**Status:** active release blocker
**Owner:** product assurance
**Observed:** 2026-08-24
**Applies to:** public candidate `chopdot-cd61093b2af1-68ce7c04192f`
**Sources:** user-observed live screen, deployed release identity, exact source
comparison, independent read-only UI review

## Release identity

- URL: `https://chopdotapp01.dot.li/?chainBackend=rpc-gateway`
- Commit: `cd61093b2af158ca1ba08f26c84c732f30007d4d`
- Tree: `3b4b2807ed02880fdc3fea060f576548fcdc1dcb`
- Build ID: `chopdot-cd61093b2af1-68ce7c04192f`
- CAR SHA-256: `b9fa8263b7f83c05a32547803078db1bbb47c232c5fc8d07b4f8f5657a34a6ae`
- Outer CAR CID: `bafybeifuwlobydydh2ezprm57qix6s6xwnm47fy3u6zvsnghd27i6cdztq`
- Inner app CID: `bafybeiejtx4iarex7lfsl6azal3dwx4xgrsxliwvxh7u4pgcdaz66wfrrq`

## P0 — group creation cannot recover from guest state

The live UI allows a guest with a valid group name to invoke Create Group. The
later production account-authority boundary rejects the action and leaves the
user on the form with: `Use your Product Account before creating a shared
group.` The authority rule is correct; the UI presents the wrong action and no
visible guest-to-account recovery path.

Source boundary:

- `src/components/CreateGroup.tsx` gates the action on name, current user, and
  busy state rather than shared-account readiness.
- `src/environment/productionAccountAuthorityRuntime.ts` correctly rejects a
  shared group without account-bound group access.
- `src/App.tsx` hides the product account connection path after guest entry.
- `src/components/Profile.tsx` reports local guest state even after migration.

## P1 — empty Home is a dashboard

The empty Home repeats receipt capture, duplicates group creation, presents
seven equally weighted modes, and adds Profile plus bottom navigation. This
contradicts P-022's explicit `out: dashboard` boundary and prevents one next
action from being obvious.

## P2 — desktop presentation is forced into a phone frame

`src/App.tsx` constrains the product surface to 375 pixels on desktop, leaving
the public host visually underused and disconnected from the viewport.

## Release verdict

- implemented: partial
- tested: partial
- committed: true for the frozen source
- pushed: true for the frozen source
- candidate_built: true
- staged: storage bytes only; product acceptance failed
- promoted: false
- reachable: byte gateway true; usable first journey false
- user_owned: false
- user_proven: false
- kg_known: false for this live failure until exact-worktree refresh

The current candidate is ineligible for promotion. Repair source and freeze a
new immutable release; do not repoint or retry the same candidate as a product
fix.

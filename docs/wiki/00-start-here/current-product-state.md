# Current product state

**Kind:** measurement
**Status:** active
**Owner:** product assurance
**Last reviewed:** 2026-08-24
**Applies to:** `chopdot-v1-launch`
**Sources:** product cards, live first-use findings, release evidence

The public-beta train is active on `codex/chopdot-v1-launch`. The product loop
is Catch -> Management -> Payout -> History, with **Scan a receipt** as the
first action. Planning and local tests are not deployment evidence.

The frozen candidate `chopdot-cd61093b2af1-68ce7c04192f` is not eligible for
promotion after a live guest group-creation failure and overloaded empty-Home
finding. P-035 is the current next card. Repair source and freeze a new
candidate; do not treat a tooling retry as a product fix.

The release is complete only when implementation, production-entrypoint tests,
commit, push, immutable build, Devnet stage, byte-identical public promotion,
reachability, user ownership, real participant use, and exact-worktree KGv2
recall are each proved separately.

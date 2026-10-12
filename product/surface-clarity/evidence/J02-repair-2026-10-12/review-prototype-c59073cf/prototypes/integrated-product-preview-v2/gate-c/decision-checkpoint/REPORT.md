# Gate C implementation checkpoint

Status: **BLOCKED — source-group attribution product decision needed**.

User authorized J10 Overall Position → J11 Settle Up → J12 Complete Settlement as an integrated local prototype. The accepted Gate B base is `28775726dc06b1823e231d50b4d84080a07530fb`, tree `6923d6cd23e8f5136410b9fbdd2e1483f0970763`. This checkpoint is on an isolated Gate C branch; no normal checkout was reset or cleaned, and the accepted preview remains unchanged.

## Completed

- Verified the accepted Gate B commit/tree and Gate A ancestry (`8548313791e4ef7b436ee742cd18c1fa48d74eeb`).
- Recovered exact J10/J11/J12 Golden sources from frozen authority `4ba456e6595330e4ca8e21366e0d827f17e10881` into `../goldens`. J11/J12 supplied registry hashes match. J10's source hash is recorded without inventing a registry pin.
- Inspected frozen schema `5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013` (tree `ce5b82d008dfa2f48e714607e30fdb6839b8305c`), laws, composition, decisions, usage guide and certified task paths. No immutable tag or authority file was changed.
- Obtained a separate read-only source review from `/root/reconstruction_review`. Its scope, 19 source hashes, precise gap and 12 required implementation/recovery obligations are in `review/`. This is source review, not clearance of Gate C implementation.
- Executed `./run.sh` with Node.js v24.19.0: 19 source byte/blob checks and 10 focused source-model/arithmetic checks passed; exit 0. Results and exact command/exit log are included.
- Confirmed no tracked difference from accepted Gate B outside `gate-c/`. The Gate C additions are recovered authority copies, source evidence, the runnable decision example and checkpoint documentation.

## Blocker and proposed decision

`GC-SOURCE-PARTIAL-ATTRIBUTION-01`: Approved sources define the CHF 34.30 pair remainder after a CHF 20.00 partial confirmation, but do not uniquely define the recomputed group/item residuals. `DECISION.md` gives the exact example and a proposed offset/application rule for user consideration. It is explicitly unapproved. Do not silently implement it or reinterpret a successful source-model demonstration as policy approval.

This is a visible prototype accounting choice, not a request for production infrastructure. User decision can be recorded alongside Gate C without modifying frozen V1/Golden/C1 bytes.

## Remaining, not executed

Gate C runtime integration, canonical multi-group payment accounting, J10/J11/J12 browser interactions, continuity/recovery coverage, Gate A/B regressions on a resulting Gate C candidate, Golden comparison, implementation security/reconstruction reviews and an updated runnable preview. No Gate C acceptance or hosted run is claimed. Existing Gate B evidence remains specific to its accepted SHA; it is not transferred as a PASS for new Gate C code.

## Resume

1. Obtain the scoped source-application product decision in `DECISION.md`.
2. Record the decision separately; retain the frozen sources/hashes.
3. Continue from this checkpoint and accepted Gate B model. Integrate one canonical local state; do not substitute a second fixture store for outcomes.
4. Build/retest all approved Gate C paths, required recovery cases and Gate A/B regressions. Obtain separate read-only implementation review before user acceptance.
5. Publish the exact tested prototype version and evidence. Stop at Gate C user acceptance; do not start Gate D.

`run.sh` is portable and read-only. It needs Node.js 20+; it needs no credentials, dependency installation, git checkout or network access. It never changes normal worktrees. Exit 0 denotes successful execution of the source example only.

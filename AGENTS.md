# Agent instructions for ChopDot

Before changing ChopDot:

1. Resolve the exact branch, commit, worktree cleanliness, package locks, and
   intended PR base.
2. Read `PRODUCT_TRUTH.md`, `SUPERVISION.md`, and
   `governance/supervision-contract.json`.
3. Read the ADRs, investigations, tests, and evidence for every affected
   invariant ID.
4. Never merge a parallel branch wholesale merely because it is newer. Compare
   authority, product behavior, security, tests, and provenance slice by slice.
5. Never promote a state beyond its evidence. Simulator, exact-candidate,
   real-host, chain-finality, receiver-confirmation, live-user, and release proof
   are different.
6. Update the PR traceability, contract state/gaps/checks, and dated decision or
   investigation in the same change when they are affected.
7. Run the supervision gate before handoff. Run release enforcement only to
   make a real release decision; do not weaken thresholds to make it green.
8. Do not reintroduce an active Supabase dependency.

`PRODUCT_TRUTH.md` is product law. `SUPERVISION.md` is the operating protocol.
The JSON contract is the machine-enforced traceability ledger. Dated ADRs and
investigations explain change. Artifacts prove it.

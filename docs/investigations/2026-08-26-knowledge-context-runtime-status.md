# Knowledge Context runtime status — 2026-08-26

**Kind:** measurement
**Status:** open
**Owner:** agent-systems integrator
**Last reviewed:** 2026-08-26
**Applies to:** `chopdot-v1-launch`
**Authority:** adapter/runtime evidence only; never product, implementation, release, or knowledge truth

## Question

Can the current configured Knowledge Context backends durably record and recall
an accepted outcome from the exact launch worktree?

## Exact target at measurement

- root: `/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch`
- branch: `codex/chopdot-v1-launch`
- HEAD: `9e5326bd6f9e75e52c4c00f5a36f001cde598b64`
- tree: `b020f9b4f5b404024306dfbeac69bb85613b6eea`

These identities describe the measurement point, not the final candidate.

## Adapter results

| Adapter | Requested/active read path | Runtime | Fallback | Result | Boundary |
|---|---|---|---|---|---|
| exact-source | exact worktree | `node-esm` | `none` | conformance 4/4 | local deterministic baseline only |
| mock KGv3 | `memory://kgv3` | `memory` | `none` | conformance 4/4 | portability fixture only; not durable after process exit |
| KGv2 | `agentops://kgv2` | `agentops-bridge` | `unavailable` | health rejected: `client_unconfigured` | live backend not configured through the port |
| Repo Graph | default exact-worktree packet absent | `packet-adapter` | unknown until packet exists | not yet executed against a final exact-worktree packet | fixture conformance does not prove an operational graph packet |

## Existing machine-local bridge observation

The current machine-local file
`/Users/devinsonpena/ChopDot/.local-private/agentops/kg_context.json` was
inspected directly. It reports:

- `updated_at`: `2026-08-10T15:38:55+00:00`;
- `status`: `active`;
- repo root: `/Users/devinsonpena/ChopDot`;
- default next card: `P-032 One ChopDot recovery and convergence`;
- active card: `P-022`;
- source references from the canonical checkout and the separate
  `portable-shell-trial` worktree.

That file is not a Knowledge Context Port receipt, cites another checkout, and
predates the current work. It cannot establish `kg_adapter_verified=true` or
durable knowledge of this worktree's outcome.

## Decision

`knowledge_portable` may become true when core and fixture conformance stay
green. `kg_adapter_verified` and `repo_graph_adapter_verified` remain false
until an accepted clean final-candidate outcome is recorded and recalled by the
named live adapter with exact root, branch, commit, digest, and citations.

## Next bounded proof

1. finish and commit the agent-system candidate;
2. promote a valid independently reviewed outcome packet;
3. create or refresh an exact-worktree Repo Graph packet and run record/recall;
4. configure the real KGv2 client behind the port, or record the exact external
   blocker without substituting direct source inspection;
5. update this investigation with receipt IDs, backend versions, paths,
   citations, mismatches, and stale reasons.

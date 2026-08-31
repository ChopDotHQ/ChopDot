# Local feature-worktree context validation

**Kind:** guardrail
**Status:** active
**Owner:** agent-governance
**Last reviewed:** 2026-08-31
**Applies to:** `codex/chopdot-v1-launch`
**Authority:** local preflight instructions only; this does not change canonical
context or create governed acceptance

The canonical checkout remains the exact root and branch declared by
`product/context-authority.json`. Its normal commands are unchanged:

```bash
npm run context:validate
npm run product:validate
npm run product:query -- next
```

A reviewable local feature worktree may opt into bounded validation explicitly:

```bash
npm run context:validate -- --feature-worktree
npm run product:validate -- --feature-worktree
npm run product:query -- next --feature-worktree
```

The flag is never inferred. It succeeds only when Git proves that the checkout
is a registered, non-detached worktree of the same repository as the manifest
root and that the exact local
`refs/remotes/origin/<manifest branch>` commit is an ancestor of feature
`HEAD`. Missing, stale, cross-repository, detached, unregistered, or spoofed
context fails closed.

The command captures one observed feature snapshot and, immediately before a
success report, rereads the canonical target ref plus the feature `HEAD`,
branch, and complete short status. Any movement fails closed. Release-state KG
checks remain bound to the resolved canonical target commit, not to the
descendant feature commit, because cited canonical recall does not become stale
merely because a feature worktree is ahead of it.

A green result is bounded local preflight evidence. It is not canonical context,
not independent review, and not hosted governed acceptance.

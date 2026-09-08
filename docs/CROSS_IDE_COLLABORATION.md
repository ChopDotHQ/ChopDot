# Cross-IDE collaboration

Use the [contribution guide](../CONTRIBUTING.md) for the shared workflow.
This page adds optional Git worktree guidance; it does not introduce another
task system or require a specific editor or AI tool.

## Choose the correct base

Read the [branch/status notice](../README.md#which-version-am-i-looking-at)
and agree on the PR target. `main` is the public default, not proof that every
experiment or release candidate has been integrated or is ready to ship.

Before creating a task branch, inspect your checkout:

```sh
git status --short
git branch --show-current
git worktree list
```

Do not reset, switch or clean a dirty checkout just to match a workflow rule.
Preserve existing work and use a separate working directory when needed.

For a new task targeting `main`, an optional worktree workflow is:

```sh
git fetch origin main
git worktree add -b docs/short-description .worktrees/short-description origin/main
```

Use a distinct branch and path for your task. Replace the base only after
agreeing which branch the change belongs on. Worktrees share Git history and
refs but have separate checked-out files; a worktree is not a backup.

## Coordinate and hand off

- Use an issue or PR to name scope, base branch and overlapping work.
- Avoid two people editing the same active checkout.
- Keep one coherent change per PR; split preparatory changes when needed.
- Record branch/commit, files changed, commands, results and limitations.
- Keep personal memory, credentials and generated tool output local.
- Public instructions must work without private machine paths or maintainer-only
  task files. Optional tool notes cannot override source or PR state.

After a task lands, retire its clean working copy when no longer needed. Check
for uncommitted work and ignored local evidence first; never use force as a
routine cleanup shortcut. Retain or back up unique work before removing it.

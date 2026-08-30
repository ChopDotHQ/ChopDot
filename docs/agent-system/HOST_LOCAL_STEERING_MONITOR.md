# Host-local steering monitor

**Kind:** operating guardrail
**Status:** implemented but not installed
**Accountable owner:** ChopDot repository owner
**Execution owner:** this Mac's signed-in operator
**Authority:** read-only steering integrity checks; never product truth, product
priority, human approval, implementation proof, or release proof

## Why this exists

The GitHub schedule checks repository content in a clean hosted checkout. It
cannot see the machine-local ChopDot skills, ignored AgentOps context, or the
AutoBots ChopDot agent definitions declared by the steering registry. The
repo-owned launchd adapter closes only that observation gap: once explicitly
installed by the operator, this Mac runs the same strict steering monitor each
day at 07:17 local time and once when the launch agent loads.

The scheduled command uses `check` semantics through
`runSteeringMonitor(..., { requirePromoted: true })`. It never calls `build`,
never refreshes the catalog or health read model, and never changes registry,
skill, AgentOps, AutoBots, Product Cockpit, or knowledge sources to make a check
pass.

## Outcome contract

- **Expected outcome:** once installed, one exact launchd service runs a strict,
  read-only check against this exact worktree and records the current external
  identity, availability, lifecycle, and digest verdict every day.
- **Proving evidence:** `agent:steering:schedule:status` reports `active`, the
  installed plist byte-for-byte matches the repo-rendered definition, launchd
  reports the worktree-specific label loaded, and `latest.json` contains the
  exact worktree root plus a `pass`, `degraded`, or `blocked` monitor verdict.
- **Failure or blocker:** missing/moved worktree, scheduler/root mismatch,
  changed plist, missing pinned Node runtime, unavailable launchd, changed
  external digest, stale generated read model, or any other strict monitor
  drift fails closed. The error remains in the deterministic stderr log; no
  governance source is repaired automatically.
- **Owner:** the repository owner approves installation and registry lifecycle
  changes. The local operator owns launchd availability and may uninstall the
  adapter. The monitor cannot approve its own findings.
- **Retry and exit:** repair or explicitly reclassify the named source through
  normal reviewed repository work, rebuild generated read models only when the
  source change is intentional, rerun the strict check, then let launchd retry
  at its next load/day. Uninstall exits local scheduling and preserves the last
  reports for diagnosis.

## Exact paths and identity

The installer derives a 12-character SHA-256 suffix from the real exact
worktree path. That suffix prevents two ChopDot worktrees from sharing a
service or report directory.

For the current launch worktree, installation is rooted at:

```text
/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch
```

The rendered plist contains:

- the exact real worktree root as `WorkingDirectory` and `--root`;
- the exact Node executable used during installation;
- the scheduler file inside that worktree;
- strict `--require-promoted` checking; and
- deterministic host-local report and log paths.

Paths follow this layout, where `<root-hash>` is derived from the exact root:

```text
~/Library/LaunchAgents/dev.chopdot.steering-surfaces.<root-hash>.plist
~/Library/Logs/ChopDot/steering-surfaces/<root-hash>/latest.json
~/Library/Logs/ChopDot/steering-surfaces/<root-hash>/stdout.log
~/Library/Logs/ChopDot/steering-surfaces/<root-hash>/stderr.log
```

`latest.json` is mode `0600`; its directory is `0700`. The plist is `0644` as
expected by launchd. Installation is idempotent when the installed plist
matches. A changed plist blocks replacement unless the operator explicitly
reviews the difference and supplies `--replace` to the underlying command.

## Operator commands

Run these only from the exact launch worktree:

```bash
npm run agent:steering:schedule:install
npm run agent:steering:schedule:status
npm run agent:steering:schedule:uninstall
```

`install` writes the worktree-specific plist and bootstraps it into the current
user's launchd domain. `status` is read-only and returns non-zero when the
service is absent, changed, or not loaded, or when its report is missing,
invalid, over 36 hours old, future-dated, or blocked. `uninstall` boots out only
that exact label and removes only its plist; reports and logs remain available.

The code also exposes `render` for a no-write plist review:

```bash
node scripts/agent-governance/steering-schedule.mjs render
```

For isolated tests, `--home=<temporary-directory> --no-launchctl` redirects all
support files away from the operator's Library and prevents service activation.
That flag is a test facility, not evidence that the real service is installed.

## Portability limits

- launchd installation is macOS-specific. Linux and hosted runners should use
  their native scheduler or the repository's GitHub scheduled workflow while
  preserving the same strict, read-only command and evidence contract.
- the plist intentionally pins the Node executable available at installation.
  If that runtime is removed or upgraded, reinstall after reviewing the new
  rendered plist.
- an external machine-local surface can disappear between checks. Its declared
  presence policy determines whether the monitor reports degraded or blocked;
  the scheduler does not weaken that policy.
- the scheduler proves observation happened on this Mac. It does not prove a
  product decision was correct, the app works, deployment succeeded, or a human
  accepted the release.

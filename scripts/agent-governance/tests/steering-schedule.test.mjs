import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  assertExactWorktree,
  installSchedule,
  inspectSchedule,
  launchAgentDefinition,
  renderLaunchAgent,
  runScheduledCheck,
  schedulePaths,
  uninstallSchedule,
} from '../steering-schedule.mjs';

const ROOT = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));

function fixtureHome(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-steering-schedule-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  return home;
}

function digest(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

test('renders a deterministic exact-worktree launchd definition', (t) => {
  const home = fixtureHome(t);
  const first = launchAgentDefinition({ root: ROOT, home });
  const second = launchAgentDefinition({ root: ROOT, home });
  const plist = renderLaunchAgent(first);

  assert.deepEqual(first, second);
  assert.equal(plist, renderLaunchAgent(second));
  assert.match(first.label, /^dev\.chopdot\.steering-surfaces\.[0-9a-f]{12}$/u);
  assert.ok(first.program_arguments.includes(`--root=${ROOT}`));
  assert.ok(first.program_arguments.includes('--require-promoted'));
  assert.equal(first.report, path.join(fs.realpathSync(home), 'Library/Logs/ChopDot/steering-surfaces', first.suffix, 'latest.json'));
  assert.match(plist, /<integer>7<\/integer>[\s\S]*<integer>17<\/integer>/u);
  assert.match(plist, /<key>RunAtLoad<\/key>\s*<true\/>/u);
});

test('install is idempotent and status is inspectable without launchctl', (t) => {
  const home = fixtureHome(t);
  const definition = launchAgentDefinition({ root: ROOT, home });

  const first = installSchedule(definition, { noLaunchctl: true });
  const before = digest(definition.plist);
  const second = installSchedule(definition, { noLaunchctl: true });
  const after = digest(definition.plist);

  assert.equal(first.state, 'configured-unverified');
  assert.equal(second.state, 'configured-unverified');
  assert.equal(before, after);
  assert.equal(fs.statSync(definition.plist).mode & 0o777, 0o644);
  assert.equal(inspectSchedule(definition, { noLaunchctl: true }).desired_plist_matches, true);
});

test('status does not create host support directories', (t) => {
  const home = fixtureHome(t);
  const definition = launchAgentDefinition({ root: ROOT, home });

  const result = inspectSchedule(definition, { noLaunchctl: true });

  assert.equal(result.state, 'inactive');
  assert.equal(fs.existsSync(path.join(home, 'Library')), false);
});

test('installer rejects a support-directory symlink that escapes the test home', (t) => {
  const home = fixtureHome(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-steering-schedule-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.symlinkSync(outside, path.join(home, 'Library'));
  const definition = launchAgentDefinition({ root: ROOT, home });

  assert.throws(
    () => installSchedule(definition, { noLaunchctl: true }),
    /escapes its home boundary/u,
  );
});

test('path mismatch fails closed', (t) => {
  const other = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-other-worktree-'));
  t.after(() => fs.rmSync(other, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q'], { cwd: other });

  assert.throws(
    () => assertExactWorktree(other, ROOT),
    /scheduler\/root mismatch/u,
  );
});

test('changed installed definition requires explicit replacement', (t) => {
  const home = fixtureHome(t);
  const definition = launchAgentDefinition({ root: ROOT, home });
  installSchedule(definition, { noLaunchctl: true });
  fs.appendFileSync(definition.plist, '<!-- unexpected local edit -->\n');

  assert.throws(
    () => installSchedule(definition, { noLaunchctl: true }),
    /rerun with --replace/u,
  );
  const replaced = installSchedule(definition, { noLaunchctl: true, replace: true });
  assert.equal(replaced.desired_plist_matches, true);
});

test('scheduled check writes only the host-local report', (t) => {
  const home = fixtureHome(t);
  const definition = launchAgentDefinition({ root: ROOT, home });
  // The catalog and health report are no longer committed; they build into the
  // gitignored .governance-build/ directory. The registry is the only tracked
  // governed file the scheduled check must never rewrite.
  const governed = [
    'governance/agent-system/steering-surface-registry.v1.json',
  ];
  const before = Object.fromEntries(governed.map((relative) => [relative, digest(path.join(ROOT, relative))]));

  const result = runScheduledCheck({
    root: ROOT,
    home,
    report: definition.report,
    requirePromoted: true,
    now: new Date('2026-08-28T12:00:00.000Z'),
    monitorRunner: (root, options) => ({
      schema: 'chopdot.steering-surface-health.v1',
      candidate: { root },
      verdict: 'degraded',
      require_promoted_observed: options.requirePromoted,
      _generated: { catalog: 'must not be written', health: 'must not be written' },
    }),
  });
  const after = Object.fromEntries(governed.map((relative) => [relative, digest(path.join(ROOT, relative))]));

  assert.deepEqual(after, before);
  assert.equal(result.root, ROOT);
  assert.ok(['pass', 'degraded', 'blocked'].includes(result.monitor.verdict));
  assert.deepEqual(JSON.parse(fs.readFileSync(definition.report, 'utf8')), result);
  assert.equal(fs.statSync(definition.report).mode & 0o777, 0o600);
  const current = inspectSchedule(definition, {
    noLaunchctl: true,
    now: new Date('2026-08-28T12:30:00.000Z'),
  });
  const stale = inspectSchedule(definition, {
    noLaunchctl: true,
    now: new Date('2026-08-30T00:30:00.000Z'),
  });
  assert.equal(current.report.state, 'current');
  assert.equal(stale.report.state, 'stale');
});

test('uninstall removes only the launchd definition and preserves reports', (t) => {
  const home = fixtureHome(t);
  const definition = launchAgentDefinition({ root: ROOT, home });
  installSchedule(definition, { noLaunchctl: true });
  fs.writeFileSync(definition.report, '{}\n');

  const result = uninstallSchedule(definition, { noLaunchctl: true });

  assert.equal(result.removed, true);
  assert.equal(fs.existsSync(definition.plist), false);
  assert.equal(fs.existsSync(definition.report), true);
});

test('report path is derived from the exact root and cannot target the repository', (t) => {
  const home = fixtureHome(t);
  const paths = schedulePaths(ROOT, home);

  assert.throws(
    () => runScheduledCheck({ root: ROOT, home, report: path.join(ROOT, 'latest.json') }),
    /scheduled report path mismatch/u,
  );
  assert.ok(paths.report.startsWith(`${fs.realpathSync(home)}${path.sep}`));
});

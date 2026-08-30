#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { parseArgs } from './lib.mjs';
import { runSteeringMonitor } from './steering-surfaces.mjs';

export const SCHEDULE_HOUR = 7;
export const SCHEDULE_MINUTE = 17;
export const SCHEDULE_PREFIX = 'dev.chopdot.steering-surfaces';
export const MAXIMUM_REPORT_AGE_HOURS = 36;

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const SCRIPT_ROOT = fs.realpathSync(path.resolve(path.dirname(SCRIPT_FILE), '../..'));

function git(root, args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function xml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function atomicWrite(file, content, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, content, { mode });
  fs.renameSync(temporary, file);
  fs.chmodSync(file, mode);
}

function realHome(homeInput) {
  const resolved = path.resolve(homeInput ?? os.homedir());
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`scheduler home must be an existing directory: ${resolved}`);
  }
  return fs.realpathSync(resolved);
}

function ensureContainedDirectory(directory, boundary) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const realDirectory = fs.realpathSync(directory);
  const realBoundary = fs.realpathSync(boundary);
  if (realDirectory !== realBoundary && !realDirectory.startsWith(`${realBoundary}${path.sep}`)) {
    throw new Error(`scheduler support directory escapes its home boundary: ${realDirectory}`);
  }
  return realDirectory;
}

export function assertExactWorktree(rootInput, expectedScriptRoot = SCRIPT_ROOT) {
  const requested = fs.realpathSync(path.resolve(rootInput ?? process.cwd()));
  const scriptRoot = fs.realpathSync(path.resolve(expectedScriptRoot));
  const gitRoot = fs.realpathSync(git(requested, ['rev-parse', '--show-toplevel']));
  if (requested !== gitRoot) {
    throw new Error(`requested root is not the Git worktree root: requested=${requested} git=${gitRoot}`);
  }
  if (requested !== scriptRoot) {
    throw new Error(`scheduler/root mismatch: scheduler=${scriptRoot} requested=${requested}`);
  }
  return requested;
}

export function schedulePaths(rootInput, homeInput = os.homedir()) {
  const root = fs.realpathSync(path.resolve(rootInput));
  const home = realHome(homeInput);
  const suffix = sha256(root).slice(0, 12);
  const label = `${SCHEDULE_PREFIX}.${suffix}`;
  const reportDirectory = path.join(home, 'Library', 'Logs', 'ChopDot', 'steering-surfaces', suffix);
  return {
    root,
    home,
    suffix,
    label,
    plist: path.join(home, 'Library', 'LaunchAgents', `${label}.plist`),
    report_directory: reportDirectory,
    report: path.join(reportDirectory, 'latest.json'),
    stdout: path.join(reportDirectory, 'stdout.log'),
    stderr: path.join(reportDirectory, 'stderr.log'),
  };
}

export function launchAgentDefinition({ root, home, node = process.execPath } = {}) {
  const exactRoot = assertExactWorktree(root);
  const paths = schedulePaths(exactRoot, home);
  const nodePath = fs.realpathSync(path.resolve(node));
  const script = path.join(exactRoot, 'scripts', 'agent-governance', 'steering-schedule.mjs');
  if (!fs.statSync(nodePath).isFile()) throw new Error(`Node runtime is not a regular file: ${nodePath}`);
  if (!fs.statSync(script).isFile()) throw new Error(`scheduler is not a regular file: ${script}`);
  return {
    ...paths,
    node: nodePath,
    script,
    program_arguments: [
      nodePath,
      script,
      'run',
      `--root=${exactRoot}`,
      `--home=${paths.home}`,
      `--report=${paths.report}`,
      '--require-promoted',
    ],
  };
}

export function renderLaunchAgent(definition) {
  const argumentsXml = definition.program_arguments
    .map((argument) => `      <string>${xml(argument)}</string>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${xml(definition.label)}</string>
  <key>ProgramArguments</key>
  <array>
${argumentsXml}
  </array>
  <key>WorkingDirectory</key>
  <string>${xml(definition.root)}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>${SCHEDULE_HOUR}</integer>
    <key>Minute</key>
    <integer>${SCHEDULE_MINUTE}</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>${xml(definition.stdout)}</string>
  <key>StandardErrorPath</key>
  <string>${xml(definition.stderr)}</string>
  <key>ProcessType</key>
  <string>Background</string>
</dict>
</plist>
`;
}

function serviceTarget(definition) {
  return `gui/${process.getuid()}/${definition.label}`;
}

function domainTarget() {
  return `gui/${process.getuid()}`;
}

function launchctlLoaded(definition) {
  return spawnSync('/bin/launchctl', ['print', serviceTarget(definition)], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).status === 0;
}

function callLaunchctl(args) {
  const result = spawnSync('/bin/launchctl', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(`launchctl ${args[0]} failed${detail ? `: ${detail}` : ''}`);
  }
}

function assertLaunchdAvailable(noLaunchctl) {
  if (noLaunchctl) return;
  if (process.platform !== 'darwin' || !fs.existsSync('/bin/launchctl')) {
    throw new Error('host-local scheduling requires macOS launchd; use the GitHub schedule on other hosts');
  }
}

export function inspectSchedule(definition, { noLaunchctl = false, now = new Date() } = {}) {
  assertLaunchdAvailable(noLaunchctl);
  const desired = renderLaunchAgent(definition);
  const installed = fs.existsSync(definition.plist);
  const desiredMatch = installed && fs.readFileSync(definition.plist, 'utf8') === desired;
  const loaded = noLaunchctl ? null : launchctlLoaded(definition);
  let report = null;
  let reportError = null;
  let reportAgeHours = null;
  const reportExists = fs.existsSync(definition.report);
  if (reportExists) {
    try {
      report = JSON.parse(fs.readFileSync(definition.report, 'utf8'));
      const checkedAt = new Date(report.checked_at ?? 'invalid');
      if (!Number.isFinite(checkedAt.getTime())) throw new Error('scheduled report has an invalid checked_at value');
      reportAgeHours = (now.getTime() - checkedAt.getTime()) / 3_600_000;
      if (report.schema !== 'chopdot.steering-schedule-run.v1') throw new Error('scheduled report schema is invalid');
      if (report.root !== definition.root) throw new Error('scheduled report root does not match this worktree');
      if (report.label !== definition.label) throw new Error('scheduled report label does not match this worktree');
      if (!['pass', 'degraded', 'blocked'].includes(report.monitor?.verdict)) throw new Error('scheduled report monitor verdict is invalid');
    } catch (error) {
      reportError = error instanceof Error ? error.message : String(error);
    }
  }
  const reportState = !reportExists
    ? 'awaiting-first-run'
    : reportError
      ? 'invalid'
      : reportAgeHours < -0.25
        ? 'future-dated'
        : reportAgeHours > MAXIMUM_REPORT_AGE_HOURS
          ? 'stale'
          : report.monitor.verdict === 'blocked'
            ? 'blocked'
            : 'current';
  const state = !installed
    ? 'inactive'
    : !desiredMatch
      ? 'drifted'
      : loaded === false
        ? 'not-loaded'
        : loaded === null
          ? 'configured-unverified'
          : 'active';
  return {
    schema: 'chopdot.steering-schedule-status.v1',
    state,
    root: definition.root,
    label: definition.label,
    schedule: { local_hour: SCHEDULE_HOUR, local_minute: SCHEDULE_MINUTE, run_at_load: true },
    plist: definition.plist,
    installed,
    desired_plist_matches: desiredMatch,
    launchctl_checked: !noLaunchctl,
    loaded,
    report: {
      path: definition.report,
      state: reportState,
      present: reportExists,
      parse_error: reportError,
      age_hours: reportAgeHours,
      maximum_age_hours: MAXIMUM_REPORT_AGE_HOURS,
      monitor_verdict: report?.monitor?.verdict ?? null,
      checked_at: report?.checked_at ?? null,
    },
    logs: { stdout: definition.stdout, stderr: definition.stderr },
  };
}

export function installSchedule(definition, { noLaunchctl = false, replace = false } = {}) {
  assertLaunchdAvailable(noLaunchctl);
  ensureContainedDirectory(path.dirname(definition.plist), definition.home);
  ensureContainedDirectory(definition.report_directory, definition.home);
  fs.chmodSync(definition.report_directory, 0o700);
  const desired = renderLaunchAgent(definition);
  const exists = fs.existsSync(definition.plist);
  const matches = exists && fs.readFileSync(definition.plist, 'utf8') === desired;
  const loaded = noLaunchctl ? false : launchctlLoaded(definition);
  if (exists && !matches && !replace) {
    throw new Error(`installed launchd definition differs: ${definition.plist}; review it and rerun with --replace`);
  }
  if (exists && !matches && loaded) callLaunchctl(['bootout', serviceTarget(definition)]);
  if (!exists || !matches) atomicWrite(definition.plist, desired, 0o644);
  if (!noLaunchctl && !launchctlLoaded(definition)) {
    callLaunchctl(['bootstrap', domainTarget(), definition.plist]);
  }
  return inspectSchedule(definition, { noLaunchctl });
}

export function uninstallSchedule(definition, { noLaunchctl = false } = {}) {
  assertLaunchdAvailable(noLaunchctl);
  if (!noLaunchctl && launchctlLoaded(definition)) callLaunchctl(['bootout', serviceTarget(definition)]);
  if (fs.existsSync(definition.plist)) fs.unlinkSync(definition.plist);
  return {
    schema: 'chopdot.steering-schedule-uninstall.v1',
    removed: !fs.existsSync(definition.plist),
    plist: definition.plist,
    reports_preserved_at: definition.report_directory,
  };
}

function publicMonitorResult(result) {
  const { _generated: _ignored, ...value } = result;
  return value;
}

export function runScheduledCheck({
  root,
  home,
  report,
  requirePromoted = true,
  now = new Date(),
  monitorRunner = runSteeringMonitor,
} = {}) {
  const exactRoot = assertExactWorktree(root);
  const definition = launchAgentDefinition({ root: exactRoot, home });
  const exactReport = path.resolve(report ?? definition.report);
  if (exactReport !== definition.report) {
    throw new Error(`scheduled report path mismatch: expected=${definition.report} requested=${exactReport}`);
  }
  if (exactReport === exactRoot || exactReport.startsWith(`${exactRoot}${path.sep}`)) {
    throw new Error('scheduled reports must remain outside the governed worktree');
  }
  ensureContainedDirectory(path.dirname(exactReport), definition.home);
  const monitor = monitorRunner(exactRoot, { requirePromoted, now });
  const result = {
    schema: 'chopdot.steering-schedule-run.v1',
    checked_at: now.toISOString(),
    root: exactRoot,
    label: definition.label,
    monitor: publicMonitorResult(monitor),
  };
  atomicWrite(exactReport, serialize(result), 0o600);
  return result;
}

function print(value) {
  process.stdout.write(typeof value === 'string' ? value : serialize(value));
}

async function main() {
  const [command = 'status', ...argv] = process.argv.slice(2);
  const options = parseArgs(argv);
  const definition = launchAgentDefinition({
    root: options.root ?? process.cwd(),
    home: options.home ?? os.homedir(),
    node: options.node ?? process.execPath,
  });
  const noLaunchctl = Boolean(options.no_launchctl);
  if (command === 'render') {
    print(renderLaunchAgent(definition));
  } else if (command === 'install') {
    print(installSchedule(definition, { noLaunchctl, replace: Boolean(options.replace) }));
  } else if (command === 'status') {
    const result = inspectSchedule(definition, { noLaunchctl });
    print(result);
    const serviceReady = ['active', 'configured-unverified'].includes(result.state);
    const reportReady = result.state === 'configured-unverified' || result.report.state === 'current';
    if (!serviceReady || !reportReady) process.exitCode = 1;
  } else if (command === 'uninstall') {
    print(uninstallSchedule(definition, { noLaunchctl }));
  } else if (command === 'run') {
    const result = runScheduledCheck({
      root: definition.root,
      home: definition.home,
      report: options.report,
      requirePromoted: Boolean(options.require_promoted),
    });
    print(result);
    if (result.monitor.verdict === 'blocked') process.exitCode = 1;
  } else {
    throw new Error(`unknown steering schedule command: ${command}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parseArgs } from './lib.mjs';

const GOVERNANCE_COMMANDS = [
  ['node', ['scripts/agent-system/cli.mjs', 'ci']],
  ['node', ['--test',
    'scripts/agent-system/tests/core-contract.test.mjs',
    'scripts/agent-system/tests/ledger-runner.test.mjs',
    'scripts/agent-system/tests/effects-approvals.test.mjs',
    'scripts/agent-system/tests/evaluator-outcome.test.mjs',
    'scripts/agent-system/tests/fail-closed.test.mjs',
    'scripts/agent-system/tests/knowledge-adapters.test.mjs',
    'scripts/agent-system/tests/adapters-compat-cli.test.mjs',
  ]],
  ['node', ['scripts/agent-governance/validate-repository.mjs']],
  ['node', ['scripts/agent-governance/adoption-guard.mjs', 'hooks-check']],
  ['node', ['--test',
    'scripts/agent-governance/tests/adoption-guard.test.mjs',
    'scripts/agent-governance/tests/pr-governance.test.mjs',
    'scripts/agent-governance/tests/pr-outcome.test.mjs',
    'scripts/agent-governance/tests/release-enforcement.test.mjs',
    'scripts/agent-governance/tests/repository-governance.test.mjs',
    'scripts/agent-governance/tests/ruleset-readback.test.mjs',
    'scripts/agent-governance/tests/workflow-exact-head.test.mjs',
  ]],
  ['npm', ['run', 'context:validate']],
  ['npm', ['run', 'product:validate']],
  ['npm', ['run', 'wiki:validate']],
];

const APPLICATION_COMMANDS = [
  ['npm', ['ci']],
  ['npm', ['run', 'lint']],
  ['npm', ['run', 'build']],
  ['npm', ['run', 'test:node']],
  ['npm', ['run', 'security:baseline']],
];

export function runParity(root, { governanceOnly = false } = {}) {
  const records = [];
  for (const [command, args, options = {}] of [...GOVERNANCE_COMMANDS, ...(governanceOnly ? [] : APPLICATION_COMMANDS)]) {
    const display = `${command} ${args.join(' ')}`;
    process.stdout.write(`\n[agent-governance] ${display}\n`);
    const started = Date.now();
    const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', ...options });
    records.push({ command: display, exit_code: result.status ?? 1, duration_ms: Date.now() - started });
  }
  const failed = records.filter((record) => record.exit_code !== 0);
  return { ok: failed.length === 0, root, mode: governanceOnly ? 'governance-only' : 'full-parity', total: records.length, passed: records.length - failed.length, failed: failed.length, records };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = path.resolve(options.root ?? process.cwd());
  const result = runParity(root, { governanceOnly: Boolean(options.governance_only) });
  process.stdout.write(`\n${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();

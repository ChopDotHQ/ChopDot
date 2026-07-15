#!/usr/bin/env node

import { cpSync, existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const date = process.env.CHOPDOT_DOT_SMOKE_DATE || '2026-07-07';
const siteDir = join(process.cwd(), 'artifacts', 'chopdot-dot-smoke', date, 'site');
const deploySiteDir = join(tmpdir(), `chopdot-dot-smoke-${date}`, 'site');
const reportDir = join(process.cwd(), 'artifacts', 'chopdot-dot-smoke', date);
const reportPath = join(reportDir, 'chopdot-dot-smoke-report.json');
const cliPackage = '@parity/polkadot-app-deploy@0.11.0';

function run(name, args) {
  const result = spawnSync('npx', ['-y', cliPackage, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: Number(process.env.CHOPDOT_DOT_SMOKE_TIMEOUT_MS || 300000),
    env: {
      ...process.env,
      POLKADOT_APP_DEPLOY_DOMAIN:
        process.env.POLKADOT_APP_DEPLOY_DOMAIN ||
        process.env.CHOPDOT_DOT_SMOKE_DOMAIN ||
        process.env.DOT_DEPLOY_DOMAIN ||
        '',
      PAD_TELEMETRY: '0',
      PAD_UPDATE_CHECK: '0',
      DO_NOT_TRACK: '1'
    }
  });
  return {
    name,
    command: `npx -y ${cliPackage} ${args.join(' ')}`,
    status: result.status,
    ok: result.status === 0,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };
}

const checks = [];
checks.push({
  name: 'node_version',
  ok: Number(process.versions.node.split('.')[0]) >= 22,
  value: process.version,
  required: '>=22'
});
checks.push({
  name: 'site_index_exists',
  ok: existsSync(join(siteDir, 'index.html')),
  path: join(siteDir, 'index.html')
});
checks.push({
  name: 'site_manifest_exists',
  ok: existsSync(join(siteDir, 'smoke-manifest.json')),
  path: join(siteDir, 'smoke-manifest.json')
});

if (checks.every((check) => check.ok)) {
  const html = readFileSync(join(siteDir, 'index.html'), 'utf8');
  checks.push({
    name: 'site_has_boundary_copy',
    ok: html.includes('Smoke artifact only') && html.includes('Friday Crew'),
    path: join(siteDir, 'index.html')
  });
}

const cliChecks = [
  run('polkadot_app_deploy_version', ['--version']),
  run('polkadot_app_deploy_environments', ['--list-environments'])
];

const deployRequested = process.env.CHOPDOT_DOT_SMOKE_DEPLOY === '1';
const deployDomain = process.env.CHOPDOT_DOT_SMOKE_DOMAIN || '';
let deployCheck = null;

if (deployRequested) {
  if (!deployDomain.endsWith('.dot')) {
    deployCheck = {
      name: 'deploy_skipped_missing_domain',
      ok: false,
      reason: 'Set CHOPDOT_DOT_SMOKE_DOMAIN to a .dot name before running with CHOPDOT_DOT_SMOKE_DEPLOY=1.'
    };
  } else {
    const deployEnv = process.env.CHOPDOT_DOT_SMOKE_ENV || 'paseo-next-v2';
    rmSync(deploySiteDir, { recursive: true, force: true });
    mkdirSync(deploySiteDir, { recursive: true });
    cpSync(siteDir, deploySiteDir, { recursive: true });
    deployCheck = run('polkadot_app_deploy_static_site', [
      deploySiteDir,
      deployDomain,
      '--env',
      deployEnv,
      '--js-merkle',
      '--tag',
      'chopdot-dot-smoke'
    ]);
    deployCheck.deploySiteDir = deploySiteDir;
  }
} else {
  deployCheck = {
    name: 'deploy_not_requested',
    ok: true,
    reason: 'No live publish attempted. Set CHOPDOT_DOT_SMOKE_DEPLOY=1 and CHOPDOT_DOT_SMOKE_DOMAIN=name.dot to run a controlled testnet deploy.'
  };
}

const report = {
  kind: 'chopdot-dot-smoke-report',
  generatedAt: new Date().toISOString(),
  sourceFacts: {
    cliPackage,
    defaultEnvironment: 'paseo-next-v2',
    siteDir
  },
  checks,
  cliChecks,
  deployCheck,
  result:
    checks.every((check) => check.ok) &&
    cliChecks.every((check) => check.ok) &&
    Boolean(deployCheck?.ok)
      ? 'pass'
      : 'needs_review'
};

mkdirSync(reportDir, { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

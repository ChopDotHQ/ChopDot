#!/usr/bin/env node
/**
 * Non-writing preflight for a Paseo `.dot` deploy.
 *
 * This deliberately does not publish, register, sign, fund, or grant anything.
 * It proves the local bundle/manifest are deploy-shaped and reports the human
 * setup still needed before running polkadot-app-deploy.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const domain = process.env.DOT_DEPLOY_DOMAIN ?? 'chopdotws01.dot';
const strictExternal = process.env.DOT_DEPLOY_PREFLIGHT_STRICT === '1';
const deployCommand = process.env.POLKADOT_APP_DEPLOY_BIN ?? 'npx';
const deployCommandPrefix = process.env.POLKADOT_APP_DEPLOY_BIN
  ? []
  : ['--yes', '@parity/polkadot-app-deploy@0.11.0'];
const outDir = path.join(repoRoot, 'dist-dot-host');
const manifestPath = path.join(repoRoot, 'polkadot-app-deploy.config.ts');
const reportDir = path.join(repoRoot, 'artifacts/polkadot-native');
const reportPath = path.join(reportDir, `dot-deploy-preflight-${new Date().toISOString().slice(0, 10)}.json`);

const checks = [];

function addCheck(name, status, detail, data = {}) {
  checks.push({ name, status, detail, ...data });
  const marker = status === 'pass' ? 'PASS' : status === 'warn' ? 'WARN' : status === 'setup_required' ? 'SETUP' : 'FAIL';
  console.log(`${marker.padEnd(5)} ${name}: ${detail}`);
}

function command(commandName, args, options = {}) {
  return spawnSync(commandName, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: process.env,
    timeout: 30_000,
    ...options,
  });
}

function deployTool(args) {
  return command(deployCommand, [...deployCommandPrefix, ...args], { timeout: 120_000 });
}

function signerSessionResult(result) {
  const output = `${result.stdout}\n${result.stderr}`.trim();
  if (process.env.MNEMONIC) {
    return {
      status: 'pass',
      detail: 'MNEMONIC is set for this shell (value not printed)',
    };
  }
  if (result.status !== 0) {
    return {
      status: strictExternal ? 'fail' : 'setup_required',
      detail: 'Run polkadot-app-deploy login, use the same POLKADOT_APP_DEPLOY_BIN session, or set MNEMONIC before publishing',
    };
  }
  if (/not logged in/i.test(output) || /sign in/i.test(output)) {
    return {
      status: strictExternal ? 'fail' : 'setup_required',
      detail: output || 'No deploy signer session is active',
    };
  }
  return {
    status: 'pass',
    detail: output || 'deploy session present',
  };
}

function dirSizeBytes(root) {
  let total = 0;
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      if (entry.isFile()) total += statSync(full).size;
    }
  }
  walk(root);
  return total;
}

function validateDomain(value) {
  if (!/^[a-z0-9-]+\.dot$/i.test(value)) return { ok: false, warning: 'Domain must look like <label>.dot' };
  const label = value.replace(/\.dot$/i, '');
  if (!/^[a-z0-9]+$/i.test(label)) return { ok: false, warning: 'NoStatus labels should be alphanumeric.' };
  if (!/^[a-z0-9]{9,}\d{2}$/i.test(label)) {
    return {
      ok: true,
      warning: 'Label may need DotNS personhood/PoP unless the signer is already eligible.',
    };
  }
  return { ok: true };
}

function main() {
  console.log('=== ChopDot Paseo .dot deploy preflight ===');
  console.log(`domain: ${domain}`);
  console.log(`strict external setup: ${strictExternal ? 'yes' : 'no'}`);
  console.log(`deploy tool: ${deployCommand} ${deployCommandPrefix.join(' ')}`.trim());

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  addCheck(
    'node',
    nodeMajor >= 22 ? 'pass' : 'fail',
    `Node ${process.versions.node}${nodeMajor >= 22 ? '' : ' is below required 22.x'}`,
  );

  const domainCheck = validateDomain(domain);
  addCheck(
    'domain shape',
    domainCheck.ok ? (domainCheck.warning ? 'warn' : 'pass') : 'fail',
    domainCheck.warning ?? `${domain} is deploy-shaped`,
    { domain },
  );

  if (!existsSync(outDir)) {
    addCheck('dot-host bundle', 'fail', 'dist-dot-host is missing; run npm run build:dot-host first');
  } else {
    const size = dirSizeBytes(outDir);
    addCheck('dot-host bundle', 'pass', `dist-dot-host exists (${(size / 1024 / 1024).toFixed(2)} MB)`, { size });
    addCheck('index.html', existsSync(path.join(outDir, 'index.html')) ? 'pass' : 'fail', 'dist-dot-host/index.html must exist');
    addCheck('assets', existsSync(path.join(outDir, 'assets')) ? 'pass' : 'fail', 'dist-dot-host/assets must exist');
    addCheck(
      'dev artifacts removed',
      !existsSync(path.join(outDir, 'dev')) && !existsSync(path.join(outDir, 'public/dev')) ? 'pass' : 'fail',
      'dist-dot-host should not include dev or public/dev',
    );
  }

  if (!existsSync(manifestPath)) {
    addCheck('deploy manifest', 'fail', 'polkadot-app-deploy.config.ts is missing');
  } else {
    const manifest = readFileSync(manifestPath, 'utf8');
    const hasExecutable = manifest.includes("path: './dist-dot-host'");
    const iconMatch = manifest.match(/icon:\s*\{\s*path:\s*['"]([^'"]+)['"]/);
    const iconPath = iconMatch?.[1] ? path.join(repoRoot, iconMatch[1]) : undefined;
    addCheck('deploy manifest', hasExecutable ? 'pass' : 'fail', 'manifest points at ./dist-dot-host');
    addCheck(
      'manifest icon',
      iconPath && existsSync(iconPath) ? 'pass' : 'fail',
      iconPath ? path.relative(repoRoot, iconPath) : 'manifest icon path missing',
    );
  }

  const deployVersion = deployTool(['--version']);
  const deployInstalled = deployVersion.status === 0;
  addCheck(
    'polkadot-app-deploy available',
    deployInstalled ? 'pass' : strictExternal ? 'fail' : 'setup_required',
    deployInstalled
      ? (deployVersion.stdout.trim() || deployVersion.stderr.trim() || 'installed')
      : 'Install @parity/polkadot-app-deploy, set POLKADOT_APP_DEPLOY_BIN, or allow npx network access',
  );

  if (deployInstalled) {
    const envs = deployTool(['--list-environments']);
    const output = `${envs.stdout}\n${envs.stderr}`;
    addCheck(
      'paseo-next-v2 environment',
      output.includes('paseo-next-v2') ? 'pass' : strictExternal ? 'fail' : 'setup_required',
      output.includes('paseo-next-v2') ? 'paseo-next-v2 listed by deploy tool' : 'deploy tool did not list paseo-next-v2',
    );
    const whoami = deployTool(['whoami']);
    const signer = signerSessionResult(whoami);
    addCheck(
      'deploy signer session',
      signer.status,
      signer.detail,
    );
  } else {
    addCheck(
      'paseo-next-v2 environment',
      strictExternal ? 'fail' : 'setup_required',
      'Cannot list environments until the deploy tool is available',
    );
    addCheck(
      'deploy signer session',
      process.env.MNEMONIC ? 'pass' : strictExternal ? 'fail' : 'setup_required',
      process.env.MNEMONIC ? 'MNEMONIC is set for this shell (value not printed)' : 'No deploy signer visible in this shell',
    );
  }

  mkdirSync(reportDir, { recursive: true });
  const fatalStatuses = new Set(['fail']);
  const externalMissing = checks.some((check) => check.status === 'setup_required');
  const failed = checks.filter((check) => fatalStatuses.has(check.status));
  const report = {
    checkedAt: new Date().toISOString(),
    domain,
    strictExternal,
    checks,
    summary: {
      failed: failed.length,
      setupRequired: checks.filter((check) => check.status === 'setup_required').length,
      warnings: checks.filter((check) => check.status === 'warn').length,
      readyForHumanDeploy: failed.length === 0 && !externalMissing,
      localBundleReady: failed.length === 0,
    },
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`report: ${reportPath}`);

  if (failed.length > 0) process.exit(1);
  if (strictExternal && externalMissing) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}

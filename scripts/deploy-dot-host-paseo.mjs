#!/usr/bin/env node
/**
 * Interactive helper for `.dot` deploy on Paseo.
 *
 * Flow:
 * 1) Build + preflight (`npm run build:dot-host` + preflight script)
 * 2) Check existing signer session
 * 3) If missing, optionally open Nova-friendly QR login flow
 * 4) (Fallback) run standard polkadot-app-deploy login
 * 5) Deploy with js-merkle
 */
import { createInterface } from 'node:readline/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = process.env;

const args = process.argv.slice(2);

const domain = parseArgValue('--domain', 'chopdotxx00.dot');
const deployEnv = firstArgValue('--env', 'paseo-next-v2');
const publish = hasFlag('--publish');
const noBuild = hasFlag('--no-build');
const useNova = hasFlag('--nova');

const deployBin = process.env.POLKADOT_APP_DEPLOY_BIN ?? 'npx';
const deployPrefix = process.env.POLKADOT_APP_DEPLOY_BIN ? [] : ['--yes', '@parity/polkadot-app-deploy@0.11.0'];

const childEnv = { ...env, DOT_DEPLOY_DOMAIN: domain };

function firstArgValue(flag, fallback) {
  const key = flag;
  const idx = args.indexOf(key);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  if (flag === '--domain' && args[0] && !args[0].startsWith('--')) return args[0];
  return fallback;
}

function parseArgValue(flag, fallback) {
  return firstArgValue(flag, fallback);
}

function printUsage() {
  console.log(`Usage:
  node scripts/deploy-dot-host-paseo.mjs [options] [domain.dot]

Options:
  --domain <name.dot>     Domain to deploy (default: chopdotxx00.dot)
  --env <environment>     Deploy environment (default: paseo-next-v2)
  --publish               Push name into Publisher registry
  --nova                  Force Nova-style QR helper first
  --no-build              Skip bundle build (assumes dist-dot-host ready)
  -h, --help              Show this help

Examples:
  node scripts/deploy-dot-host-paseo.mjs --domain chopdotxx00.dot
  node scripts/deploy-dot-host-paseo.mjs --domain chopdot-emu01.dot --nova`);
}

function hasFlag(flag) {
  return args.includes(flag);
}

function run(command, commandArgs, options = {}) {
  const proc = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...env, ...options.env },
    stdio: 'inherit',
    timeout: options.timeout ?? 120000,
  });
  return proc;
}

function runCapture(command, commandArgs, options = {}) {
  const proc = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...env, ...options.env },
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: options.timeout ?? 120000,
  });
  const output = `${proc.stdout ?? ''}${proc.stderr ?? ''}`.trim();
  return { ...proc, output };
}

function formatDeployCommand() {
  return [
    deployBin,
    ...deployPrefix,
    './dist-dot-host',
    domain,
    '--env',
    deployEnv,
    '--js-merkle',
    ...(publish ? ['--publish'] : []),
  ];
}

async function waitForInput(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim().toLowerCase();
}

function hasActiveSession(whoamiOutput) {
  if (/Not logged in/i.test(whoamiOutput)) return false;
  if (/Error/i.test(whoamiOutput)) return false;
  if (/No signed/i.test(whoamiOutput)) return false;
  if (/Sign in/i.test(whoamiOutput)) return false;
  return true;
}

function openImage(pathname) {
  spawn('open', [pathname], { stdio: 'ignore', cwd: repoRoot });
}

function runNovaScanFlow() {
  const status = run('node', ['scripts/pad-login-scannable-qr.mjs'], {
    env: childEnv,
    timeout: 1200000,
  });
  if (status.status !== 0) {
    console.log('Nova QR flow did not complete. Falling back to CLI login.');
    return false;
  }
  openImage(path.join(repoRoot, '.local-private/pad-login-qr.png'));
  return true;
}

async function ensureSignedIn() {
  const whoami = runCapture(deployBin, [...deployPrefix, 'whoami'], { env: childEnv, timeout: 60000 });
  if (whoami.status === 0 && hasActiveSession(whoami.output)) {
    console.log(whoami.output);
    return true;
  }

  if (env.MNEMONIC) {
    console.log('MNEMONIC is set; deploy will use that signer path if login is missing.');
    return true;
  }

  if (useNova) {
    console.log('No active signer session found. Running Nova sign-in helper first...');
    runNovaScanFlow();
    const secondCheck = runCapture(deployBin, [...deployPrefix, 'whoami'], { env: childEnv, timeout: 60000 });
    if (secondCheck.status === 0 && hasActiveSession(secondCheck.output)) return true;
    console.log('Session still not detected after Nova flow.');
  } else {
    const answer = await waitForInput('No session found. Try Nova helper flow? (y/N): ');
    if (answer.startsWith('y')) {
      runNovaScanFlow();
      const secondCheck = runCapture(deployBin, [...deployPrefix, 'whoami'], { env: childEnv, timeout: 60000 });
      if (secondCheck.status === 0 && hasActiveSession(secondCheck.output)) return true;
      console.log('Session still not detected after Nova flow.');
    }
  }

  const login = run(deployBin, [...deployPrefix, 'login', '--env', deployEnv], { env: childEnv, timeout: 300000 });
  if (login.status !== 0) return false;
  const finalWhoami = runCapture(deployBin, [...deployPrefix, 'whoami'], { env: childEnv, timeout: 60000 });
  return finalWhoami.status === 0 && hasActiveSession(finalWhoami.output);
}

function maybeBuildAndPreflight() {
  if (!noBuild) {
    console.log('\n==> Building dot-host bundle...');
    if (run('npm', ['run', 'build:dot-host'], { env: childEnv, timeout: 180000 }).status !== 0) {
      process.exit(1);
    }
  }

  console.log('\n==> Running dot-host preflight...');
  if (
    run('npm', ['run', 'preflight:dot-host:paseo'], {
      env: childEnv,
      timeout: 180000,
    }).status !== 0
  ) {
    process.exit(1);
  }
}

async function main() {
  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage();
    return;
  }

  console.log(`[dot-host] deploy target: ${domain} (${deployEnv})`);
  maybeBuildAndPreflight();

  console.log('\n==> Checking deploy signer...');
  const ready = await ensureSignedIn();
  if (!ready) {
    console.error('No active signer after all login options. Set POLKADOT_APP_DEPLOY_BIN session or set MNEMONIC.');
    process.exit(1);
  }

  console.log('\n==> Deploying...');
  const deployArgs = formatDeployCommand();
  const deploy = run(deployBin, deployArgs, { env: childEnv, timeout: 300000 });
  if (deploy.status !== 0) {
    process.exit(deploy.status);
  }
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});

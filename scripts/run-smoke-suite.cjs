#!/usr/bin/env node
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_URL = 'http://127.0.0.1:4173';

function parseSuite(argv) {
  const idx = argv.indexOf('--suite');
  const suite = idx >= 0 ? argv[idx + 1] : 'all';
  if (!suite || !['core', 'guest', 'all'].includes(suite)) {
    throw new Error(`Invalid --suite value "${suite}". Use core, guest, or all.`);
  }
  return suite;
}

function waitForHttp(url, timeoutMs = 60000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });
      req.on('error', retry);
    };

    const retry = () => {
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(probe, 1000);
    };

    probe();
  });
}

function runProcess(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: ROOT,
      env,
      stdio: 'inherit',
      shell: false,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

async function main() {
  const suite = parseSuite(process.argv);
  const appUrl = process.env.SMOKE_URL || DEFAULT_URL;
  const port = String(new URL(appUrl).port || '4173');

  const preview = spawn(
    'npm',
    ['run', 'preview', '--', '--host', '127.0.0.1', '--port', port],
    {
      cwd: ROOT,
      env: process.env,
      stdio: 'inherit',
      shell: false,
    },
  );

  const stopPreview = () => {
    if (!preview.killed) {
      preview.kill('SIGTERM');
    }
  };

  process.on('SIGINT', () => {
    stopPreview();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    stopPreview();
    process.exit(143);
  });

  try {
    await waitForHttp(appUrl);

    const scriptEnv = { ...process.env, SMOKE_URL: appUrl };
    if (suite === 'core' || suite === 'all') {
      await runProcess('node', ['scripts/smoke-five-flows.cjs'], scriptEnv);
    }
    if (suite === 'guest' || suite === 'all') {
      await runProcess('node', ['scripts/smoke-guest-invite-guard.cjs'], scriptEnv);
    }
  } finally {
    stopPreview();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

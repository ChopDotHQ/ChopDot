#!/usr/bin/env node
/**
 * Smaller scannable login QR for pad / polkadot-app-deploy.
 * Terminal block QRs are often too large for Nova; this writes a PNG + URI file.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { platform, release } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { createTerminalAdapter, waitForSessions } from '@parity/product-sdk-terminal';
import { createAuthClient } from '@parity/polkadot-app-deploy/dist/auth/index.js';
import { buildAuthConfig } from '@parity/polkadot-app-deploy/dist/auth-config.js';
import { loadEnvironments } from '@parity/polkadot-app-deploy/dist/environments.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, '.local-private');
const PNG_PATH = join(OUT_DIR, 'pad-login-qr.png');
const URI_PATH = join(OUT_DIR, 'pad-login-uri.txt');
const QR_TIMEOUT_MS = 60_000;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const { doc } = await loadEnvironments();
  const config = buildAuthConfig(doc, 'paseo-next-v2');
  const client = createAuthClient(config);

  const adapter = createTerminalAdapter({
    appId: config.dappId,
    endpoints: config.peopleEndpoints,
    hostMetadata: {
      hostName: config.hostName,
      hostVersion: config.hostVersion,
      platformType: platform(),
      platformVersion: release(),
    },
  });

  const sessions = await waitForSessions(adapter);
  if (sessions.length > 0) {
    adapter.destroy().catch(() => {});
    const existing = await client.connect();
    if (existing.kind === 'existing') {
      console.log(`Already signed in as: ${existing.address}`);
      console.log('Run: npx -y @parity/polkadot-app-deploy whoami');
      return;
    }
  }

  const authPromise = adapter.sso.authenticate();
  const payload = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Login service did not respond within 60s — try again'));
    }, QR_TIMEOUT_MS);

    let unsub;
    unsub = adapter.sso.pairingStatus.subscribe((status) => {
      if (status.step === 'pairing') {
        clearTimeout(timeout);
        unsub?.();
        resolve(status.payload);
      }
      if (status.step === 'pairingError') {
        clearTimeout(timeout);
        unsub?.();
        reject(new Error(status.message ?? 'Pairing error'));
      }
    });

    authPromise.catch((err) => {
      clearTimeout(timeout);
      unsub?.();
      reject(err);
    });
  });

  const uri = typeof payload === 'string' ? payload : JSON.stringify(payload);

  await writeFile(URI_PATH, `${uri}\n`, 'utf8');
  await writeFile(
    PNG_PATH,
    await QRCode.toBuffer(uri, {
      type: 'png',
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
    }),
  );

  console.log('\nScannable login files written:');
  console.log(`  PNG: ${PNG_PATH}`);
  console.log(`  URI: ${URI_PATH}`);
  console.log('\nScan the PNG with Nova (320px — much easier than the terminal QR).');
  console.log('If Nova supports paste/deep-link, copy the URI from the .txt file instead.');
  console.log('\nWaiting for phone approval… (Ctrl+C to stop)\n');

  spawn('open', [PNG_PATH], { stdio: 'ignore' });

  const handle = await client.waitForLogin({ adapter, authPromise }, (status) => {
    if (status.step === 'waiting') process.stdout.write('\rWaiting for scan…');
    if (status.step === 'paired') process.stdout.write('\rPaired — approve on phone…\n');
  });

  if (!handle) {
    console.error('\nLogin failed.');
    process.exit(1);
  }

  console.log(`\nSigned in as: ${handle.address}`);
  console.log('Next: npx -y @parity/polkadot-app-deploy whoami');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * P3-style verify for Wave 1 .dot deploy: paseo-ipfs gateway + live .dot.li host.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const domain = process.env.DOT_DEPLOY_DOMAIN ?? 'chopdotws01.dot';
const rootCid =
  process.env.DOT_DEPLOY_CID ??
  'bafybeibxwkaks6s2g7eeew4pozjky46etjrcqczuajzz7zt3yjxyqxmjqq';
const gatewayBase = process.env.DOT_DEPLOY_GATEWAY_BASE ?? 'https://paseo-bulletin-next-ipfs.polkadot.io/ipfs';
const liveUrl = `https://${domain.replace(/\.dot$/, '')}.dot.li/?mode=savings_circle`;

const maxAttempts = Number(process.env.DOT_VERIFY_ATTEMPTS ?? '6');
const delayMs = Number(process.env.DOT_VERIFY_DELAY_MS ?? '15000');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function headOk(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(90_000) });
    return { ok: res.ok, status: res.status };
  } catch (error) {
    return { ok: false, status: 0, error: String(error) };
  }
}

async function verifyGateway() {
  const url = `${gatewayBase}/${rootCid}/`;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await headOk(url);
    console.log(`gateway attempt ${attempt}/${maxAttempts}: ${result.status} ${url}`);
    if (result.ok) {
      return { pass: true, status: result.status, url };
    }
    if (attempt < maxAttempts) {
      await sleep(delayMs);
    }
  }
  return { pass: false, url };
}

function verifyDotLiWithPlaywright() {
  const script = `
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(${JSON.stringify(liveUrl)}, { timeout: 120000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(12000);
  const banner = await page.getByTestId('summit-banner').count();
  const dotLab = await page.getByTestId('dot-lab').count();
  const unreachable = await page.getByText("This app can't be reached").count();
  const reaching = await page.getByText('Reaching out').count();
  console.log(JSON.stringify({ banner, dotLab, unreachable, reaching, title: await page.title() }));
  await browser.close();
  process.exit(banner > 0 && dotLab > 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
`;
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? '' },
  });
  return {
    pass: result.status === 0,
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status,
  };
}

console.log('=== ChopDot .dot deploy verify ===');
console.log(`domain: ${domain}`);
console.log(`root CID: ${rootCid}`);
console.log(`live URL: ${liveUrl}`);

const gateway = await verifyGateway();
const live = verifyDotLiWithPlaywright();

const report = {
  verified_at: new Date().toISOString(),
  domain,
  root_cid: rootCid,
  live_url: liveUrl,
  gateway,
  live,
  overall_pass: gateway.pass && live.pass,
};

const artifactsDir = path.join(repoRoot, 'artifacts/polkadot-native');
mkdirSync(artifactsDir, { recursive: true });
const reportPath = path.join(artifactsDir, `dot-deploy-verify-${new Date().toISOString().slice(0, 10)}.json`);
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log('\n--- live check ---');
console.log(live.stdout.trim() || live.stderr.trim());
console.log(`\nreport: ${reportPath}`);
console.log(`overall: ${report.overall_pass ? 'PASS' : 'PARTIAL/FAIL'}`);

if (!report.overall_pass) {
  if (!gateway.pass) {
    console.log('gateway: FAIL (504/propagation — retry later or check network mismatch in host Settings)');
  }
  if (!live.pass) {
    console.log('live .dot.li: FAIL (host shell did not render summit-banner + dot-lab)');
  }
  process.exit(1);
}

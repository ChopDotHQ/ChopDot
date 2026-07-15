import {spawn} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import process from 'node:process';
import {chromium} from 'playwright';

const outputDirectory = process.env.PROOF_OUT ?? 'proof/polkadot-host-capability';
const requestedUrl = process.env.PROOF_URL;
const port = 4175;
const proofUrl = requestedUrl ?? `http://127.0.0.1:${port}/?developerChecks=1`;
let server;

async function waitForServer(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

try {
  await mkdir(outputDirectory, {recursive: true});
  if (!requestedUrl) {
    server = spawn(process.execPath, ['./node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)], {
      stdio: 'ignore',
    });
    await waitForServer(proofUrl);
  }

  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1280, height: 900}});
  await page.goto(proofUrl, {waitUntil: 'domcontentloaded'});

  let report;
  const deadline = Date.now() + 30_000;
  while (!report && Date.now() < deadline) {
    for (const frame of page.frames()) {
      report = await frame.evaluate(() => window.__CHOPDOT_HOST_CAPABILITIES__).catch(() => undefined);
      if (report) break;
    }
    if (!report) await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!report) throw new Error('The host capability report did not become available.');

  await page.screenshot({path: `${outputDirectory}/01-shell.png`, fullPage: true});
  await writeFile(`${outputDirectory}/report.json`, `${JSON.stringify({
    proofUrl,
    capturedAt: new Date().toISOString(),
    report,
  }, null, 2)}\n`);
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
} finally {
  server?.kill('SIGTERM');
}

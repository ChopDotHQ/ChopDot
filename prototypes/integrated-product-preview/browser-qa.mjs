import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { JOURNEYS } from './journeys.js';

const base = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4173/prototypes/integrated-product-preview/index.html';
const out = new URL('./artifacts/', import.meta.url);
mkdirSync(out, { recursive: true });

const viewports = [
  { name: '393x852', width: 393, height: 852 },
  { name: '430x890', width: 430, height: 890 },
];

const report = { journeys: [], continuity: [], viewports: [], errors: [] };
const browser = await chromium.launch({ headless: true });

for (const vp of viewports) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto(`${base}#enter`, { waitUntil: 'networkidle' });
  await page.locator('[data-action="continue-guest"]').click();
  await page.waitForFunction(() => location.hash === '#home');
  await page.screenshot({ path: new URL(`home-${vp.name}.png`, out).pathname, fullPage: true });

  const guest = await page.evaluate(() => JSON.parse(localStorage.getItem('chopdot.integrated-preview.v1')));
  const participantBefore = guest.participant.id;
  if (!participantBefore || guest.participant.accountLinked) throw new Error('Guest seed did not initialize correctly');
  report.continuity.push(`${vp.name}: guest participant ${participantBefore}`);

  await page.goto(`${base}#account`, { waitUntil: 'networkidle' });
  await page.locator('[data-action="link-account"]').click();
  await page.waitForFunction(() => location.hash === '#account');
  const linked = await page.evaluate(() => JSON.parse(localStorage.getItem('chopdot.integrated-preview.v1')));
  if (linked.participant.id !== participantBefore) throw new Error('Guest → account changed Participant identity');
  if (!linked.participant.accountLinked) throw new Error('Account link did not materialize');
  report.continuity.push(`${vp.name}: guest→account stable`);

  await page.goto(`${base}#add-expense`, { waitUntil: 'networkidle' });
  await page.locator('#expense-title').fill('Browser QA dinner');
  await page.locator('#expense-amount').fill('96');
  await page.locator('[data-action="add-expense"]').click();
  await page.waitForFunction(() => location.hash === '#review');
  await page.locator('[data-action="agree-expense"]').click();
  await page.waitForFunction(() => location.hash === '#position');
  report.continuity.push(`${vp.name}: expense→review→position`);

  await page.goto(`${base}#settle`, { waitUntil: 'networkidle' });
  await page.locator('[data-action="start-settlement"]').click();
  await page.waitForFunction(() => location.hash === '#settlement-result');
  await page.locator('[data-action="settlement-unknown"]').click();
  await page.waitForFunction(() => location.hash === '#recovery');
  const recoveryText = await page.locator('.app-content').innerText();
  if (!recoveryText.includes('Payment outcome unknown')) throw new Error('J28 unknown-payment recovery was not visible');
  await page.screenshot({ path: new URL(`recovery-${vp.name}.png`, out).pathname, fullPage: true });
  await page.locator('[data-action="resolve-failure"]').click();
  await page.waitForFunction(() => location.hash === '#settlement-result');
  const resultText = await page.locator('.app-content').innerText();
  if (!resultText.includes('Payment verified')) throw new Error('Recovery did not return to verified settlement');
  report.continuity.push(`${vp.name}: settlement unknown→J28→verified result`);

  for (const journey of JOURNEYS) {
    await page.goto(`${base}#${journey.slug}`, { waitUntil: 'networkidle' });
    const marker = await page.locator('.app-content').getAttribute('data-journey');
    if (marker !== journey.id) throw new Error(`Route mismatch: expected J${journey.id}, got ${marker}`);
    const visible = await page.locator('.app-content').isVisible();
    if (!visible) throw new Error(`J${journey.id} did not render`);
  }

  report.journeys.push(`${vp.name}: ${JOURNEYS.length}/28 rendered`);
  report.viewports.push(vp);
  report.errors.push(...consoleErrors.map((e) => `${vp.name} console: ${e}`), ...pageErrors.map((e) => `${vp.name} page: ${e}`));
  await context.close();
}

await browser.close();
if (report.errors.length) throw new Error(report.errors.join('\n'));
writeFileSync(new URL('qa-summary.json', out), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

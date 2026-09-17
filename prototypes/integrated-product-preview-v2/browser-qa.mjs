import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env.PREVIEW_V2_BASE_URL || 'http://127.0.0.1:4173/prototypes/integrated-product-preview-v2/index.html';
const out = new URL('./artifacts/', import.meta.url);
mkdirSync(out, { recursive: true });
const report = { gate: 'A', viewports: [], paths: [], errors: [] };
const browser = await chromium.launch({ headless: true });

const watch = (page, label) => {
  page.on('pageerror', e => report.errors.push(`${label}: ${String(e)}`));
  page.on('console', m => { if (m.type() === 'error') report.errors.push(`${label}: ${m.text()}`); });
};

for (const vp of [{ width: 393, height: 852 }, { width: 430, height: 890 }]) {
  const context = await browser.newContext({ viewport: vp });
  const page = await context.newPage();
  watch(page, `guest-${vp.width}x${vp.height}`);
  await page.goto(base, { waitUntil: 'networkidle' });

  await page.getByText('ChopDot', { exact: true }).waitFor();
  await page.getByText('Share & chop.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Try as guest' }).waitFor();
  await page.getByRole('button', { name: 'Create account' }).waitFor();
  await page.getByRole('button', { name: 'Sign in' }).waitFor();
  const frontText = await page.locator('#front-door').innerText();
  for (const rejected of ['Bring your people.', 'Keep things clear.', 'Start with an email. No wallet needed.', 'Demo']) {
    if (frontText.includes(rejected)) throw new Error(`Rejected front-door copy visible: ${rejected}`);
  }
  await page.screenshot({ path: new URL(`gate-a-front-door-${vp.width}x${vp.height}.png`, out).pathname, fullPage: true });

  await page.getByRole('button', { name: 'Try as guest' }).click();
  await page.waitForFunction(() => window.ChopDotPreviewV2?.getCurrentJourney() === 'J02' && window.ChopDotPreviewV2?.getHomeMode() === 'guest');
  const product = page.frameLocator('#product-frame');
  await product.getByText('Shared money, at a glance').waitFor();
  await product.locator('.avatar').filter({ hasText: 'G' }).waitFor();
  if (await product.locator('.wallet').isVisible()) throw new Error('Guest preview exposed connected wallet');
  await page.screenshot({ path: new URL(`gate-a-guest-home-${vp.width}x${vp.height}.png`, out).pathname, fullPage: true });

  await product.locator('.start').click();
  await page.waitForFunction(() => window.ChopDotPreviewV2?.getCurrentFlow() === 'create');
  await product.locator('#entry-screen[data-state="email"]').waitFor();
  report.paths.push(`${vp.width}x${vp.height}: front door → guest Home → create-account boundary`);
  report.viewports.push(`${vp.width}x${vp.height}`);
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 430, height: 890 } });
  const page = await context.newPage();
  watch(page, 'create-account');
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Create account' }).click();
  const product = page.frameLocator('#product-frame');
  await product.locator('#entry-screen[data-state="email"]').waitFor();
  if ((await product.locator('body').innerText()).includes('Demo')) throw new Error('Reviewer Demo chrome leaked into account flow');
  report.paths.push('Create account → existing verified J01 identity surface');
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 430, height: 890 } });
  const page = await context.newPage();
  watch(page, 'sign-in');
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.frameLocator('#product-frame').locator('#entry-screen[data-state="email"]').waitFor();
  report.paths.push('Sign in → existing verified J01 identity surface');
  await context.close();
}

await browser.close();
if (report.errors.length) throw new Error(report.errors.join('\n'));
writeFileSync(new URL('gate-a-summary.json', out), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

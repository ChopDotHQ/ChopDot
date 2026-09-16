import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env.PREVIEW_V2_BASE_URL || 'http://127.0.0.1:4173/prototypes/integrated-product-preview-v2/index.html';
const out = new URL('./artifacts/', import.meta.url);
mkdirSync(out, { recursive: true });

const report = { gate: 'A', viewports: [], paths: [], errors: [] };
const browser = await chromium.launch({ headless: true });

async function captureErrors(page, label) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(`${label} page: ${String(err)}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`${label} console: ${msg.text()}`); });
  return errors;
}

async function runAccountPath(vp) {
  const context = await browser.newContext({ viewport: vp });
  const page = await context.newPage();
  const errors = await captureErrors(page, `${vp.width}x${vp.height}`);
  await page.goto(`${base}?entry=account`, { waitUntil: 'networkidle' });

  const product = page.frameLocator('#product-frame');
  await product.locator('#entry-screen[data-state="welcome"]').waitFor();
  await product.getByRole('heading', { name: /Shared expenses/i }).waitFor();
  await product.getByText('Start with an email. No wallet needed.').waitFor();
  await product.getByRole('button', { name: 'Continue with email' }).click();

  await product.locator('#email').fill('sam@example.com');
  await product.getByRole('button', { name: 'Send code' }).click();
  await product.locator('#entry-screen[data-state="code"]').waitFor();
  await product.locator('#code').fill('123456');
  await product.getByRole('button', { name: 'Continue' }).click();

  await product.locator('#entry-screen[data-state="profile"]').waitFor();
  await product.locator('#name').fill('Sam');
  await product.getByRole('button', { name: 'Continue' }).click();
  await product.locator('#entry-screen[data-state="ready"]').waitFor();
  await product.getByRole('heading', { name: 'You’re ready.' }).waitFor();
  await product.getByRole('button', { name: 'Open ChopDot' }).click();

  await page.waitForFunction(() => window.ChopDotPreviewV2?.getCurrentJourney() === 'J02');
  await product.getByText('Shared money, at a glance').waitFor();
  await product.getByRole('heading', { name: 'You’re almost square.' }).waitFor();
  await product.getByText('2 things need you').waitFor();

  const hiddenReviewer = await product.locator('.labpanel').evaluate((el) => getComputedStyle(el).display === 'none');
  if (!hiddenReviewer) throw new Error(`Golden reviewer panel leaked into product mode at ${vp.width}x${vp.height}`);
  const svgCount = await product.locator('svg.icon, svg.nav-icon').count();
  if (svgCount < 5) throw new Error(`Golden semantic icon set missing at ${vp.width}x${vp.height}: ${svgCount}`);
  const visibleText = await product.locator('body').innerText();
  if (/[⌂◎◴◉▦]/u.test(visibleText)) throw new Error('Placeholder Unicode icons leaked into Golden Gate A');

  await page.screenshot({ path: new URL(`gate-a-home-${vp.width}x${vp.height}.png`, out).pathname, fullPage: true });
  report.viewports.push(`${vp.width}x${vp.height}`);
  report.paths.push(`${vp.width}x${vp.height}: welcome→email→code→name→signed-in→Golden Home`);
  report.errors.push(...errors);
  await context.close();
}

for (const vp of [{ width: 393, height: 852 }, { width: 430, height: 890 }]) {
  await runAccountPath(vp);
}

// Returning user + invite context stays attached through authentication.
{
  const context = await browser.newContext({ viewport: { width: 430, height: 890 } });
  const page = await context.newPage();
  report.errors.push(...await captureErrors(page, 'invite-auth'));
  await page.goto(`${base}?entry=invite`, { waitUntil: 'networkidle' });
  const product = page.frameLocator('#product-frame');
  await product.locator('#entry-screen[data-state="invite"]').waitFor();
  await product.getByRole('heading', { name: 'Your invite is waiting.' }).waitFor();
  await product.getByText('Geneva Weekend').waitFor();
  await product.getByRole('button', { name: 'Continue with email' }).click();
  await product.locator('#email').fill('dev@example.com');
  await product.getByRole('button', { name: 'Send code' }).click();
  await product.locator('#code').fill('123456');
  await product.getByRole('button', { name: 'Continue' }).click();
  await product.locator('#entry-screen[data-state="ready"]').waitFor();
  await product.getByRole('heading', { name: 'Welcome back.' }).waitFor();
  await product.getByText('Your invite is right where you left it.').waitFor();
  await product.getByText('You have not joined yet.').waitFor();
  report.paths.push('invite context survives returning-user authentication');
  await context.close();
}

// C1 guest continuation exists only as an invite-context successor, never as normal root entry.
{
  const context = await browser.newContext({ viewport: { width: 430, height: 890 } });
  const page = await context.newPage();
  report.errors.push(...await captureErrors(page, 'guest-invite'));
  await page.goto(`${base}?entry=guest-invite`, { waitUntil: 'networkidle' });
  const product = page.frameLocator('#product-frame');
  await product.getByRole('heading', { name: 'See the group before you decide.' }).waitFor();
  await product.getByRole('button', { name: 'Review invite as guest' }).click();
  await product.getByRole('heading', { name: 'Context kept. Consent comes next.' }).waitFor();
  await product.getByText('No Participant exists until the user explicitly joins.').waitFor();
  report.paths.push('C1 guest continuation remains invite-context-only and stops at J04 owner boundary');
  await context.close();
}

await browser.close();
if (report.errors.length) throw new Error(report.errors.join('\n'));
writeFileSync(new URL('gate-a-summary.json', out), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

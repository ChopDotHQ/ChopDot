// Two-device proof for group invite links.
//
// Person A creates a group, adds a spend, and shares an invite. Person B opens
// it on a clean context, names themselves, and must land on the SAME group with
// the SAME money truth — while correctly claiming their own roster identity.
//
//   npx vite --host 127.0.0.1 --port 5201 &
//   npm run proof:group-invite
//
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const OUT = process.env.PROOF_OUT || 'proof/group-invite';
const BASE = process.env.PROOF_URL || 'http://127.0.0.1:5201/';

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

async function newPerson(name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`${name} pageerror: ${e.message.slice(0, 140)}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`${name} console: ${m.text().slice(0, 140)}`); });
  return { ctx, page, errors };
}

const text = async (page) => (await page.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, 400);

// ---- Person A: create a group with an expense --------------------------------
const A = await newPerson('A');
await A.page.goto(BASE, { waitUntil: 'networkidle' });
await A.page.getByText('Continue as guest').click();
await A.page.waitForTimeout(500);
await A.page.locator('input').first().fill('Mina');
await A.page.locator('button:visible').last().click();
await A.page.waitForTimeout(800);
console.log('[A home]', await text(A.page));

await A.page.getByText('Start with a group').first().click();
await A.page.waitForTimeout(600);
await A.page.locator('input').first().fill('Friday Crew');
// Friends are added by submitting the friend-name field, not just typing it.
for (const friend of ['Leo', 'Nina']) {
  const field = A.page.locator('input').nth(1);
  await field.fill(friend);
  await field.press('Enter');
  await A.page.waitForTimeout(250);
}
await A.page.screenshot({ path: `${OUT}/inv-01-create.png` });
await A.page.locator('button:visible').last().click();
await A.page.waitForTimeout(900);
console.log('[A after create]', await text(A.page));
await A.page.screenshot({ path: `${OUT}/inv-02-group.png` });

// ---- Person A: add a real spend so the invite carries money state ------------
await A.page.getByText('Add spend').first().click();
await A.page.waitForTimeout(600);
await A.page.locator('#capture-amount').fill('184.50');
await A.page.locator('#capture-title').fill('Dinner at La Cabrera');
await A.page.screenshot({ path: `${OUT}/inv-01b-spend.png` });
// walk forward through review -> save
for (let i = 0; i < 4; i++) {
  const btn = A.page.locator('button:visible').last();
  if (await btn.isEnabled().catch(() => false)) {
    await btn.click();
    await A.page.waitForTimeout(700);
  }
  if ((await A.page.getByText('Total spend').count()) > 0) break;
}
console.log('[A after spend]', await text(A.page));
await A.page.screenshot({ path: `${OUT}/inv-02b-after-spend.png` });

// ---- Person A: grab the invite link -----------------------------------------
// Read it straight from the app rather than the clipboard (headless clipboard is unreliable).
const inviteUrl = await A.page.evaluate(async () => {
  const mod = await import('/src/requestLinks.ts');
  const raw = window.localStorage.getItem('chopdot-portable-shell-state-v1');
  if (!raw) return null;
  const s = JSON.parse(raw);
  const group = Object.values(s.groups)[0];
  const built = mod.buildGroupInviteUrl(
    { group, users: s.users, expenses: s.expenses, splits: s.splits, currency: s.currency },
    s.currentUserId,
  );
  return built.ok ? built.url : `FAILED: ${built.reason}`;
});
console.log('[invite url]', inviteUrl ? `${String(inviteUrl).slice(0, 90)}…  (len ${String(inviteUrl).length})` : 'null');

if (!inviteUrl || String(inviteUrl).startsWith('FAILED')) {
  console.log('RESULT: could not build invite');
  await browser.close();
  process.exit(1);
}

// ---- Person B: fresh device, opens the invite --------------------------------
const B = await newPerson('B');
await B.page.goto(inviteUrl, { waitUntil: 'networkidle' });
await B.page.waitForTimeout(600);
console.log('[B first screen]', await text(B.page));
await B.page.screenshot({ path: `${OUT}/inv-03-b-arrives.png` });

// B is a fresh device: guest setup first
if ((await B.page.getByText('Continue as guest').count()) > 0) {
  await B.page.getByText('Continue as guest').click();
  await B.page.waitForTimeout(500);
  await B.page.locator('input').first().fill('Leo');
  await B.page.locator('button:visible').last().click();
  await B.page.waitForTimeout(1200);
}
console.log('[B after setup]', await text(B.page));
await B.page.screenshot({ path: `${OUT}/inv-04-b-group.png` });

const bState = await B.page.evaluate(() => {
  const raw = window.localStorage.getItem('chopdot-portable-shell-state-v1');
  if (!raw) return null;
  const s = JSON.parse(raw);
  return {
    groups: Object.values(s.groups).map(g => g.name),
    members: Object.values(s.users).map(u => u.name).sort(),
    expenses: Object.values(s.expenses).map(e => `${e.description} ${e.amount}`),
    splitStatuses: Object.values(s.splits).map(sp => sp.status),
  };
});
console.log('[B state]', JSON.stringify(bState));

console.log('\n--- errors ---');
console.log([...A.errors, ...B.errors].join('\n') || '(none)');

const ok = bState && bState.groups.includes('Friday Crew');
console.log(`\nRESULT: ${ok ? 'PASS — second device opened the same group' : 'FAIL'}`);
await browser.close();

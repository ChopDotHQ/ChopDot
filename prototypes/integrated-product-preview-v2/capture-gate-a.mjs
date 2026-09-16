import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const root = process.env.PREVIEW_V2_BASE_URL || 'http://127.0.0.1:4173/prototypes/integrated-product-preview-v2/index.html';
const out = new URL('./artifacts/gate-a-screens/', import.meta.url);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const screens = [];

async function open(entry='account') {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 890 } });
  const page = await ctx.newPage();
  await page.goto(`${root}?entry=${entry}`, { waitUntil: 'networkidle' });
  return { ctx, page, ui: page.frameLocator('#product-frame') };
}
function entryFrame(page) {
  return page.frames().find((f) => f.url().includes('/01-enter-chopdot/v1-candidate.html'));
}
async function shot(page,id,title,group) {
  const file = `${String(screens.length+1).padStart(2,'0')}-${id}.png`;
  await page.screenshot({ path: new URL(file,out).pathname, fullPage:true });
  screens.push({id,title,group,file});
}
async function setWalletResult(page, result) {
  const f = entryFrame(page);
  await f.evaluate((value) => {
    const s = window.EntryDemo.get();
    window.EntryDemo.dispatch('APPROVAL_RESULT', { request: s.request, result: value });
  }, result);
}

// New-person primary path: ends in first-use Home, preserving Sam.
{
  const {ctx,page,ui}=await open();
  await ui.locator('#entry-screen[data-state="welcome"]').waitFor();
  await shot(page,'welcome','Welcome','Primary path');
  await ui.getByRole('button',{name:'Continue with email'}).click();
  await shot(page,'email','Email entry','Primary path');
  await ui.locator('#email').fill('sam@example.com');
  await ui.getByRole('button',{name:'Send code'}).click();
  await shot(page,'code','Email code','Primary path');
  await ui.locator('#code').fill('123456');
  await ui.getByRole('button',{name:'Continue'}).click();
  await shot(page,'profile','Name for groups','Primary path');
  await ui.locator('#name').fill('Sam');
  await ui.getByRole('button',{name:'Continue'}).click();
  await shot(page,'ready-new','Signed in — new person','Primary path');
  await ui.getByRole('button',{name:'Open ChopDot'}).click();
  await ui.locator('body[data-home-fixture="first-use"]').waitFor();
  await shot(page,'home-first-use','Home / Orientation — first use','Primary path');
  await ctx.close();
}

// Returning person: populated Golden Home remains associated with Dev.
{
  const {ctx,page,ui}=await open();
  await ui.getByRole('button',{name:'Continue with email'}).click();
  await ui.locator('#email').fill('dev@example.com');
  await ui.getByRole('button',{name:'Send code'}).click();
  await ui.locator('#code').fill('123456');
  await ui.getByRole('button',{name:'Continue'}).click();
  await ui.getByRole('button',{name:'Open ChopDot'}).click();
  await ui.locator('body[data-home-fixture="returning"]').waitFor();
  await shot(page,'home-returning','Home / Orientation — returning person','Primary path');
  await ctx.close();
}

// Invite + returning person.
{
  const {ctx,page,ui}=await open('invite');
  await ui.locator('#entry-screen[data-state="invite"]').waitFor();
  await shot(page,'invite-entry','Invite-context entry','Invite path');
  await ui.getByRole('button',{name:'Continue with email'}).click();
  await ui.locator('#email').fill('dev@example.com');
  await shot(page,'invite-email','Invite preserved during sign-in','Invite path');
  await ui.getByRole('button',{name:'Send code'}).click();
  await ui.locator('#code').fill('123456');
  await ui.getByRole('button',{name:'Continue'}).click();
  await shot(page,'ready-returning-invite','Returning person — invite preserved','Invite path');
  await ctx.close();
}

// Wallet choice, waiting and unknown states. Reviewer controls stay hidden; fixture result is injected by harness only.
{
  const {ctx,page,ui}=await open();
  await ui.getByRole('button',{name:'Use a wallet'}).click();
  await shot(page,'wallet','Wallet account choice','Wallet alternative');
  await ui.getByRole('button',{name:/Everyday/}).click();
  await shot(page,'approval-waiting','Wallet approval waiting','Wallet alternative');
  await setWalletResult(page,'unknown');
  await ui.locator('#entry-screen[data-state="approval-unknown"]').waitFor();
  await shot(page,'approval-unknown','Wallet result unknown','Wallet alternative');
  await ctx.close();
}

await browser.close();
writeFileSync(new URL('primary-manifest.json',out), JSON.stringify({gate:'A',viewport:'430x890',screens},null,2));
console.log(`Captured ${screens.length} primary Gate A screens.`);

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
async function shot(page,id,title,group) {
  const file = `${String(screens.length+1).padStart(2,'0')}-${id}.png`;
  await page.screenshot({ path: new URL(file,out).pathname, fullPage:true });
  screens.push({id,title,group,file});
}
async function walletResult(result, state, title) {
  const {ctx,page,ui}=await open();
  await ui.getByRole('button',{name:'Use a wallet'}).click();
  await ui.getByRole('button',{name:/Everyday/}).click();
  await ui.locator('#entry-screen[data-state="approval-waiting"]').waitFor();
  await ui.getByRole('button',{name:'Demo'}).click();
  await ui.getByRole('button',{name:`Test result: ${result}`}).click();
  await ui.locator(`#entry-screen[data-state="${state}"]`).waitFor();
  await shot(page,state,title,'Wallet alternative');
  await ctx.close();
}

// Primary path.
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
  await ui.getByText('Shared money, at a glance').waitFor();
  await shot(page,'home-j02','Home / Orientation','Primary path');
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

// Wallet states.
{
  const {ctx,page,ui}=await open();
  await ui.getByRole('button',{name:'Use a wallet'}).click();
  await shot(page,'wallet','Wallet account choice','Wallet alternative');
  await ui.getByRole('button',{name:/Everyday/}).click();
  await shot(page,'approval-waiting','Wallet approval waiting','Wallet alternative');
  await ctx.close();
}
await walletResult('unknown','approval-unknown','Wallet result unknown');
await walletResult('declined','approval-declined','Wallet sign-in declined');
await walletResult('expired','approval-expired','Wallet request expired');

// Resilience states exposed by the Golden routes.
for (const [hash,id,title] of [
  ['offline','offline','Offline sign-in'],
  ['session-expired','session-expired','Session expired'],
  ['wrong-account','wrong-account','Wrong account'],
  ['load-error','load-error','Could not finish sign-in']
]) {
  const {ctx,page,ui}=await open();
  const frame=page.frames().find(f=>f.url().includes('/01-enter-chopdot/v1-candidate.html'));
  await frame.goto(`${frame.url().split('#')[0]}#${hash}`,{waitUntil:'networkidle'});
  await ui.locator(`#entry-screen[data-state="${id}"]`).waitFor();
  await shot(page,id,title,'Resilience / recovery');
  await ctx.close();
}

// C1 guest successor: invite-context only.
{
  const {ctx,page,ui}=await open('guest-invite');
  await ui.getByRole('heading',{name:'See the group before you decide.'}).waitFor();
  await shot(page,'guest-private-invite','C1 guest — private invite context','C1 guest successor');
  await ui.getByRole('button',{name:'Review invite as guest'}).click();
  await shot(page,'guest-handoff','C1 guest — handoff to J04','C1 guest successor');
  await ctx.close();
}

await browser.close();
writeFileSync(new URL('manifest.json',out), JSON.stringify({gate:'A',viewport:'430x890',screens},null,2));
console.log(`Captured ${screens.length} Gate A screens.`);

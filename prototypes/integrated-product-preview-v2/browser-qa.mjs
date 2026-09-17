import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env.PREVIEW_V2_BASE_URL || 'http://127.0.0.1:4173/prototypes/integrated-product-preview-v2/index.html';
const out = new URL('./artifacts/', import.meta.url);
mkdirSync(out, { recursive: true });
const report = { gate:'A', viewports:[], paths:[], securityNegatives:[], screenshots:[], errors:[] };
const browser = await chromium.launch({ headless:true });
const assert = (condition,message) => { if (!condition) throw new Error(message); };

async function captureErrors(page,label){
  const errors=[];
  page.on('pageerror',err=>errors.push(`${label} page: ${String(err)}`));
  page.on('console',msg=>{ if(msg.type()==='error') errors.push(`${label} console: ${msg.text()}`); });
  page.on('requestfailed',req=>errors.push(`${label} network request failed: ${req.method()} ${req.url()} ${req.failure()?.errorText||''}`));
  page.on('response',res=>{ if(res.status()>=400 && !res.url().endsWith('/favicon.ico')) errors.push(`${label} network ${res.status()}: ${res.request().method()} ${res.url()}`); });
  return errors;
}
async function shot(page,name){ const file=`${name}.png`; await page.screenshot({path:new URL(file,out).pathname,fullPage:true}); report.screenshots.push(file); }
async function auth(page){ return page.evaluate(()=>window.ChopDotPreviewV2?.getSessionAuthority()||null); }
async function connected(page){ return page.evaluate(()=>window.ChopDotPreviewV2?.getConnectedAccount()||null); }
async function signInNew(ui,email='sam@example.com',name='Sam'){
  await ui.locator('#entry-screen[data-state="welcome"]').waitFor();
  await ui.getByRole('button',{name:'Continue with email'}).click();
  await ui.locator('#email').fill(email); await ui.getByRole('button',{name:'Send code'}).click();
  await ui.locator('#entry-screen[data-state="code"]').waitFor(); await ui.locator('#code').fill('123456'); await ui.getByRole('button',{name:'Continue'}).click();
  await ui.locator('#entry-screen[data-state="profile"]').waitFor(); await ui.locator('#name').fill(name); await ui.getByRole('button',{name:'Continue'}).click();
  await ui.locator('#entry-screen[data-state="ready"]').waitFor();
}
async function signInReturning(ui,email='dev@example.com'){
  await ui.getByRole('button',{name:'Continue with email'}).click(); await ui.locator('#email').fill(email); await ui.getByRole('button',{name:'Send code'}).click();
  await ui.locator('#code').fill('123456'); await ui.getByRole('button',{name:'Continue'}).click(); await ui.locator('#entry-screen[data-state="ready"]').waitFor();
}

for(const vp of [{width:393,height:852},{width:430,height:890}]){
  const ctx=await browser.newContext({viewport:vp}); const page=await ctx.newPage(); const errors=await captureErrors(page,`${vp.width}x${vp.height}`);
  await page.goto(`${base}?entry=account`,{waitUntil:'networkidle'}); await page.waitForFunction(()=>Boolean(window.ChopDotPreviewV2)); const ui=page.frameLocator('#product-frame');
  await ui.locator('#entry-screen[data-state="welcome"]').waitFor(); await ui.getByText('Start with an email. No wallet needed.').waitFor();
  assert(!(await ui.locator('.entry-demobadge').isVisible()),`Demo/reviewer badge leaked at ${vp.width}x${vp.height}`);
  await signInNew(ui); await shot(page,`gate-a-before-home-${vp.width}x${vp.height}`);
  await page.evaluate(()=>{ sessionStorage.setItem('chopdot.preview-v2.connected-account',JSON.stringify({account:'attacker-wallet',connected:true})); localStorage.setItem('chopdot.preview-v2.last-entry',JSON.stringify({name:'DP',email:'dev@example.com',connectedAccount:'attacker-wallet'})); const d=document.getElementById('product-frame')?.contentDocument; if(d?.body){const e=d.createElement('button');e.id='stale-connected-residue';e.setAttribute('aria-pressed','true');e.textContent='Connected';e.hidden=true;d.body.appendChild(e);} });
  await ui.getByRole('button',{name:'Open ChopDot'}).click(); await page.waitForFunction(()=>window.ChopDotPreviewV2?.getCurrentJourney()==='J02');
  await ui.getByRole('heading',{name:'Welcome, Sam.'}).waitFor(); await ui.getByText('No groups yet').waitFor();
  const a=await auth(page); assert(a?.participant?.displayName==='Sam','J02 participant name mismatch'); assert(a?.participant?.email==='sam@example.com','J02 participant email mismatch'); assert(a?.participant?.isNew===true,'new-person flag lost');
  assert(a?.connectedAccount===null && await connected(page)===null,'authentication forged connected-account authority'); assert((await ui.locator('.avatar').innerText())==='S','static DP avatar leaked'); assert(!(await ui.locator('.wallet').isVisible()),'wallet fixture leaked'); assert(!(await ui.locator('.groups').isVisible()),'pre-existing groups leaked'); assert((await ui.locator('.add-tab').getAttribute('aria-disabled'))==='true','Add escaped Gate-B staging boundary');
  const visible=await ui.locator('body').innerText(); assert(!/Polkadot wallet|DP\b|2 things need you/u.test(visible),'unrelated populated fixture leaked'); assert(!/[⌂◎◴◉▦]/u.test(visible),'placeholder icons leaked');
  await shot(page,`gate-a-after-home-${vp.width}x${vp.height}`); report.viewports.push(`${vp.width}x${vp.height}`); report.paths.push(`${vp.width}x${vp.height}: live welcome→email→code→name→signed-in→identity-projected J02`); report.securityNegatives.push(`${vp.width}x${vp.height}: stale storage/DOM connected residue ignored; no connected authority`); report.errors.push(...errors); await ctx.close();
}

// refresh/restart fail closed instead of trusting browser residue
{
  const ctx=await browser.newContext({viewport:{width:430,height:890}}); const page=await ctx.newPage(); const errors=await captureErrors(page,'refresh-restart'); await page.goto(`${base}?entry=account`,{waitUntil:'networkidle'}); const ui=page.frameLocator('#product-frame');
  await signInNew(ui); await ui.getByRole('button',{name:'Open ChopDot'}).click(); await page.waitForFunction(()=>window.ChopDotPreviewV2?.getCurrentJourney()==='J02'); await page.reload({waitUntil:'networkidle'}); await ui.locator('#entry-screen[data-state="welcome"]').waitFor(); assert(await auth(page)===null,'refresh rehydrated participant authority'); assert(await connected(page)===null,'refresh rehydrated connected authority'); await shot(page,'gate-a-recovery-refresh-fail-closed-430x890');
  await page.evaluate(()=>sessionStorage.setItem('chopdot.preview-v2.session',JSON.stringify({participant:{displayName:'DP'},connectedAccount:{account:'stale'}}))); const second=await ctx.newPage(); report.errors.push(...await captureErrors(second,'restart')); await second.goto(`${base}?entry=account`,{waitUntil:'networkidle'}); await second.frameLocator('#product-frame').locator('#entry-screen[data-state="welcome"]').waitFor(); assert(await auth(second)===null && await connected(second)===null,'restart trusted stale browser authority'); report.securityNegatives.push('refresh/restart fail closed instead of hydrating stale participant/account residue'); report.errors.push(...errors); await ctx.close();
}

// Back/Forward cannot mint authority
{
  const ctx=await browser.newContext({viewport:{width:430,height:890}}); const page=await ctx.newPage(); const errors=await captureErrors(page,'back-forward'); await page.goto(`${base}?entry=account`,{waitUntil:'networkidle'}); const ui=page.frameLocator('#product-frame'); await ui.getByRole('button',{name:'Continue with email'}).click(); await ui.locator('#email').fill('sam@example.com'); await ui.getByRole('button',{name:'Send code'}).click(); await ui.locator('#entry-screen[data-state="code"]').waitFor(); const f=page.frames().find(x=>x.url().includes('/01-enter-chopdot/v1-candidate.html')); assert(f,'J01 frame missing'); await f.evaluate(()=>history.back()); await ui.locator('#entry-screen[data-state="email"]').waitFor(); assert(await auth(page)===null,'Back minted authority'); await f.evaluate(()=>history.forward()); await ui.locator('#entry-screen[data-state="code"]').waitFor(); assert(await auth(page)===null,'Forward minted authority'); await shot(page,'gate-a-recovery-back-forward-430x890'); report.securityNegatives.push('Back/Forward uses canonical J01 history and cannot mint identity/account authority'); report.errors.push(...errors); await ctx.close();
}

// direct-J02 and direct caller fail closed
{
  const ctx=await browser.newContext({viewport:{width:430,height:890}}); const page=await ctx.newPage(); const errors=await captureErrors(page,'direct-j02'); await page.goto(`${base}?journey=J02`,{waitUntil:'networkidle'}); const ui=page.frameLocator('#product-frame'); await ui.locator('#entry-screen[data-state="welcome"]').waitFor(); await page.evaluate(()=>window.ChopDotPreviewV2.openHome()); await ui.locator('#entry-screen[data-state="welcome"]').waitFor(); assert(await auth(page)===null && await connected(page)===null,'direct J02 synthesized authority'); report.securityNegatives.push('direct-J02 query and direct openHome caller both fail closed'); report.errors.push(...errors); await ctx.close();
}

// returning-user + invite continuity
{
  const ctx=await browser.newContext({viewport:{width:430,height:890}}); const page=await ctx.newPage(); const errors=await captureErrors(page,'invite-auth'); await page.goto(`${base}?entry=invite`,{waitUntil:'networkidle'}); const ui=page.frameLocator('#product-frame'); await ui.locator('#entry-screen[data-state="invite"]').waitFor(); await ui.getByText('Geneva Weekend').waitFor(); await signInReturning(ui); await ui.getByText('Your invite is right where you left it.').waitFor(); await ui.getByText('You have not joined yet.').waitFor(); await ui.getByRole('button',{name:'Continue to invite'}).click(); await page.waitForFunction(()=>Boolean(window.ChopDotPreviewV2?.getSessionAuthority())); const a=await auth(page); assert(a?.participant?.email==='dev@example.com','returning identity lost'); assert(a?.destination==='invite' && a?.invite?.title==='Geneva Weekend','invite continuity lost'); assert(a?.connectedAccount===null,'returning auth created connected account'); report.paths.push('returning-user + Geneva Weekend invite continuity survives canonical J01 authentication'); report.securityNegatives.push('returning authentication does not imply connected-account authority'); report.errors.push(...errors); await ctx.close();
}

// guest→sign-in uses coherent fixture and no implicit account link
{
  const ctx=await browser.newContext({viewport:{width:430,height:890}}); const page=await ctx.newPage(); const errors=await captureErrors(page,'guest-sign-in'); await page.goto(`${base}?entry=guest-invite`,{waitUntil:'networkidle'}); const ui=page.frameLocator('#product-frame'); await ui.getByRole('heading',{name:'See the group before you decide.'}).waitFor(); await ui.getByText('Geneva Weekend').waitFor(); await ui.getByText('Invited by Devinson · 3 people').waitFor(); let visible=await ui.locator('body').innerText(); assert(!/Chop\.Dot|Phase C1|successor candidate|Alps weekend|Maya · 4 people|\bJ04\b/u.test(visible),'guest review-artifact/internal journey chrome leaked'); await shot(page,'gate-a-guest-integrated-430x890'); await ui.getByRole('button',{name:'Review invite as guest'}).click(); await ui.getByText('Nothing is joined yet. Your place is created only after you explicitly choose to join.').waitFor(); await ui.getByRole('button',{name:'Continue',exact:true}).waitFor(); visible=await ui.locator('body').innerText(); assert(!/\bJ04\b/u.test(visible),'internal journey identifier leaked on guest handoff'); assert(await auth(page)===null && await connected(page)===null,'guest review minted authority'); await ui.getByRole('button',{name:'Back to invite'}).click(); await ui.getByRole('button',{name:'Sign in instead'}).click(); await ui.locator('#entry-screen[data-state="invite"]').waitFor(); await signInReturning(ui); await ui.getByRole('button',{name:'Continue to invite'}).click(); await page.waitForFunction(()=>Boolean(window.ChopDotPreviewV2?.getSessionAuthority())); const a=await auth(page); assert(a?.participant?.email==='dev@example.com' && a?.invite?.title==='Geneva Weekend','guest→sign-in continuity lost'); assert(a?.connectedAccount===null,'guest→sign-in auto-linked account'); report.paths.push('guest invite → canonical sign-in keeps one Geneva Weekend fixture and authenticated participant'); report.securityNegatives.push('guest→sign-in cannot create connected-account authority; explicit link remains outside Gate A'); report.errors.push(...errors); await ctx.close();
}

// reviewer-only wallet outcome controls; wallet auth remains auth, not connect
{
  const ctx=await browser.newContext({viewport:{width:430,height:890}}); const page=await ctx.newPage(); const errors=await captureErrors(page,'wallet-auth-not-connect'); await page.goto(`${base}?entry=account&review=1`,{waitUntil:'networkidle'}); const ui=page.frameLocator('#product-frame'); await ui.getByRole('button',{name:'Use a wallet'}).click(); await ui.getByRole('button',{name:/Everyday/}).click(); await ui.locator('#entry-screen[data-state="approval-waiting"]').waitFor(); await ui.getByRole('button',{name:'Demo'}).click(); await ui.getByRole('button',{name:'Test result: approval verified'}).click(); await ui.locator('#entry-screen[data-state="ready"]').waitFor(); await ui.getByRole('button',{name:'Open ChopDot'}).click(); await page.waitForFunction(()=>window.ChopDotPreviewV2?.getCurrentJourney()==='J02'); const a=await auth(page); assert(a?.participant?.authMethod==='wallet-sign-in','wallet auth method lost'); assert(a?.connectedAccount===null && await connected(page)===null,'wallet sign-in became account link'); assert(!(await ui.locator('.wallet').isVisible()),'connected-wallet UI leaked'); report.securityNegatives.push('wallet authentication is not account-link authority'); report.errors.push(...errors); await ctx.close();
}

await browser.close();
if(report.errors.length) throw new Error(report.errors.join('\n'));
writeFileSync(new URL('gate-a-summary.json',out),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const base=process.env.PREVIEW_V2_BASE_URL||'http://127.0.0.1:4173/prototypes/integrated-product-preview-v2/index.html';
const out=new URL('./artifacts/',import.meta.url);mkdirSync(out,{recursive:true});
const report={gate:'A',viewports:[],paths:[],errors:[]};
const browser=await chromium.launch({headless:true});
const watch=(page,label)=>{page.on('pageerror',e=>report.errors.push(`${label}: ${String(e)}`));page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('Failed to load resource:'))report.errors.push(`${label}: ${m.text()}`)});page.on('response',res=>{if(res.status()>=400&&!res.url().endsWith('/favicon.ico'))report.errors.push(`${label}: HTTP ${res.status()} ${res.url()}`)})};
const mature=['You’re almost square.','2 things need you','Zurich Weekend','Apartment','Ski Trip','Polkadot wallet'];

for(const vp of [{width:393,height:852},{width:430,height:890}]){
  const context=await browser.newContext({viewport:vp});const page=await context.newPage();watch(page,`guest-${vp.width}x${vp.height}`);
  await page.goto(base,{waitUntil:'networkidle'});
  await page.getByText('Share & chop.',{exact:true}).waitFor();
  await page.screenshot({path:new URL(`gate-a-front-door-${vp.width}x${vp.height}.png`,out).pathname,fullPage:true});
  await page.getByRole('button',{name:'Continue as guest'}).click();
  await page.waitForFunction(()=>window.ChopDotPreviewV2?.getCurrentJourney()==='J02'&&window.ChopDotPreviewV2?.getHomeMode()==='guest');
  const product=page.frameLocator('#product-frame');
  await product.getByRole('heading',{name:'Start your first split.'}).waitFor();
  await product.getByText('No groups yet.').waitFor();
  const body=await product.locator('body').innerText();
  for(const token of mature)if(body.includes(token))throw new Error(`Guest Home leaked mature fixture: ${token}`);
  if(await product.locator('.wallet').isVisible())throw new Error('Guest Home exposed wallet');
  await page.screenshot({path:new URL(`gate-a-guest-first-use-${vp.width}x${vp.height}.png`,out).pathname,fullPage:true});
  report.viewports.push(`${vp.width}x${vp.height}`);
  await context.close();
}

{
  const context=await browser.newContext({viewport:{width:430,height:890}});const page=await context.newPage();watch(page,'guest-local-loop');
  await page.goto(base,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Continue as guest'}).click();
  let product=page.frameLocator('#product-frame');
  await product.getByRole('button',{name:'Start a group'}).click();
  await page.waitForFunction(()=>window.ChopDotPreviewV2?.getCurrentJourney()==='J03');
  product=page.frameLocator('#product-frame');
  await product.getByLabel('Group name').fill('Local Weekend');
  await product.getByRole('link',{name:'Create group'}).click();
  await product.getByRole('heading',{name:'Local Weekend is ready.'}).waitFor();
  await product.locator('#success').getByText('Local draft · saved on this device').waitFor();
  await page.screenshot({path:new URL('gate-a-local-group-created-430x890.png',out).pathname,fullPage:true});
  await product.getByRole('link',{name:/Add expense/}).click();
  await page.waitForFunction(()=>window.ChopDotPreviewV2?.getCurrentJourney()==='J05');
  product=page.frameLocator('#product-frame');

  // Human-walkthrough regression: Back from Add Expense must return to the real integrated group,
  // never the isolated Golden's "Journey 08 leads here" handoff artifact.
  await product.getByRole('link',{name:'Back'}).click();
  await page.waitForFunction(()=>window.ChopDotPreviewV2?.getCurrentJourney()==='J02');
  product=page.frameLocator('#product-frame');
  await product.getByText('Local Weekend',{exact:true}).waitFor();
  if((await product.locator('body').innerText()).includes('Journey 08 leads here'))throw new Error('J05 Back exposed isolated handoff artifact');

  await product.getByRole('button',{name:'Add expense'}).click();
  await page.waitForFunction(()=>window.ChopDotPreviewV2?.getCurrentJourney()==='J05');
  product=page.frameLocator('#product-frame');

  // Human-walkthrough regression: guest drafts may add name-only local people without creating an account.
  await product.getByRole('link',{name:/Paid by Who covered it/}).click();
  await product.getByRole('heading',{name:'Who paid?'}).waitFor();
  await product.getByRole('button',{name:/Add person/}).click();
  await product.getByLabel('Person name').fill('Jeanine');
  await product.locator('.guest-person-editor').getByRole('button',{name:'Add person'}).click();
  await product.getByRole('link',{name:/Paid by Who covered it/}).waitFor();
  await product.getByText('Jeanine',{exact:true}).waitFor();

  await product.getByText('Split equally',{exact:true}).click();
  await product.getByRole('heading',{name:'Who shared it?'}).waitFor();
  await product.getByText('Jeanine',{exact:true}).waitFor();
  await product.getByRole('link',{name:'Done'}).click();
  await product.getByText(/2 people/).waitFor();

  await product.getByLabel('Amount').fill('42');
  await product.getByLabel('Description').fill('Coffee');
  await page.screenshot({path:new URL('gate-a-local-add-expense-430x890.png',out).pathname,fullPage:true});
  await product.getByRole('link',{name:'Add expense'}).last().click();
  await product.getByRole('heading',{name:'Coffee added.'}).waitFor();
  await product.getByText('Saved locally.').waitFor();
  await product.getByRole('link',{name:'Back to group'}).click();
  await page.waitForFunction(()=>window.ChopDotPreviewV2?.getCurrentJourney()==='J02');
  product=page.frameLocator('#product-frame');
  await product.getByText('Local Weekend',{exact:true}).waitFor();
  await product.getByText('1 expense',{exact:true}).waitFor();
  await product.getByText('2 people',{exact:false}).waitFor();
  const guestState=await page.evaluate(()=>window.ChopDotPreviewV2?.getGuestState());
  if(guestState?.people?.length!==1||guestState.people[0]?.name!=='Jeanine')throw new Error('Local draft person did not persist');
  if(guestState?.expenses?.[0]?.payerId!==guestState.people[0]?.id)throw new Error('Selected local payer was not preserved on expense');
  await product.getByRole('button',{name:'Invite someone'}).click();
  await page.getByRole('heading',{name:'Ready to share?'}).waitFor();
  await page.getByText("Everything you've done stays.",{exact:true}).waitFor();
  await page.screenshot({path:new URL('gate-a-account-boundary-430x890.png',out).pathname,fullPage:true});
  await page.getByRole('button',{name:'Not now'}).click();
  await page.waitForFunction(()=>window.ChopDotPreviewV2?.getCurrentJourney()==='J02');
  product=page.frameLocator('#product-frame');
  await product.getByText('Local Weekend',{exact:true}).waitFor();
  await product.getByText('1 expense',{exact:true}).waitFor();
  await page.screenshot({path:new URL('gate-a-local-loop-430x890.png',out).pathname,fullPage:true});
  await page.reload({waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Continue as guest'}).click();
  await page.waitForFunction(()=>window.ChopDotPreviewV2?.getCurrentJourney()==='J02'&&window.ChopDotPreviewV2?.getHomeMode()==='guest');
  product=page.frameLocator('#product-frame');
  await product.getByText('Local Weekend',{exact:true}).waitFor();
  await product.getByText('1 expense',{exact:true}).waitFor();

  await product.getByRole('button',{name:'Invite someone'}).click();
  await page.getByRole('button',{name:'Create account'}).click();
  product=page.frameLocator('#product-frame');
  await product.locator('#entry-screen[data-state="email"]').waitFor();
  await product.getByLabel('Email').fill('sam@example.com');
  await product.getByRole('button',{name:'Send code'}).click();
  await product.getByLabel('6-digit code').fill('123456');
  await product.getByRole('button',{name:'Continue'}).click();
  await product.getByLabel('Your name').fill('Sam');
  await product.getByRole('button',{name:'Continue'}).click();
  await product.getByRole('button',{name:'Open ChopDot'}).click();
  await page.waitForFunction(()=>window.ChopDotPreviewV2?.getCurrentJourney()==='J02'&&window.ChopDotPreviewV2?.getHomeMode()==='converted');
  product=page.frameLocator('#product-frame');
  await product.getByRole('heading',{name:'Your work is still here.'}).waitFor();
  await product.getByText('Local Weekend',{exact:true}).waitFor();
  await product.getByText('1 expense',{exact:true}).waitFor();
  await page.screenshot({path:new URL('gate-a-converted-home-430x890.png',out).pathname,fullPage:true});
  report.paths.push('front door → guest local group + expense → share boundary → Not now/reload preserve → Create account preserves same local work');
  await context.close();
}

{
  const context=await browser.newContext({viewport:{width:430,height:890}});const page=await context.newPage();watch(page,'invite-context');
  await page.goto(`${base}?entry=invite`,{waitUntil:'networkidle'});
  const product=page.frameLocator('#product-frame');
  await product.locator('#entry-screen[data-state="invite"]').waitFor();
  await product.getByText('Geneva Weekend').waitFor();
  if(await page.locator('#front-door').isVisible())throw new Error('Generic front door appeared ahead of invite context');
  report.paths.push('deep invite context bypasses generic front door');
  await context.close();
}

await browser.close();
if(report.errors.length)throw new Error(report.errors.join('\n'));
writeFileSync(new URL('gate-a-summary.json',out),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));

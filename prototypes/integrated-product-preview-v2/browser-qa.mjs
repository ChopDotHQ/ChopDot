import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const base=process.env.PREVIEW_V2_BASE_URL||'http://127.0.0.1:4173/prototypes/integrated-product-preview-v2/index.html';
const out=new URL('./artifacts/',import.meta.url);mkdirSync(out,{recursive:true});
const report={gate:'A',viewports:[],paths:[],errors:[]};
const browser=await chromium.launch({headless:true});
const watch=(page,label)=>{page.on('pageerror',e=>report.errors.push(`${label}: ${String(e)}`));page.on('console',m=>{if(m.type()==='error')report.errors.push(`${label}: ${m.text()}`)})};
const mature=['You’re almost square.','2 things need you','Zurich Weekend','Apartment','Ski Trip','Polkadot wallet'];

for(const vp of [{width:393,height:852},{width:430,height:890}]){
  const context=await browser.newContext({viewport:vp});const page=await context.newPage();watch(page,`guest-${vp.width}x${vp.height}`);
  await page.goto(base,{waitUntil:'networkidle'});
  await page.getByText('Share & chop.',{exact:true}).waitFor();
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
  await product.getByRole('link',{name:/Add expense/}).click();
  await page.waitForFunction(()=>window.ChopDotPreviewV2?.getCurrentJourney()==='J05');
  product=page.frameLocator('#product-frame');
  await product.getByLabel('Amount').fill('42');
  await product.getByLabel('Description').fill('Coffee');
  await product.getByRole('link',{name:'Add expense'}).last().click();
  await product.getByRole('heading',{name:'Coffee added.'}).waitFor();
  await product.getByText('Saved locally.').waitFor();
  await product.getByRole('link',{name:'Back to group'}).click();
  await page.waitForFunction(()=>window.ChopDotPreviewV2?.getCurrentJourney()==='J02');
  product=page.frameLocator('#product-frame');
  await product.getByText('Local Weekend',{exact:true}).waitFor();
  await product.getByText('1 expense',{exact:true}).waitFor();
  await product.getByRole('button',{name:'Invite someone'}).click();
  await page.getByRole('heading',{name:'Ready to share?'}).waitFor();
  await page.getByText("Everything you've done stays.",{exact:true}).waitFor();
  await page.getByRole('button',{name:'Not now'}).click();
  await page.waitForFunction(()=>window.ChopDotPreviewV2?.getCurrentJourney()==='J02');
  product=page.frameLocator('#product-frame');
  await product.getByText('Local Weekend',{exact:true}).waitFor();
  await product.getByText('1 expense',{exact:true}).waitFor();
  await page.screenshot({path:new URL('gate-a-local-loop-430x890.png',out).pathname,fullPage:true});
  report.paths.push('front door → honest guest Home → Golden J03 local group → Golden J05 local expense → invite/account boundary → Not now preserves local work');
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

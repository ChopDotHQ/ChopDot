import { chromium } from '/workspace/chopdot-prototype-tools/node_modules/playwright/index.mjs';
import { serve } from '/workspace/work/j01-candidate/prototypes/integrated-product-preview-v2/gate-b/test-server.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const out='/workspace/work/independent-j01'; mkdirSync(out,{recursive:true});
const host=await serve('/tmp/chopdot-j01-repair.bC2Mz4K7/preview');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const report={checks:[],screens:[],browser:browser.version()};
try {
for(const width of [393,430]) {
 const context=await browser.newContext({viewport:{width,height:width===393?852:890}}),page=await context.newPage();
 const f=()=>page.frameLocator('#product-frame'),b=name=>f().getByRole('button',{name,exact:true}).click();
 const snap=async name=>{await page.screenshot({path:`${out}/${name}-${width}.png`});report.screens.push(`${name}-${width}.png`);report.checks.push({width,name,url:page.url(),text:await f().locator('body').innerText(),surface:await f().locator('body').evaluate(()=>({focus:document.activeElement?.outerHTML,overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('button')].filter(x=>x.getClientRects().length).map(x=>{const r=x.getBoundingClientRect(),s=getComputedStyle(x);return {label:x.getAttribute('aria-label')||x.textContent,width:r.width,height:r.height,font:s.fontSize,color:s.color,background:s.backgroundColor,outline:s.outline}})}))});};
 await page.goto(host.base+'/prototypes/integrated-product-preview-v2/index.html?entry=signin');
 await f().getByLabel('Email',{exact:true}).fill('dev@example.com');await b('Send code');
 await f().getByLabel('6-digit code').waitFor();await snap('code');await b('Send a new code');
 await f().getByText('New prototype code ready. Use 123456.',{exact:true}).waitFor();await snap('resend');
 await b('Change email');await b('Use a wallet instead');await b('Everyday Account ending 9Kq');await snap('wallet-pending');
 const s1=await f().locator('body').evaluate(()=>window.EntryDemo.walletProviderEvidence());
 await b('Simulate unknown result');await snap('wallet-unknown');await b('Simulate verified approval');
 await f().locator('#entry-screen[data-state="ready"]').waitFor();await snap('wallet-ready');
 await b('Use a different account');await b('Use a wallet instead');await b('Everyday Account ending 9Kq');
 const s2=await f().locator('body').evaluate(()=>window.EntryDemo.walletProviderEvidence());
 for(const outcome of ['approved','declined','unknown']) {
  await f().locator('body').evaluate((el,evidence)=>window.EntryDemo.deliverWalletProviderEvidence(evidence),s1);
  await b({'approved':'Simulate verified approval','declined':'Simulate declined approval','unknown':'Simulate unknown result'}[outcome]);
  const state=await f().locator('body').evaluate(()=>window.EntryDemo.get());assert.equal(state.verified,false);assert.equal(state.route,'approval-waiting');
  report.checks.push({width,name:'stale-wallet-'+outcome,passed:true});
 }
 await f().locator('body').evaluate((el,evidence)=>window.EntryDemo.deliverWalletProviderEvidence(evidence),s2);
 await b('Simulate declined approval');await snap('wallet-declined');await b('Try again');
 await f().locator('body').evaluate(()=>window.EntryDemo.dispatch('APPROVAL_RESULT',window.EntryModel.walletApprovalResult(window.EntryDemo.walletProviderEvidence(),'expired')));
 await snap('wallet-expired');await b('Try again');await b('Simulate verified approval');await f().locator('#entry-screen[data-state="ready"]').waitFor();
 await snap('wallet-recovered');
 await b('Use a different account');await f().getByLabel('Email',{exact:true}).fill('example@example.com');await b('Send code');await page.reload();
 await f().getByLabel('Email',{exact:true}).waitFor();assert.equal(await f().getByLabel('Email',{exact:true}).inputValue(),'');await snap('reload');
 report.checks.push({width,name:'storage-after-reload',storage:await page.evaluate(()=>({local:Object.fromEntries(Object.entries(localStorage)),session:Object.fromEntries(Object.entries(sessionStorage))}))});
 await context.close();
}
report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}
finally{writeFileSync(out+'/results.json',JSON.stringify(report,null,2));await browser.close();await host.close();}
console.log(JSON.stringify({status:report.status,observations:report.checks.length,error:report.error}));

import '../gate-b/browser-launch.mjs';
import {chromium} from 'playwright';
import {serve} from '../gate-b/test-server.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const out=process.env.EVIDENCE_DIR;mkdirSync(out,{recursive:true});const checks=[],errors=[];
const browser=await chromium.launch({headless:true}),host=await serve(process.env.PREVIEW_ROOT,0,{cleanIndex:true});
try{
 const startup=await browser.newContext(),early=await startup.newPage();let release;
 const hold=new Promise(resolve=>{release=resolve;});
 await early.route('**/gate-b/contract/semantic-core.json',async route=>{await hold;await route.continue();});
 await early.goto(host.base+'/prototypes/integrated-product-preview-v2/index.html',{waitUntil:'commit'});
 await early.getByRole('button',{name:'Continue as guest',exact:true}).waitFor();
 assert.equal(await early.getByRole('button',{name:'Continue as guest',exact:true}).isEnabled(),false);
 release();await early.getByRole('button',{name:'Continue as guest',exact:true}).click();
 await early.frameLocator('#product-frame').getByRole('button',{name:'Start a group',exact:true}).waitFor();
 checks.push('Entry controls wait for the frozen contract and event handlers before accepting a click');await startup.close();
 for(const width of [393,430,1440]){
 const ctx=await browser.newContext({viewport:{width,height:900}}),page=await ctx.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(host.base+'/prototypes/integrated-product-preview-v2/demo.html');
 await page.getByRole('link',{name:'Open prototype',exact:true}).click();await page.getByRole('button',{name:'Continue as guest'}).click();
 const f=page.frameLocator('#product-frame');await f.getByRole('button',{name:'Start a group',exact:true}).click();await f.getByLabel('Group name',{exact:true}).fill('Demo continuity');await f.locator('#entry').getByRole('link',{name:'Create group',exact:true}).click();await f.locator('#success').getByRole('link',{name:'Add expense',exact:true}).click();
 await f.getByLabel('Amount',{exact:true}).fill('12.34');await f.getByLabel('Description',{exact:true}).fill('Guest draft');await page.reload();assert.equal(await f.getByLabel('Description',{exact:true}).inputValue(),'Guest draft');
 const raw=await page.evaluate(()=>JSON.parse(localStorage.getItem('chopdot.preview-v2.guest')));assert.equal(Object.hasOwn(raw,'expenseDraft'),false);assert.equal(Object.values(raw.gateB.drafts)[0].amountText,'12.34');checks.push(width+' guest reload restores editor with one canonical draft');
 await f.locator('#entry').getByRole('link',{name:'Back',exact:true}).click();await f.getByRole('button',{name:'Open group',exact:true}).click();await f.locator('.app-content').getByRole('link',{name:'Add expense',exact:true}).click();assert.equal(await f.getByLabel('Description',{exact:true}).inputValue(),'Guest draft');await f.getByLabel('Description',{exact:true}).fill('Integrated change');
 await f.locator('#entry').getByRole('link',{name:'Back',exact:true}).click();await f.locator('[href="#home-handoff"][aria-label="Back"]').click();await f.getByRole('button',{name:'Add expense',exact:true}).click();assert.equal(await f.getByLabel('Description',{exact:true}).inputValue(),'Integrated change');checks.push(width+' guest and integrated editor share changes through real navigation');
 await page.goto(host.base+'/prototypes/integrated-product-preview-v2/demo.html');await page.getByText('Start over on this browser',{exact:true}).click();assert.equal(await page.getByRole('button',{name:'Delete local prototype data'}).isDisabled(),true);
 await page.evaluate(()=>{localStorage.setItem('unrelated-test-sentinel','retain');sessionStorage.setItem('unrelated-test-sentinel','retain');});
 await page.getByLabel('I want to delete this browser’s prototype data.').check();await page.getByRole('button',{name:'Delete local prototype data'}).click();assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('chopdot.preview-v2.guest'),localStorage.getItem('unrelated-test-sentinel'),sessionStorage.getItem('unrelated-test-sentinel')]),[null,'retain','retain']);checks.push(width+' reset requires consent and preserves unrelated storage');
 await page.screenshot({path:out+'/'+width+'-demo.png'});await page.getByRole('link',{name:'Open prototype',exact:true}).click();await page.getByRole('button',{name:'Continue as guest'}).click();await f.getByText('No groups yet.',{exact:true}).waitFor();checks.push(width+' reset returns to an empty real local state');
 await ctx.close();}
 assert.deepEqual(errors,[]);writeFileSync(out+'/results.json',JSON.stringify({status:'PASS',checks,errors},null,2));console.log(checks);
}finally{await browser.close();await host.close();}

import './gate-b/browser-launch.mjs';
import { chromium } from 'playwright';
import { serve } from './gate-b/test-server.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const out=process.env.EVIDENCE_DIR;mkdirSync(out,{recursive:true});
const host=await serve(process.env.PREVIEW_ROOT),browser=await chromium.launch({headless:true});
const checks=[],errors=[];let page;
const f=()=>page.frameLocator('#product-frame');
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('chopdot.preview-v2.guest')));
const record=(id)=>checks.push({id,result:'pass'});
const shot=async name=>page.screenshot({path:out+'/'+name+'.png'});
const sameSaved=(a,b)=>{for(const k of ['group','groups','people','expenses'])assert.deepEqual(b[k],a[k],k);};
const base=host.base+'/prototypes/integrated-product-preview-v2/index.html';
try{
for(const width of [393,430])for(const currency of ['CHF','EUR','USD']){
 const context=await browser.newContext({viewport:{width,height:width===393?852:890}});page=await context.newPage();page.setDefaultTimeout(10000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base);await page.getByRole('button',{name:'Continue as guest',exact:true}).click();
 await f().getByRole('button',{name:'Start a group',exact:true}).click();await f().getByLabel('Group name').fill('Existing review group');
 await page.goBack();await f().locator('body[data-preview-mode]').waitFor();assert.equal((await state()).group,null);await page.goForward();await f().getByLabel('Group name').waitFor();await page.reload();await f().getByLabel('Group name').waitFor();assert.equal(await f().getByLabel('Group name').inputValue(),'Existing review group');record(`${width}-${currency}-root-back-forward-draft`);
 await f().getByRole('link',{name:'Create group',exact:true}).click();await f().locator('#success:visible').waitFor();
 // Retain the existing local-person handoff; a name is not remote membership.
 await f().getByRole('link',{name:'Add people',exact:true}).click();await f().getByLabel('Person name').fill('Local review person');
 await f().getByRole('button',{name:'Add',exact:true}).click();await f().getByRole('button',{name:'Done',exact:true}).click();
 await f().getByRole('link',{name:'Add expense',exact:true}).click();await f().getByLabel('Amount',{exact:true}).fill('12.01');await f().getByLabel('Description',{exact:true}).fill('Preserved review expense');
 await f().locator('#entry').getByRole('link',{name:'Add expense',exact:true}).click();await f().getByRole('link',{name:'Back to group',exact:true}).click();await f().locator('.header-title').getByText('Existing review group',{exact:true}).waitFor();
 await f().locator('[aria-label="Back"][href="#home-handoff"]').click();await f().getByRole('button',{name:'Open group',exact:true}).waitFor();
 let original=await state();assert.equal(original.expenses[0].allocation.total.minorUnits,'1201');record(`${width}-${currency}-existing-handoffs`);
 await page.goto(base+'?guestCreate=1');await f().getByLabel('Group name').fill('J03 '+currency+' review');
 await f().locator('#entry [href="#currency"]').click();await f().getByRole('link',{name:currency==='CHF'?'CHF Swiss franc':currency==='EUR'?'EUR Euro':'USD US dollar',exact:true}).click();
 await f().locator('#entry:visible').waitFor();assert.equal(await f().locator('#entry .pill').innerText(),currency);sameSaved(original,await state());record(`${width}-${currency}-choice-not-creation`);
 await shot(`entry-${currency}-${width}`);
 await page.reload();await f().locator('#entry:visible').waitFor();assert.equal(await f().getByLabel('Group name').inputValue(),'J03 '+currency+' review');assert.equal(await f().locator('#entry .pill').innerText(),currency);sameSaved(original,await state());record(`${width}-${currency}-reload-draft`);
 await f().locator('#entry [href="#currency"]').click();await f().locator('#currency a[href="#entry"]').first().click();await f().locator('#entry:visible').waitFor();assert.equal(await f().locator('#entry .pill').innerText(),currency);sameSaved(original,await state());record(`${width}-${currency}-picker-back`);
 await page.goBack();await f().locator('#currency:visible').waitFor();await page.goForward();await f().locator('#entry:visible').waitFor();assert.equal(await f().getByLabel('Group name').inputValue(),'J03 '+currency+' review');sameSaved(original,await state());record(`${width}-${currency}-native-back-forward`);
 await f().getByRole('link',{name:'Create group',exact:true}).click();await f().locator('[id^=success]:visible').waitFor();let created=await state();
 assert.equal(created.group.name,'J03 '+currency+' review');assert.equal(created.group.currency,currency);assert.equal(created.groups.length,original.groups.length+1);assert.deepEqual(created.groups.find(g=>g.id===original.group.id),original.groups.find(g=>g.id===original.group.id));assert.deepEqual(created.expenses,original.expenses);assert.deepEqual(created.people,original.people);assert.equal(created.membership.creation,null);
 assert.match(await f().locator('[id^=success]:visible .group-meta').innerText(),/only you/);record(`${width}-${currency}-explicit-create-preserves-records`);await shot(`success-${currency}-${width}`);
 await page.reload();await f().locator('[id^=success]:visible').waitFor();assert.deepEqual((await state()).groups,created.groups);assert.deepEqual((await state()).expenses,created.expenses);record(`${width}-${currency}-success-reload-no-duplicate`);
 await f().getByRole('link',{name:'Add expense',exact:true}).click();await f().getByLabel('Amount',{exact:true}).waitFor();assert.equal((await state()).group.id,created.group.id);await f().getByRole('link',{name:'Back',exact:true}).click();await f().locator('body[data-preview-mode]').waitFor();await f().getByRole('button',{name:'Open '+created.group.name,exact:true}).click();await f().locator('.header-title').getByText(created.group.name,{exact:true}).waitFor();await f().locator('[aria-label="Back"][href="#home-handoff"]').click();await f().locator('body[data-preview-mode]').waitFor();assert.equal((await state()).group.currency,currency);assert.deepEqual((await state()).expenses,original.expenses);record(`${width}-${currency}-expense-group-home-return`);
 await shot(`home-${currency}-${width}`);await context.close();
}
assert.deepEqual(errors,[]);writeFileSync(out+'/results.json',JSON.stringify({status:'PASS',checks,errors},null,2));console.log(JSON.stringify({status:'PASS',count:checks.length}));
}catch(e){writeFileSync(out+'/results.json',JSON.stringify({status:'FAIL',checks,errors,error:e.stack},null,2));throw e;}finally{await browser.close();await host.close();}

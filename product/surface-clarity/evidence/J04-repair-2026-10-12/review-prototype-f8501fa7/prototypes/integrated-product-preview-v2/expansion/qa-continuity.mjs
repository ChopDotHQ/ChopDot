import '../gate-b/browser-launch.mjs';
import {chromium} from 'playwright';
import {serve} from '../gate-b/test-server.mjs';
import {upgrade} from '../gate-d/model.js';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const seed=upgrade({group:{id:'g',name:'Continuity group',currency:'CHF',membershipManaged:true,ownerId:'self'},people:[{id:'alex',name:'Alex',groupId:'g'}],expenses:[],accountCreated:true});
const browser=await chromium.launch({headless:true});let host;
const out=process.env.EVIDENCE_DIR;mkdirSync(out,{recursive:true});const checks=[],errors=[];let page;
try {
 for(const cleanIndex of [false,true]) {
 host=await serve(process.env.PREVIEW_ROOT,0,{cleanIndex});
 for(const width of [393,430,1440]) {
  const ctx=await browser.newContext({viewport:{width,height:width===393?852:width===430?890:1000}});
  await ctx.addInitScript(s=>{
   if(!localStorage.getItem('chopdot.preview-v2.guest'))localStorage.setItem('chopdot.preview-v2.guest',JSON.stringify(s));
   // Make the old asynchronous route protocol unavailable: an immediate reload
   // must depend on the currently committed route, not pending message delivery.
   addEventListener('message',e=>{if(e.data?.type?.endsWith('-route'))e.stopImmediatePropagation();});
  },seed);
  page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
  await page.goto(host.base+'/prototypes/integrated-product-preview-v2/index.html?fixtures=1&expansion='+encodeURIComponent('family=26&page=settings&group=g'));
  const f=page.frameLocator('#product-frame');
  await f.getByRole('button',{name:'Rename group',exact:true}).click();
  await f.getByRole('textbox',{name:'Group name',exact:true}).fill('Continuity '+width);
  assert.equal(new URL(page.url()).searchParams.get('expansion').includes('page=rename-edit'),true);
  await page.reload();
  assert.equal(await f.getByRole('textbox',{name:'Group name',exact:true}).inputValue(),'Continuity '+width);
  checks.push((cleanIndex?'directory ':'index.html ')+width+' immediate rename reload retains the exact draft and route without asynchronous messages');
  const before=page.url();
  const rejected=await page.evaluate(()=>{
   const child=document.querySelector('#product-frame').contentWindow;
   return [window.ChopDotPrototypeRoute.publish(child,'chopdot-expansion-route','#family=26&page=settings&group=g'),window.ChopDotPrototypeRoute.publish(window,'chopdot-expansion-route',child.location.hash),window.ChopDotPrototypeRoute.publish(child,'chopdot-gate-b-route',child.location.hash)];
  });
  assert.deepEqual(rejected,[false,false,false]);assert.equal(page.url(),before);
  checks.push((cleanIndex?'directory ':'index.html ')+width+' stale hash, foreign window and wrong owner cannot replace the current route');
  const control=f.getByRole('textbox',{name:'Group name',exact:true});
  await control.press('Tab');await page.keyboard.press('Shift+Tab');
  assert.equal(await control.evaluate(el=>el===document.activeElement),true);
  const metrics=await control.evaluate(el=>({width:el.getBoundingClientRect().width,border:getComputedStyle(el).borderRadius,font:getComputedStyle(el).fontSize}));
  assert.ok(metrics.width>200);assert.equal(metrics.border,'12px');assert.equal(metrics.font,'14px');
  checks.push((cleanIndex?'directory ':'index.html ')+width+' rename control uses the approved full-width rounded field and remains keyboard reachable');
  await page.screenshot({path:out+'/'+(cleanIndex?'directory ':'index.html ')+width+'-rename.png'});
  await ctx.close();
 }
 await host.close();
 }
 assert.deepEqual(errors,[]);writeFileSync(out+'/results.json',JSON.stringify({status:'PASS',checks,errors},null,2));console.log(JSON.stringify({status:'PASS',checks}));
} catch(e){if(page)await page.screenshot({path:out+'/failure.png'});writeFileSync(out+'/results.json',JSON.stringify({status:'FAIL',checks,errors,error:e.stack},null,2));throw e;}
finally{await browser.close();if(host?.server.listening)await host.close();}

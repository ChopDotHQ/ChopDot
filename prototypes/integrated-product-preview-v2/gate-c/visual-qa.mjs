import '../gate-b/browser-launch.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {serve} from '../gate-b/test-server.mjs';
import {addGoldenExample} from './fixtures.js';
import {transition,scopeProof} from './model.js';
const core=JSON.parse(readFileSync(new URL('../gate-b/contract/semantic-core.json',import.meta.url)));
const seed=addGoldenExample({},core),scope={payer:'self',recipient:'gc-jeanine',currency:'CHF',exponent:2,groupIds:['gc-apartment','gc-ski'],kind:'person'};
const draft={id:'visual-payment',idempotencyKey:'visual-key',operationId:'visual-prepare',scope,amount:'5430',method:'TWINT',plan:{useOffsets:true}};
const withDraft=structuredClone(seed);withDraft.gateC.drafts.self=draft;
let complete=seed;
for(const [type,extra] of [['prepare',{...draft,reviewed:true}],['start',{}],['sent',{}],['confirm',{actor:'gc-jeanine',amount:'5430'}],['close',{}]]){
 complete=transition(complete,{type,id:draft.id,actor:'self',operationId:'visual-'+type,...extra,...(type==='close'?{proof:scopeProof(complete.gateC.payments[0])}:{})},type==='close'?'prototype-fixture':'user','2026-10-03T12:00:00.000Z');
}
const scenes=[
 {j:'j10',golden:'people',route:'position',state:seed,selectors:['.root-header','.position-card','.segmented','.people-list','.app-footer']},
 {j:'j11',golden:'settle',route:'settle',state:withDraft,selectors:['.detail-header','.settle-hero','.ready-card','.focus-footer']},
 {j:'j11',golden:'amount',route:'amount',state:withDraft,selectors:['.detail-header','.amount-edit','.amount-actions','.focus-footer']},
 {j:'j12',golden:'payment-complete',route:'payment&id=visual-payment',state:complete,selectors:['.detail-header','.payment-status-card','.focus-footer']},
 {j:'j12',golden:'saved-record',route:'record&id=visual-payment',state:complete,selectors:['.detail-header','.record-card','.focus-footer']}
];
const out=resolve(process.env.EVIDENCE_DIR||'/tmp/gate-c-visual');mkdirSync(out,{recursive:true});
const host=await serve(process.env.PREVIEW_ROOT||resolve(new URL('../../..',import.meta.url).pathname)),browser=await chromium.launch({headless:true});
const report={status:'RUNNING',browser:browser.version(),comparisons:[],errors:[],scope:'Frozen Golden and live canonical-state DOM at established393/430 viewports. Style/hierarchy checks and review screenshots, not pixel equality. Added source/allocation controls follow GC-SETTLEMENT-INTENT-01.'};
async function metrics(page,prefix,selectors){return page.evaluate(({prefix,selectors})=>selectors.map(selector=>{const e=document.querySelector(prefix+' '+selector);if(!e)throw Error('Missing '+selector);const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {selector,left:r.left,top:r.top,width:r.width,height:r.height,font:s.fontFamily,color:s.color,background:s.backgroundColor,radius:s.borderRadius};}),{prefix,selectors});}
try{
 for(const width of [393,430])for(const scene of scenes){
  const viewport={width,height:width===393?852:890},context=await browser.newContext({viewport}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));await page.addInitScript(s=>localStorage.setItem('chopdot.preview-v2.guest',JSON.stringify(s)),scene.state);
  await page.goto(host.base+'/prototypes/integrated-product-preview-v2/gate-c/index.html#page='+scene.route);await page.locator(`#app>.screen[data-golden="${scene.golden}"]`).waitFor();await page.evaluate(()=>document.fonts.ready);
  const actual=await metrics(page,'#app',scene.selectors);assert.ok(actual.every(x=>x.width>0&&x.height>0&&x.left>=0&&x.left+x.width<=width+1),'Live geometry inside viewport');
  const product=`${width}-${scene.j}-${scene.golden}-product.png`;await page.screenshot({path:resolve(out,product)});
  // Project the immutable Golden device into the established viewport; strip only its laboratory wrapper.
  const reference=await context.newPage();await reference.goto(host.base+`/prototypes/integrated-product-preview-v2/gate-c/goldens/${scene.j}.html#${scene.golden}`);
  await reference.addStyleTag({content:`.labpanel{display:none!important}.lab,.stage{display:block!important;padding:0!important;margin:0!important;width:100%!important;height:100%!important}.device{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:0!important;border-radius:0!important;box-shadow:none!important}.screen{display:none!important}.screen#${scene.golden}{display:grid!important}`});
  const expected=await metrics(reference,'#'+scene.golden,scene.selectors);
  for(let i=0;i<actual.length;i++)for(const key of ['font','color','background','radius'])assert.equal(actual[i][key],expected[i][key],`${scene.j}/${scene.golden} ${actual[i].selector} ${key}`);
  const golden=`${width}-${scene.j}-${scene.golden}-golden.png`;await reference.screenshot({path:resolve(out,golden)});report.comparisons.push({viewport,journey:scene.j,screen:scene.golden,product,golden,actual,expected,styleChecks:actual.length*4,differences:'Canonical names, extra EUR card, exact payment IDs/history, and explicitly reviewed source applications replace fixture values.'});await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;throw e;}
finally{writeFileSync(resolve(out,'results.json'),JSON.stringify(report,null,2));await browser.close();await host.close();console.log(JSON.stringify({status:report.status,comparisons:report.comparisons.length,out}));}

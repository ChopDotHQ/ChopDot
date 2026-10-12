import '../gate-b/browser-launch.mjs';
import {chromium} from 'playwright';import {serve} from '../gate-b/test-server.mjs';
import {addGoldenExample} from '../gate-c/fixtures.js';
import {transition,scopeProof} from '../gate-c/model.js';
import {upgrade} from '../gate-d/model.js';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import assert from 'node:assert/strict';
const core=JSON.parse(readFileSync(new URL('../gate-b/contract/semantic-core.json',import.meta.url))),out=process.env.EVIDENCE_DIR;mkdirSync(out,{recursive:true});
const c=(type,extra={})=>({type,actor:'self',id:'history-payment',operationId:crypto.randomUUID(),...extra});
const base=(incoming=false)=>transition(upgrade({...addGoldenExample({},core),accountCreated:true}),c('prepare',{actor:incoming?'gc-marc':'self',idempotencyKey:'history-key',scope:{payer:incoming?'gc-marc':'self',recipient:incoming?'self':'gc-jeanine',currency:'CHF',exponent:2,groupIds:['gc-apartment'],kind:'person'},amount:incoming?'2000':'7430',method:'TWINT',reviewed:true,plan:{useOffsets:true}}));
const start=s=>transition(s,c('start',{actor:s.gateC.payments[0].payer})),sent=s=>transition(s,c('sent',{actor:s.gateC.payments[0].payer})),confirmed=s=>transition(s,c('confirm',{actor:s.gateC.payments[0].recipient,amount:s.gateC.payments[0].amount}));
const fixture=(s,type,extra={})=>transition(s,c(type,{proof:scopeProof(s.gateC.payments[0]),...extra}),'prototype-fixture');
const scenes=[];
for(const incoming of [false,true]){
 const seed=()=>base(incoming), direction=incoming?'incoming':'outgoing';
 for(const [state,s] of [['prepared',seed()],['started',start(seed())],['sent',sent(start(seed()))],['unknown',fixture(sent(start(seed())),'unknown')],['cancelled',transition(seed(),c('cancel',{actor:seed().gateC.payments[0].payer}))],['closed',fixture(confirmed(sent(start(seed()))),'close')]])scenes.push([direction+'-'+state,s]);
}
const host=await serve(process.env.PREVIEW_ROOT),browser=await chromium.launch({headless:true});const report={status:'RUNNING',checks:[],errors:[],laws:['LAW-PAY-02','DESIGN-status-copy']};let page;
try{for(const width of [393,430])for(const[name,seed]of scenes){const ctx=await browser.newContext({viewport:{width,height:width===393?852:890}});await ctx.addInitScript(s=>{if(!localStorage.getItem('chopdot.preview-v2.guest'))localStorage.setItem('chopdot.preview-v2.guest',JSON.stringify(s));},seed);page=await ctx.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(host.base+'/prototypes/integrated-product-preview-v2/index.html?expansion='+encodeURIComponent('family=09&page=members'));const f=page.frameLocator('#product-frame');await f.getByRole('heading',{name:'People.',exact:true}).waitFor();await f.locator('.integration-nav summary').click();await f.getByRole('button',{name:'Settlement history',exact:true}).click();await f.getByRole('heading',{name:'Recent payments',exact:true}).waitFor();
 const row=f.locator('[data-action="payment-record"]');await row.waitFor();const label=await row.locator('.row-main b').innerText(),s=await page.evaluate(()=>JSON.parse(localStorage.getItem('chopdot.preview-v2.guest')));assert.deepEqual(s.gateC,seed.gateC);const confirmedAmount=BigInt(seed.gateC.payments[0].confirmed),overclaim=confirmedAmount===0n&&/paid/i.test(label);
 const incoming=name.startsWith('incoming'),expected=confirmedAmount>0n?(incoming?'Marc paid you':'You paid Jeanine'):(incoming?'Payment from Marc':'Payment to Jeanine');
 assert.equal(label,expected,name+' must distinguish confirmed receipt from an unconfirmed intent');assert.equal(overclaim,false);
 report.checks.push({id:'HISTORY-LAW-'+name+'-'+width,state:name,width,label,confirmed:confirmedAmount.toString(),ledgerUnchanged:true,status:'PASS'});
 await page.screenshot({path:out+'/'+name+'-'+width+'.png'});await ctx.close();}
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack;if(page)await page.screenshot({path:out+'/failure.png'});process.exitCode=1;}
finally{writeFileSync(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();await host.close();}

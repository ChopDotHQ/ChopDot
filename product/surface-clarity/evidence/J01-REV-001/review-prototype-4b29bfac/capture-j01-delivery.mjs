import {chromium} from '/workspace/chopdot-prototype-tools/node_modules/playwright/index.mjs';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base=process.argv[2],out=process.argv[3];
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const report={source_sha:'4b29bfac000f3c7639cbfde8de081fc06ba13afe',browser:browser.version(),scope:'Python-launcher delivery smoke and requested review-path screenshots only; prior full checks reused',viewports:[],errors:[]};
try{
for(const width of [393,430]){
 const context=await browser.newContext({viewport:{width,height:width===393?852:890}}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)report.errors.push(r.url()+' '+r.status());});
 const f=()=>page.frameLocator('#product-frame'), b=name=>f().getByRole('button',{name,exact:true}).click();
 const shot=async name=>page.screenshot({path:`${out}/${name}-${width}.png`});
 await page.goto(base+'/prototypes/integrated-product-preview-v2/index.html');
 await page.getByRole('button',{name:'Continue as guest',exact:true}).click();
 await b('Start a group');await f().locator('#entry .name-input').fill('Review local group');
 await f().getByRole('link',{name:'Create group',exact:true}).click();
 await f().locator('#success').getByText('Review local group is ready.',{exact:true}).waitFor();
 await page.reload();await b('Invite someone');await page.locator('#account-wall-create').click();
 await f().getByLabel('Email',{exact:true}).waitFor();await b('Back');
 await page.locator('#account-wall').waitFor({state:'visible'});await shot('guest-back-boundary');
 await page.locator('#account-wall-cancel').click();await f().getByText('Review local group',{exact:true}).waitFor();await shot('guest-back-home');
 await b('Invite someone');await page.locator('#account-wall-create').click();
 await f().getByLabel('Email',{exact:true}).fill('review@example.com');await b('Send code');
 await f().getByText('Prototype only. Enter 123456 to continue. No email was sent.',{exact:true}).waitFor();await shot('simulation-code');
 const before=await f().locator('body').evaluate(()=>window.EntryDemo.get());
 await page.reload();await f().getByLabel('Email',{exact:true}).waitFor();
 await f().getByText('Sign-in restarted. Request a fresh code or approval. Your saved work and incoming destination stay.',{exact:true}).waitFor();
 const after=await f().locator('body').evaluate(()=>window.EntryDemo.get());
 assert.notEqual(after.verificationEpoch,before.verificationEpoch);assert.equal(after.email,'');assert.equal(after.verified,false);
 await shot('safe-reload');
 await b('Use a wallet instead');await b('Everyday Account ending 9Kq');
 await f().getByRole('group',{name:'Simulated wallet results'}).waitFor();await shot('simulation-wallet');
 report.viewports.push({width,height:width===393?852:890,guest_back:true,safe_reload:true,simulation_instructions:true});
 await context.close();
}
assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}
finally{await browser.close();writeFileSync(out+'/delivery-smoke.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));

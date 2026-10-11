import {chromium} from '/workspace/chopdot-prototype-tools/node_modules/playwright/index.mjs';
import {serve} from '/workspace/work/j01-candidate/prototypes/integrated-product-preview-v2/gate-b/test-server.mjs';
import {writeFileSync} from 'node:fs';
const host=await serve('/tmp/chopdot-j01-repair.bC2Mz4K7/preview');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage(),r={responses:[],console:[]};
page.on('response',x=>{if(x.status()>=400)r.responses.push({url:x.url(),status:x.status()});});
page.on('console',x=>{if(x.type()==='error')r.console.push({text:x.text(),location:x.location()});});
try{await page.goto(host.base+'/prototypes/integrated-product-preview-v2/index.html?fixtures=1&createJoin=page%3Dentry');await page.frameLocator('#product-frame').getByLabel('Group name').waitFor();await page.screenshot({path:'/workspace/work/independent-j01/resource-probe.png'});r.faviconStatus=await page.evaluate(()=>fetch('/favicon.ico').then(x=>x.status()));}
finally{writeFileSync('/workspace/work/resource-probe.json',JSON.stringify(r,null,2));await browser.close();await host.close();}console.log(JSON.stringify(r));

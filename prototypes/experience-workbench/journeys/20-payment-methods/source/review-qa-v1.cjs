'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const journeyDir=path.resolve(__dirname,'..');
const reviewDir=path.join(journeyDir,'review-v1');
const candidatePath=path.join(reviewDir,'v1-candidate.html');
const resultsDir=path.join(reviewDir,'results');
const shotsDir=path.join(resultsDir,'screenshots');
fs.rmSync(resultsDir,{recursive:true,force:true});fs.mkdirSync(shotsDir,{recursive:true});
const html=fs.readFileSync(candidatePath,'utf8');
const sha256=crypto.createHash('sha256').update(html).digest('hex');
const ids=[...html.matchAll(/<section id="([^"]+)" class="screen/g)].map(m=>m[1]);
if(ids.length!==new Set(ids).size)throw new Error('Duplicate screen ids');
const viewports=[{width:393,height:852,name:'393x852'},{width:430,height:890,name:'430x890'}];
const modelOutput=execFileSync(process.execPath,[path.join(__dirname,'test-model.cjs')],{encoding:'utf8'}).trim();
const model=JSON.parse(modelOutput);
const result={ok:false,journey:'20',version:'v1',review_status:'review-pending',candidate_sha256:sha256,states:ids.length,viewports:viewports.map(v=>v.name),model_assertions:model.assertions,model_scenarios:model.scenarios,layouts:[],interactions:[],page_errors:[],console_errors:[],external_network_requests:[],default_entry:null,invalid_entry:null,shell_checks:[],security_checks:{secret_like_terms_in_inputs:false,raw_destinations_on_overview:false}};

(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const viewport of viewports){
   const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height}});
   page.on('pageerror',e=>result.page_errors.push(`${viewport.name}: ${e.message}`));
   page.on('console',m=>{if(m.type()==='error')result.console_errors.push(`${viewport.name}: ${m.text()}`)});
   page.on('request',r=>{if(/^https?:/i.test(r.url()))result.external_network_requests.push(`${viewport.name}: ${r.url()}`)});
   await page.setContent(html,{waitUntil:'load'});await page.waitForTimeout(25);
   if(viewport.name==='393x852'){
    result.default_entry=await page.evaluate(()=>({hash:location.hash,visible:[...document.querySelectorAll('.screen')].filter(el=>getComputedStyle(el).display!=='none').map(el=>el.id)}));
    await page.evaluate(()=>{location.hash='#invalid-j20-state'});await page.waitForTimeout(25);
    result.invalid_entry=await page.evaluate(()=>({hash:location.hash,visible:[...document.querySelectorAll('.screen')].filter(el=>getComputedStyle(el).display!=='none').map(el=>el.id)}));
   }
   for(const id of ids){
    await page.evaluate(id=>{location.hash=`#${id}`},id);await page.waitForTimeout(8);
    const layout=await page.evaluate(({id,viewport})=>{
      const screen=document.getElementById(id),header=screen.querySelector('header'),main=screen.querySelector('main'),footer=screen.querySelector('footer');
      const sr=screen.getBoundingClientRect(),hr=header?.getBoundingClientRect(),mr=main?.getBoundingClientRect(),fr=footer?.getBoundingClientRect();
      const visible=[...document.querySelectorAll('.screen')].filter(el=>getComputedStyle(el).display!=='none').map(el=>el.id);
      const missing=[...screen.querySelectorAll('svg')].filter(svg=>{const r=svg.getBoundingClientRect();return r.width<1||r.height<1||svg.children.length===0}).length;
      return {screen:id,viewport,visible,display:getComputedStyle(screen).display,bodyOverflowX:document.documentElement.scrollWidth>innerWidth+1||document.body.scrollWidth>innerWidth+1,bodyOverflowY:document.documentElement.scrollHeight>innerHeight+1||document.body.scrollHeight>innerHeight+1,screenOverflowX:screen.scrollWidth>screen.clientWidth+1,screenViewportFit:Math.abs(sr.left)<1&&Math.abs(sr.top)<1&&Math.abs(sr.right-innerWidth)<1&&Math.abs(sr.bottom-innerHeight)<1,headerOverlap:!!(hr&&mr&&hr.bottom>mr.top+1),footerOverlap:!!(fr&&mr&&mr.bottom>fr.top+1),footerVisible:!!fr&&fr.top>=-1&&fr.bottom<=innerHeight+1,mainScrollHeight:main?.scrollHeight??null,mainClientHeight:main?.clientHeight??null,missingSvgs:missing};
    },{id,viewport:viewport.name});
    layout.passed=layout.display!=='none'&&layout.visible.length===1&&layout.visible[0]===id&&!layout.bodyOverflowX&&!layout.bodyOverflowY&&!layout.screenOverflowX&&layout.screenViewportFit&&!layout.headerOverlap&&!layout.footerOverlap&&layout.footerVisible&&layout.missingSvgs===0;
    result.layouts.push(layout);
    await page.screenshot({path:path.join(shotsDir,`${id}-${viewport.name}.png`)});
   }
   for(const id of ids){
    await page.evaluate(id=>{location.hash=`#${id}`},id);await page.waitForTimeout(5);
    const hrefs=await page.$$eval(`#${CSS.escape(id)} a[href^="#"]`,els=>els.map(el=>el.getAttribute('href')));
    for(let i=0;i<hrefs.length;i++){
      await page.evaluate(id=>{location.hash=`#${id}`},id);await page.waitForTimeout(4);
      const locator=page.locator(`#${CSS.escape(id)} a[href^="#"]`).nth(i);
      await locator.click({force:true});await page.waitForTimeout(5);
      const observed=await page.evaluate(()=>({hash:location.hash,visible:[...document.querySelectorAll('.screen')].filter(el=>getComputedStyle(el).display!=='none').map(el=>el.id)}));
      const target=hrefs[i].slice(1);const passed=observed.hash===`#${target}`&&observed.visible.length===1&&observed.visible[0]===target;
      result.interactions.push({viewport:viewport.name,from:id,index:i,href:hrefs[i],target,observed,passed});
    }
   }
   const shellCheck=await page.evaluate(()=>{
     location.hash='#overview';
     const footer=document.querySelector('#overview footer.app-footer');const labels=[...footer.querySelectorAll('.tab span')].map(x=>x.textContent.trim());
     const add=footer.querySelector('.add-tab');const active=[...footer.querySelectorAll('.tab.active span')].map(x=>x.textContent.trim());
     return {labels,hasRaisedAdd:!!add,addHref:add?.getAttribute('href'),active};
   });
   shellCheck.viewport=viewport.name;shellCheck.passed=JSON.stringify(shellCheck.labels)===JSON.stringify(['Pots','People','Activity','You'])&&shellCheck.hasRaisedAdd&&shellCheck.addHref==='#add-preview'&&JSON.stringify(shellCheck.active)===JSON.stringify(['You']);result.shell_checks.push(shellCheck);
   await page.close();
  }
  result.layout_checks=result.layouts.length;result.passed_layouts=result.layouts.filter(x=>x.passed).length;result.product_clicks=result.interactions.length;result.passed_product_clicks=result.interactions.filter(x=>x.passed).length;
  const overviewText=(html.match(/<section id="overview"[\s\S]*?<\/section>/)||[''])[0];
  const forbidden=['CH9300762011623852957','+41790000000','demo.user@example.invalid','5DemoDotDestination111111111111111111111111111111'];
  result.security_checks.raw_destinations_on_overview=forbidden.some(v=>overviewText.includes(v));
  result.security_checks.secret_like_terms_in_inputs=/<div class="j20-input">[^<]*(seed phrase|private key|recovery phrase|password|mnemonic)/i.test(html);
  const failedLayouts=result.layouts.filter(x=>!x.passed);const failedInteractions=result.interactions.filter(x=>!x.passed);result.failed_layouts=failedLayouts;result.failed_interactions=failedInteractions;
  result.ok=model.ok===true&&result.states>=38&&result.layout_checks===result.states*2&&result.passed_layouts===result.layout_checks&&result.passed_product_clicks===result.product_clicks&&result.page_errors.length===0&&result.console_errors.length===0&&result.external_network_requests.length===0&&result.shell_checks.every(x=>x.passed)&&result.default_entry?.visible?.length===1&&result.default_entry.visible[0]==='overview'&&result.invalid_entry?.hash==='#overview'&&result.invalid_entry.visible.length===1&&result.invalid_entry.visible[0]==='overview'&&!result.security_checks.raw_destinations_on_overview&&!result.security_checks.secret_like_terms_in_inputs;
  const stateMapping=ids.map(id=>({screen:id,financial_effect:'none',authority:id.includes('save')||id.includes('remove')||id==='preference'||id==='availability'?'simulated owner write/recovery':'read/navigation',qa:viewports.map(v=>`results/screenshots/${id}-${v.name}.png`)}));
  const uiEvents=[];for(const id of ids){const screenHtml=(html.match(new RegExp(`<section id="${id}"[\\s\\S]*?(?=<section id=|</div></main><aside)`))||[''])[0];for(const m of screenHtml.matchAll(/<a[^>]+href="(#[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)){uiEvents.push({screen:id,href:m[1],label:m[2].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(),domain_event:'PaymentMethodNavigationOrSimulatedCommand',financial_effect:'none'});}}
  const summary={ok:result.ok,journey:'20',version:'v1',review_status:'review-pending',candidate_sha256:sha256,states:result.states,mapped_actions:uiEvents.length,model_assertions:model.assertions,model_scenarios:model.scenarios,browser_layouts:result.layout_checks,passed_browser_layouts:result.passed_layouts,product_clicks:result.product_clicks,passed_product_clicks:result.passed_product_clicks,page_errors:result.page_errors,console_errors:result.console_errors,external_network_requests:result.external_network_requests.length,shell_consistency:result.shell_checks.every(x=>x.passed),overview_raw_destination_leak:result.security_checks.raw_destinations_on_overview,secret_like_input_present:result.security_checks.secret_like_terms_in_inputs,viewports:viewports.map(v=>v.name),typography:'TYPO-01 deferred'};
  fs.writeFileSync(path.join(resultsDir,'browser-qa.json'),JSON.stringify(result,null,2));
  fs.writeFileSync(path.join(reviewDir,'QA_SUMMARY.json'),JSON.stringify(summary,null,2)+'\n');
  fs.writeFileSync(path.join(reviewDir,'SCREEN_STATE_MAPPING.json'),JSON.stringify(stateMapping,null,2)+'\n');
  fs.writeFileSync(path.join(reviewDir,'UI_EVENT_MAPPING.json'),JSON.stringify(uiEvents,null,2)+'\n');
  fs.writeFileSync(path.join(reviewDir,'VISUAL_QA.md'),`# Journey 20 — Payment Methods V1 Visual QA\n\nStatus: **review candidate; not Golden**.\n\n- Candidate SHA-256: \`${sha256}\`\n- Screens: ${result.states}\n- Viewports: 393×852 and 430×890\n- Browser layout checks: ${result.passed_layouts}/${result.layout_checks}\n- Internal interactions: ${result.passed_product_clicks}/${result.product_clicks}\n- Deterministic model assertions: ${model.assertions} across ${model.scenarios} scenario groups\n- Page errors: ${result.page_errors.length}\n- Console errors: ${result.console_errors.length}\n- External runtime network requests: ${result.external_network_requests.length}\n- Canonical shell: ${result.shell_checks.every(x=>x.passed)?'PASS':'FAIL'}\n- Raw full destination values on overview: ${result.security_checks.raw_destinations_on_overview?'FAIL':'none'}\n- Secret-like values presented as inputs: ${result.security_checks.secret_like_terms_in_inputs?'FAIL':'none'}\n\nReview focus: calm masked overview, add/edit/remove version semantics, scoped preference, contextual receiving availability, stale-share behavior, exact asset/network mismatch, offline/recovery behavior, and clear separation of crypto receiving destination from wallet signing authority.\n\nTYPO-01 remains deferred.\n`);
  console.log(JSON.stringify(summary,null,2));if(!result.ok)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});

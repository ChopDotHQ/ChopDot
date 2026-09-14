#!/usr/bin/env node
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

const here=path.dirname(fileURLToPath(import.meta.url));
const journeyRoot=path.resolve(here,'..');
const repoRoot=path.resolve(journeyRoot,'../../../..');
const candidatePath=path.join(journeyRoot,'v1-candidate.html');
const evidenceRoot=path.resolve(repoRoot,'artifacts/j24-v1-review');
const shotRoot=path.join(evidenceRoot,'screenshots');
await mkdir(shotRoot,{recursive:true});

const viewports=[{width:393,height:852,name:'393x852'},{width:430,height:890,name:'430x890'}];
const groupVisualStates=['preview-summary','export-confirmation','generating','package-ready'];
const observations=[];
const screenshots=[];
const errors=[];
const pageErrors=[];
const consoleErrors=[];
const externalRequests=[];
const browser=await chromium.launch({headless:true});
const file=pathToFileURL(candidatePath).href;
const url=(state,scope='account')=>`${file}?scope=${scope}&dest=package#${state}`;
const goto=async(page,state,scope='account')=>{
  await page.goto(url(state,scope),{waitUntil:'load'});
  await page.waitForFunction(x=>document.getElementById('content')?.dataset?.testState===x,state);
};
const record=async(page,label,expectedState,expectedScope)=>{
  const actual=await page.evaluate(()=>({state:location.hash,scope:new URLSearchParams(location.search).get('scope'),text:document.getElementById('content')?.innerText||''}));
  const pass=actual.state===`#${expectedState}`&&actual.scope===expectedScope;
  observations.push({label,expected_state:`#${expectedState}`,expected_scope:expectedScope,actual_state:actual.state,actual_scope:actual.scope,pass});
  if(!pass)errors.push(`${label}: expected #${expectedState}/${expectedScope}, got ${actual.state}/${actual.scope}`);
  return actual;
};
const click=async(page,start,selector,target,scope,label)=>{
  await goto(page,start,scope);
  await page.locator(selector).click();
  await page.waitForFunction(x=>location.hash===`#${x}`,target);
  return record(page,label,target,scope);
};

for(const vp of viewports){
  const page=await browser.newPage({viewport:{width:vp.width,height:vp.height}});
  page.on('pageerror',e=>pageErrors.push({viewport:vp.name,error:String(e)}));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push({viewport:vp.name,text:m.text()})});
  page.on('request',r=>{const u=r.url();if(!u.startsWith('file:')&&!u.startsWith('data:')&&!u.startsWith('about:'))externalRequests.push({viewport:vp.name,url:u})});

  // Regression-critical group visual evidence beyond entry/scope selection.
  for(const state of groupVisualStates){
    await goto(page,state,'group');
    const text=await page.locator('#content').innerText();
    if(!text.includes('Scope:')||!text.includes('Lisbon Weekend'))errors.push(`${vp.name}/${state}: group scope not visibly rendered`);
    const out=path.join(shotRoot,`${state}-group-regression-${vp.name}.png`);
    await page.screenshot({path:out,fullPage:false});
    screenshots.push({viewport:vp.name,scope:'group',state,path:path.relative(evidenceRoot,out)});
  }

  // Safety-critical exits promised by the contract.
  await click(page,'offline-before-snapshot','[data-test-primary]','snapshot-preparing','account',`${vp.name} offline-before-snapshot → recheck snapshot`);
  await click(page,'partial-unsupported','[data-test-primary]','preview-summary','group',`${vp.name} partial warning → group preview`);
  await click(page,'identity-unresolved','[data-test-primary]','preview-summary','group',`${vp.name} unresolved identity → group preview`);
  await click(page,'cancelled-before-confirmation','[data-test-primary]','scope-choice','group',`${vp.name} cancelled-before-confirmation → same group scope chooser`);
  await click(page,'generation-cancel-requested','[data-test-primary]','reconcile-generation','account',`${vp.name} generation stop request → reconcile`);
  await click(page,'generation-failed-before-artifact','[data-test-primary]','generating','account',`${vp.name} proven pre-artifact failure → safe same-operation retry`);

  // Unresolved generation reconciliation must route to J28 with no blind retry.
  await click(page,'reconcile-generation','[data-test-tertiary]','recovery-boundary','account',`${vp.name} unresolved generation → J28 boundary`);
  let recovery=await page.evaluate(()=>({actions:[...document.querySelectorAll('#content a')].map(a=>a.textContent.trim()),text:document.getElementById('content').innerText}));
  if(recovery.actions.some(x=>/retry|regenerate/i.test(x)))errors.push(`${vp.name}: J28 generation boundary exposes blind retry/regenerate`);
  if(!/No invented success, failure, regeneration, or redelivery/i.test(recovery.text))errors.push(`${vp.name}: J28 generation boundary missing no-blind-effect copy`);

  // Unresolved destination reconciliation must route to the same J28 boundary with no redelivery shortcut.
  await click(page,'destination-reconciling','[data-test-tertiary]','recovery-boundary','account',`${vp.name} unresolved destination → J28 boundary`);
  recovery=await page.evaluate(()=>({actions:[...document.querySelectorAll('#content a')].map(a=>a.textContent.trim()),text:document.getElementById('content').innerText}));
  if(recovery.actions.some(x=>/retry|redeliver|deliver again/i.test(x)))errors.push(`${vp.name}: J28 destination boundary exposes blind redelivery`);

  await page.close();
}
await browser.close();
if(pageErrors.length)errors.push(`${pageErrors.length} page errors`);
if(consoleErrors.length)errors.push(`${consoleErrors.length} console errors`);
if(externalRequests.length)errors.push(`${externalRequests.length} external runtime requests`);

const report={
  status:errors.length?'FAILED':'ADDITIONAL_SAFETY_EVIDENCE_PASSED',
  purpose:'Close pre-handoff J24 safety evidence gaps without changing candidate product bytes.',
  screenshots:screenshots.length,
  group_visual_states:groupVisualStates,
  interaction_checks:observations.length,
  interaction_passed:observations.filter(x=>x.pass).length,
  observations,
  errors,
  page_errors:pageErrors,
  console_errors:consoleErrors,
  external_requests:externalRequests
};
await writeFile(path.join(evidenceRoot,'ADDITIONAL_SAFETY_EVIDENCE.json'),JSON.stringify(report,null,2)+'\n');
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(JSON.stringify(report,null,2));

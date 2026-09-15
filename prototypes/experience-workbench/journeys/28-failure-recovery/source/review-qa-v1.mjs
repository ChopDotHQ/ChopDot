#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const here=path.dirname(fileURLToPath(import.meta.url));
const journeyRoot=path.resolve(here,'..');
const repoRoot=path.resolve(journeyRoot,'../../../..');
const candidatePath=path.join(journeyRoot,'v1-candidate.html');
const packetPath=path.join(here,'current-work-packet.md');
const evidenceRoot=path.resolve(repoRoot,'artifacts/j28-v1-review');
const shotRoot=path.join(evidenceRoot,'screenshots');
await mkdir(shotRoot,{recursive:true});

const html=await readFile(candidatePath,'utf8');
const packet=await readFile(packetPath,'utf8');
const hash=text=>createHash('sha256').update(text).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:repoRoot,encoding:'utf8'}).trim();
const head=git('rev-parse','HEAD');
const tree=git('rev-parse','HEAD^{tree}');
const branch=process.env.GITHUB_REF_NAME||git('rev-parse','--abbrev-ref','HEAD');
const candidateSha256=hash(html),packetSha256=hash(packet);
const viewports=[{width:393,height:852,name:'393x852'},{width:430,height:890,name:'430x890'}];
const errors=[],pageErrors=[],consoleErrors=[],external=[],screenshots=[],layouts=[],interactions=[],reachability=[],modelChecks=[],sequentialChecks=[];
const check=(label,pass,actual='')=>{modelChecks.push({label,pass,actual});if(!pass)errors.push(`${label}${actual?`: ${actual}`:''}`)};
const interaction=(label,pass,actual='')=>{interactions.push({label,pass,actual});if(!pass)errors.push(`${label}${actual?`: ${actual}`:''}`);return pass};
const sequence=(label,pass,actual='')=>{sequentialChecks.push({label,pass,actual});return interaction(`sequential: ${label}`,pass,actual)};

for(const bad of ['<script src=','type="password"','private key fixture','seed phrase fixture'])if(html.includes(bad))errors.push(`prohibited static marker: ${bad}`);
for(const req of ['Journey 28','v1.1','window.J28_DEFS','window.J28_ROOTS','window.J28_BOUNDARIES','OP-28-DEMO','result-unknown','reconcile-checking','reconcile-not-found','safe-retry-review','window.J28_TEST_RESET','window.J28_TEST_TRUTH','window.J28_TEST_NEW_FIXTURE'])if(!html.includes(req))errors.push(`missing static marker: ${req}`);
check('packet identifies Journey 28',packet.includes('28 — Things Go Wrong / Recovery V1'));
check('packet binds activation head',packet.includes('d12375e4bf779a2d3ad1c4e8b8975b58fd26302b'));
check('packet requires caller reachability',packet.toLowerCase().includes('caller reachability'));

const browser=await chromium.launch({headless:true});
const file=pathToFileURL(candidatePath).href;
const stateUrl=id=>{const u=new URL(file);u.hash=id;return u.href};
const renderedState=p=>p.evaluate(()=>document.getElementById('content')?.dataset?.testState||'');
const waitRendered=(p,id)=>p.waitForFunction(target=>location.hash===`#${target}`&&document.getElementById('content')?.dataset?.testState===target,id);
const truth=p=>p.evaluate(()=>window.J28_TEST_TRUTH());
const bodyText=p=>p.locator('#content').innerText();
const resetEntry=async p=>{await p.evaluate(()=>{window.J28_TEST_RESET();location.hash='recovery-entry'});await waitRendered(p,'recovery-entry')};
const freshGoto=async(p,id)=>{await p.goto(stateUrl('recovery-entry'),{waitUntil:'load'});await p.evaluate(target=>{window.J28_TEST_RESET();location.hash=target},id);const actual=await renderedState(p);if(actual!==id&&['safe-retry-review','retrying'].includes(id))return;await waitRendered(p,id)};

const probe=await browser.newPage({viewport:{width:393,height:852}});
await freshGoto(probe,'recovery-entry');
const defs=await probe.evaluate(()=>window.J28_DEFS),roots=await probe.evaluate(()=>window.J28_ROOTS),boundaryIds=await probe.evaluate(()=>window.J28_BOUNDARIES);
await probe.close();
const ids=Object.keys(defs),boundarySet=new Set(boundaryIds),stateIds=ids.filter(id=>!boundarySet.has(id));
check('registered material state count',stateIds.length===32,String(stateIds.length));
check('named boundary count',boundaryIds.length===6,String(boundaryIds.length));
check('root set exact',JSON.stringify(roots)===JSON.stringify(['recovery-entry']),JSON.stringify(roots));
check('all codes unique',new Set(ids.map(id=>defs[id].code)).size===ids.length);
for(const id of stateIds)check(`${id} has J28 state code`,/^J28-S\d+$/.test(defs[id].code),defs[id].code);
for(const id of boundaryIds)check(`${id} has J28 boundary code`,/^J28-B\d+$/.test(defs[id].code),defs[id].code);
for(const id of ['checking-current-truth','reconnecting','refreshing-owner-truth','reconcile-checking','retrying','partial-reconcile'])check(`${id} progress`,defs[id]?.status==='progress',defs[id]?.status);
for(const id of ['operation-pending','result-unknown','reconcile-pending','partial-result','partial-stop','cancel-pending','cancel-too-late','duplicate-detected','blocked-stop'])check(`${id} warning`,defs[id]?.status==='warn',defs[id]?.status);
for(const id of ['reconcile-success','reconcile-not-found','retry-success','partial-resolved','cancelled-verified','recovered-summary'])check(`${id} success`,defs[id]?.status==='success',defs[id]?.status);

const labels=id=>(defs[id]?.actions||[]).map(a=>String(a.label||''));
for(const id of ['operation-pending','result-unknown','reconcile-pending','partial-result','partial-reconcile','cancel-pending','cancel-too-late'])check(`${id} has no replacement retry`,!labels(id).some(x=>/retry|replacement/i.test(x)),labels(id).join(' | '));
check('reconcile-not-found exposes safe retry review',labels('reconcile-not-found').some(x=>/Review safe retry/i.test(x)),labels('reconcile-not-found').join(' | '));
check('duplicate opens existing operation',defs['duplicate-detected']?.actions?.some(a=>a.to==='existing-result'));
check('cancel-too-late reconciles original operation',defs['cancel-too-late']?.actions?.some(a=>a.to==='reconcile-checking'));
check('unknown reconciles same operation',defs['result-unknown']?.actions?.some(a=>a.to==='reconcile-checking'));
check('summary starts an explicit new fixture case',labels('recovered-summary').some(x=>/Start new fixture recovery case/i.test(x)),labels('recovered-summary').join(' | '));
check('owner return starts an explicit new fixture case',labels('owner-return-boundary').some(x=>/Start new fixture recovery case/i.test(x)),labels('owner-return-boundary').join(' | '));

const edges={};
for(const id of ids){edges[id]=[];for(const a of defs[id].actions||[])if(a?.to)edges[id].push({from:id,to:a.to,label:a.label})}
for(const id of ids)for(const e of edges[id])check(`valid transition ${id}->${e.to}`,Boolean(defs[e.to]),e.to);
function shortestPath(target){const q=roots.map(start=>({id:start,start,steps:[]})),seen=new Set();while(q.length){const cur=q.shift();if(seen.has(cur.id))continue;seen.add(cur.id);if(cur.id===target)return cur;for(const e of edges[cur.id]||[])q.push({id:e.to,start:cur.start,steps:[...cur.steps,e]})}return null}
const pathProof={};
for(const id of ids){pathProof[id]=shortestPath(id);check(`truthful caller path exists for ${id}`,Boolean(pathProof[id]),'no path')}
async function clickTransition(p,e){const from=await renderedState(p);if(from!==e.from){errors.push(`caller ${e.from}->${e.to}: current ${from}`);return false}const loc=p.locator(`#content [data-to="${e.to}"]`).first();if(await loc.count()!==1){errors.push(`caller ${e.from}->${e.to}: control missing`);return false}await loc.click();const expected=e.to==='safe-retry-review'?'safe-retry-review':e.to;await waitRendered(p,expected);const actual=await renderedState(p),pass=actual===expected;interactions.push({label:`caller ${e.from}->${e.to}`,expected,actual,pass});if(!pass)errors.push(`caller ${e.from}->${e.to}: ended ${actual}`);return pass}
async function reachState(p,id){const proof=pathProof[id];await p.goto(stateUrl('recovery-entry'),{waitUntil:'load'});await resetEntry(p);for(const e of proof.steps)if(!await clickTransition(p,e))return false;return(await renderedState(p))===id}
const callerPage=await browser.newPage({viewport:{width:393,height:852}});
for(const id of ids){const proof=pathProof[id],ok=await reachState(callerPage,id);reachability.push({state:id,start:proof.start,steps:proof.steps.map(e=>`${e.from}->${e.to}`),pass:ok})}
await callerPage.close();
check('caller reachability complete',reachability.filter(r=>r.pass).length===ids.length,`${reachability.filter(r=>r.pass).length}/${ids.length}`);

for(const vp of viewports){
 const p=await browser.newPage({viewport:{width:vp.width,height:vp.height}});
 p.on('pageerror',e=>pageErrors.push({viewport:vp.name,error:String(e)}));
 p.on('console',m=>{if(m.type()==='error')consoleErrors.push({viewport:vp.name,text:m.text()})});
 p.on('request',r=>{const u=r.url();if(!u.startsWith('file:')&&!u.startsWith('data:')&&!u.startsWith('about:'))external.push({viewport:vp.name,url:u})});
 for(const id of ids){
  const ok=await reachState(p,id);if(!ok){errors.push(`${vp.name}/${id}: not caller reachable for render`);continue}
  const code=await p.locator('#content').getAttribute('data-state-code');if(code!==defs[id].code)errors.push(`${vp.name}/${id}: code ${code} expected ${defs[id].code}`);
  const metrics=await p.evaluate(()=>{const c=document.getElementById('content');return{doc:document.documentElement.scrollWidth,iw:innerWidth,cw:c.clientWidth,sw:c.scrollWidth,ch:c.clientHeight,sh:c.scrollHeight,actions:[...c.querySelectorAll('.btn')].map(el=>{const r=el.getBoundingClientRect();return{t:el.textContent.trim(),h:r.height,w:r.width}})}});
  if(metrics.doc>metrics.iw+1||metrics.sw>metrics.cw+1)errors.push(`${vp.name}/${id}: horizontal overflow`);
  for(const a of metrics.actions)if(a.h<43)errors.push(`${vp.name}/${id}: action too short ${a.t}:${a.h}`);
  layouts.push({viewport:vp.name,state:id,...metrics});
  let shot=path.join(shotRoot,`${id}-${vp.name}.png`);await p.screenshot({path:shot,fullPage:false});screenshots.push({viewport:vp.name,state:id,position:'top',path:path.relative(evidenceRoot,shot)});
  if(metrics.sh>metrics.ch+4){await p.locator('#content').evaluate(el=>{el.scrollTop=el.scrollHeight});shot=path.join(shotRoot,`${id}-bottom-${vp.name}.png`);await p.screenshot({path:shot,fullPage:false});screenshots.push({viewport:vp.name,state:id,position:'bottom',path:path.relative(evidenceRoot,shot)})}
 }
 await p.close();
}

const seq=await browser.newPage({viewport:{width:393,height:852}});
seq.on('pageerror',e=>pageErrors.push({viewport:'sequential',error:String(e)}));
seq.on('console',m=>{if(m.type()==='error')consoleErrors.push({viewport:'sequential',text:m.text()})});
async function go(pathTargets){await seq.goto(stateUrl('recovery-entry'),{waitUntil:'load'});await resetEntry(seq);for(const to of pathTargets){const loc=seq.locator(`#content [data-to="${to}"]`).first();if(await loc.count()!==1)return sequence(`path to ${to}`,false,'control missing');await loc.click();await waitRendered(seq,to)}return true}
await go(['result-unknown']);let t=await truth(seq),body=await bodyText(seq);sequence('unknown preserves operation identity and blocks retry',t.operationId==='OP-28-DEMO'&&t.status==='unknown'&&!body.match(/Review safe retry|Start replacement/),`${JSON.stringify(t)}\n${body}`);await seq.reload({waitUntil:'load'});await waitRendered(seq,'result-unknown');sequence('unknown truth survives reload',(await truth(seq)).status==='unknown'&&(await truth(seq)).operationId==='OP-28-DEMO',JSON.stringify(await truth(seq)));
await go(['result-unknown','blocked-stop']);const stoppedUnknown=await truth(seq);await seq.locator('#content [data-to="recovery-entry"]').click();await waitRendered(seq,'reconcile-checking');body=await bodyText(seq);t=await truth(seq);sequence('unknown stop resume reconciles same operation instead of reopening pre-effect scenarios',t.operationId===stoppedUnknown.operationId&&t.status==='unknown'&&await renderedState(seq)==='reconcile-checking'&&!body.includes('No operation was started'),`${JSON.stringify(t)}\n${body}`);
await go(['result-unknown','reconcile-checking','reconcile-not-found']);t=await truth(seq);sequence('no-effect proof authorizes retry',t.status==='not-found'&&t.retryAuthorized===true&&t.retryCount===0,JSON.stringify(t));await seq.locator('#content [data-to="safe-retry-review"]').click();await waitRendered(seq,'safe-retry-review');await seq.locator('#content [data-to="retrying"]').click();await waitRendered(seq,'retrying');t=await truth(seq);sequence('replacement starts once and consumes authorization',t.retryCount===1&&t.retryAuthorized===false&&t.status==='retrying',JSON.stringify(t));await seq.locator('#content [data-to="retry-success"]').click();await waitRendered(seq,'retry-success');const successTruth=await truth(seq);sequence('replacement verified without second retry',successTruth.retryCount===1&&successTruth.status==='succeeded',JSON.stringify(successTruth));await seq.reload({waitUntil:'load'});await waitRendered(seq,'retry-success');sequence('verified replacement remains terminal on reload',(await truth(seq)).status==='succeeded'&&(await truth(seq)).retryCount===1,JSON.stringify(await truth(seq)));await seq.goBack();await waitRendered(seq,'recovered-summary');sequence('Back cannot reopen the prior replacement after verified success',(await truth(seq)).status==='succeeded'&&(await truth(seq)).retryCount===1&&await renderedState(seq)==='recovered-summary',JSON.stringify(await truth(seq)));await seq.goForward();const afterForward=await renderedState(seq);sequence('Forward preserves verified terminal truth',(await truth(seq)).status==='succeeded'&&(await truth(seq)).retryCount===1&&['retry-success','recovered-summary'].includes(afterForward),`${afterForward} ${JSON.stringify(await truth(seq))}`);await seq.evaluate(()=>{location.hash='reconcile-not-found'});await waitRendered(seq,'recovered-summary');t=await truth(seq);sequence('verified replacement cannot be reauthorized on the same operation',t.operationId===successTruth.operationId&&t.retryCount===1&&t.retryAuthorized===false&&t.status==='succeeded',JSON.stringify(t));if(await renderedState(seq)!=='recovered-summary'){await seq.locator('#content [data-to="recovered-summary"]').click();await waitRendered(seq,'recovered-summary')}const oldOp=(await truth(seq)).operationId;await seq.locator('#content [data-to="recovery-entry"]').click();await waitRendered(seq,'recovery-entry');t=await truth(seq);sequence('review another case explicitly creates a new fixture operation',t.operationId!==oldOp&&/^OP-28-DEMO-\d+$/.test(t.operationId)&&t.status==='idle'&&t.retryCount===0&&t.retryAuthorized===false,JSON.stringify(t));
await go(['result-unknown','reconcile-checking','reconcile-success']);body=await bodyText(seq);sequence('reconciled success has no retry action',!body.match(/Review safe retry|Start replacement/),body);
await go(['cancel-review','cancel-pending','cancel-too-late','reconcile-checking']);sequence('too-late cancellation reconciles original operation',await renderedState(seq)==='reconcile-checking',await renderedState(seq));
await go(['cancel-review','cancel-pending','cancelled-verified']);const cancelTruth=await truth(seq);await seq.evaluate(()=>{location.hash='recovery-entry'});await waitRendered(seq,'recovered-summary');sequence('verified cancellation remains terminal across navigation',cancelTruth.status==='cancelled'&&(await truth(seq)).status==='cancelled'&&await renderedState(seq)==='recovered-summary',JSON.stringify(await truth(seq)));
await go(['duplicate-detected','existing-result','reconcile-checking']);sequence('duplicate reuses existing operation',await renderedState(seq)==='reconcile-checking'&&(await truth(seq)).retryCount===0,JSON.stringify(await truth(seq)));
await go(['partial-result','partial-reconcile']);body=await bodyText(seq);sequence('partial reconciliation blocks retry',!body.match(/Review safe retry|Start replacement/),body);await seq.evaluate(()=>{location.hash='recovery-entry'});await waitRendered(seq,'partial-reconcile');sequence('partial truth resumes by reconciling the same operation',await renderedState(seq)==='partial-reconcile'&&(await truth(seq)).status==='partial',JSON.stringify(await truth(seq)));
await seq.close();

await browser.close();
if(pageErrors.length)errors.push(`page errors: ${pageErrors.length}`);
if(consoleErrors.length)errors.push(`console errors: ${consoleErrors.length}`);
if(external.length)errors.push(`external runtime requests: ${external.length}`);
const result={journey:'28',name:'Things Go Wrong / Recovery V1',branch,head,tree,candidateSha256,packetSha256,states:stateIds.length,boundaries:boundaryIds.length,callerReachability:`${reachability.filter(r=>r.pass).length}/${ids.length}`,interactionChecks:interactions.length,modelContractChecks:modelChecks.length,sequentialChecks:sequentialChecks.length,screenshots:screenshots.length,layouts:layouts.length,pageErrors,consoleErrors,external,errors,reachability,interactions,modelChecks,sequentialChecks,screenshots,layouts};
await mkdir(path.join(evidenceRoot,'results'),{recursive:true});
await writeFile(path.join(evidenceRoot,'results/browser-qa.json'),JSON.stringify(result,null,2));
const summary=`# Journey 28 V1 Exact Candidate QA\n\n- Branch/head: \`${branch}@${head}\`\n- Tree: \`${tree}\`\n- Candidate SHA-256: \`${candidateSha256}\`\n- States/boundaries: ${stateIds.length} + ${boundaryIds.length}\n- Caller reachability: ${result.callerReachability}\n- Interaction checks: ${interactions.length}\n- Model-contract checks: ${modelChecks.length}\n- Sequential persistence/recovery checks: ${sequentialChecks.length}\n- Screenshots: ${screenshots.length}\n- Layout records: ${layouts.length}\n- Page errors: ${pageErrors.length}\n- Console errors: ${consoleErrors.length}\n- External runtime requests: ${external.length}\n- Mechanical failures: ${errors.length}\n`;
await writeFile(path.join(evidenceRoot,'VISUAL_QA.md'),summary);
console.log(JSON.stringify({status:errors.length?'FAILED':'COMPLETE_CANDIDATE_QA_PASSED',head,tree,candidateSha256,states:stateIds.length,boundaries:boundaryIds.length,callerReachability:result.callerReachability,interactionChecks:interactions.length,modelContractChecks:modelChecks.length,sequentialChecks:sequentialChecks.length,screenshots:screenshots.length,errors:errors.length}));
if(errors.length){console.error(errors.join('\n'));process.exit(1)}

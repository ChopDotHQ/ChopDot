#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const journeyRoot = path.resolve(here, '..');
const repoRoot = path.resolve(journeyRoot, '../../../..');
const candidatePath = path.join(journeyRoot, 'v1-candidate.html');
const packetPath = path.join(here, 'current-work-packet.md');
const evidenceRoot = path.resolve(repoRoot, 'artifacts/j27-v1-review');
const shotRoot = path.join(evidenceRoot, 'screenshots');
await mkdir(shotRoot, { recursive: true });

const html = await readFile(candidatePath, 'utf8');
const packet = await readFile(packetPath, 'utf8');
const hash = text => createHash('sha256').update(text).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
const head = git('rev-parse', 'HEAD');
const tree = git('rev-parse', 'HEAD^{tree}');
const branch = process.env.GITHUB_REF_NAME || git('rev-parse', '--abbrev-ref', 'HEAD');
const candidateSha256 = hash(html);
const packetSha256 = hash(packet);
const viewports=[{width:393,height:852,name:'393x852'},{width:430,height:890,name:'430x890'}];
const errors=[],pageErrors=[],consoleErrors=[],external=[],screenshots=[],layouts=[],interactions=[],reachability=[],modelChecks=[];
const check=(label,pass,actual='')=>{modelChecks.push({label,pass,actual});if(!pass)errors.push(`${label}${actual?`: ${actual}`:''}`)};

for(const bad of ['<script src=','type="password"','private key fixture','seed phrase fixture']) if(html.includes(bad)) errors.push(`prohibited static marker: ${bad}`);
for(const req of ['Journey 27','v1.1','window.J27_DEFS','Prototype fixture only','account-entry','deletion-type-confirm','notification-system-boundary','app-header','tabbar','add-tab']) if(!html.includes(req)) errors.push(`missing static marker: ${req}`);
check('packet identifies Journey 27',packet.includes('Journey: **27 — Account & Preferences V1**'));
check('packet binds activation head',packet.includes('19a282b8c3346ca62e77c2db3780163a75f58046'));
check('packet requires caller reachability',packet.toLowerCase().includes('caller reachability'));

const browser=await chromium.launch({headless:true});
const file=pathToFileURL(candidatePath).href;
const stateUrl=id=>{const u=new URL(file);u.hash=id;return u.href};
const waitRendered=(p,id)=>p.waitForFunction(target=>location.hash===`#${target}`&&document.getElementById('content')?.dataset?.testState===target,id);
const goto=async(p,id)=>{await p.goto(stateUrl(id),{waitUntil:'load'});await waitRendered(p,id)};
const probe=await browser.newPage({viewport:{width:393,height:852}});
await goto(probe,'account-entry');
const defs=await probe.evaluate(()=>window.J27_DEFS);
const roots=await probe.evaluate(()=>window.J27_ROOTS);
const boundaryIds=await probe.evaluate(()=>window.J27_BOUNDARIES);
await probe.close();
const ids=Object.keys(defs),boundarySet=new Set(boundaryIds),stateIds=ids.filter(id=>!boundarySet.has(id));
check('registered material state count',stateIds.length===62,String(stateIds.length));
check('named boundary count',boundaryIds.length===5,String(boundaryIds.length));
check('root set exact',JSON.stringify(roots)===JSON.stringify(['account-entry']),JSON.stringify(roots));
check('all codes unique',new Set(ids.map(id=>defs[id].code)).size===ids.length);
for(const id of stateIds) check(`${id} has J27 state code`,/^J27-S\d+$/.test(defs[id].code),defs[id].code);
for(const id of boundaryIds) check(`${id} has J27 boundary code`,/^J27-B\d+$/.test(defs[id].code),defs[id].code);
for(const id of ['profile-saving','notifications-saving','appearance-saving','signing-out','deletion-requesting']) check(`${id} pending`,defs[id]?.status==='progress',defs[id]?.status);
for(const id of ['profile-unknown','notifications-unknown','appearance-unknown','signout-unknown','deletion-unknown']) check(`${id} unknown warning`,defs[id]?.status==='warn',defs[id]?.status);
for(const id of ['profile-saved','notifications-saved','appearance-saved','signed-out','deleted']) check(`${id} verified success`,defs[id]?.status==='success',defs[id]?.status);
for(const id of ['profile-cancelled','notifications-cancelled','appearance-cancelled','signout-cancelled','deletion-cancelled']) check(`${id} neutral cancel`,defs[id]?.status==='neutral',defs[id]?.status);

const edges={};
for(const id of ids){edges[id]=[];for(const a of defs[id].actions||[])if(a?.to)edges[id].push({from:id,to:a.to,label:a.label});}
edges['deletion-type-confirm'].push({from:'deletion-type-confirm',to:'deletion-final-review',special:'exact'},{from:'deletion-type-confirm',to:'deletion-mismatch',special:'mismatch'});
for(const id of ids) for(const e of edges[id]) check(`valid transition ${id}->${e.to}`,Boolean(defs[e.to]),e.to);
function shortestPath(target){const q=roots.map(start=>({id:start,start,steps:[]})),seen=new Set();while(q.length){const cur=q.shift();if(seen.has(cur.id))continue;seen.add(cur.id);if(cur.id===target)return cur;for(const e of edges[cur.id]||[])q.push({id:e.to,start:cur.start,steps:[...cur.steps,e]});}return null;}
const pathProof={};for(const id of ids){pathProof[id]=shortestPath(id);check(`truthful caller path exists for ${id}`,Boolean(pathProof[id]),'no path');}
async function clickTransition(p,e){const current=await p.evaluate(()=>document.getElementById('content')?.dataset?.testState);if(current!==e.from){errors.push(`caller ${e.from}->${e.to}: current ${current}`);return false;}if(e.special){await p.locator('[data-test-delete-input]').fill(e.special==='exact'?'DEVINSON':'WRONG');await p.locator('#delete-submit').click();}else{const loc=p.locator(`#content [data-to="${e.to}"]`).first();if(await loc.count()!==1){errors.push(`caller ${e.from}->${e.to}: control missing`);return false;}await loc.click();}await waitRendered(p,e.to);const actual=await p.evaluate(()=>document.getElementById('content')?.dataset?.testState);const pass=actual===e.to;interactions.push({label:`caller ${e.from}->${e.to}`,expected:e.to,actual,pass});if(!pass)errors.push(`caller ${e.from}->${e.to}: ended ${actual}`);return pass;}

const callerPage=await browser.newPage({viewport:{width:393,height:852}});
for(const id of ids){const proof=pathProof[id];await goto(callerPage,proof.start);let ok=true;for(const e of proof.steps){if(!await clickTransition(callerPage,e)){ok=false;break;}}reachability.push({state:id,start:proof.start,steps:proof.steps.map(e=>`${e.from}->${e.to}${e.special?`(${e.special})`:''}`),pass:ok});}
await callerPage.close();
check('caller reachability complete',reachability.filter(r=>r.pass).length===ids.length,`${reachability.filter(r=>r.pass).length}/${ids.length}`);

for(const vp of viewports){const p=await browser.newPage({viewport:{width:vp.width,height:vp.height}});p.on('pageerror',e=>pageErrors.push({viewport:vp.name,error:String(e)}));p.on('console',m=>{if(m.type()==='error')consoleErrors.push({viewport:vp.name,text:m.text()})});p.on('request',r=>{const u=r.url();if(!u.startsWith('file:')&&!u.startsWith('data:')&&!u.startsWith('about:'))external.push({viewport:vp.name,url:u})});for(const id of ids){await goto(p,id);const code=await p.locator('#content').getAttribute('data-state-code');if(code!==defs[id].code)errors.push(`${vp.name}/${id}: code ${code} expected ${defs[id].code}`);const metrics=await p.evaluate(()=>{const c=document.getElementById('content');return{doc:document.documentElement.scrollWidth,iw:innerWidth,cw:c.clientWidth,sw:c.scrollWidth,ch:c.clientHeight,sh:c.scrollHeight,actions:[...c.querySelectorAll('.btn,button')].map(el=>{const r=el.getBoundingClientRect();return{t:el.textContent.trim(),h:r.height,w:r.width}})}});if(metrics.doc>metrics.iw+1||metrics.sw>metrics.cw+1)errors.push(`${vp.name}/${id}: horizontal overflow`);for(const a of metrics.actions)if(a.h<43)errors.push(`${vp.name}/${id}: action too short ${a.t}:${a.h}`);layouts.push({viewport:vp.name,state:id,...metrics});let shot=path.join(shotRoot,`${id}-${vp.name}.png`);await p.screenshot({path:shot,fullPage:false});screenshots.push({viewport:vp.name,state:id,position:'top',path:path.relative(evidenceRoot,shot)});if(metrics.sh>metrics.ch+4){await p.locator('#content').evaluate(el=>{el.scrollTop=el.scrollHeight});shot=path.join(shotRoot,`${id}-bottom-${vp.name}.png`);await p.screenshot({path:shot,fullPage:false});screenshots.push({viewport:vp.name,state:id,position:'bottom',path:path.relative(evidenceRoot,shot)});}}
await goto(p,'notifications-saved');for(const t of ['Push preference','On','Effective push','Permission needed'])if(!(await p.locator('#content').innerText()).includes(t))errors.push(`${vp.name}/notifications-saved missing ${t}`);
await goto(p,'signed-out');for(const t of ['Account','Not deleted','Groups / money / history','Unchanged'])if(!(await p.locator('#content').innerText()).includes(t))errors.push(`${vp.name}/signed-out missing ${t}`);
await goto(p,'deleted');for(const t of ['Shared group/expense history','Preserved','Not claimed erased'])if(!(await p.locator('#content').innerText()).includes(t))errors.push(`${vp.name}/deleted missing ${t}`);
await goto(p,'deletion-type-confirm');await p.locator('[data-test-delete-input]').fill('WRONG');await p.locator('#delete-submit').click();await waitRendered(p,'deletion-mismatch');await goto(p,'deletion-type-confirm');await p.locator('[data-test-delete-input]').fill('DEVINSON');await p.locator('#delete-submit').click();await waitRendered(p,'deletion-final-review');await p.close();}

await browser.close();
if(pageErrors.length)errors.push(`page errors: ${pageErrors.length}`);if(consoleErrors.length)errors.push(`console errors: ${consoleErrors.length}`);if(external.length)errors.push(`external runtime requests: ${external.length}`);
const summary={journey:27,branch,head,tree,candidateSha256,packetSha256,stateCount:stateIds.length,boundaryCount:boundaryIds.length,viewports,screenshotCount:screenshots.length,layoutCount:layouts.length,interactionChecks:interactions.length,callerReachability:`${reachability.filter(r=>r.pass).length}/${ids.length}`,modelContractChecks:`${modelChecks.filter(c=>c.pass).length}/${modelChecks.length}`,pageErrors:pageErrors.length,consoleErrors:consoleErrors.length,externalRequests:external.length,mechanicalFailures:errors.length};
await writeFile(path.join(evidenceRoot,'summary.json'),JSON.stringify(summary,null,2));
await writeFile(path.join(evidenceRoot,'browser-qa.json'),JSON.stringify({summary,layouts,interactions,pageErrors,consoleErrors,external,screenshots},null,2));
await writeFile(path.join(evidenceRoot,'caller-reachability.json'),JSON.stringify({summary:summary.callerReachability,paths:reachability},null,2));
await writeFile(path.join(evidenceRoot,'model-contract.json'),JSON.stringify({summary:summary.modelContractChecks,checks:modelChecks},null,2));
await writeFile(path.join(evidenceRoot,'VISUAL_QA.md'),`# Journey 27 V1 visual QA\n\n- Exact head: \`${head}\`\n- Candidate SHA-256: \`${candidateSha256}\`\n- Registered states: ${stateIds.length}\n- Boundaries: ${boundaryIds.length}\n- Screenshots generated: ${screenshots.length}\n- Canonical viewports: 393×852 and 430×890\n- Horizontal overflow failures: ${errors.filter(e=>e.includes('horizontal overflow')).length}\n- Page errors: ${pageErrors.length}\n- Console errors: ${consoleErrors.length}\n- External runtime requests: ${external.length}\n\nDirect independent visual review follows the active risk-based review doctrine; this artifact preserves exhaustive render evidence.\n`);
console.log(JSON.stringify(summary,null,2));
if(errors.length){console.error('\nFAILURES\n'+errors.map(e=>`- ${e}`).join('\n'));process.exit(1)}

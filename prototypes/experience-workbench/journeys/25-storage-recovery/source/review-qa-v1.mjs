#!/usr/bin/env node
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

const here=path.dirname(fileURLToPath(import.meta.url));
const journeyRoot=path.resolve(here,'..');
const repoRoot=path.resolve(journeyRoot,'../../../..');
const candidatePath=path.join(journeyRoot,'v1-candidate.html');
const packetPath=path.join(here,'current-work-packet.md');
const evidenceRoot=path.resolve(repoRoot,'artifacts/j25-v1-review');
const shotRoot=path.join(evidenceRoot,'screenshots');
await mkdir(shotRoot,{recursive:true});

const html=await readFile(candidatePath,'utf8');
const packet=await readFile(packetPath,'utf8');
const sha256=createHash('sha256').update(html).digest('hex');
const packetSha256=createHash('sha256').update(packet).digest('hex');
const git=(...a)=>execFileSync('git',a,{cwd:repoRoot,encoding:'utf8'}).trim();
const head=git('rev-parse','HEAD');
const tree=git('rev-parse','HEAD^{tree}');
const branch=process.env.GITHUB_REF_NAME||git('rev-parse','--abbrev-ref','HEAD');

const viewports=[{width:393,height:852,name:'393x852'},{width:430,height:890,name:'430x890'}];
const errors=[],pageErrors=[],consoleErrors=[],external=[],screenshots=[],layouts=[],interactions=[],reachability=[];

for(const bad of ['<script src=','type="password"','private key fixture','seed phrase fixture']) if(html.includes(bad)) errors.push(`prohibited static marker: ${bad}`);
for(const req of ['chopdot-recovery-v1','BKP25-DEMO-A','RST25-DEMO-A','Factory v1.1','restore-reconcile','Prototype fixture','window.__J25_DEFS']) if(!html.includes(req)) errors.push(`missing static marker: ${req}`);

const browser=await chromium.launch({headless:true});
const file=pathToFileURL(candidatePath).href;
const goto=async(p,id)=>{await p.goto(`${file}#${id}`,{waitUntil:'load'});await p.waitForFunction(x=>document.getElementById('content')?.dataset?.testState===x,id)};
const assert=async(label,fn,expected)=>{const actual=await fn();const pass=actual===expected;interactions.push({label,expected,actual,pass});if(!pass)errors.push(`${label}: expected ${expected}, got ${actual}`)};
const click=async(p,start,selector,target,label)=>{await goto(p,start);await p.locator(selector).click();await p.waitForFunction(x=>location.hash===`#${x}`,target);await assert(label,()=>p.evaluate(()=>location.hash),`#${target}`)};

const probe=await browser.newPage({viewport:{width:393,height:852}});
await goto(probe,'settings-entry');
const defs=await probe.evaluate(()=>window.__J25_DEFS);
await probe.close();
const entries=['settings-entry','recovery-entry'];
const slotSelector={primary:'[data-test-primary]',secondary:'[data-test-secondary]',tertiary:'[data-test-tertiary]',quaternary:'[data-test-quaternary]'};
const ids=Object.keys(defs);
const stateIds=ids.filter(id=>!defs[id].boundary);
const boundaryIds=ids.filter(id=>defs[id].boundary);
if(stateIds.length!==65) errors.push(`registered state count changed: ${stateIds.length}`);
if(boundaryIds.length!==6) errors.push(`owner boundary count changed: ${boundaryIds.length}`);

const edges={};
for(const id of ids){
  edges[id]=[];
  for(const slot of Object.keys(slotSelector)){
    const a=defs[id][slot];
    if(a?.to) edges[id].push({from:id,to:a.to,selector:slotSelector[slot],label:a.label,slot});
  }
}
for(const id of ids){
  for(const e of edges[id]) if(!defs[e.to]) errors.push(`invalid action target ${id}/${e.slot} -> ${e.to}`);
}
function shortestPath(target){
  const q=entries.map(start=>({id:start,start,steps:[]}));
  const seen=new Set();
  while(q.length){
    const cur=q.shift();
    if(seen.has(cur.id)) continue;
    seen.add(cur.id);
    if(cur.id===target) return cur;
    for(const e of edges[cur.id]||[]) q.push({id:e.to,start:cur.start,steps:[...cur.steps,e]});
  }
  return null;
}
const pathProof={};
for(const id of ids){
  pathProof[id]=shortestPath(id);
  if(!pathProof[id]) errors.push(`no truthful caller path: ${id}`);
}

for(const vp of viewports){
  const p=await browser.newPage({viewport:{width:vp.width,height:vp.height}});
  p.on('pageerror',e=>pageErrors.push({viewport:vp.name,error:String(e)}));
  p.on('console',m=>{if(m.type()==='error')consoleErrors.push({viewport:vp.name,text:m.text()})});
  p.on('request',r=>{const u=r.url();if(!u.startsWith('file:')&&!u.startsWith('data:')&&!u.startsWith('about:'))external.push({viewport:vp.name,url:u})});

  for(const id of ids){
    await goto(p,id);
    const actualCode=await p.locator('#content').getAttribute('data-state-code');
    if(actualCode!==defs[id].code) errors.push(`${vp.name}/${id}: state code ${actualCode} expected ${defs[id].code}`);
    const metrics=await p.evaluate(()=>({
      doc:document.documentElement.scrollWidth,iw:innerWidth,cw:document.getElementById('content').clientWidth,sw:document.getElementById('content').scrollWidth,
      actions:[...document.querySelectorAll('#content [data-test-primary],#content [data-test-secondary],#content [data-test-tertiary],#content [data-test-quaternary]')].map(el=>{const r=el.getBoundingClientRect();return {t:el.textContent.trim(),h:r.height,w:r.width}})
    }));
    if(metrics.doc>metrics.iw+1||metrics.sw>metrics.cw+1) errors.push(`${vp.name}/${id}: horizontal overflow`);
    for(const a of metrics.actions) if(a.h<43) errors.push(`${vp.name}/${id}: action too short ${a.t}:${a.h}`);
    layouts.push({viewport:vp.name,state:id,...metrics});
    const shot=path.join(shotRoot,`${id}-${vp.name}.png`);
    await p.screenshot({path:shot,fullPage:false});
    screenshots.push({viewport:vp.name,state:id,path:path.relative(evidenceRoot,shot)});
  }

  const happyBackup=[
    ['settings-entry','[data-test-primary]','storage-summary'],['storage-summary','[data-test-primary]','storage-choice'],
    ['storage-choice','[data-test-secondary]','backup-scope'],['backup-scope','[data-test-primary]','backup-classes'],
    ['backup-classes','[data-test-secondary]','backup-format'],['backup-format','[data-test-primary]','snapshot-preparing'],
    ['snapshot-preparing','[data-test-primary]','snapshot-ready'],['snapshot-ready','[data-test-primary]','backup-preview'],
    ['backup-preview','[data-test-primary]','backup-preview-details'],['backup-preview-details','[data-test-primary]','backup-ready-to-confirm'],
    ['backup-ready-to-confirm','[data-test-primary]','backup-confirmation'],['backup-confirmation','[data-test-primary]','backup-creating'],
    ['backup-creating','[data-test-primary]','backup-ready'],['backup-ready','[data-test-primary]','backup-destination-choice'],
    ['backup-destination-choice','[data-test-primary]','browser-save-requested'],['browser-save-requested','[data-test-primary]','backup-result-local']
  ];
  for(const [a,s,b] of happyBackup) await click(p,a,s,b,`${vp.name} happy backup ${a} -> ${b}`);

  const happyRestore=[
    ['recovery-entry','[data-test-primary]','restore-source-choice'],['restore-source-choice','[data-test-primary]','restore-file-selected'],
    ['restore-file-selected','[data-test-primary]','restore-manifest'],['restore-manifest','[data-test-primary]','restore-preview'],
    ['restore-preview','[data-test-primary]','restore-ready-to-confirm'],['restore-ready-to-confirm','[data-test-primary]','restore-confirmation'],
    ['restore-confirmation','[data-test-primary]','restore-applying'],['restore-applying','[data-test-primary]','restore-success']
  ];
  for(const [a,s,b] of happyRestore) await click(p,a,s,b,`${vp.name} happy restore ${a} -> ${b}`);

  await goto(p,'backup-creating'); await p.reload({waitUntil:'load'});
  await assert(`${vp.name} pending backup survives reload`,()=>p.evaluate(()=>location.hash),'#backup-creating');
  await goto(p,'restore-applying'); await p.reload({waitUntil:'load'});
  await assert(`${vp.name} pending restore survives reload`,()=>p.evaluate(()=>location.hash),'#restore-applying');
  await p.close();
}

// Factory v1.1 caller-reachability: replay a real click path from a truthful caller to every state/boundary.
// Direct render above is ONLY visual/layout coverage and does not satisfy this requirement.
{
  const p=await browser.newPage({viewport:{width:393,height:852}});
  p.on('pageerror',e=>pageErrors.push({viewport:'reachability',error:String(e)}));
  p.on('console',m=>{if(m.type()==='error')consoleErrors.push({viewport:'reachability',text:m.text()})});
  p.on('request',r=>{const u=r.url();if(!u.startsWith('file:')&&!u.startsWith('data:')&&!u.startsWith('about:'))external.push({viewport:'reachability',url:u})});

  for(const id of ids){
    const proof=pathProof[id];
    if(!proof){reachability.push({target:id,pass:false,reason:'no path'});continue}
    await goto(p,proof.start);
    let pass=true;
    for(const step of proof.steps){
      const before=await p.evaluate(()=>location.hash.slice(1));
      if(before!==step.from){errors.push(`caller path ${id}: expected caller ${step.from}, got ${before}`);pass=false;break}
      const loc=p.locator(step.selector);
      if(await loc.count()!==1){errors.push(`caller path ${id}: missing ${step.selector} at ${step.from}`);pass=false;break}
      await loc.click();
      await p.waitForFunction(x=>location.hash===`#${x}`,step.to);
    }
    const actual=await p.evaluate(()=>location.hash.slice(1));
    if(actual!==id){errors.push(`caller path ${id} ended at ${actual}`);pass=false}
    reachability.push({target:id,start:proof.start,steps:proof.steps.length,boundary:Boolean(defs[id].boundary),pass,path:proof.steps});
  }
  await p.close();
}

await browser.close();
if(pageErrors.length) errors.push(`${pageErrors.length} page errors`);
if(consoleErrors.length) errors.push(`${consoleErrors.length} console errors`);
if(external.length) errors.push(`${external.length} external requests`);
const reachable=reachability.filter(x=>x.pass).length;
const summary={
  status:errors.length?'FAILED':'COMPLETE_CANDIDATE_QA_PASSED',
  journey:'25',factory_generation:'v1.1',
  current_work_packet:{path:path.relative(repoRoot,packetPath),sha256:packetSha256},
  candidate:{branch,head,tree,path:path.relative(repoRoot,candidatePath),sha256},
  coverage:{
    registered_states:stateIds.length,owner_boundaries:boundaryIds.length,
    caller_reachability_proved:reachable,caller_reachability_required:ids.length,
    direct_rendered_states:ids.length,viewports:viewports.map(v=>`${v.width}x${v.height}`),
    screenshots:screenshots.length,layout_records:layouts.length,
    interaction_checks:interactions.length,interaction_passed:interactions.filter(x=>x.pass).length
  },
  errors,page_errors:pageErrors,console_errors:consoleErrors,external_requests:external,
  claim_boundary:[
    'Deterministic standalone prototype only','No production encryption/key derivation','No real filesystem persistence',
    'No live cloud/provider credentials, sync, retention or deletion','No production database restore',
    'No source authenticity/finality proof','No payment/wallet/signing authority'
  ],
  authority:[
    'Local working copy is distinct from backup/provider copies','Backup artifact is created before destination handoff',
    'Restore is preview-first and preserves newer current facts','Secrets/executable authority never round-trip',
    'Unknown backup/save/restore outcomes reconcile before retry','Identity ambiguity is never name-merged',
    'Owner/system boundaries are explicit','TYPO-01 deferred'
  ]
};
await writeFile(path.join(evidenceRoot,'QA_SUMMARY.json'),JSON.stringify(summary,null,2)+'\n');
await writeFile(path.join(evidenceRoot,'CALLER_REACHABILITY.json'),JSON.stringify(reachability,null,2)+'\n');
await writeFile(path.join(evidenceRoot,'INTERACTIONS.json'),JSON.stringify(interactions,null,2)+'\n');
await writeFile(path.join(evidenceRoot,'LAYOUTS.json'),JSON.stringify(layouts,null,2)+'\n');
await writeFile(path.join(evidenceRoot,'VISUAL_QA.md'),`# Journey 25 V1 exact-head candidate evidence

- Head: \`${head}\`
- Candidate SHA-256: \`${sha256}\`
- Current-work packet SHA-256: \`${packetSha256}\`
- Factory generation: \`v1.1\`
- Status: **${summary.status}**
- Registered states: ${stateIds.length}
- Owner boundaries: ${boundaryIds.length}
- Caller reachability: ${reachable}/${ids.length}
- Screenshots: ${screenshots.length}
- Interaction checks: ${summary.coverage.interaction_passed}/${summary.coverage.interaction_checks}
- Page errors: ${pageErrors.length}
- Console errors: ${consoleErrors.length}
- External runtime requests: ${external.length}

Every registered material state/boundary has a replayed truthful click path from a real J25 caller. Direct hash rendering is used only for the complete visual/layout matrix. Direct reviewer inspection of PNGs is still required for GOLDEN-READY. This bundle does not claim production encryption, durable local/cloud storage, provider credentials/sync, live database restore, source authenticity, payment/wallet/signing authority, or device/account recovery.
`);
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(JSON.stringify(summary,null,2));

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const dir=path.join(root,'registry/j12-continuity.json.br.b64.parts');
const encoded=fs.readdirSync(dir).filter(x=>x.endsWith('.part')).sort().map(x=>fs.readFileSync(path.join(dir,x),'utf8').trim()).join('');
const bundle=JSON.parse(zlib.brotliDecompressSync(Buffer.from(encoded,'base64')).toString('utf8'));
for(const [relative,content] of Object.entries(bundle.files)){
 const target=path.resolve(root,relative);
 if(!target.startsWith(root+path.sep))throw Error('Bundle path outside workbench');
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);
}
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,d)=>fs.writeFileSync(path.join(root,p),JSON.stringify(d,null,2)+'\n');
const html='journeys/12-complete-settlement/v1.1-continuity-candidate.html';
const sha=createHash('sha256').update(fs.readFileSync(path.join(root,html))).digest('hex');
if(sha!==bundle.sha256)throw Error('Continuity candidate checksum mismatch');
const journeys=read('registry/journeys.json'),j12=journeys.find(x=>x.id==='12');
Object.assign(j12,{status:'current',approval:'review-pending',version:'v1.1',prototype_path:html,prototype_sha256:sha});
// Retain the registry serialization convention used by the existing workbench.
fs.writeFileSync(path.join(root,'registry/journeys.json'),JSON.stringify(journeys)+'\n');
const progress=read('registry/progress.json');
Object.assign(progress,{current_journey:'12',paused_after_freeze:false,next_action:'Review Journey 12 V1.1 continuity candidate. Do not freeze without explicit approval.'});write('registry/progress.json',progress);
const cpPath='registry/checkpoints/2026-09-05-j12-v1-candidate.json';const cp=read(cpPath);
Object.assign(cp,{version:'v1.1',prototype_path:html,prototype_sha256:sha,status:'golden-candidate',approval:'review-pending',continuity_pass:'complete',continuity_qa:'journeys/12-complete-settlement/CONTINUITY_QA.json',screens_added:0,prior_candidate_sha256:'b6cc690e6993f3d8e611a0b793d0bf8fd17953af176f3bebdeca668235272dec',next_action:progress.next_action});write(cpPath,cp);
const edges=read('registry/edge-cases.json');const e25=edges.find(x=>x.id==='E25');e25.status='current';e25.continuity_check='Unknown timeout requires recovery; retry execution only after verified non-execution.';e25.qa_path='journeys/12-complete-settlement/CONTINUITY_QA.json';fs.writeFileSync(path.join(root,'registry/edge-cases.json'),JSON.stringify(edges)+'\n');
// Keep workshop guidance current without touching any Golden journey artifact.
for(const p of ['START_HERE.md','GOLDEN_SCREENS.md']){
 const full=path.join(root,p);let text=fs.readFileSync(full,'utf8');
 text=text.replaceAll('journeys/12-complete-settlement/v1-golden-candidate.html',html).replaceAll('b6cc690e6993f3d8e611a0b793d0bf8fd17953af176f3bebdeca668235272dec',sha).replaceAll('Complete Settlement V1','Complete Settlement V1.1');
 fs.writeFileSync(full,text);
}
console.log('Applied focused J12 continuity pass; existing Golden artifacts untouched.');

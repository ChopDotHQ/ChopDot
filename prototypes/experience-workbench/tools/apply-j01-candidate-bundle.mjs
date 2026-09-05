import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const dir=path.join(root,'registry/j01-candidate.json.br.b64.parts');
const names=fs.readdirSync(dir).filter(n=>/^\d{3}\.part$/.test(n)).sort();
assert.equal(names.length,4,'Incomplete Journey 01 source bundle');
const data=names.map(n=>fs.readFileSync(path.join(dir,n),'utf8').trim()).join('');
const bundle=JSON.parse(zlib.brotliDecompressSync(Buffer.from(data,'base64')).toString('utf8'));
assert.equal(bundle.name,'2026-09-05-j01-v1-candidate');
for(const [relative,text] of Object.entries(bundle.files)){
 const allowed=relative.startsWith('journeys/01-enter-chopdot/')||relative==='registry/active-candidate.json'||relative==='registry/checkpoints/2026-09-05-j01-v1-candidate.json';
 const target=path.resolve(root,relative);
 assert(allowed&&!relative.split('/').includes('..')&&target.startsWith(root+path.sep),'Unsafe bundle path');
 assert.equal(typeof text,'string');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text);
}
execFileSync(process.execPath,[path.join(root,'journeys/01-enter-chopdot/source/build.mjs')],{stdio:'inherit'});
// Coverage is current-candidate, not approved or production-complete.
const ep=path.join(root,'registry/edge-cases.json'),edges=JSON.parse(fs.readFileSync(ep,'utf8'));
for(const id of ['E01','E02']){
 const e=edges.find(x=>x.id===id);assert(e);e.status='current';e.qa_path='journeys/01-enter-chopdot/QA_SUMMARY.json';e.coverage_note='Journey 01 simulated entry candidate: offline and session-expired recovery tested; provider/backend integration remains unimplemented.';
}
const permission=edges.find(x=>x.id==='E32');assert(permission);
permission.journeys=[...new Set([...permission.journeys,'01'])];
fs.writeFileSync(ep,JSON.stringify(edges)+'\n');
console.log(`Prepared Journey 01 candidate: ${Object.keys(bundle.files).length} source/evidence records. No Golden HTML written.`);

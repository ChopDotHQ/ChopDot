import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const hash=s=>createHash('sha256').update(s).digest('hex');
const dir=path.join(root,'registry/j14-candidate.json.br.b64.parts');
const names=fs.readdirSync(dir).filter(n=>/^\d{3}\.part$/.test(n)).sort();
assert.deepEqual(names,Array.from({length:7},(_,i)=>String(i).padStart(3,'0')+'.part'),'Incomplete Journey 14 bundle');
const encoded=names.map(n=>fs.readFileSync(path.join(dir,n),'utf8').trim()).join('');
assert.equal(hash(encoded),'e083d80d0f7625067077835cbceeacfe784eb2c3afe76d74b900294f819172bd','Source bundle changed');
const bundle=JSON.parse(zlib.brotliDecompressSync(Buffer.from(encoded,'base64')).toString('utf8'));
assert.equal(bundle.name,'2026-09-06-j14-v1-candidate');
assert.equal(Object.keys(bundle.files).length,23);
for(const [relative,content] of Object.entries(bundle.files)){
 const allowed=relative.startsWith('journeys/14-receive-money/')||relative==='registry/j14-candidate.json'||relative==='registry/checkpoints/2026-09-06-j14-v1-candidate.json';
 const target=path.resolve(root,relative);
 assert(allowed&&!relative.split('/').includes('..')&&target.startsWith(root+path.sep),'Unsafe bundle path');
 assert.equal(typeof content,'string');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);
}
const reference=fs.readFileSync(path.join(root,'journeys/13-request-money/v1-candidate.html'),'utf8');
assert.equal(hash(reference),'a22664499c4056d95a6cdeb45df85d43fd2055713e80ae8f69020469aa9bb707');
const styles=[...reference.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m=>m[1]);
assert.equal(hash(styles[0]),'7fdf48665ca5e823ac98752df0cf7fe5a106484f9738113d9c730018d3d6f2d2');
assert.equal(hash(styles[1]),'670a70382097f7456e4b8202fbeddc29b0d42b8ab5f7a40f0b7a2bb0d9207df4');
for(const [name,css] of [['inherited.css',styles[0]],['people.css',styles[1]]])fs.writeFileSync(path.join(root,'journeys/14-receive-money/source',name),css);
execFileSync(process.execPath,[path.join(root,'journeys/14-receive-money/source/build.mjs')],{stdio:'inherit'});
assert.equal(hash(fs.readFileSync(path.join(root,'journeys/14-receive-money/v1-candidate.html'))),'5ce877d89157a4203a2e4a2c5fad795a4ecfabf5388dbaecb00bbf28f2f31e1d');
const edgePath=path.join(root,'registry/edge-cases.json');
const edges=JSON.parse(fs.readFileSync(edgePath,'utf8'));
for(const id of ['E18','E31','E32','E40']){const e=edges.find(e=>e.id===id);assert(e);e.journeys=[...new Set([...e.journeys,'14'])];e.receive_qa_path='journeys/14-receive-money/QA_SUMMARY.json';}
fs.writeFileSync(edgePath,JSON.stringify(edges)+'\n');
console.log('Prepared Journey 14 from 23 source/evidence records. No approved HTML written.');

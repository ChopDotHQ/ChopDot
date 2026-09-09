import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const dir=path.join(root,'registry/source-artifacts/j18-v1.1-golden.parts');
const names=fs.readdirSync(dir).filter(n=>/^\d{3}\.part$/.test(n)).sort();
if(names.length!==3) throw new Error(`Expected 3 J18 bundle parts, got ${names.length}`);
const encoded=names.map(n=>fs.readFileSync(path.join(dir,n),'utf8').trim()).join('');
const encodedSha=crypto.createHash('sha256').update(encoded).digest('hex');
if(encodedSha!=='7cbf3e7f1a93b6bd8379bd776878670ecb60f7af8b44aca1e105e6d304110689') throw new Error('J18 source bundle checksum mismatch');
const bundle=JSON.parse(zlib.brotliDecompressSync(Buffer.from(encoded,'base64')).toString('utf8'));
if(bundle.candidate_sha256!=='d42b518c14fe7c57b2df56c0e92f0ad63424b9971f294ac10df647a0e2cab08e') throw new Error('Unexpected J18 candidate checksum in source bundle');
for(const [rel,content] of Object.entries(bundle.files)){
  const target=path.resolve(root,rel);if(!target.startsWith(root+path.sep)) throw new Error(`Unsafe path ${rel}`);
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);
}
const candidate=path.join(root,'journeys/18-activity-notifications/v1.1-continuity-candidate.html');
const sha=crypto.createHash('sha256').update(fs.readFileSync(candidate)).digest('hex');
if(sha!==bundle.candidate_sha256) throw new Error(`Materialized J18 candidate mismatch: ${sha}`);
console.log(`MATERIALIZED J18 V1.1: ${sha}`);

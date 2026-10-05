import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('./',import.meta.url),manifest=JSON.parse(readFileSync(new URL('source-manifest.json',root))),checks=[];
function verify(path,hash,blob){const bytes=readFileSync(new URL(path,root));assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,path);assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex'),blob,path);checks.push({path,status:'PASS'});}
for(const [path,source] of Object.entries(manifest.sources))verify(path,source.sha256,source.git_blob);
for(const source of JSON.parse(readFileSync(new URL('decision-checkpoint/source-hashes.json',root))))verify('decision-checkpoint/'+source.local_path,source.sha256,source.blob);
console.log(JSON.stringify({status:'PASS',authority:manifest.authority_sha,schema:manifest.schema_sha,checks},null,2));

import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const dir=path.join(root,'registry/source-artifacts/j18-v1.1-golden-j19-v1-candidate.parts');const names=fs.readdirSync(dir).filter(n=>/^\d{3}\.part$/.test(n)).sort();assert.equal(names.length,9,'Expected 9 source bundle parts');const encoded=names.map(n=>fs.readFileSync(path.join(dir,n),'utf8').trim()).join('');assert.equal(sha(encoded),'3b949c1f336e10757bed18a32a208b7a8ca2892946c9ff348f1c43654a47f42e','Source bundle checksum mismatch');
const bundle=JSON.parse(zlib.brotliDecompressSync(Buffer.from(encoded,'base64')).toString('utf8'));assert.equal(bundle.name,'j18-v1.1-golden-j19-v1-candidate');assert.equal(Object.keys(bundle.files).length,28);
for(const [relative,content] of Object.entries(bundle.files)){const target=path.resolve(root,relative);assert(target.startsWith(root+path.sep)&&!relative.split('/').includes('..'),'Unsafe path');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);}
const digest=p=>sha(fs.readFileSync(path.join(root,p)));
assert.equal(digest('journeys/18-activity-notifications/v1.1-continuity-candidate.html'),'d42b518c14fe7c57b2df56c0e92f0ad63424b9971f294ac10df647a0e2cab08e');
assert.equal(digest('journeys/19-insights/v1-candidate.html'),'b539cdbea4c3ced0de2663e922b4ccbc6bcc30975e8211c24aaf02cf14357260');
execFileSync('python3',[path.join(root,'journeys/18-activity-notifications/review-v1.1/scripts/build_j18_v1.1.py')],{stdio:'inherit'});
assert.equal(digest('journeys/18-activity-notifications/review-v1.1/j18-v1.1-continuity-candidate.html'),'d42b518c14fe7c57b2df56c0e92f0ad63424b9971f294ac10df647a0e2cab08e','J18 regeneration drift');
execFileSync(process.execPath,[path.join(root,'journeys/19-insights/source/build.mjs')],{stdio:'inherit'});
assert.equal(digest('journeys/19-insights/v1-candidate.html'),'b539cdbea4c3ced0de2663e922b4ccbc6bcc30975e8211c24aaf02cf14357260','J19 regeneration drift');
console.log('Materialized exact J18 V1.1 Golden candidate support and J19 V1 review candidate.');

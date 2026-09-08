import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const sourceDir='registry/source-artifacts/review-candidates/savings-j16-v1.2-j17-v1.4.bundle.br.b64.parts';
const sourcePath=path.join(root,sourceDir);
const names=fs.readdirSync(sourcePath).filter(n=>/^\d{3}\.part$/.test(n)).sort();
if(!names.length) throw new Error('Missing Savings review publication bundle');
const encoded=names.map(n=>fs.readFileSync(path.join(sourcePath,n),'utf8').trim()).join('');
const compressed=Buffer.from(encoded,'base64');
const bundle=JSON.parse(zlib.brotliDecompressSync(compressed).toString('utf8'));
if(bundle.name!=='2026-09-08-savings-review-candidates-j16-v1.2-j17-v1.4') throw new Error('Unexpected Savings review bundle');
const allowedRoots=['journeys/16-savings-group/','journeys/17-savings-contribute-withdraw/'];
for(const [relative,content] of Object.entries(bundle.files)){
  if(relative.includes('..')||!allowedRoots.some(prefix=>relative.startsWith(prefix))) throw new Error(`Unsafe Savings review path ${relative}`);
  // Never write a Golden artifact path. Review candidates/support only.
  if(['journeys/16-savings-group/v1-recovered.html','journeys/17-savings-contribute-withdraw/v1.1-candidate.html'].includes(relative)) throw new Error(`Golden path forbidden in Savings review bundle: ${relative}`);
  const target=path.resolve(root,relative); if(!target.startsWith(root+path.sep)) throw new Error(`Unsafe target ${relative}`);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==content) fs.writeFileSync(target,content);
}
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
if(digest('journeys/16-savings-group/v1.2-review-candidate.html')!=='dc920000fc4120accab588413ee79095093f8e4223066d7d3a94fb524e5cd0de') throw new Error('J16 V1.2 review bytes drifted');
if(digest('journeys/17-savings-contribute-withdraw/v1.4-review-candidate.html')!=='a5dad1dc659955d4b70acaa13eced199dd778ff628ab8998d4c7ae83055d4915') throw new Error('J17 V1.4 review bytes drifted');
// Force one tracked deterministic diff on the first publication run so the
// existing workflow's `git diff --quiet` notices materialization and commits
// the otherwise-untracked exact candidate/support files. On the bot commit
// this value is already true, so a clean exact-head run produces no diff.
const manifestPath=path.join(root,'registry/review-candidates/savings-j16-v1.2-j17-v1.4.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
if(manifest.materialized!==true){manifest.materialized=true;fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');}
console.log(`SAVINGS REVIEW CANDIDATES MATERIALIZED: ${Object.keys(bundle.files).length} exact candidate/support files; Golden paths untouched.`);

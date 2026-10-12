import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';import vm from 'node:vm';
const base=new URL('./',import.meta.url),m=JSON.parse(fs.readFileSync(new URL('source-manifest.json',base)));let checks=0;
for(const f of m.files){assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(f.file,base))).digest('hex'),f.sha256,f.file);checks++;}
for(const [j,id]of [['j18','18-v1.1'],['j27','27-v1'],['j28','28-v1']]){const a=JSON.parse(fs.readFileSync(new URL(`authority/approval-${id}.json`,base)));const hash=crypto.createHash('sha256').update(fs.readFileSync(new URL(`goldens/${j}.html`,base))).digest('hex');assert.equal(hash,a.prototype_sha256);checks++;}
for(const j of ['j27','j28']){const html=fs.readFileSync(new URL(`goldens/${j}.html`,base),'utf8'),code=html.slice(html.indexOf('<script>')+8,html.indexOf('const ROOTS='));assert.equal(JSON.stringify(vm.runInNewContext(code+';D',{}, {timeout:1000})),JSON.stringify(JSON.parse(fs.readFileSync(new URL(`${j}-definitions.json`,base)))));checks++;}
console.log(JSON.stringify({status:'PASS',checks,authority:m.authority,schema:m.schema}));

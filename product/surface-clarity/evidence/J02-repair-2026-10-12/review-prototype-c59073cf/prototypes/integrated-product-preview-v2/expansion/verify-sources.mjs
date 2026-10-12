import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const manifest=JSON.parse(readFileSync(new URL('./source-manifest.json',import.meta.url)));let checks=0;
for(const row of [...manifest.files,...manifest.derived]){const bytes=readFileSync(new URL(row.copy,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256,row.copy);checks++;}
console.log(JSON.stringify({status:'PASS',checks,authority:manifest.authority,schema:manifest.schema,implementationBase:manifest.implementationBase,scope:'Exact copied/derived source bytes only; this is not universal task certification or product acceptance.'}));

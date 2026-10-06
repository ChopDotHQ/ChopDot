import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const manifest=JSON.parse(readFileSync(new URL('./source-manifest.json',import.meta.url)));let checks=0;
for(const row of manifest.sources){const bytes=readFileSync(new URL('../../../'+row.path,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);checks++;}
for(const [source,copy]of [[manifest.sources[0],'goldens/j03.html'],[manifest.sources[1],'goldens/j04.html'],[manifest.sources[2],'goldens/j04-c1.html'],[manifest.sources[3],'authority/member-identity.contract.json']]){assert.equal(createHash('sha256').update(readFileSync(new URL(copy,import.meta.url))).digest('hex'),source.sha256);checks++;}
console.log(JSON.stringify({status:'PASS',checks,authority:manifest.authoritySHA,schema:manifest.schemaSHA,taskCertification:'J03/J04 are not in the frozen 31 certified tasks; source-accounted Golden/C1 flows exercised directly.'}));

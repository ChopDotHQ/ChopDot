import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(join(root,'product-schema/frozen-baseline.json'),'utf8'));
const gitBlob=buf=>createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
const read=p=>readFileSync(join(root,p));
const verify=s=>{assert.ok(s?.path&&s?.git_blob,`bad pin ${JSON.stringify(s)}`);assert.equal(gitBlob(read(s.path)),s.git_blob,`frozen source changed: ${s.path}`);};
assert.equal(manifest.authority.product.commit,'4ba456e6595330e4ca8e21366e0d827f17e10881');
assert.equal(manifest.authority.product.tree,'cb424dafedff066fed433e106eb4468bec985d98');
assert.equal(manifest.journeys.length,28);
for(const s of manifest.source_groups.canonical_local_sources)verify(s);
for(const s of manifest.source_groups.phase_c1_overlays)verify(s);
for(const s of manifest.source_groups.reference_only)verify(s);
for(const j of manifest.journeys){
 verify(j.spec); verify(j.prototype); if(j.qa?.git_blob)verify(j.qa);
 for(const c of j.contracts||[])verify(c);
 for(const a of j.authority_files||[])verify(a);
 const text=read(j.prototype.path).toString('utf8');
 const pointerish=read(j.prototype.path).length<3000 && (/<meta[^>]+http-equiv=["']?refresh/i.test(text)||/href=["'][^"#][^"']+\.(?:html|zip|xz)/i.test(text));
 if(pointerish){
   assert.ok(j.artifact_resolution,`pointer Golden lacks resolution: J${j.id}`);
   for(const a of j.artifact_resolution.resolved_artifacts||[])verify(a);
   if(j.artifact_resolution.status==='incomplete_authority_artifact')assert.ok((j.artifact_resolution.missing_artifacts||[]).length>0,`incomplete artifact without missing list J${j.id}`);
 }
 for(const n of j.next||[])assert.ok(manifest.journeys.some(x=>x.id===n),`bad next J${j.id}->J${n}`);
}
assert.ok(manifest.authority_blockers.some(x=>x.id==='AUTH-J05-GOLDEN-INCOMPLETE'));
assert.ok(manifest.accepted_integration.gate_a.provenance_caveat);
console.log(JSON.stringify({stage:1,journeys:28,pointer_resolutions:manifest.journeys.filter(j=>j.artifact_resolution).length,authority_files:manifest.journeys.reduce((n,j)=>n+(j.authority_files||[]).length,0),authority_blockers:manifest.authority_blockers.map(x=>x.id),result:'PASS'},null,2));

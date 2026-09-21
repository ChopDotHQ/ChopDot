import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const m=JSON.parse(readFileSync(join(root,'product-schema/frozen-baseline.json'),'utf8'));
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const read=p=>readFileSync(join(root,p));
const verify=s=>assert.equal(blob(read(s.path)),s.git_blob,'source drift '+s.path);

for(const s of m.source_groups.canonical_local_sources)verify(s);
for(const s of m.source_groups.phase_c1_overlays)verify(s);
for(const s of m.source_groups.reference_only)verify(s);
for(const j of m.journeys){
  verify(j.spec); verify(j.prototype); if(j.qa?.git_blob)verify(j.qa);
  for(const a of j.authority_files||[])verify(a);
  for(const a of j.artifact_resolution?.resolved_artifacts||[])verify(a);
  for(const n of j.next||[])assert.ok(m.journeys.some(x=>x.id===n));
}
for(const c of m.accepted_integration.gate_a.inherited_integration_constraints||[])for(const e of c.evidence||[]){
  const b=Buffer.from(execFileSync('git',['show',e.commit+':'+e.path]));
  assert.equal(blob(b),e.git_blob);
}
assert.equal((m.authority_blockers||[]).length,0);
const rec=(m.authority_recoveries||[]).find(x=>x.id==='RECOVERY-J05-GOLDEN-01');
assert.ok(rec&&rec.status==='resolved');
const a=rec.evidence,b=read(a.path);
assert.equal(blob(b),a.git_blob);
assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256);
assert.equal(b.length,a.size_bytes);
const t=b.toString('utf8');
assert.equal((t.match(/<section class="screen" id="/g)||[]).length,27);
assert.equal((t.match(/href="#/g)||[]).length,98);
const j05=m.journeys.find(x=>x.id==='05');
const state=readFileSync(join(root,j05.authority_files.find(x=>x.kind==='state_inventory').path),'utf8');
const ids=[...state.matchAll(/`([a-z0-9-]+)`/g)].map(x=>x[1]);
for(const id of ids)assert.ok(t.includes('id="'+id+'"'),'recovered J05 missing state '+id);

console.log(JSON.stringify({
  stage:1,journeys:28,
  authority_files:m.journeys.reduce((n,j)=>n+(j.authority_files||[]).length,0),
  authority_blockers:0,
  authority_recoveries:(m.authority_recoveries||[]).map(x=>x.id),
  recovered_j05:{bytes:b.length,states:27,links:98,sha256:a.sha256},
  result:'PASS'
},null,2));

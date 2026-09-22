import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),read=n=>JSON.parse(readFileSync(join(root,'product-schema/generated',n),'utf8'));
const ui=read('ui-surface-inventory.json'),paths=read('journey-path-metrics.json');
assert.equal(ui.authority,'DERIVED_ONLY');assert.equal(paths.authority,'DERIVED_ONLY');assert.equal(ui.journeys.length,28);assert.equal(paths.journeys.length,28);
for(const j of ui.journeys){
  assert.ok(j.journey);assert.ok(j.name);assert.equal(j.artifact.status,'parsed','J'+j.journey+' artifact parse failed: '+j.artifact.error);assert.ok(j.states.length>0,'J'+j.journey+' has no states');
  const ids=new Set(j.states.map(s=>s.id));assert.equal(ids.size,j.states.length,'duplicate state in J'+j.journey);
  for(const s of j.states)for(const a of s.actions.filter(x=>x.target&&x.kind==='state_transition'))assert.ok(ids.has(a.target),'J'+j.journey+' unresolved internal state target '+a.target);
}
const j05=ui.journeys.find(x=>x.journey==='05');assert.equal(j05.summary.state_count,27);assert.deepEqual(j05.summary.required_inputs_from_schema,['amount','description']);assert.equal(j05.summary.entry_state,'entry');assert.ok(j05.states.find(x=>x.id==='entry').actions.some(x=>x.label==='Add expense'&&x.semantic_operation==='expense.create'));
const j06=ui.journeys.find(x=>x.journey==='06');assert.equal(j06.summary.state_count,31);assert.ok(j06.states.some(x=>x.actions.some(a=>a.label==='Save changes'&&a.semantic_operation==='expense.edit')));
const j07=ui.journeys.find(x=>x.journey==='07');assert.equal(j07.summary.state_count,61);assert.ok(j07.states.some(x=>x.actions.some(a=>a.label==="Looks right"&&a.semantic_operation==='expense.review_agree')));
const j08=ui.journeys.find(x=>x.journey==='08');assert.ok(j08.summary.state_count>=6);
console.log(JSON.stringify({ux_diagnostics_verify:'PASS',journeys:28,j05_states:27,j06_states:31,j07_states:61,result:'PASS'},null,2));

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveStage5 } from './stage-5-lib.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=n=>JSON.parse(readFileSync(join(root,'product-schema',n),'utf8'));
const core=read('semantic-core.json');
const graph=read('composition-graph.json');
const frozen=read('frozen-baseline.json');
const registry=read('golden-mapping-sources.json');
const bindings=read('domain-event-bindings-v1.json');
const reconstruction=read('reconstruction-map-v1.json');
const tasks=read('task-paths-v1.json');
const ui=JSON.parse(readFileSync(join(root,'product-schema/generated/ui-surface-inventory.json'),'utf8'));
const x=deriveStage5({root,core,graph,frozen,registry,bindings,reconstruction,ui,tasks});
const generated=JSON.parse(readFileSync(join(root,'product-schema/generated/reconstruction-coverage.json'),'utf8'));
const blast=JSON.parse(readFileSync(join(root,'product-schema/generated/blast-radius.json'),'utf8'));

assert.deepEqual(generated,x.coverage);
assert.deepEqual(blast,x.blast);

const names=['UI_EVENT_MAPPING.json','SCREEN_STATE_MAPPING.json','UI_TO_DOMAIN_EVENTS.md','STATE_AND_AUTHORITY.md','GIVEN_WHEN_THEN.md','golden-validation.json','RETURN_CONTEXT_MAPPING.json'];
const listed=registry.curated_mapping_sources.map(x=>x.path).sort();
const actual=execFileSync('git',['ls-tree','-r','--name-only',registry.product_authority_commit,'prototypes/experience-workbench/journeys'],{cwd:root,encoding:'utf8'})
  .split(/\r?\n/).filter(Boolean).filter(p=>names.some(n=>p.endsWith('/'+n))).sort();
assert.deepEqual(listed,actual,'golden mapping registry must exhaust frozen curated mapping artifacts');
assert.equal(registry.counts.curated_mapping_sources,registry.curated_mapping_sources.length);
assert.equal(registry.counts.supporting_state_sources,registry.supporting_state_sources.length);
assert.equal(registry.counts.total,registry.curated_mapping_sources.length+registry.supporting_state_sources.length);

assert.equal(x.coverage.status,'PASS');
assert.equal(x.coverage.source_pins.errors.length,0);
assert.equal(x.coverage.event_vocabulary.missing.length,0);
assert.equal(x.coverage.event_vocabulary.extra.length,0);
assert.equal(x.coverage.golden_pieces.unjustified_unmapped,0);
assert.equal(x.coverage.operation_witnesses.errors.length,0);
assert.equal(x.coverage.operation_witnesses.witnessed,core.operations.length);
assert.equal(x.coverage.required_states.resolved,x.coverage.required_states.total);
assert.equal(x.coverage.required_states.triggered,x.coverage.required_states.total);
for(const [kind,s] of Object.entries(x.coverage.semantic_witnesses)){
  if(s.witnessed!==undefined)assert.equal(s.witnessed,s.total,'semantic witness gap '+kind);
}
assert.ok(core.objects.some(x=>x.id==='position.scope'&&x.identity.join('|')==='scope_kind|scope_ref'));
assert.ok(core.laws.some(x=>x.id==='LAW-POS-SCOPE-01'&&x.constraint?.settlement_required_scope_kind==='participant_pair'));
assert.ok((graph.coordinated_operations||[]).some(x=>x.id==='participant.link_account'));
assert.ok((graph.contract_only_operations||[]).includes('spend.authorize_execute'));
assert.ok((graph.contract_only_operations||[]).includes('spend.materialize'));

console.log(JSON.stringify({stage:5,reconstruction:'PASS',sources:x.coverage.source_pins.total,events:x.coverage.event_vocabulary.distinct_events,pieces:x.coverage.golden_pieces.total,operations:core.operations.length,required_states:x.coverage.required_states.total,result:'PASS'},null,2));

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveStage5 } from './stage-5-lib.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=n=>JSON.parse(readFileSync(join(root,'product-schema',n),'utf8'));
const core=read('semantic-core.json'),graph=read('composition-graph.json'),frozen=read('frozen-baseline.json'),registry=read('golden-mapping-sources.json'),bindings=read('domain-event-bindings-v1.json'),reconstruction=read('reconstruction-map-v1.json'),tasks=read('task-paths-v1.json'),ui=JSON.parse(readFileSync(join(root,'product-schema/generated/ui-surface-inventory.json'),'utf8'));
const x=deriveStage5({root,core,graph,frozen,registry,bindings,reconstruction,ui,tasks});

assert.deepEqual(JSON.parse(readFileSync(join(root,'product-schema/generated/reconstruction-coverage.json'),'utf8')),x.coverage);
assert.deepEqual(JSON.parse(readFileSync(join(root,'product-schema/generated/blast-radius.json'),'utf8')),x.blast);
assert.deepEqual(JSON.parse(readFileSync(join(root,'product-schema/generated/adversarial-closure-coverage.json'),'utf8')),x.adversarial);
assert.deepEqual(JSON.parse(readFileSync(join(root,'product-schema/generated/reconstruction-pieces.json'),'utf8')),{schema_version:1,generated_view:'reconstruction-pieces',pieces:x.pieces});

const listAt=(suffixes)=>execFileSync('git',['ls-tree','-r','--name-only',registry.product_authority_commit,'prototypes/experience-workbench/journeys'],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(Boolean).filter(p=>suffixes.some(n=>p.endsWith('/'+n))).sort();
const curatedNames=['UI_EVENT_MAPPING.json','SCREEN_STATE_MAPPING.json','UI_TO_DOMAIN_EVENTS.md','STATE_AND_AUTHORITY.md','GIVEN_WHEN_THEN.md','golden-validation.json','RETURN_CONTEXT_MAPPING.json'];
const supportingNames=['STATE_INVENTORY.md','EDGE_CASES.md'];
const executableNames=['model.cjs','DECISIONS.json'];
assert.deepEqual(registry.curated_mapping_sources.map(x=>x.path).sort(),listAt(curatedNames),'curated registry must exhaust frozen mapping artifacts');
assert.deepEqual(registry.supporting_state_sources.map(x=>x.path).sort(),listAt(supportingNames),'supporting registry must exhaust frozen state/edge artifacts');
assert.deepEqual(registry.executable_mapping_sources.map(x=>x.path).sort(),listAt(executableNames),'executable registry must exhaust frozen model/decision artifacts');
assert.equal(registry.counts.curated_mapping_sources,registry.curated_mapping_sources.length);
assert.equal(registry.counts.supporting_state_sources,registry.supporting_state_sources.length);
assert.equal(registry.counts.executable_mapping_sources,registry.executable_mapping_sources.length);
assert.equal(registry.counts.total,registry.curated_mapping_sources.length+registry.supporting_state_sources.length+registry.executable_mapping_sources.length);

assert.equal(x.coverage.status,'PASS');
assert.equal(x.coverage.source_pins.errors.length,0);
assert.equal(x.coverage.event_vocabulary.errors.length,0);
assert.equal(x.coverage.golden_pieces.unjustified_unmapped,0);
assert.equal(x.coverage.golden_pieces.pseudo_pieces,0);
assert.equal(x.coverage.golden_pieces.ungoverned_recovery,0);
assert.equal(x.coverage.operation_witnesses.errors.length,0);
assert.equal(x.coverage.operation_witnesses.witnessed,core.operations.length);
assert.equal(x.coverage.required_states.resolved,x.coverage.required_states.total);
assert.equal(x.coverage.required_states.triggered,x.coverage.required_states.total);
assert.equal(x.coverage.overlays.errors.length,0);
assert.equal(x.coverage.supersessions.errors.length,0);
assert.equal(x.coverage.extraction.errors.length,0);
assert.equal(x.coverage.independent_safety.errors.length,0);
assert.equal(x.coverage.stage_5_2.errors.length,0);
assert.equal(x.coverage.stage_5_2.authored_blobs.matched,x.coverage.stage_5_2.authored_blobs.total);
assert.ok(x.adversarial.total.applicable>0);
assert.equal(x.adversarial.total.detected,x.adversarial.total.applicable);
assert.equal(x.adversarial.total.score,100);
assert.ok(x.adversarial.total.semantic_detected>0);
assert.equal(x.adversarial.total.semantic_detected+x.adversarial.total.freeze_seal_only,x.adversarial.total.applicable);

for(const [kind,s] of Object.entries(x.coverage.semantic_witnesses))if(s.witnessed!==undefined)assert.equal(s.witnessed,s.total,'semantic witness gap '+kind);
for(const d of x.coverage.extraction.source_denominators)assert.ok(d.final_states>=d.declared_state_minimum,'state denominator underflow J'+d.journey);

const j01=x.coverage.golden_pieces.per_journey.find(x=>x.journey==='01');
assert.ok(j01.states>=17,'J01 executable-model states must be reconstructed');
const j24=x.coverage.golden_pieces.per_journey.find(x=>x.journey==='24');
assert.ok(j24.denominator.state_counts.dynamic_source>0,'J24 array-literal source states must parse');
assert.ok(j24.actions>=j24.denominator.declared_action_minimum,'J24 action extraction must meet source denominator');

assert.ok(core.objects.some(x=>x.id==='position.scope'&&JSON.stringify(x.allowed_scope_kinds)==='["participant_pair","group"]'));
assert.ok(core.objects.find(x=>x.id==='position.position')?.references?.some(x=>x.object==='position.scope'&&x.required===true));
assert.ok(core.operations.find(x=>x.id==='settlement.prepare')?.reads?.includes('position.scope'));
for(const id of ['ctx.settlement','ctx.expense_guard']){const c=graph.contexts.find(x=>x.id===id);assert.ok(c.objects.includes('position.scope')&&c.laws.includes('LAW-POS-SCOPE-01'));}

const participant=x.blast.probes.find(p=>p.id==='participant_identity');
const spend=x.blast.probes.find(p=>p.id==='spend_intent');
const guard=x.blast.probes.find(p=>p.id==='settlement_guard');
const edit=x.blast.probes.find(p=>p.id==='expense_edit');
const restore=x.blast.probes.find(p=>p.id==='restore_semantics');
const group=x.blast.probes.find(p=>p.id==='group_lifecycle');
const presentation=x.blast.probes.find(p=>p.id==='presentation_control');
assert.ok(participant&&spend&&guard&&edit&&restore&&group);
assert.ok(participant.transitive.weighted_score>spend.transitive.weighted_score,'blast radius must keep Participant above fenced SpendIntent');
if(presentation)assert.ok(participant.transitive.weighted_score>presentation.transitive.weighted_score,'presentation control must rank below Participant identity');
assert.ok(guard.transitive.nodes.includes('journey:11')&&guard.transitive.nodes.includes('journey:12'),'settlement guard blast must reach settlement journeys through constrained payment objects');
assert.ok(guard.transitive.counts.journeys<participant.transitive.counts.journeys,'settlement guard must not expand to the same product-wide footprint as Participant identity');
assert.ok(edit.transitive.counts.journeys<participant.transitive.counts.journeys,'expense edit must not expand to the same product-wide footprint as Participant identity');
assert.ok(restore.transitive.counts.journeys<participant.transitive.counts.journeys,'restore may be broad but must remain below identity-wide impact');
assert.ok(group.transitive.counts.journeys<participant.transitive.counts.journeys,'group lifecycle must remain below identity-wide impact');
assert.ok(restore.transitive.counts.journeys>=restore.direct.counts.journeys,'restore bounded downstream impact must not shrink below direct impact');
assert.ok(guard.transitive.counts.tasks<(tasks.tasks||[]).length,'guard blast must not blanket-assign every certified task in impacted journeys');

console.log(JSON.stringify({stage:5,reconstruction:'PASS',sources:x.coverage.source_pins.total,events:x.coverage.event_vocabulary.distinct_events,pieces:x.coverage.golden_pieces.total,operations:core.operations.length,construction_required_states:x.coverage.required_states.total,independent_mutations:x.mutations.total.detected+'/'+x.mutations.total.applicable,adversarial_closure:x.adversarial.total.detected+'/'+x.adversarial.total.applicable,adversarial_semantic:x.adversarial.total.semantic_detected+'/'+x.adversarial.total.applicable,adversarial_seal_only:x.adversarial.total.freeze_seal_only,blast_participant:participant.transitive.weighted_score,blast_spend:spend.transitive.weighted_score,result:'PASS'},null,2));

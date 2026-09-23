import { readFileSync,mkdirSync,writeFileSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveStage5 } from './stage-5-lib.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=n=>JSON.parse(readFileSync(join(root,'product-schema',n),'utf8'));
const x=deriveStage5({
  root,
  core:read('semantic-core.json'),
  graph:read('composition-graph.json'),
  frozen:read('frozen-baseline.json'),
  registry:read('golden-mapping-sources.json'),
  bindings:read('domain-event-bindings-v1.json'),
  reconstruction:read('reconstruction-map-v1.json'),
  ui:JSON.parse(readFileSync(join(root,'product-schema/generated/ui-surface-inventory.json'),'utf8')),
  tasks:read('task-paths-v1.json')
});
const out=join(root,'product-schema/generated');
mkdirSync(out,{recursive:true});
writeFileSync(join(out,'reconstruction-coverage.json'),JSON.stringify(x.coverage,null,2)+'\n');
writeFileSync(join(out,'reconstruction-pieces.json'),JSON.stringify({schema_version:1,generated_view:'reconstruction-pieces',pieces:x.pieces},null,2)+'\n');
writeFileSync(join(out,'mutation-coverage.json'),JSON.stringify(x.mutations,null,2)+'\n');
writeFileSync(join(out,'adversarial-closure-coverage.json'),JSON.stringify(x.adversarial,null,2)+'\n');
writeFileSync(join(out,'blast-radius.json'),JSON.stringify(x.blast,null,2)+'\n');

const c=x.coverage,m=x.mutations,a=x.adversarial,b=x.blast;
const closure=c.status==='PASS'&&m.baseline_errors.length===0&&m.total.applicable>0&&m.total.detected===m.total.applicable&&m.total.score===100&&a.total.applicable>0&&a.total.detected===a.total.applicable&&a.total.score===100?'PASS':'FAIL';
const lines=[
'# Product Schema V1 — Reconstruction Closure','',
'**Primary schema closure status: '+closure+'. Gate-specific packets are downstream consumers, not the closure target.**','',
'## Round-trip target','',...c.target_contract.map(v=>'- '+v),'',
'## Golden → Schema completeness','',
'- Frozen mapping/state/executable sources pinned: **'+c.source_pins.matched+' / '+c.source_pins.total+'**',
'- Distinct frozen domain events classified: **'+c.event_vocabulary.bound_events+' / '+c.event_vocabulary.distinct_events+'**',
'- Reconstructed pieces: **'+c.golden_pieces.total+'**',
'  - states: **'+c.golden_pieces.states+'**',
'  - actions: **'+c.golden_pieces.actions+'**',
'  - fields: **'+c.golden_pieces.fields+'**',
'- Authority-accounted/classified pieces: **'+c.golden_pieces.classified+' / '+c.golden_pieces.total+'**',
'- Unjustified pieces: **'+c.golden_pieces.unjustified_unmapped+'**',
'- Authority-only PRODUCT_REQUIREMENT states: **'+(c.stage_5_2?.metrics?.authority_only_product_requirement_states??0)+'**',
'- Draft fields without semantic refs: **'+(c.stage_5_2?.metrics?.draft_fields_without_semantic_ref??0)+'**',
'- Duplicate control evidence instances: **'+(c.stage_5_2?.metrics?.duplicate_control_instances??0)+'**',
'- Conflicting duplicate domain operations: **'+(c.stage_5_2?.metrics?.duplicate_control_conflicts??0)+'**',
'- Pseudo-state pieces: **'+c.golden_pieces.pseudo_pieces+'**',
'- Ungoverned recovery/system pieces: **'+c.golden_pieces.ungoverned_recovery+'**','',
'## Schema → Product soundness','',
'- Semantic objects witnessed: **'+c.semantic_witnesses.objects.witnessed+' / '+c.semantic_witnesses.objects.total+'**',
'- Operations witnessed: **'+c.operation_witnesses.witnessed+' / '+c.operation_witnesses.total+'**',
'- Laws witnessed: **'+c.semantic_witnesses.laws.witnessed+' / '+c.semantic_witnesses.laws.total+'**',
'- Derived views witnessed: **'+c.semantic_witnesses.views.witnessed+' / '+c.semantic_witnesses.views.total+'**',
'- Contexts witnessed: **'+c.semantic_witnesses.contexts.witnessed+' / '+c.semantic_witnesses.contexts.total+'**',
'- Construction requirements witnessed: **'+c.semantic_witnesses.requirements.witnessed+' / '+c.semantic_witnesses.requirements.total+'**',
'- Continuity contracts witnessed: **'+c.semantic_witnesses.continuity.witnessed+' / '+c.semantic_witnesses.continuity.total+'**',
'- Required overlay/decision source families decomposed: **'+(c.overlays.required-c.overlays.errors.length)+' / '+c.overlays.required+'**','',
'## Construction-required state reconstructibility','',
'- Scope: **'+((c.stage_5_2?.metrics?.required_state_scope||[]).join(', ')||'none')+'**',
'- Required states resolved: **'+c.required_states.resolved+' / '+c.required_states.total+'**',
'- Required states with governed trigger meaning: **'+c.required_states.triggered+' / '+c.required_states.total+'**','',
'## Independent safety mutation coverage','',
'- Detector: '+m.detector,
'- Independent co-mutation cases detected: **'+m.total.detected+' / '+m.total.applicable+' ('+m.total.score+'%)**','',
'| Safety class | Detected | Applicable | Score |',
'|---|---:|---:|---:|',
...Object.entries(m.domains).map(([k,v])=>'| '+k+' | '+v.detected+' | '+v.applicable+' | '+v.score+'% |'),'',
'## Stage 5.2 adversarial closure regression coverage','',
'- Detector: '+a.detector,
'- Adversarial regression cases detected: **'+a.total.detected+' / '+a.total.applicable+' ('+a.total.score+'%)**',
'- Freeze seals: **'+Object.entries(c.stage_5_2?.seals||{}).map(([k,v])=>k+'='+v).join(', ')+'**','',
'## Blast-radius probes','',
'| Change | Direct tier | Direct journeys | Direct tasks | Transitive tier | Transitive journeys | Transitive tasks |',
'|---|---|---:|---:|---|---:|---:|',
...b.probes.map(p=>'| '+p.label+' | '+p.direct.tier+' | '+p.direct.counts.journeys+' | '+p.direct.counts.tasks+' | '+p.transitive.tier+' | '+p.transitive.counts.journeys+' | '+p.transitive.counts.tasks+' |'),'',
'## Closure errors','',...(c.errors.length?c.errors.map(e=>'- '+e.id+': '+JSON.stringify(e)):['- None']),'',
'## Freeze criterion','',
closure==='PASS'?'**Reconstruction closure is independently machine-checkable and currently PASS. Product Schema V1 is a freeze candidate, subject only to final external adversarial confirmation.**':'**Do not freeze Product Schema V1 while reconstruction closure is failing.**',''
];
writeFileSync(join(out,'PRODUCT_SCHEMA_CLOSURE.md'),lines.join('\n'));

console.log(JSON.stringify({
  stage:5,
  reconstruction_status:c.status,
  pieces:c.golden_pieces.total,
  unjustified:c.golden_pieces.unjustified_unmapped,
  pseudo_pieces:c.golden_pieces.pseudo_pieces,
  operation_witnesses:c.operation_witnesses.witnessed+'/'+c.operation_witnesses.total,
  required_states:c.required_states.resolved+'/'+c.required_states.total,
  events:c.event_vocabulary.bound_events+'/'+c.event_vocabulary.distinct_events,
  independent_mutation_score:m.total.score,
  adversarial_closure_score:a.total.score,
  closure_status:closure,
  error_count:c.errors.length,
  errors:c.errors.slice(0,80),
  result:closure==='PASS'?'PASS':'FAIL'
},null,2));

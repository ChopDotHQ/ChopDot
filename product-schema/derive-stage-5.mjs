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
writeFileSync(join(out,'mutation-coverage.json'),JSON.stringify(x.mutations,null,2)+'\n');
writeFileSync(join(out,'blast-radius.json'),JSON.stringify(x.blast,null,2)+'\n');

const c=x.coverage,m=x.mutations,b=x.blast;
const closure=c.status==='PASS'&&m.baseline_errors.length===0&&m.total.applicable>0&&m.total.detected===m.total.applicable?'PASS':'FAIL';
const lines=[
'# Product Schema V1 — Reconstruction Closure','',
'**Primary schema closure status: '+closure+'. Gate-specific packets are downstream consumers, not the closure target.**','',
'## Round-trip target','',
...c.target_contract.map(x=>'- '+x),'',
'## Golden → Schema completeness','',
'- Frozen mapping/state sources pinned: **'+c.source_pins.matched+' / '+c.source_pins.total+'**',
'- Distinct frozen domain events classified: **'+c.event_vocabulary.bound_events+' / '+c.event_vocabulary.distinct_events+'**',
'- Reconstructed Golden pieces: **'+c.golden_pieces.total+'**',
'  - states: **'+c.golden_pieces.states+'**',
'  - actions: **'+c.golden_pieces.actions+'**',
'  - fields: **'+c.golden_pieces.fields+'**',
'- Explicitly classified pieces: **'+c.golden_pieces.classified+' / '+c.golden_pieces.total+'**',
'- Unjustified unmapped pieces: **'+c.golden_pieces.unjustified_unmapped+'**','',
'## Schema → Product soundness','',
'- Semantic objects witnessed: **'+c.semantic_witnesses.objects.witnessed+' / '+c.semantic_witnesses.objects.total+'**',
'- Operations witnessed: **'+c.operation_witnesses.witnessed+' / '+c.operation_witnesses.total+'**',
'- Laws witnessed: **'+c.semantic_witnesses.laws.witnessed+' / '+c.semantic_witnesses.laws.total+'**',
'- Derived views witnessed: **'+c.semantic_witnesses.views.witnessed+' / '+c.semantic_witnesses.views.total+'**',
'- Contexts witnessed: **'+c.semantic_witnesses.contexts.witnessed+' / '+c.semantic_witnesses.contexts.total+'**',
'- Construction requirements witnessed: **'+c.semantic_witnesses.requirements.witnessed+' / '+c.semantic_witnesses.requirements.total+'**',
'- Continuity contracts witnessed: **'+c.semantic_witnesses.continuity.witnessed+' / '+c.semantic_witnesses.continuity.total+'**','',
'## Required-state reconstructibility','',
'- Required states resolved: **'+c.required_states.resolved+' / '+c.required_states.total+'**',
'- Required states with explicit trigger meaning: **'+c.required_states.triggered+' / '+c.required_states.total+'**','',
'## Machine-checkable safety contracts','',
'- Machine-checkable laws: **'+c.semantic_witnesses.laws.machine_checkable+'**',
'- Explicitly declared prose-only laws: **'+c.semantic_witnesses.laws.declared_prose_only+'**',
'- Mechanical mutations detected: **'+m.total.detected+' / '+m.total.applicable+' ('+m.total.score+'%)**','',
'| Safety class | Detected | Applicable | Score |',
'|---|---:|---:|---:|',
...Object.entries(m.domains).map(([k,v])=>'| '+k+' | '+v.detected+' | '+v.applicable+' | '+v.score+'% |'),'',
'## Blast-radius probes','',
'| Change | Tier | Objects | Ops | Laws | Contexts | Journeys | Views | Tasks |',
'|---|---|---:|---:|---:|---:|---:|---:|---:|',
...b.probes.map(p=>'| '+p.label+' | '+p.tier+' | '+p.counts.objects+' | '+p.counts.operations+' | '+p.counts.laws+' | '+p.counts.contexts+' | '+p.counts.journeys+' | '+p.counts.views+' | '+p.counts.tasks+' |'),'',
'## Closure errors','',
...(c.errors.length?c.errors.map(e=>'- '+e.id+': '+JSON.stringify(e)):['- None']),'',
'## Freeze criterion','',
closure==='PASS'?'**Reconstruction closure is machine-checkable and currently PASS. Product Schema V1 is a freeze candidate, subject to final independent adversarial review of Stage 5 itself.**':'**Do not freeze Product Schema V1 while reconstruction closure is failing.**',''
];
writeFileSync(join(out,'PRODUCT_SCHEMA_CLOSURE.md'),lines.join('\n'));
console.log(JSON.stringify({stage:5,reconstruction_status:c.status,golden_pieces:c.golden_pieces.total,unjustified_unmapped:c.golden_pieces.unjustified_unmapped,operation_witnesses:c.operation_witnesses.witnessed+'/'+c.operation_witnesses.total,required_states:c.required_states.resolved+'/'+c.required_states.total,events:c.event_vocabulary.bound_events+'/'+c.event_vocabulary.distinct_events,mutation_score:m.total.score,closure_status:closure,result:closure==='PASS'?'PASS':'FAIL'},null,2));

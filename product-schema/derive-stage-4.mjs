import { readFileSync,mkdirSync,writeFileSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveStage4 } from './stage-4-lib.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),read=n=>JSON.parse(readFileSync(join(root,'product-schema',n),'utf8'));
const x=deriveStage4(read('semantic-core.json'),read('composition-graph.json'),read('frozen-baseline.json')),out=join(root,'product-schema/generated');
mkdirSync(out,{recursive:true});writeFileSync(join(out,'completeness-report.json'),JSON.stringify(x.report,null,2)+'\n');writeFileSync(join(out,'gate-b-construction.json'),JSON.stringify(x.packet,null,2)+'\n');
const q=s=>'`'+s+'`',p=x.packet;
const lines=['# Generated Gate B Construction Packet','',
'**Derived view — not product authority or implementation authorization. Pre-Gate-B readiness: '+p.gate.pre_gate_b_readiness+'.**','',
'## Approved post-Golden product decisions','',...(p.approved_product_decisions.length?p.approved_product_decisions.map(x=>'- **'+x.id+'** — approved '+x.approved_on+'; resolves '+x.resolves):['- None']),'',
'## Authority recoveries','',...(p.authority_recoveries.length?p.authority_recoveries.map(x=>'- **'+x.id+'** — '+x.rule):['- None']),'',
'## Authority blockers','',...(p.authority_blockers.length?p.authority_blockers.map(x=>'- **'+x.id+'** — '+x.statement):['- None']),'',
'## Product decisions required','',...(p.product_decisions_required.length?p.product_decisions_required.map(x=>'- **'+x.id+'** — '+x.statement):['- None']),'',
'## Construction order','',...p.construction_order.map((id,i)=>(i+1)+'. J'+id+' — '+p.journeys.find(j=>j.id===id).name),'',
'## Inherited accepted Gate A constraints','',...p.inherited_integration_constraints.map(x=>'- **'+x.id+'** — '+x.rule),'',
'## Render scope','',
'Rendered in Gate B: '+p.composition.views_rendered.map(q).join(', '),
'Refreshed downstream only: '+p.composition.views_refreshed_downstream.map(x=>q(x.id)+' → Gate '+x.owner_gate).join(', '),'',
'## Journey construction requirements','',...p.journeys.flatMap(j=>['### J'+j.id+' — '+j.name,...j.requirements.map(r=>'- **'+r.id+'** ('+r.kind+'): '+JSON.stringify(r.value)),'']),
'## Gate A qualified reuse','',...p.gate_a_reuse.reusable_contexts.map(x=>'- '+q(x.id)+' — '+x.gate_a_coverage),'',
'Provenance caveat: '+p.gate_a_reuse.provenance_caveat,'',
'## Continuity contracts','',...p.continuity_contracts.map(x=>'- **'+x.id+'** — '+x.rule),'',
'## Composition laws','',...p.composition_laws.map(x=>'- **'+x.id+'** — '+x.rule),'',
'## Build constraints','',...p.build_constraints.map(x=>'- **'+x.id+'** — '+x.rule),''];
writeFileSync(join(out,'GATE_B_CONSTRUCTION.md'),lines.join('\n')+'\n');
console.log(JSON.stringify({schema_status:x.report.schema_status,pre_gate_b_readiness:x.report.pre_gate_b_readiness,approved_product_decisions:p.approved_product_decisions.map(x=>x.id),blockers:p.authority_blockers.length,product_decisions_required:p.product_decisions_required.map(x=>x.id),result:'PASS'},null,2));

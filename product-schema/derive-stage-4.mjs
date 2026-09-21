import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveStage4 } from './stage-4-lib.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(readFileSync(join(root,'product-schema',name),'utf8'));
const {report,packet}=deriveStage4(read('semantic-core.json'),read('composition-graph.json'),read('frozen-baseline.json'));
const out=join(root,'product-schema/generated'); mkdirSync(out,{recursive:true});
writeFileSync(join(out,'completeness-report.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(join(out,'gate-b-construction.json'),JSON.stringify(packet,null,2)+'\n');

const lines=['# Generated Gate B Construction Packet','',
'**Derived view — not product authority and not implementation authorization.**','',
`Schema audit: **${report.status}**  `,
`Gate: **${packet.gate.name}**  `,
`Goal: ${packet.gate.goal}`,'',
'## Construction order','',
...packet.construction_order.map((id,i)=>`${i+1}. **J${id} — ${packet.journeys.find(j=>j.id===id).name}**`),'',
'## Gate A reuse','',
`Reusable continuity contexts: ${packet.gate_a_reuse.reusable_contexts.map(x=>`\`${x}\``).join(', ')}.`,
`New Gate B continuity contexts: ${packet.gate_a_reuse.new_gate_b_contexts.map(x=>`\`${x}\``).join(', ')}.`,'',
...packet.gate_a_reuse.operation_delta.map(x=>`- \`${x.id}\`: ${x.status}${x.gate_a_coverage?` — Gate A covered ${x.gate_a_coverage}`:''}`),'',
'Gate A remains frozen; its bounded expense demo is not full J05/J08 integration.','',
'## Shared semantic circuit','',
`Contexts: ${packet.composition.contexts.map(x=>`\`${x}\``).join(', ')}`,'',
`Operations: ${packet.composition.operations.map(x=>`\`${x}\``).join(', ')}`,'',
`Derived views: ${packet.composition.views.map(x=>`\`${x}\``).join(', ')}`,'',
'## Internal handoffs','',
...packet.handoffs.internal.map(x=>`- J${x.from} → J${x.to}: ${x.contexts.map(c=>`\`${c}\``).join(', ')}`),'',
'## Continuity / acceptance','',
...packet.semantic_acceptance.map(x=>`- ${x}`),'',
'## Frozen journey sources','',
...packet.journeys.flatMap(j=>[`### J${j.id} — ${j.name}`,`- Spec: \`${j.golden.spec.path}\``,`- Golden: \`${j.golden.prototype.path}\` — SHA-256 \`${j.golden.prototype.sha256}\``,j.golden.qa?`- QA: \`${j.golden.qa.path}\``:'- QA: source not pinned in the journey registry',`- Owns operations: ${j.wiring.owns_operations.map(x=>`\`${x}\``).join(', ')||'none'}`,`- Participates: ${j.wiring.participates_operations.map(x=>`\`${x}\``).join(', ')||'none'}`,'']),
'## Build constraints','',...packet.build_constraints.map(x=>`- ${x}`),'',
'## Schema blockers','',...(packet.schema_blockers.length?packet.schema_blockers.map(x=>`- ${x}`):['- None detected by Stage 4.']),''];
writeFileSync(join(out,'GATE_B_CONSTRUCTION.md'),lines.join('\n')+'\n');
console.log(JSON.stringify({stage:'product-schema-v1-stage-4',status:report.status,routes:`${report.audits.routes.covered}/${report.audits.routes.total}`,gate_b_journeys:packet.construction_order,schema_blockers:packet.schema_blockers.length},null,2));
if(report.status!=='PASS') process.exitCode=1;

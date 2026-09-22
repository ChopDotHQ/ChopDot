function addEdge(edges,a,b){
  if(!a||!b||!edges.has(a))return;
  edges.get(a).add(b);
}
export function deriveBlastRadius(core,graph,tasks){
  const nodes=new Set(),edges=new Map(),types=new Map();
  const add=(id,type)=>{nodes.add(id);types.set(id,type);if(!edges.has(id))edges.set(id,new Set());};
  for(const o of core.objects)add('object:'+o.id,'objects');
  for(const o of core.operations)add('operation:'+o.id,'operations');
  for(const l of core.laws)add('law:'+l.id,'laws');
  for(const c of graph.contexts)add('context:'+c.id,'contexts');
  for(const j of graph.journey_projections)add('journey:'+j.id,'journeys');
  for(const v of core.derived_models)add('view:'+v.id,'views');
  for(const t of tasks.tasks||[])add('task:'+t.id,'tasks');

  for(const o of core.operations){
    for(const id of [o.owner,...(o.changes||[]),...(o.invalidates||[]),...(o.guards||[]),...(o.invalidates_prepared||[])])addEdge(edges,'object:'+id,'operation:'+o.id);
    for(const lid of o.law_refs||[])addEdge(edges,'operation:'+o.id,'law:'+lid);
  }
  for(const l of core.laws)for(const id of l.applies_to||[])addEdge(edges,'object:'+id,'law:'+l.id);
  for(const c of graph.contexts){
    for(const id of c.objects||[])addEdge(edges,'object:'+id,'context:'+c.id);
    for(const lid of c.laws||[])addEdge(edges,'law:'+lid,'context:'+c.id);
  }
  for(const v of core.derived_models)for(const id of v.derived_from||[])addEdge(edges,'object:'+id,'view:'+v.id);
  for(const j of graph.journey_projections){
    for(const op of [...(j.owns_operations||[]),...(j.participates_operations||[])])addEdge(edges,'operation:'+op,'journey:'+j.id);
    for(const c of [...(j.entry_contexts_any||[]),...(j.ambient_contexts_required||[]),...(j.effect_contexts_required||[]),...(j.emits_contexts||[])])addEdge(edges,'context:'+c,'journey:'+j.id);
    for(const v of j.renders_views||[])addEdge(edges,'view:'+v,'journey:'+j.id);
  }
  for(const u of graph.composition_units||[])for(const lid of u.law_refs||[])for(const jid of u.journeys||[])addEdge(edges,'law:'+lid,'journey:'+jid);
  for(const t of tasks.tasks||[])addEdge(edges,'journey:'+t.journey,'task:'+t.id);

  function impact(starts){
    const q=starts.filter(x=>nodes.has(x)),seen=new Set(q);
    while(q.length){
      const x=q.shift();
      for(const y of edges.get(x)||[])if(!seen.has(y)){seen.add(y);q.push(y);}
    }
    const counts={objects:0,operations:0,laws:0,contexts:0,journeys:0,views:0,tasks:0};
    for(const x of seen){const t=types.get(x);if(t)counts[t]++;}
    const score=counts.journeys*4+counts.tasks*2+counts.operations*3+counts.laws*2+counts.contexts+counts.views;
    const tier=score>=60?'CRITICAL':score>=30?'HIGH':score>=12?'MODERATE':score>=4?'LOW':'NEGLIGIBLE';
    return {counts,total_nodes:seen.size,weighted_score:score,tier,nodes:[...seen].sort()};
  }
  const specs=[
    ['equal_split_semantics','Equal split semantics',['object:expense.allocation','law:LAW-MONEY-01']],
    ['participant_identity','Participant identity',['object:identity.participant']],
    ['settlement_eligibility','Settlement eligibility',['law:LAW-PAY-04']],
    ['expense_edit','Expense edit rules',['operation:expense.edit']],
    ['review_reset','Review reset behavior',['law:LAW-EXP-REVIEW-01']],
    ['restore_semantics','Restore semantics',['operation:storage.restore']],
    ['payment_destination','Payment destination',['object:payment.destination']],
    ['group_lifecycle','Group lifecycle',['object:group.group']],
    ['spend_intent','SpendIntent',['object:spend.intent']],
    ['settlement_guard','Settlement mutation guard',['law:LAW-EXP-GUARD-01']],
    ['position_scope','Typed PositionScope',['object:position.scope']]
  ];
  const probes=specs.map(([id,label,starts])=>({id,label,starts,...impact(starts)}));
  probes.push({id:'presentation_control',label:'Presentation-only control',starts:['presentation:J19'],counts:{objects:0,operations:0,laws:0,contexts:0,journeys:1,views:0,tasks:0},total_nodes:1,weighted_score:4,tier:'LOW',nodes:['journey:19']});
  return {schema_version:1,generated_view:'blast-radius',edge_count:[...edges.values()].reduce((n,s)=>n+s.size,0),node_count:nodes.size,probes};
}

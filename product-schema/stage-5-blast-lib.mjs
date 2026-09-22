
function addNode(nodes,edges,types,id,type){
  nodes.add(id);types.set(id,type);if(!edges.has(id))edges.set(id,new Set());
}
function addEdge(edges,a,b){if(a&&b&&edges.has(a)&&edges.has(b))edges.get(a).add(b);}
function uniq(a){return [...new Set(a||[])];}

export function deriveBlastRadius(core,graph,tasks,pieces=[]){
  const nodes=new Set(),edges=new Map(),types=new Map(),relationCounts={};
  const add=(id,type)=>addNode(nodes,edges,types,id,type);
  const edge=(a,b,relation)=>{addEdge(edges,a,b);relationCounts[relation]=(relationCounts[relation]||0)+1;};

  for(const o of core.objects)add("object:"+o.id,"objects");
  for(const o of core.operations)add("operation:"+o.id,"operations");
  for(const l of core.laws)add("law:"+l.id,"laws");
  for(const c of graph.contexts)add("context:"+c.id,"contexts");
  for(const j of graph.journey_projections)add("journey:"+j.id,"journeys");
  for(const v of core.derived_models)add("view:"+v.id,"views");
  for(const t of tasks.tasks||[])add("task:"+t.id,"tasks");
  for(const p of pieces)add("piece:"+p.piece_id,"pieces");

  const viewConsumers=new Map();
  for(const v of core.derived_models){
    for(const id of v.derived_from||[]){
      edge("object:"+id,"view:"+v.id,"object_to_derived_view");
      if(!viewConsumers.has(id))viewConsumers.set(id,[]);
      viewConsumers.get(id).push(v.id);
    }
  }

  for(const o of core.operations){
    const readSet=uniq([o.owner,...(o.reads||[]),...(o.guards||[])]);
    for(const id of readSet)edge("object:"+id,"operation:"+o.id,"object_read_by_operation");
    for(const lid of o.law_refs||[])edge("law:"+lid,"operation:"+o.id,"law_governs_operation");
    for(const id of uniq([...(o.changes||[]),...(o.invalidates||[]),...(o.invalidates_prepared||[])])){
      for(const vid of viewConsumers.get(id)||[])edge("operation:"+o.id,"view:"+vid,"operation_affects_view");
    }
  }

  for(const c of graph.contexts){
    for(const id of c.objects||[])edge("object:"+id,"context:"+c.id,"object_consumed_by_context");
    for(const lid of c.laws||[])edge("law:"+lid,"context:"+c.id,"law_consumed_by_context");
  }

  for(const j of graph.journey_projections){
    for(const op of [...(j.owns_operations||[]),...(j.participates_operations||[])])edge("operation:"+op,"journey:"+j.id,"operation_used_by_journey");
    for(const cid of [...(j.entry_contexts_any||[]),...(j.ambient_contexts_required||[]),...(j.effect_contexts_required||[])])edge("context:"+cid,"journey:"+j.id,"context_consumed_by_journey");
    for(const v of j.renders_views||[])edge("view:"+v,"journey:"+j.id,"view_rendered_by_journey");
  }

  for(const u of graph.composition_units||[]){
    for(const lid of u.law_refs||[])for(const jid of u.journeys||[])edge("law:"+lid,"journey:"+jid,"composition_law_affects_journey");
  }
  for(const t of tasks.tasks||[])edge("journey:"+t.journey,"task:"+t.id,"journey_contains_task");
  for(const p of pieces)edge("piece:"+p.piece_id,"journey:"+p.journey,"piece_belongs_to_journey");

  function summarize(set){
    const counts={objects:0,operations:0,laws:0,contexts:0,journeys:0,views:0,tasks:0,pieces:0};
    for(const x of set){const t=types.get(x);if(t)counts[t]++;}
    const score=counts.journeys*4+counts.tasks*2+counts.operations*3+counts.laws*2+counts.contexts+counts.views;
    const tier=score>=80?"CRITICAL":score>=35?"HIGH":score>=15?"MODERATE":score>=5?"LOW":"NEGLIGIBLE";
    return {counts,total_nodes:set.size,weighted_score:score,tier};
  }

  function impact(starts){
    const initial=starts.filter(x=>nodes.has(x));
    const direct=new Set(initial);
    for(const x of initial)for(const y of edges.get(x)||[])direct.add(y);
    const q=[...initial],transitive=new Set(initial);
    while(q.length){
      const x=q.shift();
      for(const y of edges.get(x)||[])if(!transitive.has(y)){transitive.add(y);q.push(y);}
    }
    return {
      direct:{...summarize(direct),nodes:[...direct].sort()},
      transitive:{...summarize(transitive),nodes:[...transitive].sort()}
    };
  }

  const specs=[
    ["equal_split_semantics","Equal split semantics",["object:expense.allocation","law:LAW-MONEY-01"]],
    ["participant_identity","Participant identity",["object:identity.participant"]],
    ["settlement_eligibility","Settlement eligibility",["law:LAW-PAY-04"]],
    ["expense_edit","Expense edit rules",["operation:expense.edit"]],
    ["review_reset","Review reset behavior",["law:LAW-EXP-REVIEW-01"]],
    ["restore_semantics","Restore semantics",["operation:storage.restore"]],
    ["payment_destination","Payment destination",["object:payment.destination"]],
    ["group_lifecycle","Group lifecycle",["object:group.group"]],
    ["spend_intent","SpendIntent",["object:spend.intent"]],
    ["settlement_guard","Settlement mutation guard",["law:LAW-EXP-GUARD-01"]],
    ["position_scope","Typed PositionScope",["object:position.scope"]]
  ];
  const probes=specs.map(([id,label,starts])=>({id,label,starts,...impact(starts)}));

  const presentation=pieces.find(p=>p.piece_type==="visible_action"&&["PRESENTATION_ONLY","NAVIGATION_TRANSITION"].includes(p.classification)&&!(p.schema_refs||[]).length);
  if(presentation){
    const starts=["piece:"+presentation.piece_id];
    probes.push({id:"presentation_control",label:"Low-semantic presentation/navigation control",starts,piece_id:presentation.piece_id,...impact(starts)});
  }

  return {
    schema_version:2,
    generated_view:"blast-radius",
    model:"directed dependency-to-consumer graph; writes affect derived views but laws/objects do not bridge back into each other",
    edge_count:[...edges.values()].reduce((n,s)=>n+s.size,0),
    relation_counts:relationCounts,
    node_count:nodes.size,
    probes
  };
}

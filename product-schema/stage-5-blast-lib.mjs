
function addNode(nodes,edges,types,id,type){
  nodes.add(id);types.set(id,type);if(!edges.has(id))edges.set(id,[]);
}
function addEdge(edges,a,b,kind,relation,relationCounts){
  if(!a||!b||!edges.has(a)||!edges.has(b))return;
  if(!edges.get(a).some(e=>e.to===b&&e.kind===kind&&e.relation===relation))edges.get(a).push({to:b,kind,relation});
  relationCounts[relation]=(relationCounts[relation]||0)+1;
}
function uniq(a){return [...new Set(a||[])];}

export function deriveBlastRadius(core,graph,tasks,pieces=[]){
  const nodes=new Set(),edges=new Map(),types=new Map(),relationCounts={};
  const add=(id,type)=>addNode(nodes,edges,types,id,type);
  const semantic=(a,b,relation)=>addEdge(edges,a,b,"semantic",relation,relationCounts);
  const effect=(a,b,relation)=>addEdge(edges,a,b,"effect",relation,relationCounts);

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
      semantic("object:"+id,"view:"+v.id,"object_to_derived_view");
      if(!viewConsumers.has(id))viewConsumers.set(id,[]);
      viewConsumers.get(id).push(v.id);
    }
  }

  for(const o of core.operations){
    const readSet=uniq([o.owner,...(o.reads||[]),...(o.guards||[])]);
    for(const id of readSet)semantic("object:"+id,"operation:"+o.id,"object_read_by_operation");
    for(const lid of o.law_refs||[])semantic("law:"+lid,"operation:"+o.id,"law_governs_operation");

    // Effect edges describe what THIS operation can change. They are allowed one
    // propagation hop only when the operation itself is the blast-radius origin.
    // This prevents a state reader from turning into an assumed executed command.
    for(const id of uniq([...(o.changes||[]),...(o.invalidates||[]),...(o.invalidates_prepared||[])])){
      effect("operation:"+o.id,"object:"+id,"operation_writes_or_invalidates_object");
      for(const vid of viewConsumers.get(id)||[])semantic("operation:"+o.id,"view:"+vid,"operation_affects_view");
    }
  }

  for(const l of core.laws){
    for(const id of l.applies_to||[])semantic("law:"+l.id,"object:"+id,"law_constrains_object");
  }

  for(const c of graph.contexts){
    for(const id of c.objects||[])semantic("object:"+id,"context:"+c.id,"object_consumed_by_context");
    for(const lid of c.laws||[])semantic("law:"+lid,"context:"+c.id,"law_consumed_by_context");
  }

  for(const j of graph.journey_projections){
    for(const op of [...(j.owns_operations||[]),...(j.participates_operations||[])])semantic("operation:"+op,"journey:"+j.id,"operation_used_by_journey");
    for(const cid of [...(j.entry_contexts_any||[]),...(j.ambient_contexts_required||[]),...(j.effect_contexts_required||[])])semantic("context:"+cid,"journey:"+j.id,"context_consumed_by_journey");
    for(const v of j.renders_views||[])semantic("view:"+v,"journey:"+j.id,"view_rendered_by_journey");
  }

  for(const u of graph.composition_units||[]){
    for(const lid of u.law_refs||[])for(const jid of u.journeys||[])semantic("law:"+lid,"journey:"+jid,"composition_law_affects_journey");
  }

  // Task impact is tied to the operation the certified task actually performs,
  // not to every task that merely lives in an affected journey.
  for(const t of tasks.tasks||[]){
    const ops=uniq((t.steps||[]).map(s=>s.semantic_operation).filter(Boolean));
    for(const op of ops)semantic("operation:"+op,"task:"+t.id,"operation_used_by_task");
  }

  for(const p of pieces)semantic("piece:"+p.piece_id,"journey:"+p.journey,"piece_belongs_to_journey");

  function summarize(set){
    const counts={objects:0,operations:0,laws:0,contexts:0,journeys:0,views:0,tasks:0,pieces:0};
    for(const x of set){const t=types.get(x);if(t)counts[t]++;}
    const score=counts.journeys*4+counts.tasks*2+counts.operations*3+counts.laws*2+counts.contexts+counts.views;
    const tier=score>=80?"CRITICAL":score>=35?"HIGH":score>=15?"MODERATE":score>=5?"LOW":"NEGLIGIBLE";
    return {counts,total_nodes:set.size,weighted_score:score,tier};
  }

  function impact(starts){
    const initial=starts.filter(x=>nodes.has(x));
    const initialSet=new Set(initial);
    const direct=new Set(initial);
    for(const x of initial)for(const e of edges.get(x)||[])direct.add(e.to);

    // "transitive" is intentionally bounded causal propagation:
    // - semantic dependency edges may propagate;
    // - an effect/write edge may be crossed only from an origin operation;
    // - operations reached as consumers are NOT assumed to execute and write.
    const q=initial.map(node=>({node,effectUsed:0}));
    const best=new Map(initial.map(node=>[node,0]));
    while(q.length){
      const cur=q.shift();
      for(const e of edges.get(cur.node)||[]){
        let effectUsed=cur.effectUsed;
        if(e.kind==="effect"){
          if(effectUsed>=1||!initialSet.has(cur.node))continue;
          effectUsed++;
        }
        const prior=best.get(e.to);
        if(prior===undefined||effectUsed<prior){
          best.set(e.to,effectUsed);
          q.push({node:e.to,effectUsed});
        }
      }
    }
    const bounded=new Set(best.keys());
    return {
      direct:{...summarize(direct),nodes:[...direct].sort()},
      transitive:{...summarize(bounded),nodes:[...bounded].sort()}
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
    schema_version:3,
    generated_view:"blast-radius",
    model:"bounded causal dependency graph: semantic dependencies propagate; write/invalidation effects propagate only from origin operations; reached consumer operations are not assumed to execute; certified tasks are linked only by their semantic_operation",
    causal_horizon:{
      semantic_dependency_edges:"transitive",
      effect_edges:"maximum one, only from an origin operation",
      reached_consumer_operation_effects:"not propagated",
      task_edges:"operation-to-certified-task only; no blanket journey-to-all-tasks expansion"
    },
    edge_count:[...edges.values()].reduce((n,a)=>n+a.length,0),
    relation_counts:relationCounts,
    node_count:nodes.size,
    probes
  };
}

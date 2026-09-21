export function deriveStage4(core, graph, frozen) {
  const objectIds=new Set(core.objects.map(x=>x.id));
  const journeyIds=new Set(frozen.journeys.map(x=>x.id));
  const contextIds=new Set(graph.contexts.map(x=>x.id));
  const byJ=new Map(graph.journey_projections.map(x=>[x.id,x]));
  const byObject=new Map(core.objects.map(x=>[x.id,x]));
  const byOp=new Map(core.operations.map(x=>[x.id,x]));
  const byView=new Map(core.derived_models.map(x=>[x.id,x]));
  const byLaw=new Map(core.laws.map(x=>[x.id,x]));
  const byCtx=new Map(graph.contexts.map(x=>[x.id,x]));

  const usage=Object.fromEntries(core.objects.map(o=>[o.id,{contexts:[],owner_of:[],changed_by:[],derived_into:[],laws:[]}]));
  for(const c of graph.contexts) for(const id of c.objects) usage[id]?.contexts.push(c.id);
  for(const op of core.operations){
    usage[op.owner]?.owner_of.push(op.id);
    for(const id of op.changes||[]) usage[id]?.changed_by.push(op.id);
  }
  for(const v of core.derived_models) for(const id of v.derived_from) usage[id]?.derived_into.push(v.id);
  for(const l of core.laws) for(const id of l.applies_to) usage[id]?.laws.push(l.id);
  const orphanObjects=Object.entries(usage).filter(([,u])=>Object.values(u).every(a=>a.length===0)).map(([id])=>id);

  const viewConsumers=Object.fromEntries(core.derived_models.map(v=>[v.id,[]]));
  for(const j of graph.journey_projections) for(const id of j.renders_views) viewConsumers[id]?.push(j.id);
  const unrenderedViews=Object.entries(viewConsumers).filter(([,x])=>x.length===0).map(([id])=>id);

  const opUse=Object.fromEntries(core.operations.map(o=>[o.id,{owners:[],participants:[],units:[],contract_only:graph.contract_only_operations.includes(o.id),coordinated:false}]));
  for(const j of graph.journey_projections){
    for(const id of j.owns_operations) opUse[id]?.owners.push(j.id);
    for(const id of j.participates_operations) opUse[id]?.participants.push(j.id);
  }
  for(const u of graph.composition_units) for(const id of u.operations||[]) opUse[id]?.units.push(u.id);
  for(const c of graph.coordinated_operations||[]) if(opUse[c.id]) opUse[c.id].coordinated=true;
  const duplicateJourneyOwners=Object.entries(opUse).filter(([,x])=>x.owners.length>1).map(([id,x])=>({id,owners:x.owners}));
  const unclassifiedUnownedOps=Object.entries(opUse).filter(([,x])=>x.owners.length===0&&!x.contract_only&&!x.coordinated).map(([id,x])=>({id,participants:x.participants,units:x.units}));
  const unwiredOps=Object.entries(opUse).filter(([,x])=>x.owners.length===0&&x.participants.length===0&&x.units.length===0&&!x.contract_only).map(([id])=>id);

  const ambient=(graph.ambient_contexts||[]).map(x=>x.id);
  const routes=frozen.journeys.flatMap(j=>(j.next||[]).map(to=>{
    const source=byJ.get(j.id), target=byJ.get(to);
    const available=[...new Set([...(source?.emits_contexts||[]),...ambient])];
    const accepts=target?.entry_contexts_any||[];
    const matched=accepts.filter(x=>available.includes(x));
    return {from:j.id,to,matched_contexts:matched,available_contexts:available,accepted_entry_contexts:accepts,covered:matched.length>0};
  }));
  const routeGaps=routes.filter(x=>!x.covered);
  const ambientOnly=routes.filter(x=>x.covered && x.matched_contexts.every(x=>ambient.includes(x))).map(x=>({from:x.from,to:x.to,matched_contexts:x.matched_contexts}));

  const compositionJourneyCoverage=new Set();
  for(const u of graph.composition_units){for(const id of u.journeys||[])compositionJourneyCoverage.add(id);for(const id of u.boundary_journeys||[])compositionJourneyCoverage.add(id);}
  const missingCompositionJourneys=[...journeyIds].filter(id=>!compositionJourneyCoverage.has(id));

  const contextsUsed=new Set();
  for(const j of graph.journey_projections) for(const id of [...j.requires_contexts,...j.emits_contexts,...(j.entry_contexts_any||[])]) contextsUsed.add(id);
  for(const u of graph.composition_units) for(const id of u.contexts||[]) contextsUsed.add(id);
  for(const gate of graph.gates) for(const id of gate.contexts||[]) contextsUsed.add(id);
  const unusedContexts=[...contextIds].filter(id=>!contextsUsed.has(id));
  const lawlessObjects=core.objects.filter(o=>(usage[o.id]?.laws||[]).length===0).map(o=>o.id);

  const gateB=graph.gates.find(x=>x.id==='B');
  const unit=graph.composition_units.find(x=>x.id===gateB.composition);
  const bset=new Set(gateB.journeys);
  const internalHandoffs=routes.filter(x=>bset.has(x.from)&&bset.has(x.to)).map(x=>({from:x.from,to:x.to,contexts:x.matched_contexts}));
  const inboundHandoffs=routes.filter(x=>!bset.has(x.from)&&bset.has(x.to)).map(x=>({from:x.from,to:x.to,contexts:x.matched_contexts}));
  const downstreamHandoffs=routes.filter(x=>bset.has(x.from)&&!bset.has(x.to)).map(x=>({from:x.from,to:x.to,contexts:x.matched_contexts}));

  const relevantObjects=new Set();
  for(const id of gateB.contexts) for(const oid of byCtx.get(id)?.objects||[]) relevantObjects.add(oid);
  for(const id of gateB.operations){const op=byOp.get(id);if(!op)continue;relevantObjects.add(op.owner);for(const oid of op.changes||[])relevantObjects.add(oid);}
  for(const id of unit.views||[]) for(const oid of byView.get(id)?.derived_from||[]) relevantObjects.add(oid);
  const relevantLaws=core.laws.filter(l=>l.applies_to.some(id=>relevantObjects.has(id))).map(l=>l.id);

  const gateA=graph.gates.find(x=>x.id==='A');
  const gateAContexts=new Set(gateA.contexts||[]);
  const reusedContexts=gateB.contexts.filter(x=>gateAContexts.has(x));
  const newContexts=gateB.contexts.filter(x=>!gateAContexts.has(x));
  const gateAOpMap=new Map((gateA.operations||[]).map(x=>[x.id,x]));
  const operationDelta=gateB.operations.map(id=>{
    const a=gateAOpMap.get(id);
    return a?{id,status:'expand_bounded_gate_a_capability',gate_a_coverage:a.coverage}:{id,status:'new_to_integrated_gate_b'};
  });

  const journeyPackets=gateB.journeys.map(id=>{
    const f=frozen.journeys.find(x=>x.id===id), p=byJ.get(id);
    return {id,name:f.name,version:f.version,golden:{spec:f.spec,prototype:f.prototype,qa:f.qa,contracts:f.contracts},
      registry:{entry:f.entry,exit:f.exit,next:f.next},
      wiring:{entry_contexts_any:p.entry_contexts_any,requires_contexts:p.requires_contexts,owns_operations:p.owns_operations,participates_operations:p.participates_operations,renders_views:p.renders_views,emits_contexts:p.emits_contexts}};
  });

  const packet={
    schema_version:1,generated_view:'gate-b-construction',authority:'DERIVED_ONLY',
    gate:{id:'B',name:gateB.name,status:gateB.status,goal:gateB.goal,implementation_authorized:false},
    generated_from:{product_authority_commit:frozen.authority.product.commit,stage_1_schema:'frozen-baseline.json',stage_2_schema:'semantic-core.json',stage_3_schema:'composition-graph.json'},
    construction_order:gateB.journeys,journeys:journeyPackets,
    composition:{id:unit.id,contexts:gateB.contexts,operations:gateB.operations,views:unit.views||[],continuity:unit.continuity||[]},
    semantic_objects:[...relevantObjects].sort().map(id=>byObject.get(id)),
    operation_contracts:gateB.operations.map(id=>byOp.get(id)),
    laws:relevantLaws.map(id=>byLaw.get(id)),
    contexts:gateB.contexts.map(id=>byCtx.get(id)),
    handoffs:{internal:internalHandoffs,inbound:inboundHandoffs,downstream:downstreamHandoffs},
    gate_a_reuse:{accepted_source:gateA.accepted_source,reusable_contexts:reusedContexts,new_gate_b_contexts:newContexts,operation_delta:operationDelta,frozen_scope_exclusions:gateA.scope_exclusions,rule:gateA.rule},
    integration_contract_sources:graph.external_integration_sources,
    semantic_acceptance:[...(unit.continuity||[]),
      'Every Gate B mutation operates on the same stable Group/Participant/Expense lineage rather than screen-local substitutes.',
      'Explicit Expense splits conserve the exact Expense amount under MoneyV1 semantics.',
      'J06 owns expense edit/delete; J07 owns agreement/issue semantics; coordinated issue resolution preserves that boundary.',
      'Unresolved ExpenseIssue state blocks only dependent payment items.',
      'GroupHome/Position/Activity refresh from accepted underlying state rather than manual UI overwrites.',
      'Gate A accepted bytes and the 28 frozen Goldens remain unchanged.'],
    build_constraints:[
      'Do not infer full J05/J08 coverage from the bounded Gate A expense demonstration.',
      'Do not redesign Golden hierarchy, copy, actions, permission boundaries, or recovery meaning.',
      'Do not introduce production storage, real authentication, financial execution, provider selection, or Product Integrator work as part of Gate B.',
      'Do not use Product IR/funding/conformance research branches as product authority.'
    ],schema_blockers:[]
  };

  const blockers={orphan_objects:orphanObjects,unrendered_views:unrenderedViews,duplicate_journey_operation_owners:duplicateJourneyOwners,
    unclassified_unowned_operations:unclassifiedUnownedOps,unwired_operations:unwiredOps,route_context_gaps:routeGaps,
    journeys_missing_composition:missingCompositionJourneys,unused_contexts:unusedContexts};
  const blockerCount=Object.values(blockers).reduce((n,a)=>n+a.length,0);
  const report={
    schema_version:1,generated_view:'stage-4-completeness',status:blockerCount===0?'PASS':'FAIL',authority:'DERIVED_ONLY',
    inputs:{product_authority_commit:frozen.authority.product.commit,stage_2_objects:core.objects.length,stage_2_operations:core.operations.length,stage_3_contexts:graph.contexts.length,journeys:graph.journey_projections.length},
    audits:{
      objects:{total:core.objects.length,orphans:orphanObjects,lawless_informational:lawlessObjects},
      views:{total:core.derived_models.length,unrendered:unrenderedViews},
      operations:{total:core.operations.length,duplicate_journey_owners:duplicateJourneyOwners,coordinated:(graph.coordinated_operations||[]).map(x=>x.id),contract_only:graph.contract_only_operations,unclassified_unowned:unclassifiedUnownedOps,unwired:unwiredOps},
      routes:{total:routes.length,covered:routes.length-routeGaps.length,gaps:routeGaps,ambient_identity_only:ambientOnly},
      composition:{units:graph.composition_units.length,journeys_covered:journeyIds.size-missingCompositionJourneys.length,missing_journeys:missingCompositionJourneys,unused_contexts:unusedContexts},
      gate_b:{journeys:gateB.journeys,internal_handoffs:internalHandoffs.length,inbound_handoffs:inboundHandoffs.length,downstream_handoffs:downstreamHandoffs.length,schema_blockers:packet.schema_blockers}
    },blockers,
    known_nonblocking_findings:[...core.known_gaps,
      {id:'AUDIT-INFO-01',classification:'informational',statement:'Objects without a cross-domain law are still constrained by their owning operations/contracts and are not treated as orphans.',objects:lawlessObjects},
      {id:'AUDIT-INFO-02',classification:'informational',statement:'Some route continuity relies only on ambient authenticated identity rather than a route-specific domain object; those routes are explicitly listed.',routes:ambientOnly}]
  };
  return {report,packet,routes};
}

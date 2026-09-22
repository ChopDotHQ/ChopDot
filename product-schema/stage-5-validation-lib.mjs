
const uniq=a=>[...new Set(a||[])];
const norm=x=>String(x??'').trim();
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const has=(a,x)=>Array.isArray(a)&&a.includes(x);

export function resolveSchemaRef(core,graph,id){
  if(core.objects.some(x=>x.id===id))return {kind:"object",id};
  if(core.operations.some(x=>x.id===id))return {kind:"operation",id};
  if(core.laws.some(x=>x.id===id))return {kind:"law",id};
  if(core.derived_models.some(x=>x.id===id))return {kind:"view",id};
  if(graph.contexts.some(x=>x.id===id))return {kind:"context",id};
  if((graph.construction_requirements||[]).some(x=>x.id===id))return {kind:"requirement",id};
  if((graph.continuity_contracts||[]).some(x=>x.id===id))return {kind:"continuity",id};
  if((graph.shared_composition_laws||[]).some(x=>x.id===id))return {kind:"composition_law",id};
  if((core.golden_impacts||[]).some(x=>x.id===id))return {kind:"golden_impact",id};
  if((core.approved_product_decisions||[]).some(x=>x.id===id))return {kind:"decision",id};
  return null;
}

export function validateEventBindings(core,bindings,eventSet){
  const errors=[],ops=new Set(core.operations.map(x=>x.id));
  const allowed=new Set(bindings.operation_relation_vocabulary||[]);
  const seen=new Set();
  for(const b of bindings.bindings||[]){
    if(seen.has(b.domain_event))errors.push({id:"EVENT-DUPLICATE",event:b.domain_event});seen.add(b.domain_event);
    if(!eventSet.has(b.domain_event))errors.push({id:"EVENT-BINDING-NOT-IN-AUTHORITY",event:b.domain_event});
    const rels=b.operation_bindings||[];
    if(!eq((b.operation_refs||[]).sort(),rels.map(x=>x.operation).sort()))errors.push({id:"EVENT-REF-RELATION-DIVERGENCE",event:b.domain_event});
    for(const r of rels){
      if(!ops.has(r.operation))errors.push({id:"EVENT-UNKNOWN-OPERATION",event:b.domain_event,operation:r.operation});
      if(!allowed.has(r.relation))errors.push({id:"EVENT-UNKNOWN-RELATION",event:b.domain_event,relation:r.relation});
    }
    if(b.classification==="DOMAIN_OPERATION"){
      if(!rels.length)errors.push({id:"EVENT-DOMAIN-WITHOUT-OPERATION",event:b.domain_event});
      if(rels.some(r=>!["initiates","commits","reports_claim"].includes(r.relation)))errors.push({id:"EVENT-DOMAIN-BAD-RELATION",event:b.domain_event});
    }
    if(["NAVIGATION_TRANSITION","DERIVED_PROJECTION","REVIEW_DEMO_CHROME","PRESENTATION_ONLY","EXTERNAL_HANDOFF","DRAFT_FIELD"].includes(b.classification)&&rels.length){
      errors.push({id:"EVENT-NONMUTATION-HAS-OPERATION",event:b.domain_event,classification:b.classification});
    }
    if(b.classification==="RECOVERY_BEHAVIOR"&&rels.some(r=>!["queries","retries","cancels","reports_result"].includes(r.relation))){
      errors.push({id:"EVENT-RECOVERY-BAD-RELATION",event:b.domain_event});
    }
    if(b.classification==="SYSTEM_PROGRESSION"&&rels.some(r=>!["reports_result","commits"].includes(r.relation))){
      errors.push({id:"EVENT-SYSTEM-BAD-RELATION",event:b.domain_event});
    }
    if(b.classification==="SELECTION_STATE"&&rels.some(r=>!["prepares"].includes(r.relation))){
      errors.push({id:"EVENT-SELECTION-BAD-RELATION",event:b.domain_event});
    }
  }
  for(const e of eventSet)if(!seen.has(e))errors.push({id:"EVENT-UNBOUND",event:e});
  return errors;
}

export function applyAndValidateControlBindings(core,reconstruction,pieces,sourceControlExists){
  const errors=[],ops=new Set(core.operations.map(x=>x.id)),byTuple=new Map();
  const byId=new Map(pieces.map(p=>[p.piece_id,p]));
  for(const b of reconstruction.control_bindings||[]){
    if(!ops.has(b.operation)){errors.push({id:"CONTROL-UNKNOWN-OPERATION",binding:b.id,operation:b.operation});continue;}
    const tuple=[b.journey,b.state,b.label_exact,b.target||""].join("|");
    const prior=byTuple.get(tuple);if(prior&&prior!==b.operation)errors.push({id:"CONTROL-MULTI-OPERATION",binding:b.id,operations:[prior,b.operation]});else byTuple.set(tuple,b.operation);
    let piece=pieces.find(p=>p.journey===b.journey&&p.state===b.state&&p.piece_type==="visible_action"&&norm(p.piece)===norm(b.label_exact)&&(b.target===undefined||norm(p.target)===norm(b.target)));
    if(!piece&&sourceControlExists(b)){
      piece={piece_id:"J"+b.journey+"/"+b.state+"/action/"+b.id.toLowerCase(),journey:b.journey,state:b.state,piece:b.label_exact,piece_type:"visible_action",classification:"DOMAIN_OPERATION",schema_refs:[b.operation],authority_refs:[b.evidence_path||"frozen-prototype-source"],justification:"Explicit source-recovered operation control binding.",mapping_confidence:"authored_exact_control",target:b.target||null,operation_relation:b.relation};
      pieces.push(piece);byId.set(piece.piece_id,piece);
    }
    if(!piece){errors.push({id:"CONTROL-NOT-FOUND",binding:b.id,journey:b.journey,state:b.state,label:b.label_exact});continue;}
    piece.classification="DOMAIN_OPERATION";
    piece.schema_refs=uniq([...(piece.schema_refs||[]),b.operation]);
    piece.operation_relation=b.relation;
    piece.control_binding_id=b.id;
  }
  return errors;
}

export function validateOperationWitnesses(core,graph,reconstruction,pieces,bindings,tasks,readEvidence){
  const errors=[],ops=new Map(core.operations.map(x=>[x.id,x])),bindingByEvent=new Map((bindings.bindings||[]).map(x=>[x.domain_event,x])),controlById=new Map((reconstruction.control_bindings||[]).map(x=>[x.id,x])),taskById=new Map((tasks.tasks||[]).map(x=>[x.id,x])),seen=new Map();
  for(const w of reconstruction.operation_witnesses||[]){
    const o=ops.get(w.schema_ref);if(!o){errors.push({id:"WITNESS-UNKNOWN-OPERATION",schema_ref:w.schema_ref});continue;}
    seen.set(w.schema_ref,(seen.get(w.schema_ref)||0)+1);
    const e=w.evidence||{};
    if(!Object.keys(e).length){errors.push({id:"WITNESS-MISSING-EVIDENCE",schema_ref:w.schema_ref});continue;}
    if(e.control_binding_id){
      const b=controlById.get(e.control_binding_id);
      if(!b||b.operation!==w.schema_ref||b.journey!==w.journey)errors.push({id:"WITNESS-CONTROL-MISMATCH",schema_ref:w.schema_ref,binding:e.control_binding_id});
      const p=pieces.find(x=>x.control_binding_id===e.control_binding_id&&x.classification==="DOMAIN_OPERATION"&&has(x.schema_refs,w.schema_ref));
      if(!p)errors.push({id:"WITNESS-CONTROL-PIECE-MISSING",schema_ref:w.schema_ref,binding:e.control_binding_id});
      for(const id of e.additional_control_binding_ids||[]){const a=controlById.get(id);if(!a||a.operation!==w.schema_ref)errors.push({id:"WITNESS-ADDITIONAL-CONTROL-MISMATCH",schema_ref:w.schema_ref,binding:id});}
    }else if(e.domain_event){
      const b=bindingByEvent.get(e.domain_event);
      if(!b||!(b.operation_bindings||[]).some(x=>x.operation===w.schema_ref))errors.push({id:"WITNESS-EVENT-MISMATCH",schema_ref:w.schema_ref,event:e.domain_event});
      if(w.journey&&b&&!has(b.journeys,w.journey))errors.push({id:"WITNESS-EVENT-WRONG-JOURNEY",schema_ref:w.schema_ref,event:e.domain_event,journey:w.journey});
    }else if(e.task_ref){
      const t=taskById.get(e.task_ref);if(!t||t.journey!==w.journey)errors.push({id:"WITNESS-TASK-MISMATCH",schema_ref:w.schema_ref,task:e.task_ref});
    }else if(e.path){
      if(!e.contains||String(e.contains).trim().length<4)errors.push({id:"WITNESS-PHRASE-TOO-WEAK",schema_ref:w.schema_ref});
      if(w.journey&&!e.cross_journey_exception&&!e.path.includes("/journeys/"+w.journey+"-"))errors.push({id:"WITNESS-PATH-WRONG-JOURNEY",schema_ref:w.schema_ref,path:e.path});
      const text=readEvidence(e.path);
      if(e.contains&&!text.includes(e.contains))errors.push({id:"WITNESS-PHRASE-MISSING",schema_ref:w.schema_ref,path:e.path,contains:e.contains});
      if(e.also_contains&&!text.includes(e.also_contains))errors.push({id:"WITNESS-PHRASE-MISSING",schema_ref:w.schema_ref,path:e.path,contains:e.also_contains});
    }else if(e.schema_source){
      const source=core.sources[e.schema_source];
      if(!source)errors.push({id:"WITNESS-SCHEMA-SOURCE-MISSING",schema_ref:w.schema_ref,source:e.schema_source});
    }else{
      errors.push({id:"WITNESS-UNSUPPORTED-EVIDENCE",schema_ref:w.schema_ref});
    }
    const types=w.witness_types||[];
    if(types.includes("USER_SURFACE")&&!e.control_binding_id&&!e.domain_event&&!e.task_ref)errors.push({id:"WITNESS-USER-SURFACE-NOT-BOUND",schema_ref:w.schema_ref});
    if(types.includes("CONTRACT_ONLY")&&!has(graph.contract_only_operations,w.schema_ref))errors.push({id:"WITNESS-CONTRACT-MISMATCH",schema_ref:w.schema_ref});
    if(types.includes("COORDINATED_OPERATION")&&!(graph.coordinated_operations||[]).some(x=>x.id===w.schema_ref))errors.push({id:"WITNESS-COORDINATED-MISMATCH",schema_ref:w.schema_ref});
  }
  for(const id of ops.keys())if(!seen.has(id))errors.push({id:"WITNESS-OPERATION-MISSING",schema_ref:id});
  for(const id of graph.contract_only_operations||[]){
    const w=(reconstruction.operation_witnesses||[]).find(x=>x.schema_ref===id);
    if(!w||!has(w.witness_types,"CONTRACT_ONLY")||has(w.witness_types,"USER_SURFACE"))errors.push({id:"WITNESS-CONTRACT-ONLY-SYMMETRY",schema_ref:id});
  }
  for(const c of graph.coordinated_operations||[]){
    const w=(reconstruction.operation_witnesses||[]).find(x=>x.schema_ref===c.id);
    if(!w||!has(w.witness_types,"COORDINATED_OPERATION"))errors.push({id:"WITNESS-COORDINATED-SYMMETRY",schema_ref:c.id});
  }
  return errors;
}

export function validateRequiredStates(core,graph,reconstruction,pieces,readSourceRef){
  const errors=[],rows=[],stateByJ=new Map();
  for(const p of pieces.filter(x=>x.piece_type==="state")){if(!stateByJ.has(p.journey))stateByJ.set(p.journey,new Map());stateByJ.get(p.journey).set(p.state,p);}
  const evidenceBy=new Map((reconstruction.required_state_evidence||[]).map(x=>[x.journey+"|"+x.requirement_state,x]));
  const triggerBy=new Map((reconstruction.required_state_triggers||[]).map(x=>[x.journey+"|"+x.requirement_state,x]));
  for(const req of graph.construction_requirements||[]){
    if(req.kind!=="required_states")continue;
    for(const name of req.value||[]){
      const alias=reconstruction.state_name_aliases?.[req.journey]?.[name]||name;
      const piece=stateByJ.get(req.journey)?.get(alias),trigger=triggerBy.get(req.journey+"|"+name);
      if(!piece)errors.push({id:"REQUIRED-STATE-UNRESOLVED",journey:req.journey,state:name,alias});
      if(!trigger)errors.push({id:"REQUIRED-STATE-TRIGGER-MISSING",journey:req.journey,state:name});
      else{
        if(trigger.golden_state!==alias)errors.push({id:"REQUIRED-STATE-TRIGGER-ALIAS-MISMATCH",journey:req.journey,state:name});
        if(!Array.isArray(trigger.governed_by)||!trigger.governed_by.length)errors.push({id:"REQUIRED-STATE-UNGoverned",journey:req.journey,state:name});
        for(const ref of trigger.governed_by||[])if(!resolveSchemaRef(core,graph,ref))errors.push({id:"REQUIRED-STATE-BAD-GOVERNOR",journey:req.journey,state:name,ref});
      }
      if(alias!==name&&name.replace(/_/g,"-")!==alias){
        const ev=evidenceBy.get(req.journey+"|"+name);
        if(!ev||ev.golden_state!==alias)errors.push({id:"REQUIRED-STATE-ALIAS-EVIDENCE-MISSING",journey:req.journey,state:name,alias});
        else{
          const txt=readSourceRef(ev.source_ref);
          if(!txt.includes(ev.contains))errors.push({id:"REQUIRED-STATE-ALIAS-EVIDENCE-MISMATCH",journey:req.journey,state:name,source:ev.source_ref});
        }
      }
      rows.push({journey:req.journey,requirement:req.id,requirement_state:name,golden_state:alias,resolved:!!piece,triggered:!!trigger,classification:trigger?.classification||null,governed_by:trigger?.governed_by||[]});
    }
  }
  return {rows,errors};
}

export function validateSupersessions(core,reconstruction,pieces){
  const errors=[],supers=reconstruction.supersessions||[],decisions=new Set((core.approved_product_decisions||[]).map(x=>x.id)),impacts=new Map((core.golden_impacts||[]).map(x=>[x.id,x]));
  for(const s of supers){
    const impact=impacts.get(s.golden_impact);
    if(!impact)errors.push({id:"SUPERSESSION-UNKNOWN-IMPACT",supersession:s.id});
    if(!decisions.has(s.decision))errors.push({id:"SUPERSESSION-UNKNOWN-DECISION",supersession:s.id});
    if(impact){
      if(impact.decision!==s.decision||impact.journey!==s.journey||impact.state!==s.impact_state)errors.push({id:"SUPERSESSION-IMPACT-MISMATCH",supersession:s.id});
    }
    const p=pieces.find(x=>x.piece_id===s.piece_id);
    if(!p||p.classification!=="POST_GOLDEN_SUPERSEDED")errors.push({id:"SUPERSESSION-PIECE-MISSING",supersession:s.id,piece_id:s.piece_id});
  }
  for(const impact of impacts.values()){
    const needsState=impact.disposition==="historical_state_not_required_in_gate_b";
    const needsCopy=!!impact.copy_disposition;
    const matches=supers.filter(x=>x.golden_impact===impact.id);
    if(needsState&&!matches.some(x=>x.piece_type==="state"))errors.push({id:"SUPERSESSION-HISTORICAL-STATE-MISSING",impact:impact.id});
    if(needsCopy&&!matches.some(x=>x.piece_type==="copy"))errors.push({id:"SUPERSESSION-COPY-MISSING",impact:impact.id});
  }
  return errors;
}

export function validateOverlayWitnesses(core,graph,reconstruction,verifySource){
  const errors=[],required=["C1_IDENTITY","C1_SPEND","C1_EXECUTION","C1_README","POST_J28","DEC_EXP_LOCK","DEC_EXP_LOCK_V2"],seen=new Set();
  for(const w of reconstruction.overlay_witnesses||[]){
    seen.add(w.source_ref);
    if(!core.sources[w.source_ref]){errors.push({id:"OVERLAY-SOURCE-MISSING",source:w.source_ref});continue;}
    if(!verifySource(w.source_ref))errors.push({id:"OVERLAY-SOURCE-PIN-FAIL",source:w.source_ref});
    if(!Array.isArray(w.schema_refs)||!w.schema_refs.length)errors.push({id:"OVERLAY-NO-SCHEMA-WITNESS",source:w.source_ref});
    for(const ref of w.schema_refs||[])if(!resolveSchemaRef(core,graph,ref))errors.push({id:"OVERLAY-BAD-SCHEMA-REF",source:w.source_ref,ref});
  }
  for(const id of required)if(!seen.has(id))errors.push({id:"OVERLAY-TARGET-NOT-DECOMPOSED",source:id});
  return errors;
}

function sourceGrounded(item,core,frozenJourneyIds){
  const refs=item.sources||[];
  return refs.some(x=>core.sources[x]||frozenJourneyIds.has(String(x).replace(/^J/,"").padStart(2,"0")));
}
export function semanticWitnessStats(core,graph,frozen){
  const journeyIds=new Set(frozen.journeys.map(x=>x.id));
  const objects=core.objects.filter(x=>sourceGrounded(x,core,journeyIds)).length;
  const laws=core.laws.filter(x=>sourceGrounded(x,core,journeyIds)).length;
  const views=core.derived_models.filter(v=>graph.journey_projections.some(j=>has(j.renders_views,v.id))&&v.derived_from.every(id=>core.objects.some(o=>o.id===id))).length;
  const contexts=graph.contexts.filter(c=>c.objects.every(id=>core.objects.some(o=>o.id===id))&&graph.journey_projections.some(j=>[...(j.entry_contexts_any||[]),...(j.ambient_contexts_required||[]),...(j.effect_contexts_required||[])].includes(c.id))).length;
  const reqs=(graph.construction_requirements||[]).filter(r=>(r.sources||[]).some(x=>core.sources[x]||journeyIds.has(String(x).replace(/^J/,"").padStart(2,"0")))).length;
  const cont=(graph.continuity_contracts||[]).filter(r=>(r.sources||[]).some(x=>core.sources[x]||journeyIds.has(String(x).replace(/^J/,"").padStart(2,"0")))).length;
  return {
    objects:{total:core.objects.length,witnessed:objects},
    laws:{total:core.laws.length,witnessed:laws,machine_checkable:core.laws.filter(x=>x.machine_checkable).length,declared_prose_only:core.laws.filter(x=>x.machine_checkable===false).length},
    views:{total:core.derived_models.length,witnessed:views},
    contexts:{total:graph.contexts.length,witnessed:contexts},
    requirements:{total:(graph.construction_requirements||[]).length,witnessed:reqs},
    continuity:{total:(graph.continuity_contracts||[]).length,witnessed:cont}
  };
}

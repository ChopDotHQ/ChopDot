const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sorted=a=>[...(a||[])].sort();
const has=(a,x)=>Array.isArray(a)&&a.includes(x);
const clone=x=>structuredClone(x);

function stable(v){
  if(Array.isArray(v))return "["+v.map(stable).join(",")+"]";
  if(v&&typeof v==="object")return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+stable(v[k])).join(",")+"}";
  return JSON.stringify(v);
}
function fnv64(s){
  let h=14695981039346656037n,p=1099511628211n,m=(1n<<64n)-1n;
  for(let i=0;i<s.length;i++){
    const c=s.charCodeAt(i);
    h^=BigInt(c&255);h=(h*p)&m;
    h^=BigInt((c>>>8)&255);h=(h*p)&m;
  }
  return h.toString(16).padStart(16,"0");
}
const EXPECTED_HASHES={
  safety_subgraph:"cb7f5c7f42fcf2d8",
  semantic_inventory:"efab713b1a9fabe8",
  closure_mapping:"9aa481923e471537",
  event_semantics:"c53b7e69301f2137",
  mapping_registry:"8951ac0340a69257"
};
const EXPECTED_WRITERS=[
  "account.delete","expense.create","expense.delete","expense.edit","expense.raise_issue","expense.resolve_issue",
  "expense.review_agree","expense.withdraw_issue","group.create","group.delete","group.join","group.leave",
  "group.rename_archive","group.transfer_ownership","import.apply","membership.remove","participant.link_account",
  "settlement.authorize","settlement.close","settlement.confirm_receipt","settlement.mark_sent","settlement.prepare",
  "settlement.reconcile","storage.create_backup","storage.restore"
];
const EXPECTED_SAFETY_LAWS=[
  "LAW-ACCOUNT-01","LAW-EXP-01","LAW-EXP-03","LAW-EXP-GUARD-01","LAW-GROUP-01","LAW-GROUP-02",
  "LAW-ID-01","LAW-ID-02","LAW-ID-03","LAW-ISSUE-01","LAW-MONEY-01","LAW-PAY-01","LAW-PAY-02",
  "LAW-PAY-03","LAW-PAY-04","LAW-POS-01","LAW-POS-SCOPE-01","LAW-SPEND-01","LAW-STORAGE-01"
];

const EXPECTED_ALIASES={
  "05":{"offline_saved":"offline-saved"},
  "06":{"save_error":"save-error","no_permission":"no-permission","offline_detail":"offline-detail","offline_edit":"offline-edit","offline_saved":"offline-saved","not_found":"not-found"},
  "08":{"active_needs_review":"active","nothing_needs_you":"waiting","new_empty_group":"empty","everyone_square":"square"}
};
const EXPECTED_SUPERSESSIONS={
  "SUP-J08-SETTLING":{journey:"08",piece_id:"J08/state/settling",piece_type:"state",piece_selector:"settling",golden_impact:"GOLDEN-IMPACT-J08-SETTLEMENT-02",decision:"DEC-EXPENSE-SETTLEMENT-LOCK-02",impact_state:"settlement_in_progress"},
  "SUP-J05-LOCK-COPY":{journey:"05",piece_id:"J05/locked/copy/historical-blanket-lock",piece_type:"copy",piece_selector:"historical-blanket-lock",golden_impact:"GOLDEN-IMPACT-J05-LOCK-02",decision:"DEC-EXPENSE-SETTLEMENT-LOCK-02",impact_state:"locked"}
};
const EXPECTED_OVERLAYS={
  C1_IDENTITY:["identity.participant","identity.guest_capability","participant.link_account","LAW-ID-01","LAW-ID-02","LAW-ID-03","LAW-OP-01","LAW-OP-02"],
  C1_SPEND:["spend.intent","spend.effect","spend.authorize_execute","spend.materialize","LAW-SPEND-01","LAW-SPEND-02","LAW-MONEY-01","LAW-OP-01","LAW-OP-02"],
  C1_EXECUTION:["spend.authorize_execute","spend.materialize"],
  C1_README:["identity.participant","spend.intent","LAW-ID-01","LAW-SPEND-01"],
  POST_J28:["identity.participant","spend.intent","LAW-ID-01","LAW-ID-02","LAW-ID-03","LAW-SPEND-01","LAW-SPEND-02"],
  DEC_EXP_LOCK:["LAW-EXP-GUARD-01","payment.closeout_context"],
  DEC_EXP_LOCK_V2:["LAW-EXP-GUARD-01","LAW-PAY-03","LAW-PAY-04","GOLDEN-IMPACT-J05-LOCK-02","GOLDEN-IMPACT-J08-SETTLEMENT-02"]
};
const CRITICAL_EVENTS={
  PayerMarkedSent:{classification:"DOMAIN_OPERATION",operation:"settlement.mark_sent",relation:"commits"},
  PaymentIntentPrepared:{classification:"DOMAIN_OPERATION",operation:"settlement.prepare",relation:"commits"},
  PaymentIntentAuthorized:{classification:"DOMAIN_OPERATION",operation:"settlement.authorize",relation:"commits"},
  ReceiverConfirmationRequested:{classification:"DOMAIN_OPERATION",operation:"settlement.confirm_receipt",relation:"initiates"},
  PaymentClosed:{classification:"SYSTEM_PROGRESSION",operation:"settlement.close",relation:"reports_result"}
};

const OP_EXACT={
  "participant.link_account":{
    owner:"identity.participant",
    changes:["identity.participant","identity.account"],
    reads:["identity.participant","identity.account","identity.guest_capability","operation.identity","operation.outcome"],
    rules:["Preserve participant_id and historical references.","Binding is staged; mismatch/collision remains unresolved.","Account-only capabilities appear only after durable verified binding."]
  },
  "wallet.execute_action":{
    owner:"wallet.action",
    changes:["wallet.action"],
    reads:["wallet.session","wallet.action","payment.intent"],
    rules:["Owning journey defines exact action scope.","Signature, submission and finality remain distinct.","Unknown submission reconciles before retry."]
  },
  "settlement.prepare":{
    owner:"payment.intent",changes:["payment.intent"],reads:["position.scope","position.position","payment.settlement_scope"],law_refs:["LAW-POS-SCOPE-01"]
  },
  "settlement.authorize":{
    owner:"payment.intent",changes:["payment.intent"],reads:["payment.intent","payment.settlement_scope","wallet.session"]
  },
  "settlement.mark_sent":{
    owner:"payment.intent",changes:["payment.intent"],reads:["payment.intent","payment.settlement_scope"],law_refs:["LAW-PAY-02","LAW-OP-01"],
    rules:["Payer sent claim changes lifecycle state but is not proof of receipt, clearing, confirmation or closure.","Preserve the same PaymentIntent/operation identity."]
  },
  "settlement.confirm_receipt":{
    owner:"payment.intent",changes:["payment.intent","payment.record"],reads:["payment.intent","payment.settlement_scope","payment.record"],
    rules:["Receiver owns manual receipt confirmation where ChopDot cannot independently verify.","Payer sent claim is not proof of receipt."]
  },
  "settlement.close":{
    owner:"payment.intent",changes:["payment.intent","payment.record"],reads:["payment.intent","payment.settlement_scope","payment.record","position.scope","position.position"],invalidates:["position.position"]
  },
  "settlement.reconcile":{
    owner:"payment.intent",changes:["payment.intent"],reads:["payment.intent","payment.settlement_scope","operation.outcome","recovery.context"]
  },
  "storage.restore":{
    owner:"storage.restore_operation",changes:["group.group","group.membership"],reads:["storage.backup","storage.restore_operation","identity.participant","group.group","group.membership","payment.record","event.accepted"]
  }
};

function projectOp(o,shape){
  const out={};
  for(const k of Object.keys(shape))out[k]=o?.[k]??(Array.isArray(shape[k])?[]:null);
  return out;
}
function resolve(core,graph,id){
  if(core.objects.some(x=>x.id===id))return "object";
  if(core.operations.some(x=>x.id===id))return "operation";
  if(core.laws.some(x=>x.id===id))return "law";
  if(core.derived_models.some(x=>x.id===id))return "view";
  if(graph.contexts.some(x=>x.id===id))return "context";
  if((graph.construction_requirements||[]).some(x=>x.id===id))return "requirement";
  if((graph.continuity_contracts||[]).some(x=>x.id===id))return "continuity";
  return null;
}
function safetySubgraph(core,graph,reconstruction){
  const ids=new Set(Object.values(reconstruction.safety_class_manifest||{}).flat());
  return {
    objects:core.objects.filter(x=>ids.has(x.id)).sort((a,b)=>a.id.localeCompare(b.id)),
    operations:core.operations.filter(x=>ids.has(x.id)).sort((a,b)=>a.id.localeCompare(b.id)),
    laws:core.laws.filter(x=>ids.has(x.id)).sort((a,b)=>a.id.localeCompare(b.id)),
    composition_laws:(graph.shared_composition_laws||[]).filter(x=>ids.has(x.id)).sort((a,b)=>a.id.localeCompare(b.id))
  };
}
function inventory(core,graph){
  return {
    objects:core.objects.map(x=>x.id).sort(),
    operations:core.operations.map(x=>x.id).sort(),
    laws:core.laws.map(x=>x.id).sort(),
    views:core.derived_models.map(x=>x.id).sort(),
    contexts:graph.contexts.map(x=>x.id).sort(),
    requirements:(graph.construction_requirements||[]).map(x=>x.id).sort(),
    continuity:(graph.continuity_contracts||[]).map(x=>x.id).sort(),
    composition_laws:(graph.shared_composition_laws||[]).map(x=>x.id).sort()
  };
}
function closureSections(reconstruction){
  return {
    operation_witnesses:reconstruction.operation_witnesses,
    control_bindings:reconstruction.control_bindings,
    state_name_aliases:reconstruction.state_name_aliases,
    required_state_triggers:reconstruction.required_state_triggers,
    required_state_evidence:reconstruction.required_state_evidence,
    supersessions:reconstruction.supersessions,
    overlay_witnesses:reconstruction.overlay_witnesses,
    authored_pieces:reconstruction.authored_pieces
  };
}
function eventSemantics(bindings){
  return (bindings.bindings||[]).map(b=>({
    domain_event:b.domain_event,classification:b.classification,operation_refs:b.operation_refs||[],
    operation_bindings:b.operation_bindings||[],journeys:b.journeys||[]
  })).sort((a,b)=>a.domain_event.localeCompare(b.domain_event));
}

export function deriveFreezeSeals(core,graph,reconstruction,bindings,registry){
  return {
    safety_subgraph:fnv64(stable(safetySubgraph(core,graph,reconstruction))),
    semantic_inventory:fnv64(stable(inventory(core,graph))),
    closure_mapping:fnv64(stable(closureSections(reconstruction))),
    event_semantics:fnv64(stable(eventSemantics(bindings))),
    mapping_registry:fnv64(stable(registry))
  };
}

export function validateStage52(core,graph,reconstruction,bindings,pieces,tasks,registry){
  const errors=[],seals=deriveFreezeSeals(core,graph,reconstruction,bindings,registry);
  for(const [k,v] of Object.entries(EXPECTED_HASHES))if(seals[k]!==v)errors.push({id:"FREEZE-SEAL-DRIFT",seal:k,expected:v,actual:seals[k]});

  const safetyObjects=new Set(core.objects.filter(x=>x.safety_class).map(x=>x.id));
  const writers=core.operations.filter(o=>[...(o.changes||[]),...(o.invalidates||[]),...(o.invalidates_prepared||[])].some(x=>safetyObjects.has(x))).map(x=>x.id).sort();
  if(!eq(writers,EXPECTED_WRITERS))errors.push({id:"SAFETY-WRITER-CLOSURE",expected:EXPECTED_WRITERS,actual:writers});
  const safetyLaws=core.laws.filter(l=>(l.applies_to||[]).some(x=>safetyObjects.has(x))).map(x=>x.id).sort();
  if(!eq(safetyLaws,EXPECTED_SAFETY_LAWS))errors.push({id:"SAFETY-LAW-CLOSURE",expected:EXPECTED_SAFETY_LAWS,actual:safetyLaws});

  for(const [id,expected] of Object.entries(OP_EXACT)){
    const o=core.operations.find(x=>x.id===id);
    if(!o||!eq(projectOp(o,expected),expected))errors.push({id:"CRITICAL-OPERATION-DRIFT",operation:id});
  }

  for(const [event,expected] of Object.entries(CRITICAL_EVENTS)){
    const b=(bindings.bindings||[]).find(x=>x.domain_event===event);
    if(!b){errors.push({id:"CRITICAL-EVENT-MISSING",event});continue;}
    const rel=(b.operation_bindings||[]).find(x=>x.operation===expected.operation);
    if(b.classification!==expected.classification||!rel||rel.relation!==expected.relation||(b.operation_bindings||[]).length!==1){
      errors.push({id:"CRITICAL-EVENT-DRIFT",event});
    }
  }

  const taskBy=new Map((tasks.tasks||[]).map(x=>[x.id,x]));
  const witnessBy=new Map((reconstruction.operation_witnesses||[]).map(x=>[x.schema_ref,x]));
  for(const o of core.operations){
    const w=witnessBy.get(o.id);
    if(!w){errors.push({id:"OPERATION-WITNESS-MISSING",operation:o.id});continue;}
    const e=w.evidence||{},types=w.witness_types||[];
    if(e.schema_source&&!types.some(x=>["CONTRACT_ONLY","COORDINATED_OPERATION"].includes(x)))errors.push({id:"WITNESS-SCHEMA-SOURCE-NONCONTRACT",operation:o.id});
    if(e.path){
      if(!e.contains||String(e.contains).trim().length<12)errors.push({id:"WITNESS-PHRASE-WEAK",operation:o.id});
      if(types.includes("SYSTEM_DERIVED")&&(!e.also_contains||String(e.also_contains).trim().length<12))errors.push({id:"WITNESS-SYSTEM-DERIVED-WEAK",operation:o.id});
    }
    if(e.task_ref){
      const t=taskBy.get(e.task_ref);
      const proves=t?.steps?.some(s=>s.semantic_operation===o.id);
      if(!proves)errors.push({id:"WITNESS-TASK-DOES-NOT-PROVE-OPERATION",operation:o.id,task:e.task_ref});
    }
    if(types.includes("USER_TASK")&&!e.task_ref)errors.push({id:"WITNESS-USER-TASK-NOT-TASK",operation:o.id});
    if(types.includes("SYSTEM_DERIVED")&&(reconstruction.control_bindings||[]).some(b=>b.operation===o.id))errors.push({id:"WITNESS-SYSTEM-DERIVED-HAS-CONTROL",operation:o.id});
    if(w.journey&&!types.includes("COORDINATED_OPERATION")&&!has(o.source_journeys,w.journey))errors.push({id:"WITNESS-WRONG-OWNER-JOURNEY",operation:o.id,journey:w.journey});
  }
  const witnessCounts={};for(const w of reconstruction.operation_witnesses||[])witnessCounts[w.schema_ref]=(witnessCounts[w.schema_ref]||0)+1;
  for(const [id,n] of Object.entries(witnessCounts))if(n!==1)errors.push({id:"WITNESS-NOT-UNIQUE",operation:id,count:n});

  if(!eq(reconstruction.state_name_aliases||{},EXPECTED_ALIASES))errors.push({id:"REQUIRED-STATE-ALIAS-MANIFEST-DRIFT"});
  const requiredKeys=new Set();
  for(const r of graph.construction_requirements||[])if(r.kind==="required_states")for(const name of r.value||[])requiredKeys.add(r.journey+"|"+name);
  const triggerKeys=(reconstruction.required_state_triggers||[]).map(x=>x.journey+"|"+x.requirement_state);
  for(const k of triggerKeys)if(!requiredKeys.has(k))errors.push({id:"REQUIRED-STATE-EXTRA-TRIGGER",key:k});
  for(const k of requiredKeys)if(!triggerKeys.includes(k))errors.push({id:"REQUIRED-STATE-MISSING-TRIGGER",key:k});
  for(const t of reconstruction.required_state_triggers||[]){
    const gov=(t.governed_by||[]).map(id=>({id,kind:resolve(core,graph,id)}));
    if(t.classification==="RECOVERY_BEHAVIOR"&&gov.some(x=>x.kind!=="law"))errors.push({id:"RECOVERY-TRIGGER-NONLAW-GOVERNOR",journey:t.journey,state:t.requirement_state});
    if(t.classification==="SYSTEM_PROGRESSION"&&gov.some(x=>!["law","operation"].includes(x.kind)))errors.push({id:"SYSTEM-TRIGGER-BAD-GOVERNOR",journey:t.journey,state:t.requirement_state});
    if(t.classification==="DERIVED_PROJECTION"&&!gov.some(x=>x.kind==="view"))errors.push({id:"DERIVED-TRIGGER-NO-VIEW",journey:t.journey,state:t.requirement_state});
  }

  const supBy=new Map((reconstruction.supersessions||[]).map(x=>[x.id,x]));
  for(const [id,expected] of Object.entries(EXPECTED_SUPERSESSIONS)){
    const s=supBy.get(id);if(!s){errors.push({id:"SUPERSESSION-MANIFEST-MISSING",supersession:id});continue;}
    for(const [k,v] of Object.entries(expected))if(!eq(s[k],v))errors.push({id:"SUPERSESSION-MANIFEST-DRIFT",supersession:id,field:k});
  }
  if((reconstruction.supersessions||[]).length!==Object.keys(EXPECTED_SUPERSESSIONS).length)errors.push({id:"SUPERSESSION-MANIFEST-EXTRA"});

  const overlayBy=new Map((reconstruction.overlay_witnesses||[]).map(x=>[x.source_ref,x]));
  for(const [source,expected] of Object.entries(EXPECTED_OVERLAYS)){
    const w=overlayBy.get(source);if(!w||!eq(w.schema_refs,expected))errors.push({id:"OVERLAY-WITNESS-DRIFT",source});
  }
  if((reconstruction.overlay_witnesses||[]).length!==Object.keys(EXPECTED_OVERLAYS).length)errors.push({id:"OVERLAY-WITNESS-EXTRA"});

  const failureLike=/(failed|failure|error|unknown|rejected|disconnected|declined|denied|offline|locked|conflict|stale|expired|cancelled|canceled|blocked|not-found|mismatch|recipient-says-no|insufficient|reversal|reversed|retry|reconcil)/i;
  for(const p of pieces.filter(x=>x.piece_type==="state"&&failureLike.test(String(x.state||"")))){
    if(!["RECOVERY_BEHAVIOR","SYSTEM_PROGRESSION","POST_GOLDEN_SUPERSEDED"].includes(p.classification)){
      errors.push({id:"FAILURE-STATE-MISCLASSIFIED",piece_id:p.piece_id,classification:p.classification});
    }
    if(["RECOVERY_BEHAVIOR","SYSTEM_PROGRESSION"].includes(p.classification)&&!(p.schema_refs||[]).length){
      errors.push({id:"FAILURE-STATE-UNGOVERNED",piece_id:p.piece_id});
    }
  }

  const controlWitnessTypes=new Map((reconstruction.operation_witnesses||[]).map(w=>[w.schema_ref,new Set(w.witness_types||[])]));
  for(const b of reconstruction.control_bindings||[]){
    const types=controlWitnessTypes.get(b.operation)||new Set();
    if(types.has("SYSTEM_DERIVED")||types.has("CONTRACT_ONLY"))errors.push({id:"CONTROL-BINDS-NONSURFACE-OPERATION",binding:b.id,operation:b.operation});
  }

  const duplicateMap=new Map();
  for(const p of pieces.filter(x=>x.piece_type==="visible_action")){
    const k=[p.journey,p.state||"",String(p.piece||"").trim().toLowerCase(),String(p.target||"").trim().toLowerCase()].join("|");
    (duplicateMap.get(k)||duplicateMap.set(k,[]).get(k)).push(p);
  }
  let duplicateCount=0,conflictCount=0;
  for(const arr of duplicateMap.values())if(arr.length>1){
    duplicateCount+=arr.length-1;
    const classes=new Set(arr.map(x=>x.classification));
    const domainOps=new Set(arr.flatMap(x=>x.classification==="DOMAIN_OPERATION"?(x.schema_refs||[]):[]));
    if(domainOps.size>1){
      conflictCount++;
      errors.push({id:"DUPLICATE-CONTROL-MULTI-OPERATION",pieces:arr.map(x=>x.piece_id),operations:[...domainOps]});
    }
  }

  const productRequirementStates=pieces.filter(p=>p.piece_type==="state"&&p.classification==="PRODUCT_REQUIREMENT");
  const draftFields=pieces.filter(p=>p.piece_type==="field"&&p.classification==="DRAFT_FIELD");
  return {
    errors,seals,
    metrics:{
      authority_only_product_requirement_states:productRequirementStates.length,
      draft_fields_without_semantic_ref:draftFields.filter(x=>!(x.schema_refs||[]).length).length,
      duplicate_control_instances:duplicateCount,
      duplicate_control_conflicts:conflictCount,
      required_state_scope:[...new Set([...requiredKeys].map(x=>x.split("|")[0]))].sort()
    }
  };
}

export function buildStage52AdversarialCases(core,graph,reconstruction,bindings){
  return [
    {name:"invent-untagged-force-close",mutate:x=>x.core.operations.push({id:"settlement.force_close",owner:"payment.intent",changes:["payment.intent"],sources:["J12"]})},
    {name:"mark-sent-writes-record",mutate:x=>x.core.operations.find(o=>o.id==="settlement.mark_sent").changes.push("payment.record")},
    {name:"mark-sent-drops-pay02",mutate:x=>x.core.operations.find(o=>o.id==="settlement.mark_sent").law_refs=[]},
    {name:"link-account-rewrites-participant",mutate:x=>x.core.operations.find(o=>o.id==="participant.link_account").rules[0]="Rewrite participant_id and historical references."},
    {name:"wallet-widens-at-signing",mutate:x=>x.core.operations.find(o=>o.id==="wallet.execute_action").rules.push("Wallet may alter amount and recipient at signing.")},
    {name:"payer-marked-sent-navigation",mutate:x=>{const b=x.bindings.bindings.find(b=>b.domain_event==="PayerMarkedSent");b.classification="NAVIGATION_TRANSITION";b.operation_refs=[];b.operation_bindings=[];}},
    {name:"extra-trigger-reclassifies-state",mutate:x=>x.reconstruction.required_state_triggers.push({journey:"12",requirement_state:"payment-failed",golden_state:"payment-failed",classification:"REVIEW_DEMO_CHROME",trigger:"demo",governed_by:["view.group_home"]})},
    {name:"wrong-task-witness",mutate:x=>{const w=x.reconstruction.operation_witnesses.find(w=>w.schema_ref==="expense.delete");w.evidence={task_ref:"TASK-J06-VIEW-RECEIPT"};}},
    {name:"wrong-alias-existing-state",mutate:x=>{x.reconstruction.state_name_aliases["06"].conflict="loading";}},
    {name:"reuse-impact-on-live-state",mutate:x=>x.reconstruction.supersessions[0].piece_id="J08/state/active"},
    {name:"collapse-c1-overlay",mutate:x=>{for(const w of x.reconstruction.overlay_witnesses||[])w.schema_refs=["view.group_home"];}},
    {name:"close-drops-position-scope",mutate:x=>{const o=x.core.operations.find(o=>o.id==="settlement.close");o.reads=o.reads.filter(v=>v!=="position.scope");}}
  ];
}

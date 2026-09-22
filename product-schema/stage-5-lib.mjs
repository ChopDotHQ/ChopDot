import { readFrozen,frozenBlob,rowsOfJson,parseMarkdownEvents,parseScreenStates,parseCodedStateInventory,parseDynamicPrototype,rawFields,stateClass,actionClass,addPiece,uniq,norm,normTarget,slug } from './stage-5-source-lib.mjs';
import { deriveMechanicalMutationCoverage } from './stage-5-safety-lib.mjs';
import { deriveBlastRadius } from './stage-5-blast-lib.mjs';

export function deriveStage5({root,core,graph,frozen,registry,bindings,reconstruction,ui,tasks}){
  const cache=new Map(),commit=registry.product_authority_commit;
  const bindingByEvent=new Map(bindings.bindings.map(x=>[x.domain_event,x]));

  const sourcePins=[...(registry.curated_mapping_sources||[]),...(registry.supporting_state_sources||[])].map(s=>{
    const actual=frozenBlob(root,commit,s.path);
    return {...s,actual_git_blob:actual,matches:s.git_blob===actual};
  });
  const sourceErrors=sourcePins.filter(x=>!x.matches).map(x=>({id:'SOURCE_PIN_MISMATCH',path:x.path,expected:x.git_blob,actual:x.actual_git_blob}));

  const jsonEventRows=[],mdEventRows=[],eventSet=new Set();
  for(const s of registry.curated_mapping_sources||[]){
    if(s.kind==='UI_EVENT_MAPPING.json'){
      for(const r of rowsOfJson(readFrozen(root,commit,s.path,cache))){
        const event=r.domain_event||r.event||r.domainEvent;
        if(event){eventSet.add(event);jsonEventRows.push({journey:s.journey,path:s.path,row:r,event});}
      }
    }else if(s.kind==='UI_TO_DOMAIN_EVENTS.md'){
      for(const r of parseMarkdownEvents(readFrozen(root,commit,s.path,cache),s.path)){
        eventSet.add(r.event);mdEventRows.push({journey:s.journey,...r});
      }
    }
  }
  const boundSet=new Set(bindings.bindings.map(x=>x.domain_event));
  const eventMissing=[...eventSet].filter(x=>!boundSet.has(x)).sort();
  const eventExtra=[...boundSet].filter(x=>!eventSet.has(x)).sort();

  const uiBy=new Map(ui.journeys.map(x=>[x.journey,x]));
  const pieces=[],journeyReports=[];
  const requiredTriggerBy=new Map((reconstruction.required_state_triggers||[]).map(x=>[x.journey+'|'+x.requirement_state,x]));

  for(const j of frozen.journeys){
    const jid=j.id,pm=new Map(),states=new Set(),sourceModes=[];
    const uj=uiBy.get(jid),protoPath=j.prototype.path;
    const proto=readFrozen(root,commit,protoPath,cache),dynamic=parseDynamicPrototype(proto);
    const screenSource=(registry.curated_mapping_sources||[]).find(x=>x.journey===jid&&x.kind==='SCREEN_STATE_MAPPING.json');
    if(screenSource){
      for(const s of parseScreenStates(readFrozen(root,commit,screenSource.path,cache)))states.add(s);
      sourceModes.push('SCREEN_STATE_MAPPING');
    }
    const stateSource=(registry.supporting_state_sources||[]).find(x=>x.journey===jid&&x.kind==='STATE_INVENTORY.md');
    if(stateSource){
      for(const s of parseCodedStateInventory(readFrozen(root,commit,stateSource.path,cache),jid))states.add(s);
      sourceModes.push('STATE_INVENTORY');
    }
    if(dynamic.states.length){
      for(const s of dynamic.states)states.add(s);
      sourceModes.push('DYNAMIC_SOURCE_DEFS');
    }
    if(uj){
      const rich=states.size>0;
      for(const s of uj.states||[])if(!(rich&&s.id==='artifact-root'))states.add(s.id);
      sourceModes.push('STATIC_SURFACE_INVENTORY');
    }
    const jsonRows=jsonEventRows.filter(x=>x.journey===jid);
    for(const x of jsonRows){
      const s=x.row.screen||x.row.route||x.row.state;
      if(s)states.add(norm(s));
    }
    if(!states.size)states.add('artifact-root');

    for(const id of [...states].sort()){
      const cls=stateClass(jid,id,reconstruction);
      addPiece(pm,{
        piece_id:'J'+jid+'/state/'+id,journey:jid,state:id,piece:id,piece_type:'state',
        classification:cls.classification,schema_refs:cls.schema_refs,
        authority_refs:uniq([protoPath,stateSource?.path,screenSource?.path]),
        justification:cls.justification,mapping_confidence:'high'
      });
    }

    const stateIds=new Set(states);
    function addAction(a,authority,event=null){
      const state=norm(a.state||a.screen||a.route||'@unknown');
      const label=norm(a.label||a.action||'');
      const target=normTarget(a.target||a.href||a.to||'');
      if(!label&&!target)return;
      const binding=event?bindingByEvent.get(event):null;
      const cls=actionClass({...a,label,target},binding,stateIds);
      const id='J'+jid+'/'+state+'/action/'+slug(label)+'@'+slug(target||'none');
      addPiece(pm,{
        piece_id:id,journey:jid,state,piece:label||target,piece_type:'visible_action',
        classification:cls.classification,schema_refs:cls.schema_refs,authority_refs:uniq([authority]),
        justification:cls.justification,mapping_confidence:binding?.confidence||'derived',
        domain_event:event||null,target:target||null
      });
    }

    if(uj){
      for(const s of uj.states||[])for(const a of s.actions||[])addAction({...a,state:s.id},uj.artifact?.path||protoPath,a.domain_event||null);
    }
    for(const x of jsonRows)addAction({...x.row,state:x.row.screen||x.row.route||x.row.state},x.path,x.event);
    if(!jsonRows.length){
      for(const x of mdEventRows.filter(x=>x.journey===jid))addAction({state:'@mapping',label:x.action,target:''},x.path,x.event);
    }
    for(const a of dynamic.actions)addAction(a,protoPath,null);

    const fieldSeen=new Set();
    if(uj){
      for(const s of uj.states||[])for(const f of s.fields||[]){
        const k=norm(f.name||f.label)+'|'+s.id;
        if(fieldSeen.has(k))continue;
        fieldSeen.add(k);
        addPiece(pm,{
          piece_id:'J'+jid+'/'+s.id+'/field/'+slug(f.name||f.label),journey:jid,state:s.id,piece:f.label||f.name||f.type,piece_type:'field',
          classification:'DRAFT_FIELD',schema_refs:[],authority_refs:[uj.artifact?.path||protoPath],
          justification:'Editable/selected field value is draft/input state until an owning operation accepts it.',mapping_confidence:'derived'
        });
      }
    }
    for(const f of rawFields(proto)){
      const k=norm(f.name||f.label)+'|@artifact';
      if(fieldSeen.has(k))continue;
      fieldSeen.add(k);
      addPiece(pm,{
        piece_id:'J'+jid+'/@artifact/field/'+slug(f.name||f.label),journey:jid,state:'@artifact',piece:f.label||f.name||f.type,piece_type:'field',
        classification:'DRAFT_FIELD',schema_refs:[],authority_refs:[protoPath],
        justification:'Source-level field recovered from frozen prototype; treated as draft/input state until accepted by an owning operation.',mapping_confidence:'source_recovered'
      });
    }

    const arr=[...pm.values()].sort((a,b)=>a.piece_id.localeCompare(b.piece_id));
    pieces.push(...arr);
    const byClass={};for(const p of arr)byClass[p.classification]=(byClass[p.classification]||0)+1;
    journeyReports.push({
      journey:jid,name:j.name,source_modes:uniq(sourceModes),
      states:arr.filter(x=>x.piece_type==='state').length,
      actions:arr.filter(x=>x.piece_type==='visible_action').length,
      fields:arr.filter(x=>x.piece_type==='field').length,
      pieces:arr.length,by_classification:byClass
    });
  }

  const operationIds=new Set(core.operations.map(x=>x.id));
  const taskIds=new Set((tasks.tasks||[]).map(x=>x.id));
  const witnessErrors=[],seenWitness=new Map();
  for(const w of reconstruction.operation_witnesses||[]){
    if(!operationIds.has(w.schema_ref))witnessErrors.push({id:'WITNESS_UNKNOWN_OPERATION',schema_ref:w.schema_ref});
    seenWitness.set(w.schema_ref,(seenWitness.get(w.schema_ref)||0)+1);
    const e=w.evidence||{};
    if(e.domain_event){
      const b=bindingByEvent.get(e.domain_event);
      if(!b)witnessErrors.push({id:'WITNESS_EVENT_MISSING',schema_ref:w.schema_ref,event:e.domain_event});
      else if(!(b.operation_refs||[]).includes(w.schema_ref)&&!(w.witness_types||[]).includes('RECOVERY_ONLY'))witnessErrors.push({id:'WITNESS_EVENT_NOT_BOUND',schema_ref:w.schema_ref,event:e.domain_event});
    }
    if(e.task_ref&&!taskIds.has(e.task_ref))witnessErrors.push({id:'WITNESS_TASK_MISSING',schema_ref:w.schema_ref,task:e.task_ref});
    if(e.path){
      const txt=readFrozen(root,commit,e.path,cache);
      if(e.contains&&!txt.includes(e.contains))witnessErrors.push({id:'WITNESS_PHRASE_MISSING',schema_ref:w.schema_ref,path:e.path,contains:e.contains});
      if(e.also_contains&&!txt.includes(e.also_contains))witnessErrors.push({id:'WITNESS_PHRASE_MISSING',schema_ref:w.schema_ref,path:e.path,contains:e.also_contains});
    }
    if(e.schema_source&&!core.sources[e.schema_source])witnessErrors.push({id:'WITNESS_SCHEMA_SOURCE_MISSING',schema_ref:w.schema_ref,source:e.schema_source});
    if((w.witness_types||[]).includes('CONTRACT_ONLY')&&!(graph.contract_only_operations||[]).includes(w.schema_ref))witnessErrors.push({id:'CONTRACT_ONLY_MISMATCH',schema_ref:w.schema_ref});
    if((w.witness_types||[]).includes('COORDINATED_OPERATION')&&!(graph.coordinated_operations||[]).some(x=>x.id===w.schema_ref))witnessErrors.push({id:'COORDINATED_OPERATION_MISMATCH',schema_ref:w.schema_ref});
  }
  for(const id of operationIds)if(!seenWitness.has(id))witnessErrors.push({id:'UNWITNESSED_OPERATION',schema_ref:id});

  const stateSetByJourney=new Map(journeyReports.map(j=>[
    j.journey,
    new Set(pieces.filter(p=>p.journey===j.journey&&p.piece_type==='state').map(p=>p.state))
  ]));
  const required=[];
  for(const r of graph.construction_requirements||[]){
    if(r.kind!=='required_states')continue;
    for(const name of r.value||[]){
      const alias=reconstruction.state_name_aliases?.[r.journey]?.[name]||name;
      const target=stateSetByJourney.get(r.journey)?.has(alias);
      const trig=requiredTriggerBy.get(r.journey+'|'+name);
      required.push({
        journey:r.journey,requirement:r.id,requirement_state:name,golden_state:alias,
        resolved:!!target,triggered:!!trig,classification:trig?.classification||null,trigger:trig?.trigger||null
      });
    }
  }
  const requiredErrors=required.filter(x=>!x.resolved||!x.triggered).map(x=>({id:!x.resolved?'REQUIRED_STATE_UNRESOLVED':'REQUIRED_STATE_TRIGGER_MISSING',...x}));

  const semanticStats={
    objects:{total:core.objects.length,witnessed:core.objects.filter(x=>(x.source_journeys||[]).length||(x.sources||[]).length).length},
    operations:{total:core.operations.length,witnessed:operationIds.size-witnessErrors.filter(x=>x.id==='UNWITNESSED_OPERATION').length},
    laws:{total:core.laws.length,witnessed:core.laws.filter(x=>(x.sources||[]).length).length,machine_checkable:core.laws.filter(x=>x.machine_checkable).length,declared_prose_only:core.laws.filter(x=>x.machine_checkable===false).length},
    views:{total:core.derived_models.length,witnessed:core.derived_models.filter(x=>(x.source_journeys||[]).length||(x.sources||[]).length).length},
    contexts:{
      total:graph.contexts.length,
      witnessed:graph.contexts.filter(c=>
        graph.journey_projections.some(j=>[
          ...(j.entry_contexts_any||[]),...(j.ambient_contexts_required||[]),
          ...(j.effect_contexts_required||[]),...(j.emits_contexts||[])
        ].includes(c.id))||graph.composition_units.some(u=>(u.contexts||[]).includes(c.id))
      ).length
    },
    requirements:{total:(graph.construction_requirements||[]).length,witnessed:(graph.construction_requirements||[]).filter(x=>x.journey||x.sources?.length).length},
    continuity:{total:(graph.continuity_contracts||[]).length,witnessed:(graph.continuity_contracts||[]).filter(x=>(x.sources||[]).length).length}
  };
  const semanticUnwitnessed=Object.entries(semanticStats)
    .filter(([,x])=>x.witnessed!==undefined&&x.witnessed<x.total)
    .map(([kind,x])=>({kind,unwitnessed:x.total-x.witnessed}));

  const byClass={};for(const p of pieces)byClass[p.classification]=(byClass[p.classification]||0)+1;
  const unclassified=pieces.filter(x=>!bindings.classification_vocabulary.includes(x.classification));
  const errors=[
    ...sourceErrors,
    ...eventMissing.map(event=>({id:'UNBOUND_DOMAIN_EVENT',event})),
    ...eventExtra.map(event=>({id:'EXTRA_DOMAIN_EVENT_BINDING',event})),
    ...witnessErrors,...requiredErrors,
    ...unclassified.map(x=>({id:'UNCLASSIFIED_PIECE',piece_id:x.piece_id})),
    ...semanticUnwitnessed.map(x=>({id:'UNWITNESSED_SEMANTIC_CATEGORY',...x}))
  ];

  const coverage={
    schema_version:1,generated_view:'reconstruction-coverage',
    target_contract:reconstruction.target_contract,status:errors.length?'FAIL':'PASS',
    source_pins:{total:sourcePins.length,matched:sourcePins.filter(x=>x.matches).length,errors:sourceErrors},
    event_vocabulary:{
      json_rows:jsonEventRows.length,markdown_event_rows:mdEventRows.length,
      distinct_events:eventSet.size,bound_events:boundSet.size,missing:eventMissing,extra:eventExtra
    },
    golden_pieces:{
      total:pieces.length,states:pieces.filter(x=>x.piece_type==='state').length,
      actions:pieces.filter(x=>x.piece_type==='visible_action').length,
      fields:pieces.filter(x=>x.piece_type==='field').length,
      classified:pieces.length-unclassified.length,unjustified_unmapped:unclassified.length,
      by_classification:byClass,per_journey:journeyReports
    },
    semantic_witnesses:semanticStats,
    operation_witnesses:{
      total:core.operations.length,
      witnessed:core.operations.length-witnessErrors.filter(x=>x.id==='UNWITNESSED_OPERATION').length,
      errors:witnessErrors
    },
    required_states:{
      total:required.length,resolved:required.filter(x=>x.resolved).length,
      triggered:required.filter(x=>x.triggered).length,rows:required,errors:requiredErrors
    },
    supersessions:reconstruction.supersessions||[],errors
  };

  return {
    coverage,
    mutations:deriveMechanicalMutationCoverage(core,graph,reconstruction),
    blast:deriveBlastRadius(core,graph,tasks),
    pieces
  };
}

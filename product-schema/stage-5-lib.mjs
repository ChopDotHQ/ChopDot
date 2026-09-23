
import {
  readFrozen,frozenBlob,rowsOfJson,parseMarkdownEvents,parseModelEvents,parseScreenStates,
  parseCodedStateInventory,parseExecutableStates,parseDynamicPrototype,parseSwitchPrototype,
  rawFields,stateClass,actionClass,addPiece,uniq,norm,normTarget,slug
} from './stage-5-source-lib.mjs';
import { deriveIndependentMutationCoverage,validateIndependentSafety } from './stage-5-safety-lib.mjs';
import { deriveBlastRadius } from './stage-5-blast-lib.mjs';
import { validateStage52,deriveStage52AdversarialCoverage } from './stage-5-freeze-lib.mjs';
import {
  validateEventBindings,applyAndValidateControlBindings,validateOperationWitnesses,
  validateRequiredStates,validateSupersessions,validateOverlayWitnesses,semanticWitnessStats
} from './stage-5-validation-lib.mjs';

const has=(a,x)=>Array.isArray(a)&&a.includes(x);

export function deriveStage5({root,core,graph,frozen,registry,bindings,reconstruction,ui,tasks}){
  const cache=new Map(),productCommit=registry.product_authority_commit;
  const readAt=(commit,path)=>readFrozen(root,commit,path,cache);
  const readProduct=path=>readAt(productCommit,path);
  const sourceCommit=s=>s?.commit||productCommit;
  const readSourceRef=ref=>{
    const s=core.sources[ref];
    if(!s)throw new Error('Unknown source ref '+ref);
    return readAt(sourceCommit(s),s.path);
  };
  const verifySourceRef=ref=>{
    const s=core.sources[ref];if(!s)return false;
    try{return frozenBlob(root,sourceCommit(s),s.path)===s.git_blob;}catch{return false;}
  };

  const registered=[...(registry.curated_mapping_sources||[]),...(registry.supporting_state_sources||[]),...(registry.executable_mapping_sources||[])];
  const sourcePins=registered.map(s=>{
    const actual=frozenBlob(root,productCommit,s.path);
    return {...s,actual_git_blob:actual,matches:s.git_blob===actual};
  });
  const sourceErrors=sourcePins.filter(x=>!x.matches).map(x=>({id:'SOURCE-PIN-MISMATCH',path:x.path,expected:x.git_blob,actual:x.actual_git_blob}));

  const jsonEventRows=[],mdEventRows=[],modelEventRows=[],eventSet=new Set();
  for(const s of registry.curated_mapping_sources||[]){
    if(s.kind==='UI_EVENT_MAPPING.json'){
      for(const row of rowsOfJson(readProduct(s.path))){
        const event=row.domain_event||row.event||row.domainEvent;
        if(event){eventSet.add(event);jsonEventRows.push({journey:s.journey,path:s.path,row,event});}
      }
    }else if(s.kind==='UI_TO_DOMAIN_EVENTS.md'){
      for(const row of parseMarkdownEvents(readProduct(s.path),s.path)){
        eventSet.add(row.event);mdEventRows.push({journey:s.journey,...row});
      }
    }
  }
  for(const s of (registry.executable_mapping_sources||[]).filter(x=>x.kind==='model.cjs')){
    for(const row of parseModelEvents(readProduct(s.path),s.path)){
      eventSet.add(row.event);modelEventRows.push({journey:s.journey,...row});
    }
  }
  const eventErrors=validateEventBindings(core,bindings,eventSet);
  const bindingByEvent=new Map((bindings.bindings||[]).map(x=>[x.domain_event,x]));

  const uiBy=new Map(ui.journeys.map(x=>[x.journey,x]));
  const protoByJourney=new Map(),stateSetByJourney=new Map(),pieces=[],extractionErrors=[],sourceDenominators=[];

  const governance=(journey,classification)=>{
    if(!['RECOVERY_BEHAVIOR','SYSTEM_PROGRESSION'].includes(classification))return [];
    return (reconstruction.journey_governance?.[journey]||[]).filter(ref=>core.laws.some(x=>x.id===ref)||core.derived_models.some(x=>x.id===ref)||core.operations.some(x=>x.id===ref));
  };

  for(const j of frozen.journeys){
    const jid=j.id,pm=new Map(),states=new Set(),sourceModes=[];
    const protoPath=j.prototype.path,proto=readProduct(protoPath),uj=uiBy.get(jid);
    const exemption=(reconstruction.extraction_exemptions||[]).find(x=>x.journey===jid);
    protoByJourney.set(jid,{path:protoPath,text:proto});

    const screenSource=(registry.curated_mapping_sources||[]).find(x=>x.journey===jid&&x.kind==='SCREEN_STATE_MAPPING.json');
    const stateSource=(registry.supporting_state_sources||[]).find(x=>x.journey===jid&&x.kind==='STATE_INVENTORY.md');
    const modelSource=(registry.executable_mapping_sources||[]).find(x=>x.journey===jid&&x.kind==='model.cjs');

    const screenStates=screenSource?parseScreenStates(readProduct(screenSource.path)):[];
    const inventoryStates=stateSource?parseCodedStateInventory(readProduct(stateSource.path),jid):[];
    const modelStates=modelSource?parseExecutableStates(readProduct(modelSource.path)):[];
    const dynamic=parseDynamicPrototype(proto),switchUI=parseSwitchPrototype(proto);
    const uiStates=(uj?.states||[]).map(x=>x.id==='artifact-root'&&exemption?exemption.canonical_state:x.id).filter(x=>x!=='artifact-root');
    const jsonRows=jsonEventRows.filter(x=>x.journey===jid);
    const jsonStates=uniq(jsonRows.map(x=>x.row.screen||x.row.route||x.row.state).filter(Boolean).map(norm));

    for(const [mode,arr] of [['SCREEN_STATE_MAPPING',screenStates],['STATE_INVENTORY',inventoryStates],['EXECUTABLE_MODEL',modelStates],['DYNAMIC_SOURCE_DEFS',dynamic.states],['SWITCH_SOURCE_DEFS',switchUI.states],['STATIC_SURFACE_INVENTORY',uiStates],['UI_EVENT_MAPPING',jsonStates]]){
      if(arr.length){sourceModes.push(mode);for(const s of arr)states.add(norm(s));}
    }
    if(!states.size){
      if(exemption?.canonical_state){
        states.add(exemption.canonical_state);
        sourceModes.push('EXPLICIT_SINGLE_SURFACE_EXEMPTION');
      }else{
        extractionErrors.push({id:'EXTRACTION-NO-STATES',journey:jid,prototype:protoPath});
      }
    }

    const stateCounts={screen_mapping:screenStates.length,state_inventory:inventoryStates.length,executable_model:modelStates.length,dynamic_source:dynamic.states.length,switch_source:switchUI.states.length,static_inventory:uiStates.length,event_mapping:jsonStates.length};
    const declaredMinimum=Math.max(0,...Object.values(stateCounts));
    if(states.size<declaredMinimum)extractionErrors.push({id:'EXTRACTION-STATE-UNDERCOUNT',journey:jid,states:states.size,declared_minimum:declaredMinimum,state_counts:stateCounts});
    if(proto.includes('const defs=')&&dynamic.states.length===0)extractionErrors.push({id:'EXTRACTION-DYNAMIC-STATE-PARSER-MISS',journey:jid});
    stateSetByJourney.set(jid,states);

    for(const id of [...states].sort()){
      const cls=stateClass(jid,id,reconstruction),refs=uniq([...(cls.schema_refs||[]),...governance(jid,cls.classification)]);
      addPiece(pm,{piece_id:'J'+jid+'/state/'+id,journey:jid,state:id,piece:id,piece_type:'state',classification:cls.classification,schema_refs:refs,authority_refs:uniq([protoPath,stateSource?.path,screenSource?.path,modelSource?.path]),justification:cls.justification,mapping_confidence:'high'});
    }

    const stateIds=new Set(states);
    function addAction(a,authority,event=null){
      const state=norm(a.state||a.screen||a.route||''),label=norm(a.label||a.action||''),target=normTarget(a.target||a.href||a.to||'');
      if(!label&&!target)return;
      const binding=event?bindingByEvent.get(event):null;
      let cls=actionClass({...a,label,target},binding,stateIds);
      if(cls.classification==='UNJUSTIFIED'&&a.source_event){
        if(/CHECK|STATUS|RETRY|RECOVER|CANCEL/i.test(a.source_event))cls={classification:'RECOVERY_BEHAVIOR',schema_refs:[],justification:'Local source event is recovery/status control; canonical outcome remains governed by recovery laws.'};
        else if(/SEND|REQUEST_APPROVAL|PROVIDER/i.test(a.source_event))cls={classification:'EXTERNAL_HANDOFF',schema_refs:[],justification:'Local source event crosses into a provider/system boundary.'};
        else cls={classification:'NAVIGATION_TRANSITION',schema_refs:[],justification:'Local source event changes reversible prototype/navigation state without canonical domain acceptance.'};
      }
      if(cls.classification==='UNJUSTIFIED'&&/send (a )?(new )?code/i.test(label))cls={classification:'EXTERNAL_HANDOFF',schema_refs:[],justification:'Sign-in code request crosses to the identity provider boundary.'};
      if(cls.classification==='UNJUSTIFIED'&&exemption?.root_action_classification&&state===exemption.canonical_state){
        cls={classification:exemption.root_action_classification,schema_refs:[],justification:'Explicit single-surface extraction exemption classifies root affordances as navigation/handoffs, not domain writes.'};
      }
      if(cls.classification==='UNJUSTIFIED'&&jid==='17'&&(/^(CHF|EUR|USD|DOT)\s+\d/i.test(label)||/^Max$/i.test(label))){
        cls={classification:'SELECTION_STATE',schema_refs:[],justification:'Preset amount selector updates reversible savings draft amount; it does not commit a savings operation.'};
      }
      const refs=uniq([...(cls.schema_refs||[]),...governance(jid,cls.classification)]);
      const id='J'+jid+'/'+(state||'source')+'/action/'+slug(label)+'@'+slug(target||a.source_event||'none');
      addPiece(pm,{piece_id:id,journey:jid,state:state||null,piece:label||target,piece_type:'visible_action',classification:cls.classification,schema_refs:refs,authority_refs:uniq([authority]),justification:cls.justification,mapping_confidence:binding?.confidence||'derived',domain_event:event||null,target:target||null,source_event:a.source_event||null});
    }

    if(uj)for(const s of uj.states||[])for(const a of s.actions||[])addAction({...a,state:(s.id==='artifact-root'&&exemption?exemption.canonical_state:s.id)},uj.artifact?.path||protoPath,a.domain_event||null);
    for(const x of jsonRows)addAction({...x.row,state:x.row.screen||x.row.route||x.row.state},x.path,x.event);
    for(const a of dynamic.actions)addAction(a,protoPath,null);
    for(const a of switchUI.actions)addAction(a,protoPath,null);

    const fieldSeen=new Set();
    if(uj)for(const s of uj.states||[])for(const field of s.fields||[]){
      const key=s.id+'|'+norm(field.name||field.label);if(fieldSeen.has(key))continue;fieldSeen.add(key);
      addPiece(pm,{piece_id:'J'+jid+'/'+s.id+'/field/'+slug(field.name||field.label),journey:jid,state:s.id,piece:field.label||field.name||field.type,piece_type:'field',classification:'DRAFT_FIELD',schema_refs:[],authority_refs:[uj.artifact?.path||protoPath],justification:'Editable/selected field is draft/input state until an owning operation accepts it.',mapping_confidence:'derived'});
    }
    for(const field of switchUI.fields){
      const key=field.state+'|'+norm(field.name||field.label);if(fieldSeen.has(key))continue;fieldSeen.add(key);
      addPiece(pm,{piece_id:'J'+jid+'/'+field.state+'/field/'+slug(field.name||field.label),journey:jid,state:field.state,piece:field.label||field.name||field.type,piece_type:'field',classification:'DRAFT_FIELD',schema_refs:[],authority_refs:[protoPath],justification:'Field recovered from a frozen switch-rendered Golden state.',mapping_confidence:'source_recovered'});
    }
    for(const field of rawFields(proto)){
      const key='source|'+norm(field.name||field.label);if(fieldSeen.has(key))continue;fieldSeen.add(key);
      addPiece(pm,{piece_id:'J'+jid+'/field/source/'+slug(field.name||field.label),journey:jid,state:null,piece:field.label||field.name||field.type,piece_type:'field',classification:'DRAFT_FIELD',schema_refs:[],authority_refs:[protoPath],justification:'Source-level field recovered from frozen prototype; no pseudo-state is invented.',mapping_confidence:'source_recovered'});
    }

    const arr=[...pm.values()];
    const countUnique=xs=>new Set(xs.map(x=>[norm(x.state||''),norm(x.label||x.action||''),normTarget(x.target||x.href||x.to||'')].join('|'))).size;
    const staticControls=(uj?.states||[]).flatMap(s=>(s.actions||[]).map(a=>({...a,state:(s.id==='artifact-root'&&exemption?exemption.canonical_state:s.id)})));
    const jsonControls=jsonRows.map(x=>({...x.row,state:x.row.screen||x.row.route||x.row.state,domain_event:x.event}));
    const uiActionCount=countUnique(staticControls);
    const jsonActionCount=countUnique(jsonControls);
    const dynamicActionCount=countUnique(dynamic.actions);
    const switchActionCount=countUnique(switchUI.actions);
    const expectedActionMinimum=Math.max(uiActionCount,jsonActionCount,dynamicActionCount,switchActionCount);
    if(arr.filter(x=>x.piece_type==='visible_action').length<expectedActionMinimum)extractionErrors.push({id:'EXTRACTION-ACTION-UNDERCOUNT',journey:jid,actions:arr.filter(x=>x.piece_type==='visible_action').length,declared_minimum:expectedActionMinimum});
    sourceDenominators.push({journey:jid,state_counts:stateCounts,declared_state_minimum:declaredMinimum,final_states:states.size,action_counts:{static_unique:uiActionCount,event_mapping_unique:jsonActionCount,dynamic_unique:dynamicActionCount,switch_unique:switchActionCount},declared_action_minimum:expectedActionMinimum});
    pieces.push(...arr);
  }

  for(const p of reconstruction.authored_pieces||[])pieces.push({...p,authority_refs:uniq([p.authority_ref]),mapping_confidence:'authored_exact_piece'});

  const sourceControlExists=b=>{
    const info=protoByJourney.get(b.journey);if(!info)return false;
    const text=b.evidence_path?readProduct(b.evidence_path):info.text;
    return stateSetByJourney.get(b.journey)?.has(b.state)&&text.includes(b.label_exact)&&(b.target===undefined||text.includes(b.target));
  };
  const controlErrors=applyAndValidateControlBindings(core,reconstruction,pieces,sourceControlExists);

  for(const p of pieces){
    if(['RECOVERY_BEHAVIOR','SYSTEM_PROGRESSION'].includes(p.classification)&&!(p.schema_refs||[]).length)p.schema_refs=governance(p.journey,p.classification);
  }

  const witnessErrors=validateOperationWitnesses(core,graph,reconstruction,pieces,bindings,tasks,readProduct);
  const required=validateRequiredStates(core,graph,reconstruction,pieces,readSourceRef);
  const supersessionErrors=validateSupersessions(core,reconstruction,pieces);
  const overlayErrors=validateOverlayWitnesses(core,graph,reconstruction,verifySourceRef);

  const semanticStats=semanticWitnessStats(core,graph,frozen);
  const semanticErrors=[];
  for(const [kind,s] of Object.entries(semanticStats))if(s.witnessed!==undefined&&s.witnessed<s.total)semanticErrors.push({id:'SEMANTIC-WITNESS-GAP',kind,unwitnessed:s.total-s.witnessed});

  const unjustified=pieces.filter(p=>p.classification==='UNJUSTIFIED'||!bindings.classification_vocabulary.includes(p.classification));
  const pseudoPieces=pieces.filter(p=>String(p.state||'').startsWith('@')||p.piece_id.includes('/@'));
  const recoveryUngoverned=pieces.filter(p=>['RECOVERY_BEHAVIOR','SYSTEM_PROGRESSION'].includes(p.classification)&&!(p.schema_refs||[]).length);

  const authority={
    c1Identity:JSON.parse(readSourceRef('C1_IDENTITY')),
    c1Spend:JSON.parse(readSourceRef('C1_SPEND')),
    j17Text:readSourceRef('J17'),
    j27Text:readSourceRef('J27'),
    j28Text:readSourceRef('J28'),
    j25Html:readProduct(frozen.journeys.find(x=>x.id==='25').prototype.path)
  };
  const independentSafetyErrors=validateIndependentSafety(core,graph,reconstruction,authority);
  const mutations=deriveIndependentMutationCoverage(core,graph,reconstruction,authority);
  const stage52=validateStage52(core,graph,reconstruction,bindings,pieces,tasks,registry);

  const eventErrorsAll=[...eventErrors];
  const errors=[
    ...sourceErrors,...extractionErrors,...eventErrorsAll,...controlErrors,...witnessErrors,...required.errors,
    ...supersessionErrors,...overlayErrors,...semanticErrors,
    ...unjustified.map(p=>({id:'UNJUSTIFIED-PIECE',piece_id:p.piece_id,journey:p.journey,piece:p.piece})),
    ...pseudoPieces.map(p=>({id:'PSEUDO-PIECE',piece_id:p.piece_id})),
    ...recoveryUngoverned.map(p=>({id:'UNGOVERNED-RECOVERY-PIECE',piece_id:p.piece_id})),
    ...independentSafetyErrors.map(e=>({id:'INDEPENDENT-SAFETY-'+e.id,...e})),
    ...stage52.errors
  ];

  const byClass={};for(const p of pieces)byClass[p.classification]=(byClass[p.classification]||0)+1;
  const perJourney=frozen.journeys.map(j=>{
    const ps=pieces.filter(p=>p.journey===j.id),d=sourceDenominators.find(x=>x.journey===j.id),classes={};
    for(const p of ps)classes[p.classification]=(classes[p.classification]||0)+1;
    return {journey:j.id,name:j.name,states:ps.filter(x=>x.piece_type==='state').length,actions:ps.filter(x=>x.piece_type==='visible_action').length,fields:ps.filter(x=>x.piece_type==='field').length,pieces:ps.length,by_classification:classes,denominator:d};
  });

  const coverage={
    schema_version:2,generated_view:'reconstruction-coverage',
    target_contract:reconstruction.target_contract,status:errors.length?'FAIL':'PASS',
    source_pins:{total:sourcePins.length,matched:sourcePins.filter(x=>x.matches).length,errors:sourceErrors},
    event_vocabulary:{json_rows:jsonEventRows.length,markdown_event_rows:mdEventRows.length,model_event_rows:modelEventRows.length,distinct_events:eventSet.size,bound_events:(bindings.bindings||[]).length,errors:eventErrorsAll},
    golden_pieces:{total:pieces.length,states:pieces.filter(x=>x.piece_type==='state').length,actions:pieces.filter(x=>x.piece_type==='visible_action').length,fields:pieces.filter(x=>x.piece_type==='field').length,classified:pieces.length-unjustified.length,unjustified_unmapped:unjustified.length,pseudo_pieces:pseudoPieces.length,ungoverned_recovery:recoveryUngoverned.length,by_classification:byClass,per_journey:perJourney},
    semantic_witnesses:{...semanticStats,operations:{total:core.operations.length,witnessed:core.operations.length-witnessErrors.filter(x=>x.id==='WITNESS-OPERATION-MISSING').length}},
    operation_witnesses:{total:core.operations.length,witnessed:core.operations.length-witnessErrors.filter(x=>x.id==='WITNESS-OPERATION-MISSING').length,errors:witnessErrors},
    required_states:{total:required.rows.length,resolved:required.rows.filter(x=>x.resolved).length,triggered:required.rows.filter(x=>x.triggered).length,rows:required.rows,errors:required.errors},
    overlays:{required:7,errors:overlayErrors},
    supersessions:{total:(reconstruction.supersessions||[]).length,errors:supersessionErrors},
    extraction:{errors:extractionErrors,source_denominators:sourceDenominators},
    independent_safety:{errors:independentSafetyErrors},
    stage_5_2:{seals:stage52.seals,metrics:stage52.metrics,errors:stage52.errors},
    errors
  };

  const blast=deriveBlastRadius(core,graph,tasks,pieces);
  const adversarial=deriveStage52AdversarialCoverage(core,graph,reconstruction,bindings,pieces,tasks,registry);
  return {coverage,mutations,adversarial,blast,pieces};
}

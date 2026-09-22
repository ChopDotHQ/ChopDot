import { execFileSync } from 'node:child_process';

export const uniq=a=>[...new Set((a||[]).filter(x=>x!==null&&x!==undefined&&x!==''))];
export const norm=x=>String(x??'').trim();
export const normTarget=x=>norm(x).replace(/^#/,'');
export const slug=x=>norm(x).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'unnamed';

export function readFrozen(root,commit,path,cache){
  const k=commit+':'+path;
  if(cache.has(k))return cache.get(k);
  const v=execFileSync('git',['show',k],{cwd:root,encoding:'utf8',maxBuffer:30*1024*1024});
  cache.set(k,v);
  return v;
}
export function frozenBlob(root,commit,path){
  return execFileSync('git',['rev-parse',commit+':'+path],{cwd:root,encoding:'utf8'}).trim();
}
export function rowsOfJson(text){
  const j=JSON.parse(text);
  return Array.isArray(j)?j:(j.rows||j.mappings||j.events||j.items||[]);
}
export function parseMarkdownEvents(text,path){
  const out=[],seen=new Set();
  const push=(event,action,event_cell,source_kind)=>{
    const k=event+'|'+(action||'')+'|'+source_kind;
    if(seen.has(k))return;
    seen.add(k);out.push({event,action:action||null,event_cell:event_cell||null,path,source_kind});
  };
  for(const line of text.split(/\r?\n/)){
    if(line.trim().startsWith('|')&&!/^\|\s*---/.test(line)&&!/UI action|Primary UI action/.test(line)){
      const cols=line.split('|').slice(1,-1).map(x=>x.trim());
      if(cols.length>=2){
        const cell=cols[1].replace(/\x60/g,'');
        for(const m of cell.matchAll(/\b([A-Z][A-Za-z0-9]+(?:[A-Z][A-Za-z0-9]+)+)\b/g))push(m[1],cols[0],cols[1],'table');
      }
    }
    for(const m of line.matchAll(/\x60([A-Z][A-Za-z0-9]+)\x60/g))push(m[1],null,line,'backtick_prose');
    for(const m of line.matchAll(/\*\*([A-Z][A-Za-z0-9]+)\*\*/g))push(m[1],null,line,'bold_prose');
  }
  return out;
}
export function parseModelEvents(text,path){
  const out=[],seen=new Set();
  for(const m of text.matchAll(/\bemit\(\s*['"]([A-Z][A-Za-z0-9]+)['"]/g)){
    if(seen.has(m[1]))continue;seen.add(m[1]);out.push({event:m[1],action:null,event_cell:null,path,source_kind:'model_emit'});
  }
  return out;
}
export function parseScreenStates(text){
  const out=[];
  for(const r of rowsOfJson(text)){
    const id=r.screen||r.route||r.state||r.id;
    if(id)out.push(norm(id));
  }
  return uniq(out);
}
export function parseCodedStateInventory(text,journey){
  const out=[];
  for(const line of text.split(/\r?\n/)){
    const coded=new RegExp('J'+journey+'-(?:S|B)\\d+','i').test(line);
    if(coded){
      const bt=[...line.matchAll(/\x60([^\x60]+)\x60/g)].map(m=>norm(m[1])).filter(x=>/^[a-z][a-z0-9-]*$/.test(x));
      if(bt.length)out.push(bt[0]);
      else {
        const m=line.match(/J\d+-(?:S|B)\d+\s*[·|-]\s*([a-z0-9][a-z0-9-]+)/i);
        if(m)out.push(norm(m[1]));
      }
    }else{
      for(const m of line.matchAll(/\x60([a-z][a-z0-9-]*)\x60/gi))out.push(norm(m[1]));
    }
  }
  return uniq(out);
}
export function parseExecutableStates(text){
  const out=[];
  for(const name of ['STATES','routes']){
    const re=new RegExp('(?:const|let|var)\\s+'+name+'\\s*=\\s*\\[([\\s\\S]*?)\\]','i');
    const m=text.match(re);
    if(m)for(const q of m[1].matchAll(/['"]([a-z0-9][a-z0-9-]+)['"]/gi))out.push(q[1]);
  }
  return uniq(out);
}
export function parseDynamicPrototype(text){
  const states=[],actions=[];
  for(const line of text.split(/\r?\n/)){
    let state=null;
    let m=line.match(/^\s*['"]([a-z0-9][a-z0-9-]+)['"]\s*:\s*[SB]\(/i);
    if(!m)m=line.match(/^\s*['"]([a-z0-9][a-z0-9-]+)['"]\s*:\s*\[/i);
    if(!m)m=line.match(/\badd\(\s*['"]([a-z0-9][a-z0-9-]+)['"]\s*,\s*[SB]\(/i);
    if(m){state=m[1];states.push(state);}
    if(!state)continue;
    const seen=new Set();
    for(const a of line.matchAll(/\bA\(\s*['"]([^'"]*)['"]\s*,\s*['"]([^'"]*)['"]/g)){
      const label=norm(a[1]),target=normTarget(a[2]),k=label+'|'+target;
      if(!seen.has(k)){seen.add(k);actions.push({state,label,target,source:'dynamic_prototype'});}
    }
    for(const a of line.matchAll(/\[\s*['"]([^'"]+)['"]\s*,\s*['"]([a-z0-9][a-z0-9-]+)['"]\s*\]/gi)){
      const label=norm(a[1]),target=normTarget(a[2]),k=label+'|'+target;
      if(!seen.has(k)){seen.add(k);actions.push({state,label,target,source:'dynamic_prototype'});}
    }
  }
  return {states:uniq(states),actions};
}
export function rawFields(text){
  const out=[];
  function attr(tag,name){
    const m=tag.match(new RegExp(name+"\\s*=\\s*['\"]([^'\"]*)['\"]",'i'));
    return m?m[1]:null;
  }
  for(const m of text.matchAll(/<input\b[^>]*>/gi)){
    const tag=m[0],type=(attr(tag,'type')||'text').toLowerCase();
    if(['button','submit','reset','hidden'].includes(type))continue;
    out.push({label:attr(tag,'aria-label')||attr(tag,'placeholder')||attr(tag,'name')||attr(tag,'id')||type,name:attr(tag,'name')||attr(tag,'id')||null,type});
  }
  for(const m of text.matchAll(/<textarea\b[^>]*>/gi)){
    const tag=m[0];
    out.push({label:attr(tag,'aria-label')||attr(tag,'placeholder')||attr(tag,'name')||attr(tag,'id')||'textarea',name:attr(tag,'name')||attr(tag,'id')||null,type:'text'});
  }
  for(const m of text.matchAll(/<select\b[^>]*>/gi)){
    const tag=m[0];
    out.push({label:attr(tag,'aria-label')||attr(tag,'name')||attr(tag,'id')||'select',name:attr(tag,'name')||attr(tag,'id')||null,type:'select'});
  }
  const map=new Map();
  for(const x of out){
    const k=norm(x.name||x.label)+'|'+x.type;
    if(!map.has(k))map.set(k,x);
  }
  return [...map.values()];
}
function recoveryState(id){
  return /(error|fail|unknown|offline|locked|conflict|stale|expired|cancel|reconcil|retry|blocked|missing|duplicate|reversed|not-found|unavailable|denied|mismatch)/i.test(id);
}
function progressState(id){
  return /(loading|saving|creating|applying|deleting|withdrawing|submitting|pending|checking|preparing|connecting|switching|archiving|unarchiving|leaving|requesting|syncing|refreshing|retrying)$/i.test(id);
}
export function stateClass(journey,id,reconstruction){
  const sup=(reconstruction.supersessions||[]).find(x=>x.journey===journey&&x.piece_type==='state'&&x.piece_selector===id);
  if(sup)return {classification:'POST_GOLDEN_SUPERSEDED',schema_refs:[sup.golden_impact,sup.decision],justification:sup.reason};
  const trig=(reconstruction.required_state_triggers||[]).find(x=>x.journey===journey&&x.golden_state===id);
  if(trig)return {classification:trig.classification,schema_refs:[],justification:trig.trigger};
  if(/boundary|handoff/i.test(id))return {classification:'EXTERNAL_HANDOFF',schema_refs:[],justification:'Explicit journey/system boundary state.'};
  if(recoveryState(id))return {classification:'RECOVERY_BEHAVIOR',schema_refs:[],justification:'Failure, uncertainty, stale/offline, or recovery state preserved by Golden authority.'};
  if(progressState(id))return {classification:'SYSTEM_PROGRESSION',schema_refs:[],justification:'Pending/system progression state that does not itself manufacture terminal truth.'};
  return {classification:'PRODUCT_REQUIREMENT',schema_refs:[],justification:'Approved product state required by the Golden/state mapping.'};
}
export function actionClass(action,binding,stateIds){
  if(binding)return {classification:binding.classification,schema_refs:binding.operation_refs||[],justification:binding.justification||'Frozen domain-event binding.'};
  if(action.semantic_operation)return {classification:'DOMAIN_OPERATION',schema_refs:[action.semantic_operation],justification:'Explicit semantic_operation mapping already present in the diagnostic/task substrate.'};
  if(/^(demo|test result|fixture|simulate)/i.test(norm(action.label))||/\bdemo\b/i.test(norm(action.label)))return {classification:'REVIEW_DEMO_CHROME',schema_refs:[],justification:'Prototype/reviewer control; does not create product-domain authority.'};
  const target=normTarget(action.target||action.href);
  if(target&&stateIds.has(target))return {classification:'NAVIGATION_TRANSITION',schema_refs:[],justification:'Internal transition to another approved state.'};
  if(action.kind==='external_or_route'||(action.href&&!String(action.href).startsWith('#')))return {classification:'EXTERNAL_HANDOFF',schema_refs:[],justification:'Navigation/handoff outside the current journey state graph.'};
  if(action.disabled===true||/^(saving|creating|withdrawing|please wait|loading)/i.test(norm(action.label)))return {classification:'SYSTEM_PROGRESSION',schema_refs:[],justification:'Disabled/progress control rather than a new domain effect.'};
  return {classification:'UNJUSTIFIED',schema_refs:[],justification:'Visible control has no verified navigation, handoff, reviewer, recovery, system-progression, or semantic-operation binding.'};
}
export function addPiece(map,piece){
  const old=map.get(piece.piece_id);
  if(!old){map.set(piece.piece_id,piece);return;}
  old.authority_refs=uniq([...(old.authority_refs||[]),...(piece.authority_refs||[])]);
  old.schema_refs=uniq([...(old.schema_refs||[]),...(piece.schema_refs||[])]);
  if(piece.domain_event)old.domain_event=piece.domain_event;
  if(piece.mapping_confidence)old.mapping_confidence=piece.mapping_confidence;
  if(piece.classification==='DOMAIN_OPERATION'||piece.classification==='POST_GOLDEN_SUPERSEDED')old.classification=piece.classification;
  if(piece.justification&&!old.justification.includes(piece.justification))old.justification+=' '+piece.justification;
}

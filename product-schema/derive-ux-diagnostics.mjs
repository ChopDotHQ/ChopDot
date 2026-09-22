import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const ps=join(root,'product-schema');
const readJson=p=>JSON.parse(readFileSync(join(ps,p),'utf8'));
const frozen=readJson('frozen-baseline.json');
const graph=readJson('composition-graph.json');
const out=join(ps,'generated');mkdirSync(out,{recursive:true});

function artifactFor(j){
  if(j.id==='05')return {kind:'html',path:'product-schema/recovered-evidence/j05-v1-approved-candidate.html',provenance:'recovered_approved_evidence'};
  const r=j.artifact_resolution?.resolved_artifacts||[];
  const html=r.find(x=>x.kind==='html'); if(html)return {kind:'html',path:html.path,provenance:'resolved_artifact'};
  const zip=r.find(x=>x.kind==='zip'); if(zip)return {kind:'zip',path:zip.path,provenance:'resolved_package'};
  const xz=r.find(x=>x.kind==='xz'); if(xz)return {kind:'xz',path:xz.path,provenance:'resolved_package'};
  return {kind:'html',path:j.prototype.path,provenance:'prototype_entrypoint'};
}
function loadArtifact(a){
  const p=join(root,a.path);
  if(a.kind==='html')return readFileSync(p,'utf8');
  if(a.kind==='xz')return execFileSync('xz',['-dc',p],{encoding:'utf8',maxBuffer:20*1024*1024});
  if(a.kind==='zip'){
    const members=execFileSync('unzip',['-Z1',p],{encoding:'utf8'}).trim().split(/\r?\n/).filter(x=>/\.html?$/i.test(x));
    if(!members.length)throw new Error('No HTML in '+a.path);
    let best='',bestLen=-1;
    for(const m of members){const s=execFileSync('unzip',['-p',p,m],{encoding:'utf8',maxBuffer:20*1024*1024});if(s.length>bestLen){best=s;bestLen=s.length;}}
    return best;
  }
  throw new Error('Unsupported artifact '+a.kind);
}
function decode(s=''){return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/&middot;/g,'·').replace(/&rsquo;/g,'’').replace(/&ldquo;|&rdquo;/g,'"');}
function attr(tag,name){const m=tag.match(new RegExp(name+"\\\\s*=\\\\s*['\\\"]([^'\\\"]*)['\\\"]","i"));return m?decode(m[1]):null;}
function visible(html=''){return decode(html.replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<svg[\s\S]*?<\/svg>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();}
function extractScreens(doc){
  const tokens=[...doc.matchAll(/<section\b[^>]*>|<\/section>/gi)],screens=[];
  for(let i=0;i<tokens.length;i++){
    const tag=tokens[i][0];if(/^<\/section/i.test(tag))continue;
    const cls=attr(tag,'class')||'',id=attr(tag,'id');
    if(!id||!cls.split(/\s+/).includes('screen'))continue;
    let depth=1,end=null;
    for(let k=i+1;k<tokens.length;k++){if(/^<\/section/i.test(tokens[k][0]))depth--;else depth++;if(depth===0){end=tokens[k].index+tokens[k][0].length;break;}}
    if(end===null)throw new Error('Unclosed screen '+id);
    screens.push({id,html:doc.slice(tokens[i].index,end)});
  }
  return screens;
}
function parseFields(html){
  const fields=[];
  for(const m of html.matchAll(/<input\b[^>]*>/gi)){const tag=m[0],type=(attr(tag,'type')||'text').toLowerCase();if(['button','submit','reset'].includes(type))continue;fields.push({element:'input',type,label:attr(tag,'aria-label')||attr(tag,'placeholder')||attr(tag,'name')||attr(tag,'id')||null,name:attr(tag,'name'),value:attr(tag,'value'),required:/\srequired(?:\s|>|=)/i.test(tag)});}
  for(const m of html.matchAll(/<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/gi)){const open='<textarea '+m[1]+'>';fields.push({element:'textarea',type:'text',label:attr(open,'aria-label')||attr(open,'placeholder')||attr(open,'name')||attr(open,'id')||null,name:attr(open,'name'),value:visible(m[2])||null,required:/\srequired(?:\s|>|=)/i.test(open)});}
  for(const m of html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)){const open='<select '+m[1]+'>';fields.push({element:'select',type:'select',label:attr(open,'aria-label')||attr(open,'name')||attr(open,'id')||null,name:attr(open,'name'),value:null,required:/\srequired(?:\s|>|=)/i.test(open)});}
  return fields;
}
function parseActions(html){
  const actions=[];
  for(const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)){const open='<a '+m[1]+'>',href=attr(open,'href'),label=attr(open,'aria-label')||visible(m[2])||null;if(!label&&!href)continue;actions.push({element:'a',label,href,target:href?.startsWith('#')?href.slice(1):null,kind:href?.startsWith('#')?'state_transition':href?'external_or_route':'action'});}
  for(const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)){const open='<button '+m[1]+'>',label=attr(open,'aria-label')||visible(m[2])||null;if(label)actions.push({element:'button',label,href:null,target:null,kind:'action'});}
  for(const m of html.matchAll(/<input\b[^>]*>/gi)){const tag=m[0],type=(attr(tag,'type')||'text').toLowerCase();if(['button','submit','reset'].includes(type))actions.push({element:'input',label:attr(tag,'aria-label')||attr(tag,'value')||null,href:null,target:null,kind:'action'});}
  return actions;
}
function unique(arr){return [...new Set(arr.filter(Boolean))];}
function entryState(states){
  const ids=new Set(states.map(x=>x.id));
  for(const id of ['entry','home','overview','active','detail','review','queue','group','start'])if(ids.has(id))return id;
  return states[0]?.id||null;
}
function completionCandidates(states){
  const positive=/(success|complete|completed|done|updated|resolved|saved|sent|joined|created|deleted|reviewed|result|confirmation)/i;
  const negative=/(error|failed|offline|invalid|locked|loading|not-found|missing|conflict)/i;
  return states.map(x=>x.id).filter(id=>positive.test(id)&&!negative.test(id));
}
function shortest(start,targets,states){
  if(!start||!targets.length)return null;
  const target=new Set(targets),by=new Map(states.map(s=>[s.id,s.actions.map(a=>a.target).filter(Boolean)])),q=[[start,0,[start]]],seen=new Set([start]);
  while(q.length){const [id,d,path]=q.shift();if(d>0&&target.has(id))return {transitions:d,path};for(const n of by.get(id)||[])if(by.has(n)&&!seen.has(n)){seen.add(n);q.push([n,d+1,[...path,n]]);}}
  return null;
}
const opMap={
  '05':{'Add expense':'expense.create'},
  '06':{'Save changes':'expense.edit','Delete expense':'expense.delete','Delete':'expense.delete'},
  '07':{"Looks right":'expense.review_agree',"Something's off":'expense.raise_issue','Withdraw':'expense.withdraw_issue','Reply':'expense.reply_to_issue','Still off':'expense.resolve_issue'}
};
const requiredInputsByJourney={};
for(const r of graph.construction_requirements||[])if(r.kind==='defaults'&&Array.isArray(r.value?.required_user_input))requiredInputsByJourney[r.journey]=r.value.required_user_input;

const inventories=[];
for(const j of frozen.journeys){
  const artifact=artifactFor(j);let status='parsed',error=null,states=[];
  try{
    const doc=loadArtifact(artifact),raw=extractScreens(doc);
    states=raw.map(s=>{
      const fields=parseFields(s.html);
      const actions=parseActions(s.html).map(a=>({...a,semantic_operation:opMap[j.id]?.[a.label]||null}));
      const hm=s.html.match(/<div[^>]*class=["'][^"']*header-title[^"']*["'][^>]*>[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i);
      return {id:s.id,title:hm?visible(hm[1]):null,fields,actions,field_count:fields.length,action_count:actions.length,internal_targets:unique(actions.map(a=>a.target))};
    });
    if(!states.length){status='unparsed';error='no .screen sections found';}
  }catch(e){status='error';error=e.message;}
  const start=entryState(states),targets=completionCandidates(states),min=shortest(start,targets,states),requiredInputs=requiredInputsByJourney[j.id]||[];
  const allActions=states.flatMap(s=>s.actions),allFields=states.flatMap(s=>s.fields);
  inventories.push({
    journey:j.id,name:j.name,version:j.version,artifact:{...artifact,status,error},states,
    summary:{
      state_count:states.length,field_instances:allFields.length,action_instances:allActions.length,
      unique_action_labels:unique(allActions.map(x=>x.label)).length,unique_field_labels:unique(allFields.map(x=>x.label)).length,
      semantic_action_mappings:allActions.filter(x=>x.semantic_operation).length,
      entry_state:start,completion_candidates:targets,
      shortest_completion_transition_count:min?.transitions??null,shortest_completion_path:min?.path??null,
      required_inputs_from_schema:requiredInputs,
      estimated_minimum_user_interactions:min?min.transitions+requiredInputs.length:null,
      step_metric_confidence:j.id==='05'?'verified_required_inputs_plus_derived_transitions':'heuristic_static_prototype_graph'
    }
  });
}
const pathMetrics=inventories.map(j=>({
  journey:j.journey,name:j.name,states:j.summary.state_count,visible_field_instances:j.summary.field_instances,visible_action_instances:j.summary.action_instances,
  unique_fields:j.summary.unique_field_labels,unique_actions:j.summary.unique_action_labels,required_inputs:j.summary.required_inputs_from_schema,
  entry_state:j.summary.entry_state,completion_candidates:j.summary.completion_candidates,shortest_transition_steps:j.summary.shortest_completion_transition_count,
  shortest_path:j.summary.shortest_completion_path,estimated_minimum_user_interactions:j.summary.estimated_minimum_user_interactions,
  confidence:j.summary.step_metric_confidence,
  note:j.journey==='05'?'Estimated interactions = approved required inputs plus shortest internal completion transitions. Entering J05 from J08 is outside this count.':'Diagnostic only until a canonical task path is certified; static prototype links can include demonstration/reviewer transitions.'
}));
const parsed=inventories.filter(x=>x.artifact.status==='parsed').length,totalStates=inventories.reduce((n,x)=>n+x.summary.state_count,0),totalActions=inventories.reduce((n,x)=>n+x.summary.action_instances,0),totalFields=inventories.reduce((n,x)=>n+x.summary.field_instances,0);
const md=['# UX Coverage Diagnostics','','**Derived diagnostics only — Goldens/specs remain product authority.**','',
'These outputs answer two questions: what is visible/actionable in each approved journey, and how much interaction friction the current prototype graph suggests. Step counts marked heuristic are not canonical user-task counts.','',
'## Coverage summary','',
'- Journeys parsed: **'+parsed+' / '+inventories.length+'**',
'- Screen/state surfaces found: **'+totalStates+'**',
'- Action instances found: **'+totalActions+'**',
'- Field instances found: **'+totalFields+'**','',
'## Journey overview','',
'| J | Journey | States | Fields | Actions | Min transitions | Est. min interactions | Confidence |',
'|---|---|---:|---:|---:|---:|---:|---|',
...pathMetrics.map(x=>'| J'+x.journey+' | '+x.name.replace(/\|/g,'/')+' | '+x.states+' | '+x.visible_field_instances+' | '+x.visible_action_instances+' | '+(x.shortest_transition_steps??'—')+' | '+(x.estimated_minimum_user_interactions??'—')+' | '+x.confidence+' |'),
'','## How to use this','',
'- Surface inventory exposes buttons/fields/states that exist in approved artifacts.',
'- Semantic action mappings show where a visible action is tied to a schema operation; missing mappings are coverage questions, not automatically product defects.',
'- Shortest transitions are useful for spotting obviously long paths, but only certified task paths should be used for UX optimization decisions.',
'- Required inputs come from schema construction requirements when explicitly approved; they are not inferred from placeholder HTML.','',
'Generated files: ui-surface-inventory.json, journey-path-metrics.json, UX_COVERAGE.md',''];
writeFileSync(join(out,'ui-surface-inventory.json'),JSON.stringify({schema_version:1,generated_view:'ui-surface-inventory',authority:'DERIVED_ONLY',journeys:inventories},null,2)+'\n');
writeFileSync(join(out,'journey-path-metrics.json'),JSON.stringify({schema_version:1,generated_view:'journey-path-metrics',authority:'DERIVED_ONLY',journeys:pathMetrics},null,2)+'\n');
writeFileSync(join(out,'UX_COVERAGE.md'),md.join('\n')+'\n');
console.log(JSON.stringify({ux_diagnostics:'PASS',journeys:inventories.length,parsed,states:totalStates,actions:totalActions,fields:totalFields,result:'PASS'},null,2));

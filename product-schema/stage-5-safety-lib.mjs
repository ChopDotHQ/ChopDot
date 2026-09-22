const deepEqual=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const clone=x=>structuredClone(x);
const uniq=a=>[...new Set((a||[]).filter(Boolean))];

function lookupNode(core,graph,contract){
  if(contract.node_kind==='law')return core.laws.find(x=>x.id===contract.schema_ref);
  if(contract.node_kind==='object')return core.objects.find(x=>x.id===contract.schema_ref);
  if(contract.node_kind==='operation')return core.operations.find(x=>x.id===contract.schema_ref);
  if(contract.node_kind==='composition_law')return (graph.shared_composition_laws||[]).find(x=>x.id===contract.schema_ref);
  return null;
}
function snapshotNode(node,contract){
  if(!node)return null;
  if(contract.node_kind==='law')return {applies_to:node.applies_to||[],constraint:node.constraint||null};
  if(contract.node_kind==='object')return {kind:node.kind,identity:node.identity||[],derived_from:node.derived_from||[]};
  if(contract.node_kind==='operation')return {owner:node.owner,changes:node.changes||[],invalidates:node.invalidates||[],invalidates_prepared:node.invalidates_prepared||[],guards:node.guards||[]};
  if(contract.node_kind==='composition_law')return {constraint:node.constraint};
  return null;
}
export function validateSafetyContracts(core,graph,reconstruction){
  const errors=[],contracts=reconstruction.safety_contracts||[],byRef=new Map(contracts.map(x=>[x.schema_ref,x]));
  const classified=[
    ...core.laws.filter(x=>x.safety_class).map(x=>({id:x.id,kind:'law'})),
    ...core.objects.filter(x=>x.safety_class).map(x=>({id:x.id,kind:'object'})),
    ...core.operations.filter(x=>x.safety_class).map(x=>({id:x.id,kind:'operation'})),
    ...(graph.shared_composition_laws||[]).filter(x=>x.safety_class).map(x=>({id:x.id,kind:'composition_law'}))
  ];
  for(const x of classified)if(!byRef.has(x.id))errors.push({id:'MISSING_SAFETY_CONTRACT',schema_ref:x.id});
  for(const c of contracts){
    const node=lookupNode(core,graph,c);
    if(!node)errors.push({id:'MISSING_SAFETY_NODE',schema_ref:c.schema_ref});
    else if(!deepEqual(snapshotNode(node,c),c.expected))errors.push({id:'SAFETY_CONTRACT_DRIFT',schema_ref:c.schema_ref});
  }
  return errors;
}
function leaves(x,path=[],out=[]){
  if(Array.isArray(x)){out.push({path,value:x,type:'array'});return out;}
  if(x&&typeof x==='object'){for(const [k,v] of Object.entries(x))leaves(v,[...path,k],out);return out;}
  out.push({path,value:x,type:typeof x});return out;
}
function setAt(obj,path,value){
  let cur=obj;
  for(let i=0;i<path.length-1;i++)cur=cur[path[i]];
  cur[path.at(-1)]=value;
}
function mutators(leaf){
  const v=leaf.value,out=[];
  if(typeof v==='boolean')out.push({operator:'INVERT_BOOLEAN',value:!v});
  else if(typeof v==='number')out.push({operator:'PERTURB_NUMBER',value:v+1});
  else if(typeof v==='string')out.push({operator:'REPLACE_VALUE',value:'__MUTATED__'});
  else if(v===null)out.push({operator:'REPLACE_NULL',value:'__MUTATED__'});
  if(Array.isArray(v)){
    if(v.length)out.push({operator:'WEAKEN_EXACT_SET',value:v.slice(1)});
    out.push({operator:'WIDEN_SET',value:[...v,'__MUTATED__']});
    if(v.length>1){
      const r=[...v].reverse();
      if(!deepEqual(r,v))out.push({operator:'REORDER_SET',value:r});
    }
  }
  return out;
}
function mutateSchema(core,graph,contract,path,value){
  const c=clone(core),g=clone(graph),node=lookupNode(c,g,contract);
  if(!node)return {core:c,graph:g};
  let root;
  if(contract.node_kind==='law')root={applies_to:node.applies_to,constraint:node.constraint};
  else if(contract.node_kind==='object')root={kind:node.kind,identity:node.identity,derived_from:node.derived_from||[]};
  else if(contract.node_kind==='operation')root={owner:node.owner,changes:node.changes||[],invalidates:node.invalidates||[],invalidates_prepared:node.invalidates_prepared||[],guards:node.guards||[]};
  else root={constraint:node.constraint};
  setAt(root,path,value);
  if(contract.node_kind==='law'){node.applies_to=root.applies_to;node.constraint=root.constraint;}
  else if(contract.node_kind==='object'){node.kind=root.kind;node.identity=root.identity;node.derived_from=root.derived_from;}
  else if(contract.node_kind==='operation'){node.owner=root.owner;node.changes=root.changes;node.invalidates=root.invalidates;node.invalidates_prepared=root.invalidates_prepared;node.guards=root.guards;}
  else node.constraint=root.constraint;
  return {core:c,graph:g};
}
export function deriveMechanicalMutationCoverage(core,graph,reconstruction){
  const baseline=validateSafetyContracts(core,graph,reconstruction),results=[],per={};
  for(const c of reconstruction.safety_contracts||[]){
    for(const leaf of leaves(c.expected)){
      for(const m of mutators(leaf)){
        const x=mutateSchema(core,graph,c,leaf.path,m.value);
        const errors=validateSafetyContracts(x.core,x.graph,reconstruction);
        const detected=errors.length>0;
        results.push({schema_ref:c.schema_ref,safety_class:c.safety_class,path:leaf.path.join('.'),operator:m.operator,detected,detected_by:uniq(errors.map(e=>e.id))});
        per[c.safety_class]??={applicable:0,detected:0};
        per[c.safety_class].applicable++;
        if(detected)per[c.safety_class].detected++;
      }
    }
  }
  const domains=Object.fromEntries(Object.entries(per).sort().map(([k,v])=>[k,{...v,score:v.applicable?Number((v.detected/v.applicable*100).toFixed(2)):null}]));
  const detected=results.filter(x=>x.detected).length;
  return {schema_version:1,generated_view:'mechanical-mutation-coverage',baseline_errors:baseline,domains,total:{applicable:results.length,detected,score:results.length?Number((detected/results.length*100).toFixed(2)):null},results};
}

import assert from 'node:assert/strict';
import { applyAndValidateControlBindings,validateOperationWitnesses } from './stage-5-validation-lib.mjs';

export function runWitnessRelationRegressions(core,graph,reconstruction,pieces,bindings,tasks,readEvidence){
  let cases=0;
  const controlErrors=r=>applyAndValidateControlBindings(core,r,structuredClone(pieces));
  const witnessErrors=r=>validateOperationWitnesses(core,graph,r,pieces,bindings,tasks,readEvidence);
  assert.deepEqual(controlErrors(structuredClone(reconstruction)),[]);cases++;
  assert.deepEqual(witnessErrors(structuredClone(reconstruction)),[]);cases++;
  for(const state of ['withdraw-review','add-sent']){
    const r=structuredClone(reconstruction);
    r.control_bindings.find(b=>b.id==='CTRL-J17-CONTRIBUTE').state=state;
    assert.ok(controlErrors(r).some(e=>e.id==='CONTROL-NOT-FOUND'&&e.binding==='CTRL-J17-CONTRIBUTE'));cases++;
  }
  const variants=[
    {contains:'function rawSource(s)',also_contains:'function allowed(s)'},
    {contains:"delivery:'queued'",also_contains:'function allowed(s)'},
    {contains:'function rawSource(s)',also_contains:'function deliver(s,id,result)'},
    {contains:'function deliver(s,id,result)',also_contains:"delivery:'queued'"}
  ];
  for(const evidence of variants){
    const r=structuredClone(reconstruction);
    Object.assign(r.operation_witnesses.find(w=>w.schema_ref==='request.deliver').evidence,evidence);
    assert.ok(witnessErrors(r).some(e=>e.id==='WITNESS-PATH-OPERATION-RELATION'&&e.schema_ref==='request.deliver'));cases++;
  }
  for(const witness_types of [[],['AUTHORITY_ACCOUNTED'],['CONTRACT_ONLY']]){
    const r=structuredClone(reconstruction),w=r.operation_witnesses.find(w=>w.schema_ref==='request.deliver');
    w.witness_types=witness_types;w.evidence.contains='function rawSource(s)';w.evidence.also_contains='function allowed(s)';
    assert.ok(witnessErrors(r).some(e=>e.id==='WITNESS-PATH-OPERATION-RELATION'));cases++;
  }
  for(const evidence of [{schema_source:'J13'},{task_ref:'TASK-J05-COMMON-EQUAL'},{domain_event:'RequestDeliveryRetryRequested'},
    {control_binding_id:'CTRL-J17-CONTRIBUTE'}]){
    const r=structuredClone(reconstruction),w=r.operation_witnesses.find(w=>w.schema_ref==='request.deliver');
    w.evidence=evidence;
    assert.ok(witnessErrors(r).some(e=>e.id==='WITNESS-PATH-OPERATION-RELATION'));cases++;
  }
  return {cases,result:'PASS'};
}

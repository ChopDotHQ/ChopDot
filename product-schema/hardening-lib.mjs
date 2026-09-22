export function validateHardening(core, graph, frozen, oracle) {
  const errors=[];
  const obj=id=>core.objects.find(x=>x.id===id),op=id=>core.operations.find(x=>x.id===id),law=id=>core.laws.find(x=>x.id===id),view=id=>core.derived_models.find(x=>x.id===id),jp=id=>graph.journey_projections.find(x=>x.id===id),unit=id=>graph.composition_units.find(x=>x.id===id),gate=id=>graph.gates.find(x=>x.id===id),req=id=>(graph.construction_requirements||[]).find(x=>x.id===id);
  const has=(a,x)=>Array.isArray(a)&&a.includes(x),fail=(id,msg)=>errors.push({id,msg}),integration=new Map((frozen.accepted_integration?.gate_a?.inherited_integration_constraints||[]).map(x=>[x.id,x])),recoveries=new Set((frozen.authority_recoveries||[]).filter(x=>x.status==='resolved').map(x=>x.id)),gaps=new Set((core.known_gaps||[]).map(x=>x.id)),decisions=new Set((core.approved_product_decisions||[]).filter(x=>['approved','approved_then_clarified'].includes(x.status)).map(x=>x.id)),goldenImpacts=new Set((core.golden_impacts||[]).map(x=>x.id));
  const matches=(actual,expected)=>Object.entries(expected||{}).every(([k,v])=>JSON.stringify(actual?.[k])===JSON.stringify(v));

  for(const a of oracle.assertions){const r=a.required||{};
    if(r.operation&&r.journey_owner){const j=jp(r.journey_owner);if(!op(r.operation)||!j||!has(j.owns_operations,r.operation))fail(a.id,'expected '+r.operation+' owned by J'+r.journey_owner);}
    if(r.object){const o=obj(r.object);if(!o)fail(a.id,'missing object '+r.object);else if(r.identity&&JSON.stringify(o.identity)!==JSON.stringify(r.identity))fail(a.id,'bad identity for '+r.object);}
    if(r.law_constraint){const l=law(r.law_constraint.law);if(!l||l.constraint?.kind!==r.law_constraint.kind||!matches(l.constraint,r.law_constraint.matches))fail(a.id,'bad/missing law constraint '+r.law_constraint.law);}
    if(r.known_gap&&!gaps.has(r.known_gap))fail(a.id,'missing known gap '+r.known_gap);
    if(r.product_decision&&!decisions.has(r.product_decision))fail(a.id,'missing approved product decision '+r.product_decision);
    for(const id of r.product_decisions||[])if(!decisions.has(id))fail(a.id,'missing approved product decision '+id);
    for(const id of r.golden_impacts||[])if(!goldenImpacts.has(id))fail(a.id,'missing golden impact '+id);
    for(const id of r.construction_requirements||[])if(!req(id))fail(a.id,'missing requirement '+id);
    for(const spec of r.construction_requirement_matches||[]){const q=req(spec.id);if(!q||!matches(q.value,spec.matches))fail(a.id,'requirement mismatch '+spec.id);}
    if(r.view){const v=view(r.view);for(const id of r.derived_from||[])if(!has(v?.derived_from,id))fail(a.id,r.view+' missing '+id);for(const id of r.must_not_derive_from||[])if(has(v?.derived_from,id))fail(a.id,r.view+' wrongly derives from '+id);}
    if(r.exact_derived_from){const v=view(r.view);if(!v||JSON.stringify(v.derived_from)!==JSON.stringify(r.exact_derived_from))fail(a.id,'wrong exact derived_from for '+r.view);}
    if(r.read_model){const o=obj(r.read_model);if(!o||o.kind!=='read_model')fail(a.id,r.read_model+' is not a read_model');}
    if(r.read_model_invalidation){for(const id of r.read_model_invalidation.operations||[])if(!has(op(id)?.invalidates,r.read_model_invalidation.read_model))fail(a.id,id+' missing invalidation '+r.read_model_invalidation.read_model);}
    if(r.operation_changes_exact){const o=op(r.operation_changes_exact.operation);if(!o||JSON.stringify(o.changes||[])!==JSON.stringify(r.operation_changes_exact.changes))fail(a.id,'wrong changes for '+r.operation_changes_exact.operation);}
    if(r.operation_invalidates_prepared){const o=op(r.operation_invalidates_prepared.operation);for(const id of r.operation_invalidates_prepared.objects||[])if(!has(o?.invalidates_prepared,id))fail(a.id,r.operation_invalidates_prepared.operation+' missing prepared invalidation '+id);}
    if(r.object_derived_from){const o=obj(r.object_derived_from.object);if(!o||JSON.stringify(o.derived_from||[])!==JSON.stringify(r.object_derived_from.derived_from))fail(a.id,'wrong derived_from for '+r.object_derived_from.object);}
    if(r.object_derived_from_superset){const o=obj(r.object_derived_from_superset.object);for(const id of r.object_derived_from_superset.derived_from||[])if(!has(o?.derived_from,id))fail(a.id,r.object_derived_from_superset.object+' missing derived input '+id);}
    if(r.construction_requirement&&!req(r.construction_requirement))fail(a.id,'missing requirement '+r.construction_requirement);
    if(r.integration_constraint){const c=integration.get(r.integration_constraint);if(!c||c.constraint?.kind!==r.kind)fail(a.id,'missing integration constraint '+r.integration_constraint);}
    if(r.authority_recovery&&!recoveries.has(r.authority_recovery))fail(a.id,'missing recovery '+r.authority_recovery);
    if(r.composition){const u=unit(r.composition);if(!u)fail(a.id,'missing composition');else{if(JSON.stringify(u.views_rendered)!==JSON.stringify(r.views_rendered))fail(a.id,'wrong rendered views');const d=(u.views_refreshed_downstream||[]).map(x=>x.id);for(const id of r.views_refreshed_downstream||[])if(!d.includes(id))fail(a.id,'missing downstream view '+id);}}
    if(r.gate_b_must_not_include_object){const u=unit(gate('B')?.composition);for(const cid of u?.contexts||[])if(has(graph.contexts.find(x=>x.id===cid)?.objects,r.gate_b_must_not_include_object))fail(a.id,'Gate B includes future-only object '+r.gate_b_must_not_include_object);}
    if(r.gate_b_must_not_include_law){const u=unit(gate('B')?.composition);if(has(u?.law_refs,r.gate_b_must_not_include_law))fail(a.id,'Gate B includes future-only law '+r.gate_b_must_not_include_law);}
  }

  const objectIds=new Set(core.objects.map(x=>x.id));
  for(const l of core.laws)for(const id of l.applies_to||[])if(!objectIds.has(id))fail('LAW-APPLIES-TO-MISSING-OBJECT',l.id+' applies_to missing '+id);
  const readModels=new Set(core.objects.filter(x=>x.kind==='read_model').map(x=>x.id));
  for(const o of core.operations){for(const id of o.changes||[])if(readModels.has(id))fail('READ-MODEL-DIRECT-WRITE',o.id+' directly changes '+id);for(const id of o.invalidates||[])if(!readModels.has(id))fail('INVALIDATE-NON-READ-MODEL',o.id+' invalidates non-read-model '+id);}
  for(const l of core.laws.filter(x=>x.constraint?.kind==='effect_guard_required'))for(const id of l.constraint.operations||[])if(!has(op(id)?.guards,l.constraint.guard))fail('GUARD-COVERAGE',id+' missing guard '+l.constraint.guard);
  for(const j of graph.journey_projections.filter(x=>x.kind==='read_projection'))if((j.owns_operations||[]).length)fail('READ-PROJECTION-OWNS-MUTATION','J'+j.id+' owns '+j.owns_operations.join(','));

  const review=law('LAW-EXP-REVIEW-01')?.constraint,effect=op('expense.edit')?.dependent_state_effects?.find(x=>x.object==='expense.review');
  if(review?.kind==='successful_edit_resets_current_reviews'&&(!effect||effect.law_ref!=='LAW-EXP-REVIEW-01'||!effect.effect.includes('needs_review_again')||!effect.effect.includes('accepted persistence')))fail('REVIEW-EFFECT-CONSISTENCY','expense.edit dependent review effect disagrees with LAW-EXP-REVIEW-01');

  const gc=law('LAW-EXP-GUARD-01')?.constraint,r05=req('REQ-J05-LOCK')?.value,r06=req('REQ-J06-LOCK')?.value;
  if(gc){
    if(r05?.policy!==gc.policy||r05?.ordinary_settlement_create!==gc.dependency_scoped?.create||r05?.unresolved_guard_input!=='fail_closed')fail('GUARD-REQ-J05-CONSISTENCY','REQ-J05-LOCK disagrees with LAW-EXP-GUARD-01');
    if(r06?.policy!==gc.policy||r06?.ordinary_settlement_edit!==gc.dependency_scoped?.edit||r06?.ordinary_settlement_delete!==gc.dependency_scoped?.delete||r06?.unknown_effect!=='fail_closed_until_authoritative_reconciliation')fail('GUARD-REQ-J06-CONSISTENCY','REQ-J06-LOCK disagrees with LAW-EXP-GUARD-01');
  }
  const guardObj=obj('expense.mutation_guard');for(const id of ['payment.intent','payment.settlement_scope','group.group','expense.expense'])if(!has(guardObj?.derived_from,id))fail('GUARD-DERIVATION', 'expense.mutation_guard missing '+id);
  if(has(ctxObjects(graph,'ctx.expense_guard'),'payment.closeout_context'))fail('GATEB-CLOSEOUT-LEAK','future closeout context leaked into Gate B expense guard');
  if((req('REQ-J08-STATES')?.value||[]).includes('settlement_in_progress'))fail('GOLDEN-IMPACT-J08-NOT-APPLIED','historical blanket lock still required in Gate B');
  for(const id of ['LAW-PAY-03','LAW-PAY-04'])if(!has(unit(gate('B')?.composition)?.law_refs,id))fail('GATEB-DEPENDENCY-LAW-MISSING','Gate B missing '+id);
  if(!has(op('expense.raise_issue')?.invalidates_prepared,'payment.intent'))fail('ISSUE-PREPARED-INTENT-INVALIDATION','expense.raise_issue must invalidate dependent prepared PaymentIntent');

  if((frozen.authority_blockers||[]).length)fail('AUTHORITY-BLOCKERS-PRESENT','unresolved authority blockers remain');
  if((graph.coordinated_operations||[]).some(x=>x.id==='expense.resolve_issue'))fail('NO-FAKE-COORDINATION','expense.resolve_issue coordinated');
  const b=gate('B'),bu=unit(b?.composition);if(!b||!bu)fail('SINGLE-COMPOSITION-OWNER','Gate B missing composition');for(const f of ['journeys','contexts','operations'])if(b&&Object.prototype.hasOwnProperty.call(b,f))fail('SINGLE-COMPOSITION-OWNER','Gate B duplicates '+f);
  return errors;
}
function ctxObjects(graph,id){return graph.contexts.find(x=>x.id===id)?.objects||[];}
function normalizeIds(ids){return [...new Set((ids||[]).map(x=>String(x).trim()).filter(Boolean))].sort();}
function lawOf(core,id){return core.laws.find(x=>x.id===id);}
export function allocateEqualByConstraint(c,total,participantIds){
  if(c?.kind!=='deterministic_equal_allocation')throw new Error('bad equal allocation constraint');
  if(JSON.stringify(c.participant_normalization)!==JSON.stringify(['stringify','trim','drop-empty','deduplicate','stable-sort']))throw new Error('unsupported participant normalization');
  if(c.base_rule!=='floor(total_minor_units / participant_count)')throw new Error('unsupported base rule');
  if(c.remainder_rule!=='first-stable-sorted-participant-ids-get-plus-one-minor-unit')throw new Error('unsupported remainder rule');
  if(c.exact_partition!==true||c.exact_conservation!==true)throw new Error('exact partition/conservation required');
  const ids=normalizeIds(participantIds);if(!ids.length)throw new Error('no participants');
  const base=Math.floor(total/ids.length),rem=total%ids.length;
  return ids.map((participant_id,i)=>({participant_id,minor_units:base+(i<rem?1:0)}));
}

export function evaluateExpenseContract(core,frozen,fixture){
  const failures=[],con=lawOf(core,'LAW-EXP-01')?.constraint?.kind==='sum_allocations_equals_expense_total',att=lawOf(core,'LAW-EXP-03')?.constraint?.kind==='allocation_participant_membership';
  if(!con)failures.push('LAW-EXP-01');
  const ids=fixture.allocations.map(x=>x.participant_id);
  if(new Set(ids).size!==ids.length)failures.push('LAW-EXP-03');
  if(fixture.allocations.reduce((n,x)=>n+x.minor_units,0)!==fixture.total_minor_units)failures.push('LAW-EXP-01');
  if(!att)failures.push('LAW-EXP-03');
  if(JSON.stringify(normalizeIds(fixture.selected_participants))!==JSON.stringify(normalizeIds(ids)))failures.push('LAW-EXP-03');
  for(const a of fixture.allocations)if(!fixture.group_participants.includes(a.participant_id))failures.push('LAW-EXP-03');
  if(fixture.split_method==='equal'){
    const c=frozen.accepted_integration.gate_a.inherited_integration_constraints.find(x=>x.id==='GATEA-MONEY-EQUAL-01')?.constraint;
    let expected;try{expected=allocateEqualByConstraint(c,fixture.total_minor_units,fixture.selected_participants);}catch{failures.push('GATEA-MONEY-EQUAL-01');expected=[];}
    const actual=[...fixture.allocations].sort((a,b)=>a.participant_id.localeCompare(b.participant_id));
    if(JSON.stringify(actual)!==JSON.stringify(expected))failures.push('GATEA-MONEY-EQUAL-01');
  }
  if(fixture.split_method==='exact'&&fixture.declared_exact_allocations){
    const expected=[...fixture.declared_exact_allocations].sort((a,b)=>a.participant_id.localeCompare(b.participant_id)),actual=[...fixture.allocations].sort((a,b)=>a.participant_id.localeCompare(b.participant_id));
    if(JSON.stringify(actual)!==JSON.stringify(expected))failures.push('LAW-EXP-EXACT-MAPPING');
  }
  return [...new Set(failures)];
}

export function evaluateExpenseMutationGuard(core,fixture){
  const c=lawOf(core,'LAW-EXP-GUARD-01')?.constraint;
  if(c?.policy!=='dependency_scoped_economic_guard')throw new Error('unsupported expense guard policy');
  const op=fixture.operation;
  if(!c.operations.includes(op))return {blocked:false,reason:'operation_not_guarded'};
  if(!Object.prototype.hasOwnProperty.call(fixture,'active_settlements'))return {blocked:true,reason:'settlement_state_unresolved_fail_closed'};
  if(!Array.isArray(fixture.active_settlements))return {blocked:true,reason:'settlement_state_unresolved_fail_closed'};

  const futureCloseout=lawOf(core,'LAW-EXP-CLOSEOUT-01')?.constraint;
  for(const x of fixture.closeout_contexts||[]){
    if(futureCloseout?.status==='semantic_only_no_approved_surface'&&x?.active===true&&x.group_id===fixture.group_id)return {blocked:true,reason:'explicit_group_closeout',closeout_id:x.closeout_id||null};
  }

  const unresolved=fixture.active_settlements.filter(s=>{
    if(s?.unknown_effect===true)return true;
    if(s?.open_remainder===true)return true;
    if(s?.reconciled_no_effect===true)return false;
    if(s?.authoritative_terminal===true)return false;
    return true;
  });

  const samePair=(a,b,x,y)=>a&&b&&x&&y&&((a===x&&b===y)||(a===y&&b===x));
  const stateTouches=(state,s)=>{
    if(!state)return false;
    if(state.expense_id&&(s.source_item_ids||[]).includes(state.expense_id))return true;
    for(const e of state.pair_currency_effects||[]){
      if(e?.minor_units===0)continue;
      if(e?.currency===s.currency&&samePair(e.party_a,e.party_b,s.payer_participant_id,s.recipient_participant_id))return true;
    }
    const byPayment=state.eligible_balance_after_by_payment_id||{};
    if(Object.prototype.hasOwnProperty.call(byPayment,s.payment_id)&&Number.isFinite(s.prepared_amount_minor_units)&&byPayment[s.payment_id]<s.prepared_amount_minor_units)return true;
    return false;
  };

  for(const s of unresolved){
    const current=fixture.current||null,proposed=fixture.proposed||null;
    const hit=op==='expense.create'?stateTouches(proposed,s):op==='expense.edit'?(stateTouches(current,s)||stateTouches(proposed,s)):stateTouches(current,s);
    if(hit)return {blocked:true,reason:'mutation_changes_active_settlement_dependency',payment_id:s.payment_id};
  }
  return {blocked:false,reason:'economically_independent_of_active_settlements'};
}

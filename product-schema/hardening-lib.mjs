export function validateHardening(core, graph, frozen, oracle) {
  const errors=[];
  const obj=id=>core.objects.find(x=>x.id===id);
  const op=id=>core.operations.find(x=>x.id===id);
  const law=id=>core.laws.find(x=>x.id===id);
  const view=id=>core.derived_models.find(x=>x.id===id);
  const jp=id=>graph.journey_projections.find(x=>x.id===id);
  const unit=id=>graph.composition_units.find(x=>x.id===id);
  const gate=id=>graph.gates.find(x=>x.id===id);
  const has=(arr,x)=>Array.isArray(arr)&&arr.includes(x);
  const fail=(id,msg)=>errors.push({id,msg});

  for (const a of oracle.assertions) {
    const r=a.required;
    if (r.operation && r.journey_owner) {
      const j=jp(r.journey_owner);
      if(!op(r.operation)||!j||!has(j.owns_operations,r.operation)) fail(a.id,`expected ${r.operation} owned by J${r.journey_owner}`);
    }
    if (r.object) {
      const o=obj(r.object);
      if(!o) fail(a.id,`missing object ${r.object}`);
      else if(r.identity && JSON.stringify(o.identity)!==JSON.stringify(r.identity)) fail(a.id,`bad identity for ${r.object}`);
      if(r.law&&!law(r.law)) fail(a.id,`missing law ${r.law}`);
    }
    if (r.guard) {
      if(!obj(r.guard)||!law(r.law)) fail(a.id,'missing mutation guard/law');
      for(const id of r.operations||[]) if(!has(op(id)?.guards,r.guard)) fail(a.id,`${id} missing guard ${r.guard}`);
    }
    if (r.view) {
      const v=view(r.view);
      for(const id of r.derived_from||[]) if(!has(v?.derived_from,id)) fail(a.id,`${r.view} missing dependency ${id}`);
    }
    if (r.operations && r.emits) for(const id of r.operations) if(!has(op(id)?.emits,r.emits)) fail(a.id,`${id} does not emit ${r.emits}`);
    if (r.read_model) {
      for(const id of r.must_not_be_changed_by||[]) if(has(op(id)?.changes,r.read_model)) fail(a.id,`${id} wrongly changes derived ${r.read_model}`);
      for(const id of r.must_be_invalidated_by||[]) if(!has(op(id)?.invalidates,r.read_model)) fail(a.id,`${id} does not invalidate ${r.read_model}`);
    }
    if (r.journeys && r.authority_kinds) {
      for(const jid of r.journeys){
        const j=frozen.journeys.find(x=>x.id===jid); const kinds=new Set((j?.authority_files||[]).map(x=>x.kind));
        if(!kinds.has('decision_history')) fail(a.id,`J${jid} decision history not pinned`);
        if(jid!=='08'&&!kinds.has('state_inventory')) fail(a.id,`J${jid} state inventory not pinned`);
      }
    }
    if (r.composition) {
      const u=unit(r.composition);
      if(!u) fail(a.id,'missing composition');
      else {
        if(JSON.stringify(u.views_rendered)!==JSON.stringify(r.views_rendered)) fail(a.id,'wrong rendered views');
        const down=(u.views_refreshed_downstream||[]).map(x=>x.id);
        for(const id of r.views_refreshed_downstream||[]) if(!down.includes(id)) fail(a.id,`missing downstream refresh view ${id}`);
      }
    }
    if (r.provenance_caveat) {
      const aGate=gate('A');
      if(!aGate?.provenance_caveat) fail(a.id,'Gate A provenance caveat dropped');
      if(!(aGate?.context_coverage||[]).every(x=>x.gate_a_coverage)) fail(a.id,'Gate A reusable contexts are unqualified');
    }
    if (r.authority_blocker && !(frozen.authority_blockers||[]).some(x=>x.id===r.authority_blocker)) fail(a.id,`missing authority blocker ${r.authority_blocker}`);
  }

  if((graph.coordinated_operations||[]).some(x=>x.id==='expense.resolve_issue')) fail('NO-FAKE-COORDINATION','expense.resolve_issue must not be coordinated');
  const expOps=core.operations.filter(x=>x.id.startsWith('expense.'));
  for(const o of expOps){
    for(const id of o.invalidates||[]){
      if(obj(id)?.kind!=='read_model') fail('DERIVED-ONLY',`${o.id} invalidates non-read-model ${id}`);
    }
  }
  const b=gate('B'), bu=unit(b?.composition);
  if(!b||!bu) fail('SINGLE-COMPOSITION-OWNER','Gate B missing composition');
  for(const f of ['journeys','contexts','operations']) if(b && Object.prototype.hasOwnProperty.call(b,f)) fail('SINGLE-COMPOSITION-OWNER',`Gate B duplicates ${f}`);
  return errors;
}

export function evaluateExpenseContract(core, fixture) {
  const failures=[];
  const conservation=core.laws.find(x=>x.id==='LAW-EXP-01')?.constraint?.kind==='sum_allocations_equals_expense_total';
  const attribution=core.laws.find(x=>x.id==='LAW-EXP-03')?.constraint?.kind==='allocation_participant_membership';
  if(!conservation) failures.push('LAW-EXP-01');
  else {
    const sum=fixture.allocations.reduce((n,x)=>n+x.minor_units,0);
    if(sum!==fixture.total_minor_units) failures.push('LAW-EXP-01');
  }
  if(!attribution) failures.push('LAW-EXP-03');
  else for(const a of fixture.allocations) if(!fixture.selected_participants.includes(a.participant_id)||!fixture.group_participants.includes(a.participant_id)) failures.push('LAW-EXP-03');
  if(fixture.locked && ['expense.create','expense.edit','expense.delete'].includes(fixture.operation)){
    if(core.laws.find(x=>x.id==='LAW-EXP-GUARD-01')?.constraint?.kind==='effect_guard_required') failures.push('LAW-EXP-GUARD-01');
  }
  return [...new Set(failures)];
}

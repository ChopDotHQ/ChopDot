export function validateHardening(core, graph, frozen, oracle) {
  const errors = [];
  const obj = id => core.objects.find(x => x.id === id);
  const op = id => core.operations.find(x => x.id === id);
  const law = id => core.laws.find(x => x.id === id);
  const view = id => core.derived_models.find(x => x.id === id);
  const jp = id => graph.journey_projections.find(x => x.id === id);
  const unit = id => graph.composition_units.find(x => x.id === id);
  const gate = id => graph.gates.find(x => x.id === id);
  const req = id => (graph.construction_requirements || []).find(x => x.id === id);
  const has = (arr, x) => Array.isArray(arr) && arr.includes(x);
  const fail = (id, msg) => errors.push({ id, msg });
  const resolved = new Set((core.resolved_authority_interpretations || []).map(x => x.id));
  const recoveries = new Set((frozen.authority_recoveries || []).filter(x => x.status === 'resolved').map(x => x.id));
  const integration = new Map((frozen.accepted_integration?.gate_a?.inherited_integration_constraints || []).map(x => [x.id, x]));
  const matches = (actual, expected) => Object.entries(expected || {}).every(([k, v]) => JSON.stringify(actual?.[k]) === JSON.stringify(v));

  for (const a of oracle.assertions) {
    const r = a.required;
    if (r.operation && r.journey_owner) {
      const j = jp(r.journey_owner);
      if (!op(r.operation) || !j || !has(j.owns_operations, r.operation)) fail(a.id, 'expected ' + r.operation + ' owned by J' + r.journey_owner);
    }
    if (r.object) {
      const o = obj(r.object);
      if (!o) fail(a.id, 'missing object ' + r.object);
      else if (r.identity && JSON.stringify(o.identity) !== JSON.stringify(r.identity)) fail(a.id, 'bad identity for ' + r.object);
    }
    if (r.law_constraint) {
      const l = law(r.law_constraint.law);
      if (!l || l.constraint?.kind !== r.law_constraint.kind || !matches(l.constraint, r.law_constraint.matches)) fail(a.id, 'bad/missing law constraint ' + r.law_constraint.law);
    }
    if (r.view) {
      const v = view(r.view);
      for (const id of r.derived_from || []) if (!has(v?.derived_from, id)) fail(a.id, r.view + ' missing ' + id);
      for (const id of r.must_not_derive_from || []) if (has(v?.derived_from, id)) fail(a.id, r.view + ' wrongly derives from ' + id);
    }
    if (r.read_model) {
      for (const id of r.must_not_be_changed_by || []) if (has(op(id)?.changes, r.read_model)) fail(a.id, id + ' wrongly changes ' + r.read_model);
      for (const id of r.must_be_invalidated_by || []) if (!has(op(id)?.invalidates, r.read_model)) fail(a.id, id + ' missing invalidation ' + r.read_model);
    }
    if (r.construction_requirement && !req(r.construction_requirement)) fail(a.id, 'missing requirement ' + r.construction_requirement);
    if (r.integration_constraint) {
      const c = integration.get(r.integration_constraint);
      if (!c || c.constraint?.kind !== r.kind) fail(a.id, 'missing integration constraint ' + r.integration_constraint);
    }
    if (r.authority_recovery && !recoveries.has(r.authority_recovery)) fail(a.id, 'missing recovery ' + r.authority_recovery);
    if (r.resolved_interpretation && !resolved.has(r.resolved_interpretation)) fail(a.id, 'missing resolved interpretation ' + r.resolved_interpretation);
    if (r.composition) {
      const u = unit(r.composition);
      if (!u) fail(a.id, 'missing composition');
      else {
        if (JSON.stringify(u.views_rendered) !== JSON.stringify(r.views_rendered)) fail(a.id, 'wrong rendered views');
        const downstream = (u.views_refreshed_downstream || []).map(x => x.id);
        for (const id of r.views_refreshed_downstream || []) if (!downstream.includes(id)) fail(a.id, 'missing downstream view ' + id);
      }
    }
  }

  if ((frozen.authority_blockers || []).length) fail('NO-AUTHORITY-BLOCKERS', 'unresolved authority blockers remain');
  if ((core.known_gaps || []).some(x => x.classification === 'requires_product_decision' && (x.journeys || []).some(j => ['05','06','07','08'].includes(j)))) fail('NO-GATEB-PRODUCT-DECISIONS', 'Gate B product decision gap remains');
  if ((graph.coordinated_operations || []).some(x => x.id === 'expense.resolve_issue')) fail('NO-FAKE-COORDINATION', 'expense.resolve_issue coordinated');
  for (const o of core.operations.filter(x => x.id.startsWith('expense.'))) {
    for (const id of o.invalidates || []) if (obj(id)?.kind !== 'read_model') fail('DERIVED-ONLY', o.id + ' invalidates non-read-model ' + id);
  }
  const b = gate('B'), bu = unit(b?.composition);
  if (!b || !bu) fail('SINGLE-COMPOSITION-OWNER', 'Gate B missing composition');
  for (const f of ['journeys','contexts','operations']) if (b && Object.prototype.hasOwnProperty.call(b, f)) fail('SINGLE-COMPOSITION-OWNER', 'Gate B duplicates ' + f);
  return errors;
}

export function evaluateExpenseContract(core, fixture) {
  const failures = [];
  const conservation = core.laws.find(x => x.id === 'LAW-EXP-01')?.constraint?.kind === 'sum_allocations_equals_expense_total';
  const attribution = core.laws.find(x => x.id === 'LAW-EXP-03')?.constraint?.kind === 'allocation_participant_membership';
  if (!conservation) failures.push('LAW-EXP-01');
  else {
    const ids = fixture.allocations.map(x => x.participant_id);
    if (new Set(ids).size !== ids.length) failures.push('LAW-EXP-03');
    const sum = fixture.allocations.reduce((n, x) => n + x.minor_units, 0);
    if (sum !== fixture.total_minor_units) failures.push('LAW-EXP-01');
  }
  if (!attribution) failures.push('LAW-EXP-03');
  else {
    const expected = [...new Set(fixture.selected_participants)].sort();
    const actual = fixture.allocations.map(x => x.participant_id).sort();
    if (JSON.stringify(expected) !== JSON.stringify(actual)) failures.push('LAW-EXP-03');
    for (const a of fixture.allocations) if (!fixture.group_participants.includes(a.participant_id)) failures.push('LAW-EXP-03');
  }
  if (fixture.group_settlement_state === 'in_progress' && ['expense.create','expense.edit','expense.delete'].includes(fixture.operation)) {
    const c = core.laws.find(x => x.id === 'LAW-EXP-GUARD-01')?.constraint;
    if (c?.scope === 'group' && c?.lock_when?.group_settlement_state === 'in_progress') failures.push('LAW-EXP-GUARD-01');
  }
  return [...new Set(failures)];
}

export function allocateEqualByConstraint(c, total, participantIds) {
  if (c?.kind !== 'deterministic_equal_allocation') throw new Error('bad equal allocation constraint');
  const ids = [...new Set(participantIds.map(x => String(x).trim()).filter(Boolean))].sort();
  if (!ids.length) throw new Error('no participants');
  const base = Math.floor(total / ids.length), remainder = total % ids.length;
  return ids.map((participant_id, i) => ({ participant_id, minor_units: base + (i < remainder ? 1 : 0) }));
}

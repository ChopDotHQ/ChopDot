import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateHardening,evaluateExpenseContract,allocateEqualByConstraint,evaluateExpenseMutationGuard } from './hardening-lib.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),read=n=>JSON.parse(readFileSync(join(root,'product-schema',n),'utf8')),core=read('semantic-core.json'),graph=read('composition-graph.json'),frozen=read('frozen-baseline.json'),oracle=read('gate-b-authority-oracle.json'),blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
for(const a of oracle.assertions)for(const e of a.evidence||[]){let bytes,text;if(e.commit){bytes=Buffer.from(execFileSync('git',['show',e.commit+':'+e.path]));text=bytes.toString('utf8');}else{bytes=readFileSync(join(root,e.path));if(e.archive==='zip_html'){const members=execFileSync('unzip',['-Z1',join(root,e.path)],{encoding:'utf8'}).trim().split(/\r?\n/).filter(x=>x.toLowerCase().endsWith('.html'));assert.ok(members.length,a.id+' zip has no html');text=members.map(member=>execFileSync('unzip',['-p',join(root,e.path),member],{encoding:'utf8'})).join('\n');}else if(e.archive==='xz_html'){text=execFileSync('xz',['-dc',join(root,e.path)],{encoding:'utf8'});}else text=bytes.toString('utf8');}assert.equal(blob(bytes),e.git_blob,a.id+' evidence blob mismatch '+e.path);for(const phrase of e.contains||[])assert.ok(text.includes(phrase),a.id+' evidence phrase missing: '+phrase);}
assert.deepEqual(validateHardening(core,graph,frozen,oracle),[]);

const base={operation:'expense.create',split_method:'equal',total_minor_units:1000,group_participants:['A','B','C'],selected_participants:['A','B','C'],allocations:[{participant_id:'A',minor_units:334},{participant_id:'B',minor_units:333},{participant_id:'C',minor_units:333}]};
assert.deepEqual(evaluateExpenseContract(core,frozen,base),[]);
assert.deepEqual(evaluateExpenseContract(core,frozen,{...base,allocations:[{participant_id:'A',minor_units:1},{participant_id:'B',minor_units:1},{participant_id:'C',minor_units:998}]}),['GATEA-MONEY-EQUAL-01']);
const eq=frozen.accepted_integration.gate_a.inherited_integration_constraints.find(x=>x.id==='GATEA-MONEY-EQUAL-01').constraint;assert.deepEqual(allocateEqualByConstraint(eq,1001,['C','A','B']),[{participant_id:'A',minor_units:334},{participant_id:'B',minor_units:334},{participant_id:'C',minor_units:333}]);

const now='2026-09-22T12:00:00Z';
const scope=(id='P1',extra={})=>({payment_id:id,payer_participant_id:'A',recipient_participant_id:'B',currency:'CHF',source_item_ids:['E1'],prepared_amount_minor_units:10000,resolution_status:'active',...extra});
const snap=(bal=10000,eligible=true,ids=['E1'])=>({eligible_balance_minor_units:bal,dispute_eligible:eligible,source_item_ids:ids});
const fixture=(operation,over={})=>({operation,group_id:'G1',evaluated_state_as_of:now,active_settlements:[scope()],dependency_snapshot_before_by_payment_id:{P1:snap()},dependency_snapshot_after_by_payment_id:{P1:snap()},...over});
const blocked=x=>assert.equal(evaluateExpenseMutationGuard(core,x).blocked,true);

// Positive baseline: exact independent mutation is allowed.
assert.equal(evaluateExpenseMutationGuard(core,fixture('expense.create',{proposed:{expense_id:'E2',pair_currency_effects:[{party_a:'A',party_b:'C',currency:'EUR',minor_units:10}]}})).blocked,false);

// Direct source / pair / currency dependency.
blocked(fixture('expense.edit',{current:{expense_id:'E1',pair_currency_effects:[]},proposed:{expense_id:'E1',pair_currency_effects:[]}}));
blocked(fixture('expense.create',{proposed:{expense_id:'E2',pair_currency_effects:[{party_a:'A',party_b:'B',currency:'CHF',minor_units:10}]}}));

// S1d: eligible balance grows — still changes settlement meaning.
blocked(fixture('expense.create',{proposed:{expense_id:'E2',pair_currency_effects:[]},dependency_snapshot_after_by_payment_id:{P1:snap(12500)}}));
// S8c / D24: dispute eligibility changes either direction.
blocked(fixture('expense.edit',{current:{expense_id:'E2',pair_currency_effects:[]},proposed:{expense_id:'E2',pair_currency_effects:[]},dependency_snapshot_after_by_payment_id:{P1:snap(10000,false)}}));
blocked(fixture('expense.edit',{current:{expense_id:'E2',pair_currency_effects:[]},proposed:{expense_id:'E2',pair_currency_effects:[]},dependency_snapshot_before_by_payment_id:{P1:snap(10000,false)},dependency_snapshot_after_by_payment_id:{P1:snap(10000,true)}}));

// S4d/e: missing current/proposed economic state.
blocked(fixture('expense.edit',{}));blocked(fixture('expense.delete',{}));
// S4f/g: incomplete/malformed settlement.
blocked(fixture('expense.create',{active_settlements:[{payment_id:'P1'}],proposed:{expense_id:'E2',pair_currency_effects:[]}}));
blocked(fixture('expense.create',{active_settlements:[null],proposed:{expense_id:'E2',pair_currency_effects:[]}}));
// D12: second unresolved intent missing from dependency snapshots.
blocked(fixture('expense.create',{active_settlements:[scope('P1'),scope('P2',{source_item_ids:['E9']})],proposed:{expense_id:'E2',pair_currency_effects:[]}}));
// D13 + malformed status: closed enumeration.
for(const status of ['reversed','cancelled','failed','expired','pending_reversal',true,1])blocked(fixture('expense.create',{active_settlements:[scope('P1',{resolution_status:status})],proposed:{expense_id:'E2',pair_currency_effects:[]}}));
// D14 stale reconciliation.
blocked(fixture('expense.create',{active_settlements:[scope('P1',{resolution_status:'authoritative_terminal',reconciliation_evidence:{authority_verified:true,as_of:'2026-09-22T11:59:59Z'}})],proposed:{expense_id:'E2',pair_currency_effects:[]}}));
// D15 non-authoritative reconciliation.
blocked(fixture('expense.create',{active_settlements:[scope('P1',{resolution_status:'authoritative_terminal',reconciliation_evidence:{authority_verified:false,as_of:now}})],proposed:{expense_id:'E2',pair_currency_effects:[]}}));
// D21/D22 misrouted state.
blocked(fixture('expense.delete',{proposed:{expense_id:'E2',pair_currency_effects:[]}}));
blocked(fixture('expense.create',{current:{expense_id:'E2',pair_currency_effects:[]}}));
// D27 missing prepared amount.
blocked(fixture('expense.create',{active_settlements:[{...scope(),prepared_amount_minor_units:undefined}],proposed:{expense_id:'E2',pair_currency_effects:[]}}));
// Missing snapshot key / malformed snapshot.
blocked(fixture('expense.create',{proposed:{expense_id:'E2',pair_currency_effects:[]},dependency_snapshot_after_by_payment_id:{}}));
blocked(fixture('expense.create',{proposed:{expense_id:'E2',pair_currency_effects:[]},dependency_snapshot_after_by_payment_id:{P1:{eligible_balance_minor_units:'10000',dispute_eligible:true,source_item_ids:['E1']}}}));
// Fresh authoritative terminal releases.
assert.equal(evaluateExpenseMutationGuard(core,fixture('expense.create',{active_settlements:[scope('P1',{resolution_status:'authoritative_terminal',reconciliation_evidence:{authority_verified:true,as_of:now}})],proposed:{expense_id:'E2',pair_currency_effects:[]},dependency_snapshot_before_by_payment_id:{},dependency_snapshot_after_by_payment_id:{}})).blocked,false);

console.log(JSON.stringify({hardening:'PASS',oracle_assertions:oracle.assertions.length,expense_contract_cases:2,guard_policy_cases:27,approved_product_decisions:(core.approved_product_decisions||[]).map(x=>x.id),golden_impacts:(core.golden_impacts||[]).map(x=>x.id),result:'PASS'},null,2));

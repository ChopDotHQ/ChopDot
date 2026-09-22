import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateHardening,evaluateExpenseContract,allocateEqualByConstraint,evaluateExpenseMutationGuard } from './hardening-lib.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),read=n=>JSON.parse(readFileSync(join(root,'product-schema',n),'utf8')),core=read('semantic-core.json'),graph=read('composition-graph.json'),frozen=read('frozen-baseline.json'),oracle=read('gate-b-authority-oracle.json'),decision=read('product-decisions-v1.json'),blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
for(const a of oracle.assertions)for(const e of a.evidence||[]){let bytes,text;if(e.commit){bytes=Buffer.from(execFileSync('git',['show',e.commit+':'+e.path]));text=bytes.toString('utf8');}else{bytes=readFileSync(join(root,e.path));if(e.archive==='zip_html'){const members=execFileSync('unzip',['-Z1',join(root,e.path)],{encoding:'utf8'}).trim().split(/\r?\n/).filter(x=>x.toLowerCase().endsWith('.html'));assert.ok(members.length,a.id+' zip has no html');text=members.map(member=>execFileSync('unzip',['-p',join(root,e.path),member],{encoding:'utf8'})).join('\n');}else if(e.archive==='xz_html'){text=execFileSync('xz',['-dc',join(root,e.path)],{encoding:'utf8'});}else text=bytes.toString('utf8');}assert.equal(blob(bytes),e.git_blob,a.id+' evidence blob mismatch '+e.path);for(const phrase of e.contains||[])assert.ok(text.includes(phrase),a.id+' evidence phrase missing: '+phrase);}
assert.equal(decision.decision_id,'DEC-EXPENSE-SETTLEMENT-LOCK-01');
assert.equal(decision.status,'approved_human_product_decision');
assert.deepEqual(validateHardening(core,graph,frozen,oracle),[]);

const base={operation:'expense.create',split_method:'equal',total_minor_units:1000,group_participants:['A','B','C'],selected_participants:['A','B','C'],allocations:[{participant_id:'A',minor_units:334},{participant_id:'B',minor_units:333},{participant_id:'C',minor_units:333}]};
assert.deepEqual(evaluateExpenseContract(core,frozen,base),[]);
assert.deepEqual(evaluateExpenseContract(core,frozen,{...base,allocations:[{participant_id:'A',minor_units:1},{participant_id:'B',minor_units:1},{participant_id:'C',minor_units:998}]}),['GATEA-MONEY-EQUAL-01']);
const eq=frozen.accepted_integration.gate_a.inherited_integration_constraints.find(x=>x.id==='GATEA-MONEY-EQUAL-01').constraint;assert.deepEqual(allocateEqualByConstraint(eq,1001,['C','A','B']),[{participant_id:'A',minor_units:334},{participant_id:'B',minor_units:334},{participant_id:'C',minor_units:333}]);

const active=[{payment_id:'P1',active:true,terminal:false,source_item_ids:['E1']}];
assert.deepEqual(evaluateExpenseMutationGuard(core,{operation:'expense.edit',group_id:'G1',expense_id:'E1',active_settlements:active}),{blocked:true,reason:'expense_in_active_settlement_scope',payment_id:'P1'});
assert.deepEqual(evaluateExpenseMutationGuard(core,{operation:'expense.edit',group_id:'G1',expense_id:'E2',active_settlements:active}),{blocked:false,reason:'target_not_in_active_settlement_scope'});
assert.deepEqual(evaluateExpenseMutationGuard(core,{operation:'expense.create',group_id:'G1',active_settlements:active}),{blocked:false,reason:'unrelated_new_expense_not_in_frozen_scope'});
assert.deepEqual(evaluateExpenseMutationGuard(core,{operation:'expense.create',group_id:'G1',active_settlements:active,closeout_context:{active:true,group_id:'G1'}}),{blocked:true,reason:'explicit_group_closeout'});
assert.deepEqual(evaluateExpenseMutationGuard(core,{operation:'expense.delete',group_id:'G1',expense_id:'E1',active_settlements:[{payment_id:'P1',active:false,terminal:false,unknown_effect:true,source_item_ids:['E1']}]}),{blocked:true,reason:'expense_in_active_settlement_scope',payment_id:'P1'});
assert.deepEqual(evaluateExpenseMutationGuard(core,{operation:'expense.delete',group_id:'G1',expense_id:'E1',active_settlements:[{payment_id:'P1',active:false,terminal:true,source_item_ids:['E1']}]}),{blocked:false,reason:'target_not_in_active_settlement_scope'});

console.log(JSON.stringify({hardening:'PASS',oracle_assertions:oracle.assertions.length,expense_contract_cases:2,guard_policy_cases:6,approved_product_decisions:(core.approved_product_decisions||[]).map(x=>x.id),gate_b_decisions:(core.known_gaps||[]).filter(x=>x.classification==='requires_product_decision'&&(x.journeys||[]).some(j=>['05','06','07','08'].includes(j))).map(x=>x.id),result:'PASS'},null,2));

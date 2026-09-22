import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateHardening,evaluateExpenseContract,allocateEqualByConstraint,evaluateExpenseMutationGuard } from './hardening-lib.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),read=n=>JSON.parse(readFileSync(join(root,'product-schema',n),'utf8')),core=read('semantic-core.json'),graph=read('composition-graph.json'),frozen=read('frozen-baseline.json'),oracle=read('gate-b-authority-oracle.json'),decision1=read('product-decisions-v1.json'),decision2=read('product-decisions-v2.json'),blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
for(const a of oracle.assertions)for(const e of a.evidence||[]){let bytes,text;if(e.commit){bytes=Buffer.from(execFileSync('git',['show',e.commit+':'+e.path]));text=bytes.toString('utf8');}else{bytes=readFileSync(join(root,e.path));if(e.archive==='zip_html'){const members=execFileSync('unzip',['-Z1',join(root,e.path)],{encoding:'utf8'}).trim().split(/\r?\n/).filter(x=>x.toLowerCase().endsWith('.html'));assert.ok(members.length,a.id+' zip has no html');text=members.map(member=>execFileSync('unzip',['-p',join(root,e.path),member],{encoding:'utf8'})).join('\n');}else if(e.archive==='xz_html'){text=execFileSync('xz',['-dc',join(root,e.path)],{encoding:'utf8'});}else text=bytes.toString('utf8');}assert.equal(blob(bytes),e.git_blob,a.id+' evidence blob mismatch '+e.path);for(const phrase of e.contains||[])assert.ok(text.includes(phrase),a.id+' evidence phrase missing: '+phrase);}
assert.equal(decision1.decision_id,'DEC-EXPENSE-SETTLEMENT-LOCK-01');assert.equal(decision1.status,'approved_human_product_decision');
assert.equal(decision2.decision_id,'DEC-EXPENSE-SETTLEMENT-LOCK-02');assert.equal(decision2.status,'approved_human_product_decision');
assert.equal(blob(readFileSync(join(root,'product-schema/product-decisions-v1.json'))),'355fff22b8c8996379ebabb8d943f289aa7ea5ad');
assert.equal(blob(readFileSync(join(root,'product-schema/product-decisions-v2.json'))),'8c73229d1350cb21f71f9664e50cfb7cf739ac5a');
assert.deepEqual(validateHardening(core,graph,frozen,oracle),[]);

const base={operation:'expense.create',split_method:'equal',total_minor_units:1000,group_participants:['A','B','C'],selected_participants:['A','B','C'],allocations:[{participant_id:'A',minor_units:334},{participant_id:'B',minor_units:333},{participant_id:'C',minor_units:333}]};
assert.deepEqual(evaluateExpenseContract(core,frozen,base),[]);
assert.deepEqual(evaluateExpenseContract(core,frozen,{...base,allocations:[{participant_id:'A',minor_units:1},{participant_id:'B',minor_units:1},{participant_id:'C',minor_units:998}]}),['GATEA-MONEY-EQUAL-01']);
const eq=frozen.accepted_integration.gate_a.inherited_integration_constraints.find(x=>x.id==='GATEA-MONEY-EQUAL-01').constraint;assert.deepEqual(allocateEqualByConstraint(eq,1001,['C','A','B']),[{participant_id:'A',minor_units:334},{participant_id:'B',minor_units:334},{participant_id:'C',minor_units:333}]);

const scope={payment_id:'P1',source_item_ids:['E1'],payer_participant_id:'A',recipient_participant_id:'B',currency:'CHF',prepared_amount_minor_units:10000};
assert.deepEqual(evaluateExpenseMutationGuard(core,{operation:'expense.edit',group_id:'G1',active_settlements:[scope],current:{expense_id:'E1'},proposed:{expense_id:'E1'}}),{blocked:true,reason:'mutation_changes_active_settlement_dependency',payment_id:'P1'});
assert.deepEqual(evaluateExpenseMutationGuard(core,{operation:'expense.edit',group_id:'G1',active_settlements:[scope],current:{expense_id:'E2',pair_currency_effects:[{party_a:'A',party_b:'C',currency:'CHF',minor_units:10}]},proposed:{expense_id:'E2',pair_currency_effects:[{party_a:'A',party_b:'C',currency:'CHF',minor_units:10}]}}),{blocked:false,reason:'economically_independent_of_active_settlements'});
assert.deepEqual(evaluateExpenseMutationGuard(core,{operation:'expense.create',group_id:'G1',active_settlements:[scope],proposed:{expense_id:'E3',pair_currency_effects:[{party_a:'A',party_b:'B',currency:'CHF',minor_units:-3000}]}}),{blocked:true,reason:'mutation_changes_active_settlement_dependency',payment_id:'P1'});
assert.deepEqual(evaluateExpenseMutationGuard(core,{operation:'expense.edit',group_id:'G1',active_settlements:[scope],current:{expense_id:'E2',pair_currency_effects:[{party_a:'A',party_b:'C',currency:'EUR',minor_units:10}]},proposed:{expense_id:'E2',pair_currency_effects:[{party_a:'A',party_b:'B',currency:'CHF',minor_units:10}]}}),{blocked:true,reason:'mutation_changes_active_settlement_dependency',payment_id:'P1'});
assert.deepEqual(evaluateExpenseMutationGuard(core,{operation:'expense.delete',group_id:'G1',active_settlements:[{...scope,unknown_effect:true,authoritative_terminal:true}],current:{expense_id:'E1'}}),{blocked:true,reason:'mutation_changes_active_settlement_dependency',payment_id:'P1'});
assert.deepEqual(evaluateExpenseMutationGuard(core,{operation:'expense.delete',group_id:'G1',active_settlements:[{...scope,authoritative_terminal:true}],current:{expense_id:'E1'}}),{blocked:false,reason:'economically_independent_of_active_settlements'});
assert.deepEqual(evaluateExpenseMutationGuard(core,{operation:'expense.delete',group_id:'G1',active_settlements:[{...scope,authoritative_terminal:true,open_remainder:true}],current:{expense_id:'E1'}}),{blocked:true,reason:'mutation_changes_active_settlement_dependency',payment_id:'P1'});
assert.deepEqual(evaluateExpenseMutationGuard(core,{operation:'expense.create',group_id:'G1',proposed:{expense_id:'E3'}}),{blocked:true,reason:'settlement_state_unresolved_fail_closed'});

console.log(JSON.stringify({hardening:'PASS',oracle_assertions:oracle.assertions.length,expense_contract_cases:2,guard_policy_cases:8,approved_product_decisions:(core.approved_product_decisions||[]).map(x=>x.id),golden_impacts:(core.golden_impacts||[]).map(x=>x.id),result:'PASS'},null,2));

'use strict';
const assert = require('node:assert/strict');
const M = require('./model.cjs');
let assertions = 0;
const eq=(a,b,msg)=>{assert.deepEqual(a,b,msg);assertions++;};
const ok=(v,msg)=>{assert.ok(v,msg);assertions++;};

const methods=M.clone(M.DEMO_METHODS);
const bank=methods.find(m=>m.kind==='bank');
const twint=methods.find(m=>m.kind==='twint');
const paypal=methods.find(m=>m.kind==='paypal');
const dot=methods.find(m=>m.kind==='crypto');

// Validation and normalization
eq(M.validateDraft(bank).ok,true); eq(M.validateDraft(twint).ok,true); eq(M.validateDraft(paypal).ok,true); eq(M.validateDraft(dot).ok,true);
eq(M.validateDraft({kind:'bank',label:'Demo',fields:{holder:'A',iban:'CH93 0076 2011 6238 5295 7'}}).ok,true);
eq(M.validateDraft({kind:'bank',label:'Demo',fields:{holder:'A',iban:'CH12'}}).code,'invalid-iban-format');
eq(M.validateDraft({kind:'twint',label:'TWINT',fields:{phone:''}}).code,'missing-twint-destination');
eq(M.validateDraft({kind:'twint',label:'TWINT',fields:{phone:'+41 79 000 00 00'}}).ok,true);
eq(M.validateDraft({kind:'paypal',label:'PayPal',fields:{email:'not-an-email'}}).code,'invalid-email-format');
eq(M.validateDraft({kind:'paypal',label:'PayPal',fields:{username:'demo'}}).ok,true);
eq(M.validateDraft({kind:'crypto',label:'DOT',fields:{asset:'DOT',network:'polkadot',address:'short'}}).code,'invalid-address-format');
eq(M.validateDraft({kind:'crypto',label:'DOT',fields:{asset:'DOT',network:'',address:'5DemoLongAddress123'}}).code,'missing-network');
eq(M.validateDraft({kind:'crypto',label:'DOT',fields:{asset:'',network:'polkadot',address:'5DemoLongAddress123'}}).code,'missing-asset');
eq(M.validateDraft({kind:'future',label:'X',fields:{}}).code,'unsupported-kind');
eq(M.validateDraft({kind:'bank',label:'X',privateKey:'abc',fields:{holder:'A',iban:bank.fields.iban}}).code,'secret-field');
eq(M.validateDraft({kind:'crypto',label:'X',fields:{asset:'DOT',network:'polkadot',address:dot.fields.address,mnemonic:'one two'}}).code,'secret-field');
eq(M.validateDraft(bank).providerVerified,false);

// Masking
ok(M.maskedDestination(bank).includes('••••')); ok(!M.maskedDestination(bank).includes(bank.fields.iban));
ok(M.maskedDestination(twint).includes('•••')); ok(!M.maskedDestination(twint).includes('0000000'));
ok(M.maskedDestination(paypal).includes('•••@')); ok(!M.maskedDestination(paypal).startsWith('demo.user'));
ok(M.maskedDestination(dot).includes('…')); ok(!M.maskedDestination(dot).includes(dot.fields.address));

// Duplicates and fingerprints
eq(M.fingerprint({...bank,fields:{...bank.fields,iban:'CH93 0076 2011 6238 5295 7'}}),M.fingerprint(bank));
eq(M.duplicateOf({...bank,label:'Different label',fields:{...bank.fields,iban:'CH93 0076 2011 6238 5295 7'}},methods).id,bank.id);
eq(M.createMethod({...bank,id:undefined,label:'Duplicate'},methods,'new-bank').code,'duplicate-method');
eq(M.createMethod({kind:'bank',label:'Backup',fields:{holder:'Demo',iban:'CH1200762011623852958'},available:true},methods,'m-backup').ok,true);
eq(M.createMethod({kind:'bank',label:'Backup',fields:{holder:'Demo',iban:'CH1200762011623852958'},available:true},methods,'m-backup').method.version,1);
eq(M.createMethod({kind:'bank',label:'Backup',fields:{holder:'Demo',iban:'CH1200762011623852958'},available:true},methods,'m-backup').paymentAuthorized,false);

// Compatibility and scoped preference
eq(M.compatibility(bank,{asset:'CHF'}).compatible,true); eq(M.compatibility(twint,{asset:'CHF'}).compatible,true); eq(M.compatibility(paypal,{asset:'CHF'}).compatible,true);
eq(M.compatibility(dot,{asset:'DOT',network:'polkadot'}).compatible,true);
eq(M.compatibility(bank,{asset:'DOT',network:'polkadot'}).reason,'asset-mismatch');
eq(M.compatibility(dot,{asset:'CHF'}).reason,'asset-mismatch');
eq(M.compatibility(dot,{asset:'DOT'}).reason,'network-required');
eq(M.compatibility(dot,{asset:'DOT',network:'westend'}).reason,'network-mismatch');
eq(M.compatibility(bank,{asset:'CHF',network:'polkadot'}).reason,'network-not-supported');
eq(M.preferenceScope({asset:'CHF'}),'fiat:CHF');
eq(M.preferenceScope({asset:'DOT',network:'polkadot'}),'crypto:DOT:polkadot');
eq(M.suggestedMethod(methods,M.DEMO_PREFERENCES,{asset:'CHF'}).id,bank.id);
eq(M.suggestedMethod(methods,M.DEMO_PREFERENCES,{asset:'DOT',network:'polkadot'}).id,dot.id);
const prefFail=M.setPreference(M.DEMO_PREFERENCES,methods,bank.id,{asset:'DOT',network:'polkadot'}); eq(prefFail.ok,false); eq(prefFail.code,'asset-mismatch');
const prefOk=M.setPreference(M.DEMO_PREFERENCES,methods,twint.id,{asset:'CHF'}); eq(prefOk.ok,true); eq(prefOk.preferences['fiat:CHF'],twint.id); eq(prefOk.paymentAuthorized,false);

// Edit/version and stale bindings
const share=M.bindReference(bank,'share'); eq(share.version,bank.version);
const edited=M.editMethod(bank,{fields:{reference:'New demo note'}},methods); eq(edited.ok,true); eq(edited.method.version,bank.version+1); eq(edited.paymentAuthorized,false);
eq(M.resolveReference(share,[edited.method,...methods.filter(m=>m.id!==bank.id)]).state,'stale-edited');
eq(M.resolveReference(M.bindReference(edited.method),[edited.method]).state,'current');
const removed=M.removeMethod(edited.method); eq(removed.ok,true); eq(removed.method.removed,true); eq(removed.method.available,false); eq(removed.balancesChanged,false); eq(removed.paymentReversed,false); eq(removed.historyDeleted,false);
eq(M.resolveReference(M.bindReference(edited.method),[removed.method]).state,'stale-removed');
const hist=M.historicalPayment(bank); const histBefore=JSON.stringify(hist); M.removeMethod(bank); eq(JSON.stringify(hist),histBefore); eq(hist.methodVersion,bank.version); eq(hist.settled,true);

// Command identity, unknown recovery and safe retry
let ledger={};
let cmd=M.applyCommand(ledger,{id:'save-1',operation:'save',simulatedOutcome:'accepted'}); ledger=cmd.ledger; eq(cmd.code,'accepted'); eq(cmd.record.accepted,true);
let replay=M.applyCommand(ledger,{id:'save-1',operation:'save',simulatedOutcome:'failed'}); eq(replay.code,'idempotent-replay'); eq(replay.record.accepted,true);
eq(M.retryPolicy(replay.record).canRetry,false); eq(M.retryPolicy(replay.record).reason,'already-accepted');
let unknown=M.applyCommand({}, {id:'remove-1',operation:'remove',simulatedOutcome:'unknown'}); eq(unknown.code,'result-unknown'); eq(unknown.record.accepted,null);
eq(M.retryPolicy(unknown.record).canRetry,false); eq(M.retryPolicy(unknown.record).mustRecover,true);
let recovered=M.recoverCommand(unknown.ledger,'remove-1',false); eq(recovered.code,'recovered'); eq(recovered.record.accepted,false); eq(M.retryPolicy(recovered.record).canRetry,true);
let recoveredAccepted=M.recoverCommand(M.applyCommand({}, {id:'edit-1',operation:'edit',simulatedOutcome:'unknown'}).ledger,'edit-1',true); eq(recoveredAccepted.record.accepted,true); eq(M.retryPolicy(recoveredAccepted.record).canRetry,false);
eq(M.applyCommand({}, {operation:'save'}).code,'missing-command-id');

console.log(JSON.stringify({ok:true,assertions,scenarios:12},null,2));

const assert=require('node:assert/strict');
const M=require('./continuity-model.cjs');
let count=0;
function test(name,fn){fn();count++;console.log('PASS',name);}
for(const key of Object.keys(M.fixtures)){
 test(key+': repeated refresh is read-only',()=>{let r=M.initial(key);for(let i=0;i<4;i++){let n=M.apply(r,'PaymentStatusRefreshRequested');assert.equal(n,r);assert.equal(M.balance(n),M.fixtures[key].original);assert.equal(n.receiptAccepted,false);}});
 test(key+': payer cannot confirm or close',()=>{let r=M.initial(key);for(const event of ['ReceiverConfirmationRequested','ReceiverConfirmedPartial','DemoPaymentClosed'])assert.equal(M.apply(r,event,'payer'),r);});
 test(key+': timeout requires recovery before retry',()=>{let r=M.initial(key,'unknown');r=M.apply(r,'PaymentRetryRequested');assert.equal(r.state,'recovering');assert(!r.history.some(x=>x.event==='PaymentRetryRequested'));assert.equal(r.id,M.fixtures[key].id);const copy=r;assert.equal(M.apply(r,'PaymentStatusRefreshRequested'),copy);const f=M.fixtures[key];r=M.apply(r,'DemoVerifiedResult','demo-provider',{paymentId:r.id,method:f.method,recipient:f.recipient,outcome:'not-executed'});assert(r.retryEligible);r=M.apply(r,'PaymentRetryRequested');assert.equal(r.state,'retrying');assert.equal(r.history.filter(x=>x.event==='PaymentRetryRequested').length,1);assert.equal(M.apply(r,'PaymentRetryRequested'),r);});
 test(key+': wrong result cannot unlock retry',()=>{const r=M.initial(key,'unknown');assert.equal(M.apply(r,'DemoVerifiedResult','demo-provider',{paymentId:'other',method:M.fixtures[key].method,recipient:M.fixtures[key].recipient,outcome:'not-executed'}),r);});
}
for(const [key,amount] of [['twint',5430],['bank',5430],['cash',3000],['partial',2000],['different',4000]]){
 test(key+': exact receipt, closure and read projection',()=>{const f=M.fixtures[key];let r=M.initial(key);assert.equal(M.apply(r,'ReceiverConfirmationRequested','receiver',{paymentId:r.id,recipient:'Wrong',amount}),r);r=M.apply(r,'ReceiverConfirmationRequested','receiver',{paymentId:r.id,recipient:f.recipient,amount});assert.equal(r.state,'received');assert.equal(M.balance(r),f.original);assert.equal(M.apply(r,'SettlementResultViewed'),r);r=M.apply(r,'DemoPaymentClosed','demo-backend');assert.equal(M.balance(r),f.original-amount);assert.equal(M.apply(r,'DemoPaymentClosed','demo-backend'),r);});
}
test('wallet: exact provider fixture only',()=>{let r=M.initial('wallet');const f=M.fixtures.wallet;r=M.apply(r,'DemoVerifiedResult','demo-provider',{paymentId:r.id,method:f.method,recipient:f.recipient,outcome:'received',amount:f.amount,transfer:f.transfer});assert.equal(r.state,'received');r=M.apply(r,'DemoPaymentClosed','demo-backend');assert.equal(M.balance(r),0);});
console.log(JSON.stringify({ok:true,checks:count}));

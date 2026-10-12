/* Prototype-only reducer. No payment SDK, network call, or production authority. */
(function (root) {
  'use strict';
  const fixtures = Object.freeze({
    twint: {id:'demo-ja-twint-5430', payer:'Devinson', recipient:'Jeanine', method:'TWINT', currency:'CHF', original:5430, amount:5430, source:['Apartment','Ski Trip'], items:['apartment-ja-7430','ski-ja-credit-2000']},
    bank: {id:'demo-ja-bank-5430', payer:'Devinson', recipient:'Jeanine', method:'Bank transfer', currency:'CHF', original:5430, amount:5430, source:['Apartment','Ski Trip'], items:['apartment-ja-7430','ski-ja-credit-2000']},
    cash: {id:'demo-nina-cash-3000', payer:'Devinson', recipient:'Nina', method:'Cash', currency:'CHF', original:3000, amount:3000, source:['Geneva Day'], items:['geneva-nina-3000']},
    wallet: {id:'demo-ja-wallet-5430', payer:'Devinson', recipient:'Jeanine', method:'Connected wallet', currency:'CHF', original:5430, amount:5430, transfer:'7.812500 DOT', source:['Apartment','Ski Trip'], items:['apartment-ja-7430','ski-ja-credit-2000']},
    partial: {id:'demo-ja-twint-2000', payer:'Devinson', recipient:'Jeanine', method:'TWINT', currency:'CHF', original:5430, amount:2000, source:['Apartment','Ski Trip'], items:['apartment-ja-7430','ski-ja-credit-2000']},
    different: {id:'demo-ja-twint-4000', payer:'Devinson', recipient:'Jeanine', method:'TWINT', currency:'CHF', original:5430, amount:5430, source:['Apartment','Ski Trip'], items:['apartment-ja-7430','ski-ja-credit-2000']}
  });
  const readEvents = new Set(['PaymentStatusViewed','PaymentStatusRefreshRequested','SettlementResultViewed','SavedRecordViewed','SavedRecordRefreshRequested','SettlementHistoryOpened','SettlementExitRequested','JourneyHandoffReturned']);
  function initial(key, state='awaiting', confirmed=0) {
    if (!fixtures[key]) throw Error('Unknown fixture');
    return {key, id:fixtures[key].id, state, confirmed, settled:['closed','partial'].includes(state)?confirmed:0, retryEligible:state==='failed', outcome:state==='failed'?'not-executed':'unknown', receiptAccepted:confirmed>0, history:[], version:0};
  }
  function balance(record) { return fixtures[record.key].original-record.settled; }
  function apply(previous, event, actor='payer', payload={}) {
    // Reads are pure, including refresh. Only a separately accepted result changes truth.
    if (readEvents.has(event)) return previous;
    const record=JSON.parse(JSON.stringify(previous));
    const f=fixtures[record.key];
    function log(name) { record.history.push({event:name, actor, paymentId:record.id}); }
    if (event==='PayerMarkedSent') {
      if (actor!=='payer' || !['started','sent','awaiting','retrying'].includes(record.state)) return previous;
      record.state='awaiting'; record.retryEligible=false; log(event);
    } else if (event==='ReceiverConfirmationRequested' || event==='ReceiverConfirmedPartial') {
      if (actor!=='receiver' || payload.recipient!==f.recipient || payload.paymentId!==record.id || f.method==='Connected wallet' || !['sent','awaiting','not-received'].includes(record.state)) return previous;
      const amount=payload.amount??f.amount;
      if (!Number.isSafeInteger(amount) || amount<=0 || amount>f.amount || amount>f.original) return previous;
      record.confirmed=amount; record.receiptAccepted=true; record.state='received'; record.retryEligible=false;
      log(event); log('DemoReceiverReceiptAccepted');
    } else if (event==='ReceiverNotYetReported') {
      if(actor!=='receiver' || payload.recipient!==f.recipient || payload.paymentId!==record.id || !['sent','awaiting','not-received'].includes(record.state)) return previous;
      record.state='not-received'; log(event);
    } else if (event==='DemoPaymentClosed') {
      if(actor!=='demo-backend' || !record.receiptAccepted || record.state!=='received') return previous;
      record.settled=record.confirmed; record.state=balance(record)===0?'closed':'partial'; log(event);
    } else if (event==='DemoVerifiedResult') {
      if(actor!=='demo-provider' || payload.paymentId!==record.id || payload.method!==f.method || payload.recipient!==f.recipient) return previous;
      if(payload.outcome==='not-executed' && ['unknown','recovering','failed'].includes(record.state) && record.settled===0) {
        record.outcome='not-executed'; record.retryEligible=true; record.state='failed'; log(event);
      } else if(payload.outcome==='received' && f.method==='Connected wallet' && payload.transfer===f.transfer && payload.amount===f.amount && record.settled===0) {
        record.state='received'; record.confirmed=f.amount; record.receiptAccepted=true; record.retryEligible=false; record.outcome='received'; log(event);
      } else return previous;
    } else if (event==='PaymentOutcomeUnknown') {
      if(record.settled>0) return previous;
      record.state='unknown'; record.outcome='unknown'; record.retryEligible=false; log(event);
    } else if (event==='PaymentRecoveryRequested') {
      if(['closed','partial'].includes(record.state)) return previous;
      record.state='recovering'; record.retryEligible=false; log(event);
    } else if (event==='PaymentRetryRequested' || event==='PaymentMethodSelectionOpened' || event==='PaymentIntentReviewResumed') {
      if (record.state==='started' && event==='PaymentIntentReviewResumed') {log(event);}
      else if(record.retryEligible && record.outcome==='not-executed' && record.settled===0) {
        record.state=event==='PaymentRetryRequested'?'retrying':'started'; record.retryEligible=false; log(event);
      } else if(['unknown','recovering'].includes(record.state)) {
        record.state='recovering'; record.retryEligible=false; log('PaymentRecoveryRequested');
      } else return previous;
    } else return previous;
    record.version++; return record;
  }
  const api={fixtures,initial,balance,apply,readEvents};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.J12Continuity=api;
})(typeof window!=='undefined'?window:globalThis);

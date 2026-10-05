/* Local scenario navigation only. All provider/backend outcomes below are explicit test fixtures. */
(() => {
  'use strict';
  const M=window.J12Continuity, templates=new Map([...document.querySelectorAll('.screen')].map(s=>[s.id,s.innerHTML]));
  const storageKey='chopdot-j12-continuity-v1.1';
  let saved={}; try {saved=JSON.parse(sessionStorage.getItem(storageKey)||'{}');}catch{}
  let records=saved.records||{}, key=saved.key||'twint', viewer=saved.viewer||'payer', screen='', returnFrom=saved.returnFrom||{};
  const q=new URLSearchParams(location.search);
  if(M.fixtures[q.get('payment')])key=q.get('payment');
  if(['payer','receiver'].includes(q.get('viewer')))viewer=q.get('viewer');
  const f=()=>M.fixtures[key], rec=()=>records[key]||(records[key]=M.initial(key));
  const money=(v)=>`${f().currency} ${(v/100).toFixed(2)}`;
  const get=(s)=>document.getElementById(s), text=(s,sel,value)=>{const el=s.querySelector(sel);if(el)el.textContent=value;};
  const primary=s=>s.querySelector('.focus-footer .primary');
  const title=(s,a,b)=>{text(s,'.header-title b',a);text(s,'.header-title span',b);};
  const heading=(s,a,b)=>{text(s,'.payment-status-card h1',a);text(s,'.payment-status-card p',b);};
  const metadata=(s)=>{
    const values=s.querySelectorAll('.payment-status-meta b');
    if(values[0])values[0].textContent=f().transfer&&/^wallet-(submitted|checking|received)/.test(s.id)?f().transfer:money(rec().confirmed||f().amount);
    if(values[1])values[1].textContent=viewer==='receiver'?f().payer:f().recipient;
  };
  function persist(){try{sessionStorage.setItem(storageKey,JSON.stringify({records,key,viewer,returnFrom}));}catch{}}
  function update(event,actor=viewer,payload={}){records[key]=M.apply(rec(),event,actor,payload);persist();}
  function closeAccepted(){update('DemoPaymentClosed','demo-backend');}
  function family(kind) {
    const r=rec(), k=key;
    if(kind==='return')return k==='bank'?'bank-return':k==='wallet'?'wallet-approval-waiting':k==='cash'?'cash-sent':k==='partial'?'partial-sent':'twint-return';
    if(kind==='waiting')return k==='bank'?'bank-waiting':k==='cash'?'cash-waiting':k==='partial'?'partial-waiting':k==='wallet'?'wallet-checking':'twint-waiting';
    if(kind==='receiver')return k==='bank'?'bank-receiver':k==='cash'?'cash-receiver':k==='partial'?'partial-receiver':'receiver-review';
    if(kind==='received')return r.confirmed===4000?'partial-received-different':k==='bank'?'bank-received':k==='cash'?'cash-received':k==='wallet'?'wallet-received':k==='partial'?'partial-received':'payment-received';
    if(kind==='complete')return r.confirmed===4000?'partial-different-complete':k==='bank'?'bank-complete':k==='cash'?'cash-complete':k==='wallet'?'wallet-complete':k==='partial'?'partial-complete':'payment-complete';
    if(kind==='record')return r.settled>0&&M.balance(r)>0?'saved-record-partial':k==='bank'?'saved-record-bank':k==='wallet'?'saved-record-wallet':'saved-record';
    if(kind==='status'){
      if(r.state==='closed'||r.state==='partial')return family('complete');
      if(r.state==='received')return family('received');
      if(r.state==='unknown')return 'wallet-result-unknown';
      if(r.state==='recovering')return 'wallet-recovering';
      if(r.state==='reversed')return 'wallet-reversed';
      if(r.state==='failed')return 'payment-failed';
      if(r.state==='retrying')return 'retrying';
      if(r.state==='cancelled')return 'payment-cancelled';
      if(r.state==='started')return family('return');
      if(r.state==='approval')return 'wallet-approval-waiting';
      if(r.state==='not-received')return viewer==='receiver'?'receiver-not-yet':'recipient-says-no';
      return viewer==='receiver'?family('receiver'):family('waiting');
    }
  }
  const inferredKey=id=>/^bank|saved-record-bank/.test(id)?'bank':/^cash/.test(id)?'cash':/^wallet|saved-record-wallet|position-reopened/.test(id)?'wallet':/different/.test(id)?'different':/^partial|position-partial|saved-record-partial/.test(id)?'partial':'twint';
  const receiverId=id=>/^receiver-|amount-different/.test(id)||['bank-receiver','cash-receiver','partial-receiver'].includes(id);
  function seed(id,paymentKey,role){
    key=paymentKey||inferredKey(id); viewer=role||(receiverId(id)?'receiver':'payer');
    let state='awaiting', confirmed=0;
    if(/return|j11-handoff/.test(id))state='started';
    if(/approval-waiting/.test(id))state='approval';
    if(/submitted|checking/.test(id))state='submitted';
    if(/result-unknown/.test(id))state='unknown';
    if(/recovering/.test(id))state='recovering';
    if(/failed|rejected|expired/.test(id))state='failed';
    if(/cancelled/.test(id))state='cancelled';
    if(/reversed|reopened/.test(id))state='reversed';
    if(/not-yet|says-no/.test(id))state='not-received';
    if(/received$|partial-received-different|complete$|^saved-record|position-updated|position-partial|record-unavailable/.test(id)){
      state=/received$|partial-received-different/.test(id)?'received':key==='partial'||key==='different'?'partial':'closed';
      confirmed=key==='different'?4000:M.fixtures[key].amount;
    }
    records[key]=M.initial(key,state,confirmed); records[key].retryEligible=state==='failed';
    persist(); navigate(id,false);
    if(state==='received')queueMicrotask(closeAccepted);
  }
  function currentBalanceText(){return viewer==='receiver'?`${f().payer} owes you`:`You owe ${f().recipient}`;}
  function render(id){
    const s=get(id); if(!s)return;
    s.innerHTML=templates.get(id);
    const r=rec(); const rem=M.balance(r), done=r.settled>0, closed=rem===0, method=f().method;
    s.dataset.paymentId=r.id; s.dataset.method=method; s.dataset.viewer=viewer;
    s.dataset.resultingMinor=String(rem); s.dataset.sourceItems=f().items.join(',');
    // Shared status surfaces inherit the selected scope; reads never change it.
    if(s.querySelector('.payment-status-card')){
      metadata(s);
      text(s,'.header-title span',`${f().recipient} · ${method}`);
    }
    if(['twint-waiting','bank-waiting','cash-waiting','partial-waiting'].includes(id)){
      heading(s,`Waiting for ${f().recipient}.`,`${f().recipient} needs to confirm that the payment arrived.`);
      if(key==='partial')text(s,'.payment-status-card p',`${money(f().original)} stays open until confirmation.`);
    }
    if(id==='wallet-result-unknown'){
      title(s,'Payment status',`${f().recipient} · ${method}`);
      heading(s,'Still checking.','The request timed out. Check the existing payment before retrying. Do not start another payment.');
    }
    if(id==='wallet-recovering'){
      title(s,'Checking payment',`${f().recipient} · ${method}`);
      heading(s,'Checking the existing payment.','No new payment will start. Retry is available only after we confirm nothing was sent.');
    }
    if(id==='payment-failed')heading(s,'Payment was not sent.','We confirmed nothing was sent. Your balance is unchanged. You can safely try again.');
    if(id==='retrying')heading(s,'Retrying the same payment.','The earlier attempt is confirmed not sent. The person, amount and method stay the same.');
    if(id==='position'){
      title(s,'Overall Position',`${f().recipient} · ${method}`);
      text(s,'.balance-after .label',currentBalanceText());
      text(s,'.balance-after .amount',money(rem));
      text(s,'.balance-after .sub',closed?'This payment is complete.':done?`${money(r.settled)} confirmed. ${money(rem)} remains.`:r.state==='reversed'?'This payment was reversed.':r.state==='unknown'||r.state==='recovering'?'Payment outcome is still unknown.':r.state==='failed'?'Nothing was sent.':`This ${method} payment is still open.`);
      const rows=[...s.querySelectorAll('.status-banner')];
      if(rows[0]){
        rows[0].href='#'+family('status'); text(rows[0],':scope > div > b',closed?'Payment complete':done?'Partial payment complete':r.state==='reversed'?'Payment reversed':r.state==='failed'?'Payment not sent':r.state==='unknown'||r.state==='recovering'?'Check payment status':`Waiting for ${f().recipient}`);
        text(rows[0],':scope > div > span',`${money(done?r.settled:f().amount)} · ${method}`);
      }
      // Role switching is a workshop control, never an action on the payer's balance.
      if(rows[1]){
        rows[1].href='#payment-details'; text(rows[1],':scope > div > b','Payment details');text(rows[1],':scope > div > span',`${f().source.join(' · ')} · ${method}`); text(rows[1],'.status-side','View');
      }
      primary(s).href='#'+family('status'); primary(s).textContent=done?'View payment':'Open payment';
      s.querySelector('.balance-after .amount')?.classList.toggle('good',closed);
      if(done&&rows[0]){const d=document.createElement('div');d.innerHTML=templates.get('payment-complete');const svg=d.querySelector('.state-icon svg');if(svg)rows[0].querySelector('.status-symbol').replaceChildren(svg.cloneNode(true));}
      s.querySelector('header a').href='#'+family('status');
    }
    if(/^position-(updated|partial|partial-different|reopened)$/.test(id)){
      title(s,closed?'Updated balance':'Remaining balance',`${f().recipient} · ${method}`);
      text(s,'.balance-after .label',currentBalanceText());text(s,'.balance-after .amount',money(rem));
      text(s,'.balance-after .sub',r.state==='reversed'?`The ${method} payment was reversed.`:closed?`${money(r.settled)} confirmed via ${method}.`:`${money(r.settled)} confirmed. ${money(rem)} remains.`);
      const details=s.querySelectorAll('.timeline-row');
      if(details[0]){text(details[0],'b',closed?'Payment complete':r.state==='reversed'?'Payment reversed':'Partial payment complete');text(details[0],':scope > div > span',`${money(r.settled||f().amount)} · ${method}`);}
      if(details[1]){text(details[1],'b',closed?'Balance updated':`${money(rem)} remains`);text(details[1],':scope > div > span',f().source.join(' · '));}
      for(const a of s.querySelectorAll('a'))if(a.dataset.domainEvent==='SavedRecordViewed')a.href='#'+family('record');
    }
    if(/^saved-record/.test(id)){
      title(s,'Payment record',`Saved · ${method}`);
      for(const row of s.querySelectorAll('.record-row')){
        const label=row.querySelector('span')?.textContent.trim();
        if(label==='Method')text(row,'b',method);
        if(label==='Paid to')text(row,'b',f().recipient);
        if(label==='Confirmed')text(row,'b',f().recipient+' · 10:47');
        if(label==='Reference')text(row,'b',r.id.toUpperCase().replace('DEMO-','CD-'));
        if(label==='Groups')text(row,'b',f().source.join(' · '));
        if(label==='Amount'||label==='Amount confirmed')text(row,'b',money(r.confirmed||f().amount));
        if(label==='Remaining')text(row,'b',money(rem));
      }
      if(r.state==='reversed'){
        text(s,'.record-head h2','Payment reversed'); text(s,'.record-head p',`${money(f().original)} is open again.`);
        const status=[...s.querySelectorAll('.record-row')].find(x=>x.querySelector('span')?.textContent==='Status');if(status)text(status,'b','Reversed');
      }
      for(const a of s.querySelectorAll('a'))if(a.getAttribute('href')!=='#history-handoff')a.href='#'+family('status');
    }
    if(id==='payment-details'){
      title(s,'Payment details',`${f().recipient} · ${method}`);
      for(const row of s.querySelectorAll('.record-row')){
        const label=row.querySelector('span')?.textContent.trim();
        if(label==='Method')text(row,'b',method); if(label==='Recipient')text(row,'b',f().recipient);
        if(label==='Reference')text(row,'b',r.id.toUpperCase().replace('DEMO-','CD-'));
      }
      for(const a of s.querySelectorAll('a'))a.href='#'+(returnFrom['payment-details']||family('status'));
    }
    if(id==='receiver-inbox'){
      title(s,'Payments to confirm',`${f().recipient} · ${method}`);
      const rows=[...s.querySelectorAll('.method-row')];
      if(rows[0]){rows[0].href='#'+family('receiver');text(rows[0],'b',`${money(f().amount)} from ${f().payer}`);text(rows[0],':scope > div > span',`${method} · ${f().source.join(' and ')}`);}
      rows.slice(1).forEach(row=>row.remove());
      for(const a of s.querySelectorAll('header a, footer a'))a.href='#'+family('receiver');
    }
    if(receiverId(id)){
      title(s,s.querySelector('.header-title b')?.textContent||'Confirm payment',`From ${f().payer} · ${method}`);
      const chip=s.querySelector('.method-chip');if(chip){[...chip.childNodes].filter(x=>x.nodeType===3).forEach(x=>x.remove());chip.append(' '+method);}
    }
    if(viewer==='receiver' && /received|complete/.test(id) && !id.includes('saved')){
      heading(s,r.state==='received'?'Receipt confirmed.':'Payment confirmed.',`${f().payer}’s payment is recorded. ${money(rem)} remains.`);
      for(const a of s.querySelectorAll('header a'))a.href='#receiver-inbox';
    }
    if(id.endsWith('complete')||id==='payment-complete'){
      for(const a of s.querySelectorAll('header a'))a.href=viewer==='receiver'?'#receiver-inbox':'#position';
      if(key==='cash'&&primary(s))primary(s).href='#position-updated';
    }
    if(['j11-handoff','history-handoff','support-handoff','group-home'].includes(id)){
      title(s,s.querySelector('.header-title b')?.textContent||'Payment',`${f().recipient} · ${method}`);
      for(const a of s.querySelectorAll('a'))a.href='#'+(returnFrom[id]||family('status'));
    }
    if(id==='recipient-says-no')heading(s,`${f().recipient} has not received it.`,`Check the ${method} details. This payment remains open.`);
    for(const a of s.querySelectorAll('a')){
      a.dataset.paymentId=r.id; a.dataset.viewer=viewer;
      if(a.dataset.domainEvent && !a.dataset.authority)a.dataset.authority=viewer;
      if(a.dataset.domainEvent==='PaymentStatusRefreshRequested'){
        a.href='#'+id; a.dataset.resultResolver='accepted-status-only';
      }
    }
    document.body.dataset.viewer=viewer;document.body.dataset.payment=key;
    persist();
  }
  function navigate(id,push=true){
    if(!templates.has(id))id='position';
    screen=id;render(id);
    for(const node of document.querySelectorAll('.screen')){const active=node.id===id;node.style.display=active?'grid':'none';node.dataset.active=String(active);node.setAttribute('aria-hidden',String(!active));}
    document.body.dataset.screen=id;
    const url=new URL(location.href);url.searchParams.set('payment',key);url.searchParams.set('viewer',viewer);url.hash=id;
    try{history[push?'pushState':'replaceState']({payment:key,viewer,screen:id},'',url);}catch{}
  }
  const READ_STATUS=new Set(['PaymentStatusRefreshRequested','PaymentStatusViewed']);
  function click(a){
    const target=a.getAttribute('href').slice(1),event=a.dataset.domainEvent||'PaymentStatusViewed';
    if(!templates.has(target))return;
    // Navigation never impersonates the other party. Workshop controls are separate.
    if(viewer==='payer'&&(receiverId(target)||a.dataset.authority==='receiver'))return navigate(family('status'));
    const before=rec();
    if(event==='ReceiverConfirmationRequested'||event==='ReceiverConfirmedPartial'||event==='ReceiverNotYetReported'){
      if(viewer!=='receiver')return;
      update(event,'receiver',{recipient:f().recipient,paymentId:rec().id,amount:screen==='amount-different'?4000:f().amount});
      if(rec()===before)return;
      // A deterministic local fixture accepts receipt; navigation itself never closes the item.
      if(rec().receiptAccepted)closeAccepted();
      return navigate(event==='ReceiverNotYetReported'?'receiver-not-yet':screen==='amount-different'?'partial-received-different':family('received'));
    }
    if(event==='PayerMarkedSent')update(event);
    if(event==='PaymentRecoveryRequested'){update(event);return navigate('wallet-recovering');}
    if(['PaymentRetryRequested','PaymentMethodSelectionOpened','PaymentIntentReviewResumed'].includes(event)){
      update(event);
      if(['unknown','recovering'].includes(rec().state))return navigate('wallet-recovering');
      if(rec()===before && rec().state!=='started')return navigate(family('status'));
    }
    if(event==='PaymentStatusRefreshRequested')return navigate(family('status'));
    if(event==='SavedRecordViewed'&&!target.startsWith('saved-record'))return navigate(family('status'));
    if(target.startsWith('saved-record'))return navigate(family('record'));
    if(target==='history-handoff'||target==='support-handoff'||target==='j11-handoff'||target==='payment-details'){returnFrom[target]=screen;return navigate(target);}
    if(screen==='retrying' && target==='twint-return')return navigate(family('return'));
    if(target==='receiver-review')return navigate(family('receiver'));
    if(target==='position')return navigate('position');
    if(/^position-/.test(target))return navigate(target);
    if(target===family('complete')||/^(bank-|cash-|wallet-|payment-|partial-).*complete$/.test(target))return navigate(rec().state==='reversed'?family('status'):family('complete'));
    if(target==='twint-waiting'&&!screen.startsWith('twint'))return navigate(family('status'));
    if(viewer==='receiver'&&['bank-waiting','cash-waiting','partial-waiting'].includes(target))return navigate('receiver-not-yet');
    return navigate(target);
  }
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href^="#"]');if(!a)return;
    e.preventDefault();
    if(a.closest('.labpanel')){
      if(a.dataset.testAction==='receiver'){viewer='receiver';return navigate(family('receiver'));}
      if(a.dataset.testAction==='payer'){viewer='payer';return navigate(family('status'));}
      if(a.dataset.testAction==='no-execution'){
        update('DemoVerifiedResult','demo-provider',{paymentId:rec().id,method:f().method,recipient:f().recipient,outcome:'not-executed'});return navigate(family('status'));
      }
      if(a.dataset.testAction==='wallet-receipt'){
        update('DemoVerifiedResult','demo-provider',{paymentId:rec().id,method:f().method,recipient:f().recipient,outcome:'received',amount:f().amount,transfer:f().transfer});closeAccepted();return navigate('wallet-received');
      }
      return seed(a.hash.slice(1),a.dataset.fixture,a.dataset.viewer);
    }
    if(a.closest('.screen'))click(a);
  });
  addEventListener('popstate',()=>{
    const query=new URLSearchParams(location.search);key=query.get('payment')||key;viewer=query.get('viewer')||viewer;
    let id=location.hash.slice(1);
    // A browser Back cannot resurrect an earlier unsettled snapshot.
    if(['closed','partial','reversed'].includes(rec().state)&&!/position|saved-record|history/.test(id))id=family('status');
    navigate(id,false);
  });
  let first=location.hash.slice(1)||'twint-return';
  if(!q.has('payment')&&!records[key])seed(first);
  else navigate(first,false);
})();

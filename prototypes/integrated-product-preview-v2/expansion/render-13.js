// Render templates extracted from unchanged approved J13; dynamic facts come from the canonical adapter.
export function renderRequest(s,M){const P=M.P;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={back:'<path d="m15 18-6-6 6-6"/>',chev:'<path d="m9 18 6-6-6-6"/>',check:'<path d="m5 12 4 4L19 6"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 11v6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',send:'<path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/>',group:'<path d="M3 7h18v12H3zM6 7V4h12v3M8 11h8"/>',wallet:'<path d="M20 8V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v11H5a3 3 0 0 1-3-3V6"/><path d="M20 12h-5v4h5"/>',refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M18 7a7 7 0 0 0-11-2L4 8m2 9a7 7 0 0 0 11 2l3-3"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>'};
const icon=id=>`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[id]||paths.info}</svg>`;
const btn=(label,action,cl='primary',attrs='')=>`<button type="button" class="${cl}" data-action="${esc(action)}" ${attrs}>${label}</button>`;
const row=(title,sub,action,ic='group',tail='')=>`<button type="button" class="mp-row" data-action="${esc(action)}"><span class="row-icon">${icon(ic)}</span><span><b>${esc(title)}</b><span class="sub">${esc(sub)}</span></span>${tail||icon('chev')}</button>`;
const card=(title,copy)=>`<section class="card mp-card-copy"><h2>${title}</h2><p>${copy}</p></section>`;
const status=(title,copy,ic='info',good=false)=>`<div class="mp-status"><div class="state-icon ${good?'good':''}">${icon(ic)}</div><h1 tabindex="-1">${title}</h1><p>${copy}</p></div>`;
const rule=text=>`<p class="rq-rule">${icon('info')}<span>${text}</span></p>`;
const money=(n=M.amount(s),currency=s.context.currency)=>P.amount(n,currency);
const scopeName=p=>p.scope==='all'?'Across shared groups':P.GROUPS[p.scope]?.name||'Shared group';
const who=()=>P.name(s.context.person);
const payload=()=>M.current(s)?.payload||s.command?.payload||s.review||M.snapshot(s);
const person=(p=payload())=>`<section class="card rq-person"><span class="person-avatar">${P.PEOPLE[p.payer].initials}</span><span><b>${esc(P.name(p.payer))}</b><span class="sub">${esc(scopeName(p))}</span></span></section>`;
const total=(p=payload(),label='Request amount')=>`<section class="card rq-amount"><span class="label">${label}</span><div class="value">${money(p.amountMinor,p.currency)}</div><p class="mp-meta">${esc(scopeName(p))}</p></section>`;
const notePreview=p=>`<section class="card rq-message"><div class="sender">${esc(P.name(s.data.viewer))} requests ${money(p.amountMinor,p.currency)}</div><div class="message-meta">${esc(scopeName(p))} · Only shared with ${esc(P.name(p.payer))}</div>${p.note?`<p>${esc(p.note)}</p>`:''}</section>`;
function screen(){
 let header='Request money',sub=scopeName(s.context),body='',foot='';const w=esc(who()),r=M.current(s),p=payload(),disabled=!s.data.online?'disabled':'';
 switch(s.route){
 case 'compose':{
  const g=M.guard(s);body=`<div><div class="eyebrow">You and ${w}</div><h1 class="hero" tabindex="-1">Request money.</h1><p class="mp-meta">A clear amount. A little less chasing.</p></div>`+person(M.snapshot(s))+total(M.snapshot(s),w+' owes you');
  body+=`<section class="card mp-card">${row('What this covers',M.source(s).length===1?'1 shared group':new Set(M.source(s).map(x=>x.group)).size+' shared groups','sources')}</section>`;
  body+=`<label class="card rq-note"><span>Note <small>Optional · <span id="note-count">${s.note.length}</span>/160</small></span><textarea id="request-note" aria-label="Optional note" maxlength="160" placeholder="Thanks for the weekend!">${esc(s.note)}</textarea></label>`+rule('This is a request, not a payment. Your balance stays unchanged.');
  if(!s.data.online)body+=card('You are offline.','Your draft is here. Reconnect and review the current balance before sending.');
  if(g==='note')body+=card('Keep it short.','Your note can be up to 160 characters.');
  foot=btn('Review request','review','primary',g?'disabled':'');break;}
 case 'sources':{
  header='What this covers';body=`<div><div class="eyebrow">You and ${w}</div><h1 class="hero" tabindex="-1">The shared balance.</h1><p class="mp-meta">${esc(scopeName(s.context))}</p></div>`+total(p);
  const rows=M.source(s);body+=`<section class="card mp-card">${rows.map(x=>`<div class="mp-row"><span class="row-icon">${icon('group')}</span><span><b>${esc(P.GROUPS[x.group].name)}</b><span class="sub">${x.minor<0?'You owe '+w:w+' owes you'}</span></span><span class="rq-row-amount">${x.minor<0?'−':''}${money(x.minor,x.currency)}</span></div>`).join('')}</section>`+rule('Based on existing shared records. Sending a request does not add an expense or change what anyone owes.');foot=btn('Back to request','back');break;}
 case 'review':
  header='Review request';body=status('Ready to send.','Check the person and amount. '+w+' decides when and how to pay.','send')+person(s.review)+total(s.review);
  body+=`<div class="mp-section"><h2>${w} will see</h2></div>`+notePreview(s.review)+`<section class="card rq-facts"><div><span>Send through</span><b>ChopDot · private request</b></div><div><span>Your preference</span><b>${esc(P.PEOPLE[s.data.viewer]?.preferred||'Choose when paying')}</b></div></section>`+rule('Your preference is a suggestion. Payment is reviewed separately.');
  foot=btn('Send request','send','primary',disabled)+btn('Edit note','edit','text-link');break;
 case 'submitting':case 'unknown':{
  header='Creating request';const recovering=s.command?.status==='recovering';body=status(s.route==='submitting'?'Creating your request.':recovering?'Still checking.':'Did it go through?',s.route==='submitting'?'Keep this open while the request is saved.':'We have not confirmed whether the request was created. Check this same request before trying again.','refresh')+total(p)+rule('No payment has been made. We will not create a second request while this one is unresolved.');foot=s.route==='submitting'?btn('Creating…','noop','primary','disabled'):btn(recovering?'Check again':'Check status','recover','primary',disabled);break;}
 case 'failed':header='Request not created';body=status('Nothing was sent.','The service confirmed this request was not created. Your note is still here.','refresh')+total(p)+notePreview(p);foot=btn('Try again','retry','primary',disabled);break;
 case 'detail':{
  header='Your request';const delivered=r?.delivery==='delivered',failed=r?.delivery==='failed';body=status(delivered?'Request sent.':failed?'Saved. Not delivered yet.':'Request created.',delivered?w+' can open it in ChopDot. Payment is still up to them.':failed?'Delivery did not complete. Retry delivery without creating another request.':'Your request is saved. We are still waiting for delivery.','send',delivered)+total(r.payload,M.amount(s)!==r.payload.amountMinor?'Originally requested':'Request amount');
  if(M.amount(s)!==r.payload.amountMinor)body+=card('The balance has changed.','Current balance: '+money()+'. Payment must use a freshly reviewed balance, not this old request.');
  body+=`<section class="card rq-facts"><div><span>To</span><b>${w}</b></div><div><span>Delivery</span><b>${delivered?'Delivered':failed?'Not delivered':'Queued'}</b></div><div><span>Payment</span><b>Not paid</b></div></section>`+notePreview(r.payload)+rule('No automatic reminders. No money has moved.');
  foot=btn('Back to '+w,'return')+(failed?btn('Retry delivery','retry-delivery','secondary',disabled):'')+btn('Withdraw request','withdraw-review','text-link danger',disabled);break;}
 case 'duplicate':header='Request already exists';body=status('Already asked.','There is an active request covering some or all of these same items. Open it instead of asking twice.','clock')+person(r.payload)+total(r.payload,'Existing request')+rule('Different notes or entry points do not create a new request for the same items.');foot=btn('View existing request','open-existing');break;
 case 'changed':{
  header='Balance changed';const was=s.command?.payload||s.review,now=M.snapshot(s);body=status('Let’s check that again.','The balance or request changed before your action completed. Nothing new was accepted.','refresh');
  if(was)body+=`<section class="card rq-facts"><div><span>You reviewed</span><b>${money(was.amountMinor,was.currency)}</b></div><div><span>Current balance</span><b>${money(now.amountMinor,now.currency)}</b></div></section>`;
  body+=rule('Review the current state. We will not silently send a different amount.');foot=btn(r?'View current request':'Review current balance',r?'open-existing':'refresh-review','primary',disabled);break;}
 case 'nothing-due':{
  header='Your balance';const n=M.amount(s);body=status(n<0n?'You owe '+w+'.':'Nothing to request.',n<0n?'This balance goes the other way. You can review a payment instead.':'There is no outstanding amount to request in this scope.','check',n===0n)+total(M.snapshot(s),n<0n?'You owe '+w:'Current balance');foot=btn(n<0n?'Review settlement':'Back to '+w,n<0n?'settle':'return');break;}
 case 'unavailable':header='Cannot continue';body=status(s.data.issue?'An expense needs review.':'This view has changed.',s.data.issue?'An item in this request is still being reviewed. Other people and unrelated items are not blocked.':'Your access or membership changed. Go back before trying again.','info');foot=btn(s.data.issue?'Review expense':'Back to people',s.data.issue?'issue':'safe-return');break;
 case 'offline':header='You are offline';body=status('Your draft is here.','Reconnect before creating, checking or withdrawing a request. We will not send it automatically.','info')+card('Nothing was sent.','You can return to your draft. The balance must be reviewed again when you reconnect.');foot=btn('Back to draft','edit');break;
 case 'payment-progress':header='Payment in progress';body=status('Payment is being checked.','A payment for this request is in progress. Please wait before requesting again or withdrawing.','clock')+total(r.payload)+rule('A request cannot approve a payment or mark it complete.');foot=btn('View payment progress','payment');break;
 case 'paid':header='Request completed';body=status('Payment confirmed.','This demonstration uses a verified settlement result from the payment journey, not a sender’s “mark paid” button.','check',true)+total(r.payload,'Confirmed payment')+rule('This request is complete. The payment record belongs to Journey 12.');foot=btn('View payment record','payment');break;
 case 'withdraw-confirm':header='Withdraw request';body=status('Withdraw this request?','This stops the request. It does not cancel the balance or remove past records.','close')+total(r.payload)+card('Your shared balance stays.',money()+' is the current balance. Withdrawing will not change it.');foot=btn('Withdraw request','withdraw','primary danger',disabled)+btn('Keep request','open-existing','secondary');break;
 case 'withdrawing':case 'withdraw-unknown':header='Withdrawing request';body=status(s.route==='withdrawing'?'Withdrawing request.':'Still checking.','Until the result is confirmed, the request may still be active. Your balance stays unchanged.','refresh')+total(r.payload);foot=s.route==='withdrawing'?btn('Withdrawing…','noop','primary','disabled'):btn('Check status','recover','primary',disabled);break;
 case 'withdraw-failed':header='Request still active';body=status('Not withdrawn.','The service confirmed no change was saved. You can try the same withdrawal again.','refresh')+total(r.payload);foot=btn('Try again','retry','primary',disabled)+btn('Keep request','open-existing','text-link');break;
 case 'withdrawn':header='Request withdrawn';body=status('Request withdrawn.','The request has stopped. Your shared balance and past records are unchanged.','check',true)+`<section class="card rq-balance"><span>Current shared balance</span><b>${money()}</b></section>`;foot=btn('Back to '+w,'return');break;
 case 'loading':header='Loading request';body=`<h1 class="hero" tabindex="-1">One moment.</h1><section class="card loading-card"><div class="skel short"></div><div class="skel"></div><div class="skel med"></div></section>`;foot=btn('Back to '+w,'return');break;
 case 'error':header='Could not load';body=status('Request could not load.','We could not check the request. Do not send another until its status is known.','refresh');foot=btn('Try again','reload-request');break;
 case 'handoff':header=s.handoff?.title||'People';sub='Preview only';body=status(esc(s.handoff?.title||'Back to people')+'.',esc(s.handoff?.copy||'Return to the same person and group.'),'info')+rule('Boundary preview only. This does not execute the adjacent journey, change settings or start a payment.');foot=btn('Return to request','resume');break;
 }
 return {header,sub,body,foot};
}

return {...screen(),esc,icon,btn};
}

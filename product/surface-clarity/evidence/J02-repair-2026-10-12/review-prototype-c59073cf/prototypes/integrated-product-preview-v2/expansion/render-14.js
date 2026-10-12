// Render templates extracted from unchanged approved J14; dynamic facts come from the canonical adapter.
export function renderReceive(s,M){const P=M.P,QR_DATA=M.QR_DATA;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const paths={back:'<path d="m15 18-6-6 6-6"/>',chev:'<path d="m9 18 6-6-6-6"/>',check:'<path d="m5 12 4 4L19 6"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 11v6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',send:'<path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/>',wallet:'<path d="M20 8V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v11H5a3 3 0 0 1-3-3V6"/><path d="M20 12h-5v4h5"/>',refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M18 7a7 7 0 0 0-11-2L4 8m2 9a7 7 0 0 0 11 2l3-3"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',bank:'<path d="m3 8 9-5 9 5H3ZM3 21h18M6 10v8M12 10v8M18 10v8"/>',phone:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/>',copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 5V3H3v13h2"/>',person:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',qr:'<path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h3v3h3v3h-6z"/>'};
 const icon=id=>`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[id]||paths.info}</svg>`;
 const btn=(label,action,cl='primary',attrs='')=>`<button type="button" class="${cl}" data-action="${esc(action)}" ${attrs}>${label}</button>`;
 const row=(title,sub,action,ic='info',tail='')=>`<button type="button" class="mp-row" data-action="${esc(action)}"><span class="row-icon">${icon(ic)}</span><span><b>${esc(title)}</b><span class="sub">${esc(sub)}</span></span>${tail||icon('chev')}</button>`;
 const status=(title,copy,ic='info',good=false)=>`<div class="mp-status"><div class="state-icon ${good?'good':''}">${icon(ic)}</div><h1 tabindex="-1">${title}</h1><p>${copy}</p></div>`;
 const rule=text=>`<p class="rc-rule">${icon('info')}<span>${text}</span></p>`;
 const card=(title,copy)=>`<section class="card mp-card-copy"><h2>${title}</h2><p>${copy}</p></section>`;
 const facts=rows=>`<section class="card rc-facts">${rows.map(([a,b])=>`<div><span>${esc(a)}</span><b ${a==='Link access'?'data-time-left':''}>${esc(b)}</b></div>`).join('')}</section>`;
 const name=id=>M.names[id]||'Someone';
 const person=(id,sub)=>`<section class="card rc-id"><span class="person-avatar">${id==='dev'?'DP':name(id).slice(0,1)}</span><span><b>${esc(name(id))}</b><span class="sub">${esc(sub)}</span></span></section>`;
 const amount=()=>M.formatAmount(s);
 const context=()=>amount()?facts([['For',name(s.context.person)],['Amount',amount()],['From',s.context.origin==='request'?'Your existing request':'Payment review']]):'';
 const details=(d=M.dest(s))=>d?facts([['Receive with',d.method],['Currency',d.currency],...d.fields]):'';
 const demoWarning=()=>rule('Demo details only. Do not use them for a real payment.');
 const left=()=>{const minutes=Math.max(0,Math.ceil(((M.record(s)?.expiresAt||0)-s.now)/60000));return minutes>60?Math.ceil(minutes/60)+' hours':minutes+' minutes';};
 function qr(){const r=M.record(s),key=r.id.split('-').pop(),q=QR_DATA[key];if(!q)return card('Restart this demo.','This local demo has used its sample codes. No real sharing link was created.');let d='';q.rows.forEach((row,y)=>{for(let x=0;x<q.n;x++)if(row[x]==='1')d+=`M${x} ${y}h1v1h-1z`;});return `<svg role="img" aria-label="Demo sharing QR code. Not a payment code." viewBox="0 0 ${q.n} ${q.n}"><rect width="${q.n}" height="${q.n}" fill="white"/><path d="${d}" fill="black"/></svg>`;}
 function screen(){
  const d=M.dest(s),r=M.record(s),owner=name(s.context.owner),aud=name(s.audience),isStop=s.command?.type==='stop';let header='Receive money',sub=M.own(s)?'Your payment details':owner+' shared with you',body='',foot='';
  switch(s.route){
   case 'methods':
    body=`<div><div class="eyebrow">${esc(M.own(s)?'You':owner)}</div><h1 class="hero" tabindex="-1">${M.own(s)?'Receive money.':'Payment details.'}</h1><p class="mp-meta">${M.own(s)?'Choose how someone can pay you.':'Only the details shared with you.'}</p></div>`+context();
    body+=`<section class="card mp-card">${M.available(s).map(d=>row(d.method,d.currency+' · '+(d.method==='Wallet'?d.network:'Saved receiving details'),'method:'+d.id,d.method==='Wallet'?'wallet':d.preferred?'phone':'bank',d.preferred?'<span class="mp-badge">Preferred</span>':'')).join('')}</section>`;
    body+=rule('Sharing details does not request money or change a balance.');foot=btn(M.own(s)?'Manage payment methods':'Back to payment',M.own(s)?'manage':'exit','secondary');break;
   case 'details':
    header=M.own(s)?'Your '+d.method+' details':d.method+' details';body=person(s.context.owner,M.own(s)?'Your receiving details':'Shared with you')+context()+details()+demoWarning();
    body+=`<section class="card mp-card">${row('Copy details',M.own(s)?'Review exactly what you copy':'For this payment only','copy-review','copy')}${M.own(s)?row('Use another method','Your saved receiving options','methods', 'wallet'):''}</section>`;
    foot=btn(M.own(s)?'Share details':'Back to payment',M.own(s)?'start-share':'exit');break;
   case 'audience':
    header='Share with';body=status('Who is this for?','Only this person can open the link in ChopDot.','person')+`<section class="card mp-card">${s.audienceOptions.map(id=>row(name(id),'Share this method only','audience:'+id,'person')).join('')}</section>`+rule('No group-wide sharing. No contacts are uploaded.');foot=btn('Back to details','details','secondary');break;
   case 'review':
    header='Review sharing';body=status('Just the details.','Check what '+aud+' will be able to open.','send')+person(s.audience,'Only this person · sign-in required')+details()+context()+facts([['Link access','24 hours'],['Shared','This payment method only']])+rule('Groups, expenses and other payment methods stay private.');foot=btn('Share with '+esc(aud),'prepare')+btn('Back to details','details','text-link');break;
   case 'preparing':case 'stopping':
    header=isStop?'Stopping link':'Preparing link';body=status(isStop?'Stopping access.':'Preparing your link.',isStop?'Please wait while this link is stopped.':'Your details stay private while we prepare this link.','refresh')+person(s.audience,d.method+' · '+d.currency);foot=btn('Please wait…','noop','primary','disabled');break;
   case 'recovery':
    header='Check sharing status';body=status('Still checking.',isStop?'We have not confirmed that the link is stopped. Check before trying again.':'We have not confirmed whether the link was created. Recover this result before trying again.','refresh')+person(s.audience,d?.method+' · '+d?.currency)+rule('Checking does not create another link or change a payment.');foot=btn('Check status','recover');break;
   case 'failed':
    header=isStop?'Link not stopped':'Link not created';body=status(isStop?'It was not stopped.':'No link was created.',isStop?'The service confirmed no change. Try the same action again.':'The service confirmed nothing was saved. You can safely try the same action again.','refresh')+person(s.audience,d?.method+' · '+d?.currency);foot=btn('Try again','retry');break;
   case 'ready':
    header='Ready to share';body=status('Ready for '+aud+'.','Show the code or share this private link.','send')+person(s.audience,d.method+' · '+d.currency)+facts([['Only for',aud],['Link access',left()+' left'],['Payment','Not confirmed']])+`<section class="card mp-card">${row('Preview what they see','This method only','recipient','person')}${row('Copy link','Sign-in is still required','copy-link','copy')}${row(s.context.origin==='request'?'Back to request':'Back to you','Keep this link available','exit','back')}</section>`+rule('A link being ready does not mean it was delivered, opened or paid.');foot=btn('Show code','code')+btn('Share link','share-preview','secondary')+btn('Stop this link','stop-confirm','text-link danger');break;
   case 'code':
    header='Show code';body=person(s.audience,'Only '+aud+' can open this')+`<section class="card rc-code"><h2>${esc(d.method)} · ${esc(d.currency)}</h2>${qr()}<p>Demo code · not a payment code</p></section>`+facts([['For',aud],['Link access',left()+' left']])+rule('They sign in to see your details. Scanning does not send money.');foot=btn('Back to sharing','ready')+btn('Stop this link','stop-confirm','text-link danger');break;
   case 'recipient':
    header='Recipient preview';sub='Preview only';body=`<span class="rc-chip">Viewing as ${esc(aud)} · demonstration</span>`+status(owner+' shared payment details.','Use the matching method and currency when you review a payment.','wallet')+details()+context()+demoWarning();foot=btn('Back to sharing','ready');break;
   case 'expired':
    header='Link expired';body=status('This link has expired.','Review the details again before creating another link.','clock')+rule('Old links cannot show the current details. Copies already taken cannot be recalled.');foot=btn('Review details again','refresh');break;
   case 'stop-confirm':
    header='Stop sharing';body=status('Stop this link?','This stops future access through this link.','close')+person(s.audience,d.method+' · '+d.currency)+rule('Anything already copied cannot be recalled. This does not cancel a request or a payment.');foot=btn('Stop link','stop','primary danger')+btn('Keep link','ready','secondary');break;
   case 'stopped':
    header='Link stopped';body=status('Link stopped.','It can no longer be used to open your details.','check',true)+rule('Copied details stay outside ChopDot. Your requests, payments and balances are unchanged.');foot=btn('Back to payment details','refresh');break;
   case 'changed':
    header='Details changed';body=status('Review the latest details.','The destination or payment context changed. We will not share the old version.','refresh')+rule('Nothing is silently switched. Check the method, currency and destination again.');foot=btn('Review current details','refresh');break;
   case 'unavailable':
    header='Details unavailable';body=status('Not available to share.','These details are no longer available, or your access changed.','info')+rule('Private receiving details are not shown here.');foot=btn('Back','safe-exit');break;
   case 'empty':
    body=status('Add a way to get paid.','Save your receiving details before sharing them.','wallet')+rule('No bank or wallet connection is required just to use ChopDot.');foot=btn('Manage payment methods','manage');break;
   case 'offline':
    header='You are offline';body=status('Reconnect to continue.','We cannot check whether these details or links are still current.','info')+rule('Nothing will be shared automatically when you reconnect.');foot=btn('Back','safe-exit');break;
   case 'copy-review':
    header='Review copied details';body=status('Copy only what you need.','Copied details can be pasted outside ChopDot. They cannot be recalled.','copy')+`<section class="card rc-copy"><textarea id="copy-text" aria-label="Demo receiving details to copy" readonly>${esc(M.raw(s))}</textarea></section>`+rule('Only the selected receiving method is included. No group history or account secrets.');if(s.copyState==='failed')body+=card('Copy is not available here.','Select the text above and copy it manually.');foot=btn(s.copyState==='copied'?'Copy again':'Copy details','copy-raw')+btn('Back to details','details','text-link');break;
   case 'share-preview':
    header='Share link';sub='Preview only';body=status('Choose where to share.','This is a preview of the device sharing step. Nothing leaves this demo.','send')+person(s.audience,'Only '+aud+' can open the link')+`<section class="card rc-link"><p>Sharing link · demonstration</p>${esc(M.link(s))}</section>`+`<section class="card mp-card">${row('Preview returning to ChopDot','Delivery cannot be confirmed','share-done','send')}${row('Preview cancelling','No new action in ChopDot','share-cancel','close')}${row('Preview sharing unavailable','Keep the same link','share-fail','info')}</section>`;foot=btn('Back to sharing','ready','secondary');break;
   case 'share-return':
    header='Back in ChopDot';body=status(s.shareResult==='cancelled'?'Sharing cancelled.':s.shareResult==='failed'?'Could not open sharing.':'Back in ChopDot.',s.shareResult==='cancelled'?'Your link is still available. Nothing changed in ChopDot.':s.shareResult==='failed'?'Show the code or copy the same link instead.':'Check your conversation. ChopDot cannot confirm delivery or payment.','info')+facts([['For',aud],['Payment','Not confirmed']]);foot=btn('Back to sharing','ready');break;
   case 'boundary':
    if(!s.access){header='Your profile';sub='Preview only';body=status('Back to your profile.','The previous details are no longer available.','person');foot=btn('Return to this example','resume');break;}
    header='Continue in ChopDot';sub='Preview only';body=status(s.boundary==='manage'?'Your payment methods.':s.context.origin==='settlement'?'Back to payment review.':s.context.origin==='request'?'Back to your request.':'Back to you.','This is the next journey’s handoff, not a new screen in that approved journey.','info')+context()+facts([['Method',d?.method||'None selected'],['Currency',d?.currency||s.context.currency||'Not selected'],['Payment','Unchanged']])+rule('The same person, scope and resulting balance return with you.');foot=btn(s.boundary==='manage'?'Return to receiving details':'Return to this example','resume');break;
  }
  if(s.toast)body+=`<p class="rc-toast" role="status">${esc(s.toast)}</p>`;
  return {header,sub,body,foot};
 }
 
return {...screen(),esc,icon,btn};
}

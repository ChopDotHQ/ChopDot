// Render templates extracted from unchanged approved J09; dynamic facts come from the canonical adapter.
export function renderPeople(s,M){const P=M.P;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const paths={back:'<path d="m15 18-6-6 6-6"/>',chev:'<path d="m9 18 6-6-6-6"/>',people:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',group:'<path d="M3 7h18v12H3zM6 7V4h12v3M8 11h8"/>',search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',check:'<path d="m5 12 4 4L19 6"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 11v6"/>',wallet:'<path d="M20 8V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v11H5a3 3 0 0 1-3-3V6"/><path d="M20 12h-5v4h5"/>',refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M18 7a7 7 0 0 0-11-2L4 8m2 9a7 7 0 0 0 11 2l3-3"/>',plus:'<path d="M12 5v14M5 12h14"/>',remove:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V3h6v4"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'};
 const icon=(id,cl='icon')=>`<svg class="${cl}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[id]||paths.info}</svg>`;
 const btn=(label,act,cl='primary',attrs='')=>`<button type="button" class="${cl}" data-action="${esc(act)}" ${attrs}>${label}</button>`;
 const row=(title,sub,act,ic='group',tail='',attrs='')=>`<button class="mp-row" data-action="${esc(act)}" ${attrs}><span class="row-icon">${icon(ic)}</span><span><b>${esc(title)}</b><span class="sub">${esc(sub)}</span></span>${tail||icon('chev','chevron')}</button>`;
 const section=(title,detail='')=>`<div class="mp-section"><h2>${title}</h2><span>${detail}</span></div>`;
 const card=(title,copy)=>`<section class="card mp-card-copy"><h2>${title}</h2><p>${copy}</p></section>`;
 const status=(title,copy,ic='info',good=false)=>`<div class="mp-status"><div class="state-icon ${good?'good':''}">${icon(ic)}</div><h1 tabindex="-1">${title}</h1><p>${copy}</p></div>`;
 const personRow=(p,group=false)=>`<button class="mp-row" data-action="person" data-person="${esc(p)}"><span class="person-avatar">${esc(M.PEOPLE[p].initials)}</span><span><b>${esc(M.name(p))}</b><span class="sub">${group?(M.owner(s)===p?'Group owner':'Member'):M.visibleGroups(s,p).length+' shared '+(M.visibleGroups(s,p).length===1?'group':'groups')}</span></span>${p===s.viewer?'<span class="mp-badge">You</span>':icon('chev','chevron')}</button>`;
 function screenData(){
  const p=M.PEOPLE[s.person]||Object.values(M.PEOPLE)[0],who=esc(p.name),g=esc(M.GROUPS[s.group]?.name||'Your groups'),scope=s.scope==='all'?'All shared groups':esc(M.GROUPS[s.scope]?.name||g);
  let header='People',sub=g,body='',foot='';
  if(!M.canView(s)&&!['access-changed','handoff'].includes(s.route))s.route='access-changed';
  if(s.route==='person'&&s.scope!=='all'&&!s.members[s.scope].includes(s.person))s.route='access-changed';
  switch(s.route){
  case 'members':{
   const members=s.members[s.group],invites=s.invites.filter(i=>i.group===s.group);
   body=`<div><div class="eyebrow">${g}</div><h1 class="hero" tabindex="-1">People.</h1><p class="mp-meta">${members.length} ${members.length===1?'member':'members'}${invites.length?' · '+invites.length+' invited':''}</p></div>`;
   if(!s.online)body+=`<div class="notice">${icon('info')}<span>Offline. Showing your saved group.</span></div>`;
   body+=`<section class="card mp-card">${members.map(p=>personRow(p,true)).join('')}</section>`;
   if(members.length===1)body+=card('Make room for your people.','Invite someone when you are ready to share expenses.');
   if(invites.length)body+=section('Invited')+`<section class="card mp-card">${invites.map(i=>row(M.name(i.person),'Has not joined yet','invite-detail','people','<span class="mp-badge">Pending</span>',`data-person="${i.person}"`)).join('')}</section>`;
   body+=`<section class="card mp-card">${row('Group roles','Who can do what','roles','people')}${row('All your people','Across your shared groups','directory','people')}</section>`;
   foot=btn(icon('plus')+' Invite someone','invite', 'primary',s.online?'':'disabled');break;}
  case 'directory':{
   header='Your people';sub='Across your groups';const filtered=M.directory(s);
   body=`<div><div class="eyebrow">Your shared groups</div><h1 class="hero" tabindex="-1">Familiar faces.</h1><p class="mp-meta">Find someone. Pick up where you left off.</p></div><label class="mp-search">${icon('search')}<input id="people-search" aria-label="Search people" value="${esc(s.query)}" placeholder="Search people" autocomplete="off"></label>`;
   body+=filtered.length?`<section class="card mp-card">${filtered.map(p=>personRow(p)).join('')}</section>`:`<section class="card mp-empty"><h2>No matches.</h2><p>Try another name.</p></section>`;
   foot=btn('Back to group','members');break;}
  case 'person':{
   header=p.name;sub=scope;const self=s.person===s.viewer;
   body=`<div class="mp-top"><span class="person-avatar">${p.initials}</span><div><h1 tabindex="-1">${who}.</h1><span class="caption">${s.scope==='all'?'Your shared groups':(M.owner(s,s.scope)===s.person?'Group owner':'Member')+' · '+scope}</span></div></div>`;
   if(self){body+=card('Your place here.',`${M.owner(s)===s.viewer?'You own':'You are a member of'} ${g}.`);}
   else{
    const balances=M.balances(s,s.person),currencies=Object.keys(balances);if(!currencies.length)currencies.push(M.GROUPS[s.group].currency);
    for(const c of currencies){const n=balances[c]||0n;const blocked=M.affected(s,s.person);
     body+=`<section class="card mp-card"><div class="mp-money"><span class="label">${n===0n?'Nothing to settle':n<0n?'You owe '+who:who+' owes you'}</span><div class="value ${n>0n?'positive':''}">${M.amount(n,c)}</div><p class="mp-meta">${scope}${blocked?' · May change':''}</p></div>${n!==0n?btn(blocked?'Review open issue':(n<0n?'Settle ':'Request ')+M.amount(n,c)+icon('chev'),blocked?'review-issue':'payment','mp-balance-action',`data-currency="${c}" ${(!s.online||!M.canMoney(s))?'disabled':''}`):''}</section>`;
    }
    if(M.affected(s,s.person))body+=card('One expense is still in review.','Only this balance is affected. Other people remain available.');
   }
   body+=section('Shared with you')+`<section class="card mp-card">${row('Payment preference',M.preference(s)?M.preference(s)+' preferred':'Not shared','preferences','wallet')}${row('Shared groups',M.visibleGroups(s,s.person).length+' together','groups','group')}</section>`;
   if(s.scope!=='all'&&!self&&M.owner(s)===s.viewer)body+=btn('Manage in this group','manage','text-link');
   foot=btn('Back to people',s.scope==='all'?'directory':'members');break;}
  case 'groups':{
   header='Shared groups';sub=p.name;body=`<div><div class="eyebrow">You and ${who}</div><h1 class="hero" tabindex="-1">Your groups.</h1></div>`;
   body+=`<section class="card mp-card">${M.visibleGroups(s,s.person).map(k=>{const n=M.balances(s,s.person,k)[M.GROUPS[k].currency]||0n;return row(M.GROUPS[k].name,n===0n?'Nothing to settle':n<0n?'You owe '+who:who+' owes you','open-group','group',`<span class="mp-row-money"><b class="${n>0n?'positive':''}">${M.amount(n,M.GROUPS[k].currency)}</b></span>`,`data-group="${esc(k)}"`);}).join('')}</section>`;
   foot=btn('Back to '+who,'back');break;}
  case 'preferences':{
   header='Payment preference';sub=p.name;const pref=M.preference(s);
   body=status(pref?who+' prefers '+esc(pref)+'.':'Details not shared.',pref?'You can review payment options when you settle.':who+' has not shared a payment preference with you.','wallet');
   body+=pref?card('Shared with you',esc(pref)+' · No account details shown here.'):card('Still private.','No phone number, bank details or wallet address is revealed.');
   if(s.person===s.viewer)body+=`<section class="card mp-card">${row('Manage your methods','Choose what you share','own-methods','wallet')}</section>`;
   else body+=`<p class="mp-rule">Only ${who} can change their payment details.</p>`;
   foot=btn('Back to '+who,'back');break;}
  case 'roles':header='Group roles';body=status('Everyone has a place.','Roles apply only to '+g+'.','people')+card('Group owner',esc(M.name(M.owner(s)))+' manages invitations and members.')+card('Members','Add shared expenses and review their own share.')+card('Payments stay personal.','A group role never lets someone approve your payment or confirm receipt for you.');foot=btn('Back to people','back');break;
  case 'manage':header='Manage member';sub=g;body=`<div class="mp-top"><span class="person-avatar">${p.initials}</span><div><h1 tabindex="-1">${who}.</h1><span class="caption">Member · ${g}</span></div></div>`+card('Only this group.','Changes here do not remove '+who+' from other groups or erase past expenses.')+`<section class="card mp-card">${row('Remove from this group','Review before removing','remove','remove')}</section>`;foot=btn('Back to '+who,'back');break;
  case 'remove-confirm':header='Remove member';sub=g;body=status('Remove '+who+'?',who+' will lose access to '+g+'.','remove')+card('Past expenses stay.','Their name remains on shared records. Nothing changes in other groups.')+card('Nothing left to settle here.','No open payments or expense issues in this group.');foot=btn('Remove from group','confirm-remove','primary danger')+btn('Keep '+who,'back','secondary');break;
  case 'remove-blocked':header='Keep this clear';body=status('Settle up first.','There are still open items with '+who+' in '+g+'.','info')+card('No one has been removed.','Resolve the amount or open issue before changing membership.');foot=btn('View balance','person-return')+btn('Back','back','secondary');break;
  case 'remove-saving':header='Updating group';body=status('Removing '+who+'…','We are saving this change.','clock');foot=btn('Saving…','noop','primary','disabled');break;
  case 'remove-unknown':header='Updating group';body=status('Still checking.','We could not confirm whether the change was saved. Check the same request before trying again.','refresh')+card('Your records stay.','No expenses or balances will be deleted.');foot=btn('Check status','recover');break;
  case 'remove-failed':header='Change not saved';body=status('No one was removed.','Try the same change again when you are ready.','info');foot=btn('Try again','retry')+btn('Back to people','members','secondary');break;
  case 'removed':header='Group updated';body=status(who+' was removed.','From '+g+' only.','check',true)+card('Past records are still here.','Their shared expenses remain. Your other groups are unchanged.');foot=btn('Back to people','members');break;
  case 'access-changed':header='Access changed';sub='ChopDot';body=status('This view has changed.','You may no longer have access, or this person may have left. Refresh before continuing.','info');foot=btn('Back to your people','safe-directory');break;
  case 'offline':header='You are offline';body=status('Your group is saved.','You can look around. Reconnect before inviting or making changes.','info');foot=btn('View saved people','members');break;
  case 'loading':header='Loading people';body=`<h1 class="hero" tabindex="-1">One moment.</h1><section class="card loading-card"><div class="skel short"></div><div class="skel"></div><div class="skel med"></div></section>`;foot=btn('Back','members');break;
  case 'error':header='Could not load';body=status('People could not load.','Your group has not changed. Please try again.','refresh');foot=btn('Try again','members');break;
  case 'handoff':{
   const h=s.handoff;header=h?.title||'Continue';sub=h?.subtitle||g;
   if(h?.payment){const t=h.payment;body=status(t.kind==='settle'?'Ready to settle.':'Ready to request.','Review this exact amount in the next step.','wallet')+`<section class="card mp-money"><span class="label">${t.kind==='settle'?'You pay '+esc(M.name(t.recipient)):esc(M.name(t.payer))+' pays you'}</span><div class="value">${M.amount(t.amountMinor,t.currency)}</div><p class="mp-meta">${t.sourceGroups.map(k=>esc(M.GROUPS[k].name)).join(' · ')}</p></section>`+card('Payment method',esc(t.paymentMethod||'Choose when you settle'));
    body+=`<div class="mp-inline">${icon('info')}<span>Preview only. No request was sent and no payment was started.</span></div>`;
   }else body=status(esc(h?.title||'Continue')+'.',esc(h?.copy||'Your place is kept for the next step.'),h?.icon||'people')+`<div class="mp-inline">${icon('info')}<span>Preview only. No invitation, profile or group setting was changed.</span></div>`;
   foot=btn(h?.backLabel||'Back','back');break;}
  }
  return {header,sub,body,foot};
 }
 
return {...screenData(),esc,icon,btn};
}

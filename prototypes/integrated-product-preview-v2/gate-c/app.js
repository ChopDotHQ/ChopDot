import {publishPrototypeRoute} from '../prototype-route.js';
import {member} from '../create-join/model.js';
import {currentActor,routeParticipant} from '../create-join/authority.js';
import {routeLocalSession} from '../session-guard.js';
import {requirePrototypeWriter,assertPrototypeWriter} from '../prototype-writer.js';
import {repository,scopeProof,METHODS} from './model.js';
import {allGroups as canonicalGroups,people,pairs,sources,sum,resolveScope,makePlan,unresolved,fail} from './ledger.js';
import {moneyFromMinorUnits,moneyFromPreviewDecimal,moneyToDecimal,formatPreviewMoney} from '../money-v1.js';
import {addGoldenExample} from './fixtures.js';
import {repository as expenseRepository} from '../gate-b/model.js';
await requirePrototypeWriter();
const allGroups=s=>{const p=member(s,currentActor());return canonicalGroups(s).filter(g=>!p||g.id===p.groupId);};
const core=await fetch('../gate-b/contract/semantic-core.json').then(r=>{if(!r.ok)throw Error('Contract unavailable');return r.json();});
const docs=Object.fromEntries(await Promise.all(['j10','j11','j12'].map(async j=>[j,new DOMParser().parseFromString(await fetch(`./goldens/${j}.html`).then(r=>{if(!r.ok)throw Error('Golden unavailable');return r.text();}),'text/html')])));
const repo=repository(localStorage,assertPrototypeWriter), expenseRepo=expenseRepository(localStorage,core,assertPrototypeWriter);
const fixtureMode=new URLSearchParams(location.search).has('fixtures');
let actor=currentActor()!=='self'?currentActor():fixtureMode?sessionStorage.getItem('chopdot.gate-b.actor')||'self':'self';
let state,route,screen,draft,busy=false;
const app=document.querySelector('#app');
const el=(tag,cls='',value)=>{const n=document.createElement(tag);n.className=cls;if(value!==undefined)n.textContent=value;return n;};
const $=q=>screen.querySelector(q), $$=q=>[...screen.querySelectorAll(q)];
const text=(q,value)=>{$$(q).forEach(n=>n.textContent=value);};
const name=id=>id===actor?'You':id==='self'?(state.group?.membershipManaged?(state.gateD?.account.displayName==='You'?'Group owner':state.gateD?.account.displayName||'Group owner'):'Guest'):people(state).find(p=>p.id===id)?.name||id;
const owesLabel=(debtor,creditor)=>debtor===actor?`You owe ${name(creditor)}`:`${name(debtor)} owes ${creditor===actor?'you':name(creditor)}`;
const groupName=id=>allGroups(state).find(g=>g.id===id)?.name||id;
const initials=id=>name(id).split(/\s+/).map(x=>x[0]).join('').slice(0,2);
const money=(n,c='CHF',e=2)=>formatPreviewMoney(moneyFromMinorUnits(BigInt(n)<0n?-BigInt(n):BigInt(n),c,e));
const decimal=(n,c='CHF',e=2)=>moneyToDecimal(moneyFromMinorUnits(n,c,e));
const dateLabel=iso=>iso?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date(iso))+' UTC':'Not recorded';
const command=(type,p,extra={})=>({type,id:p.id,actor,operationId:crypto.randomUUID(),...extra});
function guard(fn){return (...args)=>{if(busy)return;try{return fn(...args);}catch(e){showError(e);}};}
function action(q,fn){$$(q).forEach(a=>{a.dataset.bound='true';a.onclick=guard(ev=>{ev.preventDefault();fn(ev);});});}
function button(label,fn,cls='gc-button'){const n=el('button',cls,label);n.type='button';n.onclick=guard(fn);return n;}
function link(label,fn,cls='text-link'){const n=el('a',cls,label);n.href='#';n.dataset.bound='true';n.onclick=guard(ev=>{ev.preventDefault();fn();});return n;}
function nav(page,params={}){const hash=new URLSearchParams({page,...params}).toString();if(location.hash.slice(1)===hash)render();else location.hash=hash;}
function notifyParent(){publishPrototypeRoute('chopdot-gate-c-route',location.hash);}
function mount(j,id){
 const t=docs[j].getElementById(id);if(!t)throw Error(`Missing Golden ${j}/${id}`);
 document.querySelector('#golden-style').textContent=[...docs[j].querySelectorAll('style')].map(s=>s.textContent).join('\n');
 screen=t.cloneNode(true);screen.dataset.journey=j;screen.dataset.golden=id;screen.tabIndex=-1;screen.querySelectorAll('script').forEach(x=>x.remove());
 screen.querySelectorAll('[data-scope-ref],[data-idempotency-key]').forEach(x=>{x.removeAttribute('data-scope-ref');x.removeAttribute('data-idempotency-key');});app.replaceChildren(screen);
 action('[aria-label="Back"]',()=>nav('position'));
}
function note(message,error=false){const n=el('p',`gc-note${error?' gc-error':''}`,message);n.role=error?'alert':'status';($('.app-content')||screen).prepend(n);return n;}
function card(title){const n=el('section','card gc-card');if(title)n.append(el('h2','',title));return n;}
function footer(actions){const f=$('.focus-footer,.app-footer');f.replaceChildren();const stack=el('div','footer-stack');for(const [label,fn,cls] of actions)stack.append(link(label,fn,cls||'secondary'));f.append(stack);}
function header(title,subtitle=''){text('.header-title b',title);text('.header-title span',subtitle);}
function row(label,sub,value,fn){const n=el(fn?'a':'div','gc-row');const body=el('div');body.append(el('b','',label),el('span','',sub));n.append(body,el('strong','',value));if(fn){n.href='#';n.dataset.bound='true';n.onclick=guard(e=>{e.preventDefault();fn();});}return n;}
function toGroup(groupId=state.group?.id,page='group',id=''){
 if(groupId)repo.selectGroup(groupId);
 if(parent!==window)parent.postMessage({type:'chopdot-gate-c-exit'},location.origin);
 location.href=`../gate-b/index.html${fixtureMode?'?fixtures=1':''}#${new URLSearchParams({page,...(id?{id}:{})})}`;
}
function saveDraft(){repo.saveDraft(actor,draft);}
function getDraft(){const d=state.gateC.drafts[actor];if(!d)fail('DRAFT','Choose a balance to settle first.');return structuredClone(d);}
function currentPlan(){const scope=resolveScope(state,draft.scope);return {scope,plan:makePlan(scope.rows,draft.amount,draft.plan)};}
function begin(other,currency,exponent=2,groupId=null){
 const available=sources(state,actor,other).filter(r=>r.currency===currency&&r.exponent===Number(exponent)&&(!groupId||r.groupId===groupId)&&BigInt(r.minor)&&!r.disputed);
 const scope={payer:actor,recipient:other,currency,exponent:Number(exponent),groupIds:[...new Set(available.map(r=>r.groupId))],sourceIds:available.map(r=>r.id),kind:groupId?'group':'person'};
 const resolved=resolveScope(state,scope);
 draft={id:crypto.randomUUID(),idempotencyKey:crypto.randomUUID(),operationId:crypto.randomUUID(),scope,amount:resolved.total,method:'TWINT',plan:{useOffsets:true},createdAt:new Date().toISOString()};saveDraft();nav('settle');
}
function currencyCards(container,entries){
 const template=docs.j10.querySelector('#people .position-card');
 const keys=[...new Set(entries.map(p=>`${p.currency}:${p.exponent}`))];
 if(!keys.length)keys.push('CHF:2');
 for(const key of keys){const [c,e]=key.split(':'),items=entries.filter(p=>p.currency===c&&p.exponent===Number(e));
  const owe=sum(items.filter(p=>BigInt(p.minor)>0n).map(p=>p.minor)),owed=-sum(items.filter(p=>BigInt(p.minor)<0n).map(p=>p.minor));
  const box=template.cloneNode(true);box.classList.add('gc-currency-card');box.querySelector('.position-net').classList.toggle('negative',owed<owe);box.querySelector('.position-net').classList.toggle('zero',owed===owe);box.querySelector('.position-net').textContent=`${owed-owe>=0n?'+':'−'}${money(owed-owe,c,Number(e))}`;
  box.querySelectorAll('.gross b').forEach((n,i)=>n.textContent=money(i?owed:owe,c,Number(e)));
  const disputed=items.some(p=>p.rows.some(r=>r.disputed));const pending=items.some(p=>p.rows.some(r=>Object.values(state.expenses.find(e=>e.id===r.expenseId)?.reviews||{}).some(v=>v.status!=='agreed')));box.querySelector('.ready-line span').textContent=disputed?'Some balances have an open issue':pending?'Some balances may change':'All balances reviewed';container.append(box);
 }
}
function positionPage(){
 const isGroups=route.tab==='groups';mount('j10',isGroups?'groups':'people');
 const content=$('.app-content'),originalCard=$('.position-card'),wrap=el('div');currencyCards(wrap,pairs(state,actor));originalCard.replaceWith(...wrap.children);
 text('.avatar',initials(actor));
 action('[href="#people"]',()=>nav('position'));action('[href="#groups"]',()=>nav('position',{tab:'groups'}));
 if(isGroups){const list=$('.group-list');list.replaceChildren();for(const g of allGroups(state)){
   const entries=pairs(state,actor,g.id).filter(p=>BigInt(p.minor)),label=entries.length?entries.map(p=>`${BigInt(p.minor)>0n?'Owe':'Owed'} ${money(p.minor,p.currency,p.exponent)}`).join(' · '):'You’re square';
   list.append(row(g.name,`${entries.length} open balances`,label,()=>nav('group',{group:g.id})));}
   text('.section-title span',`${allGroups(state).length} active`);
 }else{const lists=$$('.people-list');lists.forEach(n=>n.replaceChildren());const entries=pairs(state,actor).filter(p=>BigInt(p.minor));
   for(const p of entries){const n=docs.j10.querySelector('#people .person-row').cloneNode(true);n.querySelector('.person-avatar').textContent=initials(p.other);n.querySelector('.person-copy b').textContent=name(p.other);n.querySelector('.person-copy span').textContent=`${new Set(p.rows.map(r=>r.groupId)).size} ${p.currency} groups`;
    n.querySelector('.row-money b').classList.toggle('positive',BigInt(p.minor)<0n);n.querySelector('.row-money b').textContent=`${BigInt(p.minor)>0n?'−':'+'}${money(p.minor,p.currency,p.exponent)}`;n.querySelector('.row-money span').textContent=p.rows.some(r=>r.disputed)?'May change':BigInt(p.minor)>0n?'Settle':'Request';n.dataset.bound='true';n.href='#';n.onclick=guard(ev=>{ev.preventDefault();nav('person',{other:p.other,currency:p.currency,exponent:p.exponent});});lists[BigInt(p.minor)>0n?0:1].append(n);}
   $$('.section-title span').forEach((n,i)=>n.textContent=`${entries.filter(p=>(BigInt(p.minor)>0n)===(i===0)).length} balances`);
   if(!entries.length)lists[0].append(el('p','gc-card','You’re square. Add an expense when you’re ready.'));
   $('[href="#mixed"]')?.remove();
 }
 content.append(link('Payment activity',()=>nav('activity')));
 action('[href="#home-handoff"]',()=>toGroup());action('[href="#add-handoff"]',()=>toGroup(state.group?.id,'editor'));action('[href="#activity-handoff"]',()=>{location.href=`../gate-d/index.html${fixtureMode?'?fixtures=1':''}#page=activity`;});action('[href="#you-handoff"]',()=>{location.href=`../gate-d/index.html${fixtureMode?'?fixtures=1':''}#page=account-overview`;});
 if(state.gateC.environment.offline)note('Offline. Showing saved balances.');
}
function groupPage(){
 mount('j11','group-select');const group=allGroups(state).find(g=>g.id===route.group);if(!group)fail('GROUP','Group unavailable.');header('Settle in '+group.name,'Choose a person');
 const content=$('.app-content');content.replaceChildren();const list=card('Balances');for(const p of pairs(state,actor,group.id).filter(p=>BigInt(p.minor))){list.append(row(name(p.other),BigInt(p.minor)>0n?'You owe':'Owes you',money(p.minor,p.currency,p.exponent),()=>nav('person',{other:p.other,currency:p.currency,exponent:p.exponent,group:group.id})));}if(!list.querySelector('.gc-row'))list.append(el('p','','You’re square in this group.'));content.append(list);
 footer([['Open Group Home',()=>toGroup(group.id),'primary'],['Back to balances',()=>nav('position',{tab:'groups'})]]);
}
function personPage(){
 mount('j10','jeanine');const rows=sources(state,actor,route.other).filter(r=>r.currency===route.currency&&r.exponent===Number(route.exponent||2)&&(!route.group||r.groupId===route.group));const n=sum(rows.map(r=>r.minor)), c=route.currency,e=Number(route.exponent||2);
 header(name(route.other),route.group?groupName(route.group):'Across included groups');text('.direction',n>0n?`You owe ${name(route.other)}`:n<0n?`${name(route.other)} owes you`:'You’re square');text('.amount',money(n,c,e));$('.detail-summary .amount').classList.toggle('positive',n<0n);text('.detail-summary .sub',`${c} only`);
 const equations=$$('.net-equation');const positive=sum(rows.filter(r=>BigInt(r.minor)>0n).map(r=>r.minor)),negative=sum(rows.filter(r=>BigInt(r.minor)<0n).map(r=>r.minor));
 [positive,negative,n].forEach((v,i)=>{equations[i].querySelector('b').textContent=`${v<0n?'− ':''}${money(v,c,e)}`;});equations[0].querySelector('span').textContent=`You owe ${name(route.other)}`;equations[1].querySelector('span').textContent=`${name(route.other)} owes you`;equations[2].querySelector('span').textContent=n>=0n?'Net you owe':'Net owed to you';
 const list=$('.breakdown');list.replaceChildren();text('.section-title span',`${c} only`);
 for(const r of rows){list.append(row(groupName(r.groupId),`${r.description} · ${r.disputed?'Open issue':BigInt(r.minor)>=0n?'You owe':'Owed to you'}`,money(r.minor,c,e),()=>toGroup(r.groupId,'detail',r.expenseId)));}
 const actions=[];if(n>0n)actions.push([`Settle ${money(n,c,e)}`,()=>begin(route.other,c,e,route.group||null),'primary pink']);else if(n<0n)actions.push(['Request payment',()=>{location.href=`../expansion/index.html${fixtureMode?'?fixtures=1':''}#${new URLSearchParams({family:'13',page:'compose',person:route.other,currency:c,exponent:String(e),scope:route.group||'all',group:route.group||state.group.id})}`;},'primary']);actions.push(['Back to balances',()=>route.group?nav('group',{group:route.group}):nav('position')]);footer(actions);
 if(rows.some(r=>r.disputed))note('Included issues may change this balance. Only eligible sources can be selected for payment.');
}
function showApplication(container,rows,plan,context){
 const section=card('After this payment');const gids=[...new Set(rows.map(r=>r.groupId))];
 for(const gid of gids){const after=sum(plan.after.filter(r=>r.groupId===gid).map(r=>r.minor));section.append(row(groupName(gid),after>0n?owesLabel(context.payer,context.recipient):after<0n?owesLabel(context.recipient,context.payer):'These included balances are settled',money(after,context.currency,context.exponent)));}
 section.append(el('p','gc-small',`Only the selected balances change. ${money(plan.remaining,context.currency,context.exponent)} remains in this scope.`));container.append(section);
}
function settlePage(){
 draft=getDraft();const {scope,plan}=currentPlan();mount('j11','settle');header(`Settle with ${name(draft.scope.recipient)}`,`${draft.scope.currency} · ${draft.scope.groupIds.map(groupName).join(' + ')}`);
 text('.settle-hero .person-avatar',initials(draft.scope.recipient));text('.amount-display',money(draft.amount,draft.scope.currency,draft.scope.exponent));text('.settle-hero h1',name(draft.scope.recipient));text('.settle-hero .sub',draft.scope.kind==='group'?groupName(draft.scope.groupIds[0]):`Across ${draft.scope.groupIds.length} selected groups`);
 text('.ready-card b','Ready to review');text('.ready-card div span',`${scope.rows.length} eligible source items`);text('[href="#methods"] b',draft.method);text('[href="#methods"] div span','Selected method');text('[href="#amount"] b',draft.amount===scope.total?'Pay full balance':'Pay part now');text('[href="#amount"] div span',money(draft.amount,draft.scope.currency,draft.scope.exponent));
 action('[href="#breakdown"]',()=>nav('scope'));action('[href="#methods"]',()=>nav('methods'));action('[href="#amount"]',()=>nav('amount'));
 action('.primary',prepareDraft);action('.secondary,[aria-label="Back"]',()=>nav('person',{other:draft.scope.recipient,currency:draft.scope.currency,exponent:draft.scope.exponent,...(draft.scope.kind==='group'?{group:draft.scope.groupIds[0]}:{})}));
 showApplication($('.app-content'),scope.rows,plan,draft.scope);
}
function prepareDraft(){
 const resolved=resolveScope(state,draft.scope);
 const remainderOf=state.gateC.payments.filter(p=>p.state==='partial'&&unresolved(state,p)&&p.payer===actor&&p.recipient===draft.scope.recipient&&p.currency===draft.scope.currency&&p.exponent===draft.scope.exponent&&p.sources.some(r=>resolved.rows.some(x=>x.id===r.id))).map(p=>p.id);
 state=repo.commit({type:'prepare',actor,id:draft.id,operationId:draft.operationId,idempotencyKey:draft.idempotencyKey,scope:draft.scope,amount:draft.amount,method:draft.method,plan:draft.plan,reviewed:true,remainderOf});nav('payment',{id:draft.id});
}
function scopePage(){
 draft=getDraft();mount('j11','breakdown');header('Included balances',name(draft.scope.recipient));const content=$('.app-content');content.replaceChildren();
 const all=sources(state,actor,draft.scope.recipient).filter(r=>r.currency===draft.scope.currency&&r.exponent===draft.scope.exponent&&BigInt(r.minor));const selected=new Set(draft.scope.sourceIds||[]), list=card('Choose what to settle');
 for(const r of all){const label=el('label','gc-row'),input=el('input');input.type='checkbox';input.checked=selected.has(r.id);input.disabled=r.disputed;input.setAttribute('aria-label',`${groupName(r.groupId)} · ${r.description}`);input.onchange=()=>{input.checked?selected.add(r.id):selected.delete(r.id);};label.append(input);const body=el('div');body.append(el('b','',groupName(r.groupId)),el('span','',`${r.description}${r.disputed?' · Open issue':''}`));label.append(body,el('strong','',`${BigInt(r.minor)<0n?'Credit ':''}${money(r.minor,draft.scope.currency,draft.scope.exponent)}`));list.append(label);}
 content.append(list,el('p','gc-small','Only selected sources will be included. Changing the scope returns to the full eligible amount for review.'));
 footer([['Use selected balances',()=>{const rows=all.filter(r=>selected.has(r.id));draft.scope.sourceIds=rows.map(r=>r.id);draft.scope.groupIds=[...new Set(rows.map(r=>r.groupId))];draft.scope.kind=draft.scope.groupIds.length===1?'group':'person';draft.amount=resolveScope(state,draft.scope).total;draft.plan={useOffsets:true};saveDraft();nav('settle');},'primary'],['Back',()=>nav('settle')]]);
}
function methodsPage(){
 draft=getDraft();mount('j11','methods');header('Choose how to pay',name(draft.scope.recipient));
 $$('.method-row').forEach((n,i)=>{const method=METHODS.find(m=>n.querySelector('b')?.textContent.includes(m))||(i===2?'Wallet':i===3?'Cash':'PayPal');n.querySelector('b').textContent=method;n.querySelector('.method-copy span').textContent=method==='Wallet'?'Simulated quote available for CHF 54.30':'External payment · recipient confirms';n.querySelector('.method-side')?.replaceChildren();n.dataset.bound='true';n.onclick=guard(ev=>{ev.preventDefault();draft.method=method;saveDraft();nav(method==='TWINT'?'settle':'method_details');});});
 action('[aria-label="Back"]',()=>nav('settle'));
}
function methodDetailsPage(){
 draft=getDraft();const method=draft.method,j={ 'Bank transfer':'bank',Wallet:'wallet',Cash:'cash',PayPal:'paypal' }[method]||'settle';
 mount('j11',j);header(method,`${name(draft.scope.recipient)} · ${money(draft.amount,draft.scope.currency,draft.scope.exponent)}`);
 text('.settle-hero .person-avatar',initials(draft.scope.recipient));text('.settle-hero h1',name(draft.scope.recipient));text('.amount-display',money(draft.amount,draft.scope.currency,draft.scope.exponent));text('.settle-hero .sub',draft.scope.groupIds.map(groupName).join(' + '));
 if(method==='Bank transfer'){
  const values=[name(draft.scope.recipient),'DEMO — NO BANK ACCOUNT',`ChopDot · ${draft.id.slice(0,8)}`];
  $$('.copy-row').forEach((r,i)=>{r.querySelector('b').textContent=values[i];const a=r.querySelector('a');a.setAttribute('aria-label',`Copy ${r.querySelector('span').textContent}`);a.dataset.bound='true';a.onclick=guard(async ev=>{ev.preventDefault();try{await navigator.clipboard.writeText(values[i]);note('Copied. These are prototype details only.');}catch{note('Copy unavailable. The displayed prototype value is still available.');}});});
 }else if(method==='Wallet'){
  text('.account-box b','Demo wallet');text('.account-box div span','No live wallet connected');text('.account-box .action','Simulation');text('.quote-amount','7.812500 DOT');text('.quote-sub','Demo equivalent for CHF 54.30');
  $$('.quote-cell b').forEach((n,i)=>n.textContent=i?'7.812500 DOT':'0.012000 DOT · demo');text('.quote-cell:last-child span',`${name(draft.scope.recipient)} receives`);
  action('[href="#wallet-dot"]',()=>render());action('[href="#wallet-usdc"]',()=>showError({code:'QUOTE',message:'No USDC quote is available in this prototype. Choose the DOT demo quote or another method.'}));
 }else if(method==='Cash')text('.summary-row:last-child b',`${name(draft.scope.recipient)} confirms next`);
 else {text('.summary-row:first-child b','Demo recipient · no live account');text('.summary-row:last-child b',money(draft.amount,draft.scope.currency,draft.scope.exponent));}
 const labels={'Bank transfer':'Review transfer',Wallet:'Review wallet payment',Cash:'Record a payment',PayPal:'Review PayPal payment'};
 footer([[labels[method]||'Review payment',prepareDraft,'primary pink'],['Choose another method',()=>nav('methods')]]);action('[aria-label="Back"]',()=>nav('methods'));
}
function amountPage(){
 draft=getDraft();const scope=resolveScope(state,draft.scope);mount('j11','amount');header('Payment amount',`${name(draft.scope.recipient)} · ${draft.scope.currency}`);text('.amount-edit label',`Pay ${name(draft.scope.recipient)}`);
 const input=$('.amount-input');input.value=decimal(draft.amount,draft.scope.currency,draft.scope.exponent);input.setAttribute('aria-label','Payment amount');
 const allocation=card('Apply this payment'),content=$('.app-content');content.append(allocation);let planOptions=structuredClone(draft.plan), lastPlan;
 const rebuild=()=>{
  allocation.replaceChildren(el('h2','','Apply this payment'));
  const selected=moneyFromPreviewDecimal(input.value,draft.scope.currency,draft.scope.exponent).minorUnits;
  $('.focus-footer .primary').removeAttribute('aria-disabled');$('.focus-footer .primary').tabIndex=0;
  if(selected===scope.total)planOptions={...planOptions,useOffsets:true};
  lastPlan=makePlan(scope.rows,selected,planOptions);
  const full=BigInt(scope.total),twenty=20n*10n**BigInt(draft.scope.exponent),half=(full+1n)/2n;
  $$('.amount-chip').forEach((n,i)=>n.classList.toggle('active',i===2?selected===scope.total:i===1?BigInt(selected)===half&&selected!==scope.total:BigInt(selected)===twenty&&selected!==scope.total&&twenty!==half));
  text('.remaining',`${money(lastPlan.remaining,draft.scope.currency,draft.scope.exponent)} remains`);text('.focus-footer .primary',`Use ${money(selected,draft.scope.currency,draft.scope.exponent)}`);
  if(scope.rows.some(r=>BigInt(r.minor)<0n)){
   const label=el('label','gc-row'),check=el('input');check.type='checkbox';check.checked=lastPlan.useOffsets;check.disabled=selected===scope.total;check.title=check.disabled?'Clearing the full net balance includes these offsets.':'';check.setAttribute('aria-label','Apply included offsets');check.onchange=guard(()=>{planOptions={useOffsets:check.checked};rebuild();allocation.querySelector('[aria-label="Apply included offsets"]')?.focus();});label.append(check,el('span','','Apply the included offsets'));allocation.append(label);
  }
  allocation.append(el('p','gc-small','Suggested order: oldest recorded expense first. Choose exact amounts below to change where the payment goes. If less arrives, that amount follows the displayed order and limits.'));
  const cash={...lastPlan.cashBySource};
  for(const id of lastPlan.order){const r=scope.rows.find(r=>r.id===id),label=el('label','gc-row'),body=el('div');body.append(el('b','',groupName(r.groupId)),el('span','',r.description));const amount=el('input');amount.type='text';amount.inputMode='decimal';amount.value=decimal(cash[id],draft.scope.currency,draft.scope.exponent);amount.setAttribute('aria-label',`Pay toward ${r.description}`);amount.oninput=()=>{try{cash[id]=moneyFromPreviewDecimal(amount.value,draft.scope.currency,draft.scope.exponent).minorUnits;planOptions.cashBySource={...cash};}catch{planOptions.cashBySource={...cash,[id]:'invalid'};}
   preview.replaceChildren();try{lastPlan=makePlan(scope.rows,selected,planOptions);showApplication(preview,scope.rows,lastPlan,draft.scope);$('.focus-footer .primary').removeAttribute('aria-disabled');$('.focus-footer .primary').tabIndex=0;}catch{const invalid=el('p','gc-error','Enter exact source amounts that add up to the selected payment.');invalid.role='alert';preview.append(invalid);$('.focus-footer .primary').setAttribute('aria-disabled','true');$('.focus-footer .primary').tabIndex=-1;}};label.append(body,amount);allocation.append(label);}
  const preview=el('div');showApplication(preview,scope.rows,lastPlan,draft.scope);allocation.append(preview);
 };
 input.oninput=()=>{planOptions={useOffsets:planOptions.useOffsets!==false};try{rebuild();}catch(e){const invalid=el('p','gc-error',e.message);invalid.role='alert';allocation.replaceChildren(invalid);$('.focus-footer .primary').setAttribute('aria-disabled','true');$('.focus-footer .primary').tabIndex=-1;}};
 $$('.amount-chip').forEach((a,i)=>{const full=BigInt(scope.total),twenty=20n*10n**BigInt(draft.scope.exponent);if(i===0){a.textContent=money(twenty,draft.scope.currency,draft.scope.exponent);if(twenty>full){a.setAttribute('aria-disabled','true');a.tabIndex=-1;}}a.classList.toggle('active',i===2&&draft.amount===scope.total);a.dataset.bound='true';a.onclick=guard(ev=>{ev.preventDefault();if(i===0&&twenty>full)return;const n=i===0?twenty:i===1?(full+1n)/2n:full;input.value=decimal(n,draft.scope.currency,draft.scope.exponent);planOptions={useOffsets:true};rebuild();});});
 action('.primary',()=>{const amount=moneyFromPreviewDecimal(input.value,draft.scope.currency,draft.scope.exponent).minorUnits;makePlan(scope.rows,amount,planOptions);draft.amount=amount;draft.plan=planOptions;saveDraft();nav('settle');});action('[aria-label="Back"]',()=>nav('settle'));rebuild();
}
function paymentForRoute(){const p=state.gateC.payments.find(p=>p.id===route.id);if(!p)fail('NOT_FOUND','Payment unavailable.');if(![p.payer,p.recipient].includes(actor))fail('PERMISSION','This payment belongs to its payer and recipient.');return p;}
function userAction(type,p,extra={}){state=repo.commit(command(type,p,extra));nav('payment',{id:p.id});}
function simulated(type,p,extra={}){state=repo.commit(command(type,p,{proof:scopeProof(p),...extra}),'prototype-fixture');nav('payment',{id:p.id});}
function paymentPage(){
 const p=paymentForRoute(),isPayer=actor===p.payer,isWallet=p.method==='Wallet';let template;
 if(route.view==='handoff'&&['started','sent','approval_waiting'].includes(p.state)){
  mount('j11',isWallet?'wallet-handoff':p.method==='Bank transfer'?'bank-handoff':p.method==='PayPal'?'paypal-handoff':p.method==='Cash'?'cash-handoff':'twint-handoff');screen.dataset.paymentId=p.id;screen.dataset.paymentState=p.state;
  header(isWallet?'Check your wallet':p.method==='Cash'?'Payment marked sent':`Finish in ${p.method}`,name(p.recipient));text('.payment-status-card h1',isWallet?'Approval requested.':p.method==='Cash'?'Payment marked sent.':`${p.method} handoff.`);text('.payment-status-card p','Prototype simulation. No external app, wallet or funds have been used.');
  $$('.payment-status-meta b').forEach((n,i)=>n.textContent=i?name(p.recipient):money(p.amount,p.currency,p.exponent));
  footer([['Return to ChopDot',()=>nav('payment',{id:p.id}),'primary'],['Back to balances',()=>nav('position')]]);action('[aria-label="Back"]',()=>nav('payment',{id:p.id}));return;
 }

 if(p.state==='prepared')template=isWallet?'wallet-review':p.method==='Bank transfer'?'bank-review':p.method==='Cash'?'cash-confirm':BigInt(p.amount)<BigInt(p.original)?'partial-review':'twint-review';
 else if(['sent','not_received','unknown','recovering'].includes(p.state)&&!isPayer&&!isWallet&&route.view!=='waiting')template='receiver-review';
 else template={started:'twint-return',sent:route.view==='waiting'?'twint-waiting':'twint-sent',not_received:'recipient-says-no',received:'payment-received',closed:'payment-complete',partial:'partial-complete',approval_waiting:'wallet-approval-waiting',submitted:'wallet-submitted',checking:'wallet-checking',unknown:'wallet-result-unknown',recovering:'wallet-recovering',failed:'payment-failed',cancelled:'payment-cancelled',expired:'payment-expired',reversed:'wallet-reversed'}[p.state]||'twint-waiting';
 mount(p.state==='prepared'?'j11':'j12',template);screen.dataset.paymentId=p.id;screen.dataset.paymentState=p.state;header(p.state==='prepared'?'Review payment':p.state==='partial'?'Partial settlement complete':'Payment status',`${name(isPayer?p.recipient:p.payer)} · ${p.method}`);
 const shown=['closed','partial','received','reversed'].includes(p.state)?p.confirmed:p.amount;
 text('.amount-display,.amount-check',money(shown,p.currency,p.exponent));text('.settle-hero h1',name(p.recipient));text('.settle-hero .person-avatar',initials(p.recipient));text('.settle-hero .sub',p.groupIds.map(groupName).join(' + '));text('.avatar-big',initials(p.payer));text('.receiver-card p','Confirm only the amount that arrived.');text('.method-chip',p.method);
 $$('.payment-status-meta b').forEach((n,i)=>n.textContent=i?name(isPayer?p.recipient:p.payer):money(shown,p.currency,p.exponent));
 const body=$('.app-content');
 if(p.state==='prepared'){
  const summary=$('.summary-card');if(summary){summary.replaceChildren();for(const [a,b] of [['Method',p.method],['Reference',p.id.slice(0,8)],['Remaining after',money(p.plan.remaining,p.currency,p.exponent)]])summary.append(row(a,'',b));}
  text('.notice-card div',isWallet?'Request approval, then wait for the verified result.':'Return after sending. Your sent claim still needs the recipient’s confirmation.');
  if(isWallet&&summary){summary.replaceChildren();for(const [a,b] of [['You send','7.812500 DOT'],['Recipient',name(p.recipient)],['Network fee','0.012000 DOT · demo'],['Balance settled',money(p.amount,p.currency,p.exponent)]])summary.append(row(a,'',b));}
  if(p.method==='Cash'){text('.state-wrap h1',`Record ${money(p.amount,p.currency,p.exponent)} as sent?`);text('.state-wrap p',`This records what happened. ${name(p.recipient)} confirms receipt next.`);}
  showApplication(body,p.sources,p.plan,p);
  footer(isPayer?[[isWallet?'Approve in wallet':p.method==='Cash'?'Record as sent':`Open ${p.method==='Bank transfer'?'bank app':p.method}`,()=>{state=repo.commit(command('start',p));if(p.method==='Cash')state=repo.commit(command('sent',p));if(p.method==='Wallet'){location.href='../expansion/index.html'+(fixtureMode?'?fixtures=1':'')+'#'+new URLSearchParams({family:'21',page:'handoff',payment:p.id,group:p.groupIds[0]});return;}nav('payment',{id:p.id,view:'handoff'});},'primary pink'],['Change method',()=>{state=repo.commit(command('cancel',p));draft={id:crypto.randomUUID(),idempotencyKey:crypto.randomUUID(),operationId:crypto.randomUUID(),scope:{payer:p.payer,recipient:p.recipient,currency:p.currency,exponent:p.exponent,groupIds:p.groupIds,sourceIds:p.sources.map(r=>r.id),kind:p.scopeKind},amount:p.amount,method:p.method,plan:p.plan};saveDraft();nav('methods');}]]:[['Back to balances',()=>nav('position')]]);
 }else if(['sent','not_received','unknown','recovering'].includes(p.state)&&!isPayer&&!isWallet&&route.view!=='waiting'){
  $$('.detail-pair b').forEach((n,i)=>n.textContent=i?p.groupIds.map(groupName).join(' + '):name(p.payer));text('.notice-soft span',p.groupIds.map(groupName).join(' + '));
  footer([['Yes, it arrived',()=>userAction('confirm',p,{amount:p.amount}),'primary pink'],['Not yet',()=>{state=repo.commit(command('not_received',p));nav('payment',{id:p.id,view:'waiting'});}],['Something’s wrong',()=>nav('different',{id:p.id}),'text-link']]);
 }else{
  const remaining=BigInt(p.original)-BigInt(p.confirmed);
  if(isWallet&&isPayer&&['approval_waiting','submitted','unknown','recovering'].includes(p.state)){const reopen=button('Open original wallet flow',()=>{location.href='../expansion/index.html'+(fixtureMode?'?fixtures=1':'')+'#'+new URLSearchParams({family:'21',page:'handoff',payment:p.id,group:p.groupIds[0]});});($('.app-content')||screen).append(reopen);}
 const messages={started:['Did you send it?','Returning from a payment app does not confirm receipt.'],sent:[`Payment marked sent.`,`Waiting for ${name(p.recipient)} to confirm.`],not_received:['Payment not received yet.','The balance remains open. Check with the recipient.'],received:['Payment received.','The accepted result is ready to close this exact payment item.'],closed:['Settlement complete.','These included balances have been updated.'],partial:[`${money(p.confirmed,p.currency,p.exponent)} confirmed.`,`${money(remaining,p.currency,p.exponent)} remains open for a later payment.`],approval_waiting:['Approval requested.','Waiting for the exact wallet approval result.'],submitted:['Payment submitted.','Checking the existing transfer.'],unknown:['Payment result unknown.','Recover this payment before starting another.'],recovering:['Recovering payment status.','Checking the existing payment identity.'],failed:['Payment failed.','Verified nonexecution. Review before retrying.'],cancelled:['Payment cancelled.','No execution was accepted for this payment.'],expired:['Payment expired.','Verified nonexecution. Review the current scope.'],reversed:['Payment reversed.','The original source balances have reopened.']};
  const [title,desc]=messages[p.state]||['Checking payment.','The existing payment remains open.'];text('.payment-status-card h1',title);text('.payment-status-card p',desc);
  const actions=[];
  if(p.state==='started'&&isPayer){actions.push(['Yes, I sent it',()=>userAction('sent',p),'primary pink'],['Not yet',()=>nav('position')]);}
  else if(p.state==='sent'&&isPayer&&route.view!=='waiting')actions.push(['View confirmation status',()=>nav('payment',{id:p.id,view:'waiting'}),'primary']);
  else if(['unknown','recovering'].includes(p.state)&&isPayer)actions.push(['Recover status',()=>userAction('recover',p),'primary']);
  else if(p.retryEligible&&isPayer)actions.push(['Review and retry',()=>userAction('retry',p),'primary']);
  else if(['closed','partial','reversed'].includes(p.state)){
   actions.push([p.state==='partial'?'View remaining balance':'View updated balances',()=>nav('person',{other:isPayer?p.recipient:p.payer,currency:p.currency,exponent:p.exponent}),'primary'],['View payment record',()=>nav('record',{id:p.id})]);
  }else actions.push(['Refresh status',()=>render(),'primary']);
  actions.push(['Back to balances',()=>nav('position')]);footer(actions);
 }
 action('[aria-label="Back"]',()=>nav('activity'));action('.notice-soft[href]',()=>nav('details',{id:p.id}));
 body.append(link('Payment details',()=>nav('details',{id:p.id})));
 if(isWallet&&p.transfer){const info=card('Reviewed transfer');info.append(el('p','',`${decimal(p.transfer.minorUnits,p.transfer.asset,p.transfer.exponent)} ${p.transfer.asset} for ${money(p.amount,p.currency,p.exponent)}`));body.append(info);}
 if(state.gateC.environment.offline)note('Offline. Showing the last saved status. Refresh does not confirm a payment.');
}
function differentPage(){
 const p=paymentForRoute();mount('j12','amount-different');header('Amount received',name(p.payer));const body=$('.app-content');body.replaceChildren();const box=card('How much arrived?'),input=el('input','gb-input');input.inputMode='decimal';input.setAttribute('aria-label','Amount received');input.value=decimal(p.amount,p.currency,p.exponent);box.append(input,el('p','gc-small','Only the confirmed amount can close. The remaining amount stays open.'));body.append(box);
 footer([['Confirm received amount',()=>userAction('confirm',p,{amount:moneyFromPreviewDecimal(input.value,p.currency,p.exponent).minorUnits}),'primary'],['View source expenses',()=>nav('details',{id:p.id})],['Back',()=>nav('payment',{id:p.id})]]);
}
function detailsPage(){const p=paymentForRoute();mount('j12','receiver-breakdown');header('Payment details',`${p.method} · ${money(p.amount,p.currency,p.exponent)}`);const body=$('.app-content');body.replaceChildren();const box=card('Included sources');for(const r of p.sources)box.append(row(groupName(r.groupId),`${r.description} · revision ${r.revision} · Originally: ${BigInt(r.minor)>=0n?owesLabel(p.payer,p.recipient):owesLabel(p.recipient,p.payer)}`,money(r.minor,p.currency,p.exponent),()=>toGroup(r.groupId,'detail',r.expenseId)));body.append(box);showApplication(body,p.sources,p.receiptPlan||p.plan,p);body.append(el('p','gc-small',`Reference ${p.id}`));footer([['Back to payment',()=>nav('payment',{id:p.id}),'primary']]);}
function recordPage(){const p=paymentForRoute();if(!['closed','partial','reversed'].includes(p.state))fail('STATE','The payment record is available after accepted closure.');mount('j12',state.gateC.environment.recordUnavailable?'record-unavailable':'saved-record');header('Payment record',p.state==='reversed'?'Reversed':'Saved on this device');
 const body=$('.app-content');body.replaceChildren();if(state.gateC.environment.recordUnavailable){body.append(card('Payment record unavailable'),el('p','gc-small','The accepted payment is unchanged. Try the record again later.'));footer([['Refresh record',()=>render(),'primary'],['Back to payment',()=>nav('payment',{id:p.id})]]);return;}
 const box=docs.j12.querySelector('#saved-record .record-card').cloneNode(true);box.querySelector('.record-head h2').textContent=p.state==='partial'?'Partial settlement':p.state==='reversed'?'Payment reversed':'Payment complete';box.querySelector('.record-head p').textContent='Saved on this device';box.querySelectorAll('.record-row').forEach(n=>n.remove());
 for(const [a,b] of [['Amount',money(p.confirmed,p.currency,p.exponent)],['Payer',name(p.payer)],['Paid to',name(p.recipient)],['Method',p.method],['Sent',dateLabel(p.sentAt)],['Confirmed',`${p.confirmation==='recipient'?name(p.recipient):'Simulated wallet result'} · ${dateLabel(p.confirmedAt)}`],['Groups',p.groupIds.map(groupName).join(' · ')],['Reference',p.id]]){const n=el('div','record-row');n.append(el('span','',a),el('b','',b));box.append(n);}body.append(box);
 const eventLabels={prepare:'Payment prepared',start:'Payment started',sent:'Payer marked sent',confirm:'Recipient confirmed receipt',close:'Accepted amount applied',unknown:'Result unknown',recover:'Recovery requested',no_effect:'Nonexecution verified',retry:'Retry reviewed',cancel:'Prepared payment cancelled',wallet_submitted:'Wallet submission accepted',wallet_received:'Wallet receipt accepted',reverse:'Payment reversed',not_received:'Recipient reported not received'};
 const timeline=card('Payment history');for(const h of state.gateC.history.filter(h=>h.paymentId===p.id))timeline.append(el('p','gc-status-history',`${dateLabel(h.at)} · ${eventLabels[h.type]||h.type} · ${h.authority==='prototype-fixture'?'Simulated result':name(h.actor)}`));body.append(timeline);footer([['Done',()=>nav('payment',{id:p.id}),'primary'],['Payment activity',()=>nav('activity')]]);
}
function activityPage(){mount('j10','groups');header('Payment activity');const content=$('.app-content');content.replaceChildren(el('h1','hero','Payment activity.'));const list=card();for(const p of [...state.gateC.payments].reverse().filter(p=>[p.payer,p.recipient].includes(actor)))list.append(row(name(actor===p.payer?p.recipient:p.payer),`${p.method} · ${p.state.replaceAll('_',' ')}`,money(p.amount,p.currency,p.exponent),()=>nav('payment',{id:p.id})));if(!list.children.length)list.append(el('p','','No payments yet.'));content.append(list);footer([['Back to balances',()=>nav('position'),'primary']]);}
function boundary(title,message){mount('j12','support-handoff');const content=$('.handoff')||$('.app-content');content.replaceChildren(el('h1','',title),el('p','',message),link('Back to balances',()=>nav('position'),'primary'));}
function showError(e){
 const known={METHOD:'no-method',QUOTE:'fee-unavailable',EXPIRED:'quote-expired',OFFLINE:'offline',CHANGED:'balance-changed',DISPUTE:'open-issue',IN_PROGRESS:'already-progress'};
 if(known[e.code]||e.code==='WALLET'){
  const walletScreens=['wallet-connect','wallet-wrong','invalid-address','insufficient','fee-unavailable'];
  const id=e.code==='WALLET'&&walletScreens.includes(e.message)?e.message:known[e.code]||'wallet-connect';
  const p=state.gateC.payments.find(p=>p.id===route.id),d=state.gateC.drafts[actor];
  mount('j11',id);screen.dataset.recoveryCode=e.code;header('Review payment',p?name(p.recipient):d?name(d.scope.recipient):'');
  const names={'wallet-connect':'Connect a wallet before approval.','wallet-wrong':'The connected account does not match this payment.','invalid-address':'The recipient address needs attention.','insufficient':'The demo wallet has insufficient balance.','fee-unavailable':'A network fee quote is unavailable.'};
  const msg=names[e.message]||e.message;
  const body=$('.app-content');body.replaceChildren();const box=card(e.code==='OFFLINE'?'You’re offline.':e.code==='METHOD'?'No payment details yet.':e.code==='IN_PROGRESS'?'Payment already in progress.':'This payment needs attention.');box.append(el('p','',msg));body.append(box);
  const actions=[];
  if(e.detail?.paymentId)actions.push(['Open existing payment',()=>nav('payment',{id:e.detail.paymentId}),'primary']);
  if(e.code==='METHOD')actions.push(['Request payment details',()=>boundary('Payment details requested','This is a prototype handoff. No message has been sent. Add details through the available-method fixture to continue.'),'primary']);
  if(['CHANGED','DISPUTE'].includes(e.code))actions.push(['Review source expenses',()=>p?nav('details',{id:p.id}):nav('scope'),'primary']);
  actions.push(['Back to payment',()=>p?nav('payment',{id:p.id}):d?nav('settle'):nav('position')],['Back to balances',()=>nav('position')]);footer(actions);action('[aria-label="Back"]',()=>p?nav('payment',{id:p.id}):nav('position'));return;
 }
 if(!screen)mount('j10','empty');note(e.message||'Unable to complete this action.',true);
 if(e.detail?.paymentId)($('.app-content')||screen).append(link('Open existing payment',()=>nav('payment',{id:e.detail.paymentId})));
 if(['CHANGED','DISPUTE'].includes(e.code))($('.app-content')||screen).append(link('Review source expenses',()=>route.id?nav('details',{id:route.id}):nav('scope')));
}
function toolbar(){
 if(currentActor()!=='self')return;
 if(!fixtureMode)return;const bar=document.querySelector('#fixtures');bar.hidden=false;document.body.classList.add('fixture-mode');bar.replaceChildren(el('b','','Prototype controls · simulated people and outcomes · no funds or authentication'));
 const select=el('select');select.setAttribute('aria-label','Test person');for(const p of people(state)){const o=el('option','',p.name);o.value=p.id;o.selected=p.id===actor;select.append(o);}select.onchange=()=>{actor=select.value;sessionStorage.setItem('chopdot.gate-b.actor',actor);if(route.id&&state.gateC.payments.find(p=>p.id===route.id)&&[state.gateC.payments.find(p=>p.id===route.id).payer,state.gateC.payments.find(p=>p.id===route.id).recipient].includes(actor))nav('payment',{id:route.id});else nav('position');};bar.append(select);
 if(!state.gateC.fixtureAdded)bar.append(button('Add Golden example',()=>{state=repo.addFixture(s=>addGoldenExample(s,core));nav('position');}));
 for(const [key,label] of [['offline','Offline'],['failSave','Save failure'],['recordUnavailable','Record unavailable'],['noMethod','No method']]){const wrap=el('label','',label+' '),input=el('input');input.type='checkbox';input.checked=state.gateC.environment[key]===true;input.setAttribute('aria-label',label);input.onchange=()=>{repo.setEnvironment({...state.gateC.environment,[key]:input.checked});render(label);};wrap.append(input);bar.append(wrap);}
 const wallet=el('select');wallet.setAttribute('aria-label','Wallet precondition');
 for(const [value,label] of [['','Wallet ready'],['wallet-connect','Disconnected'],['wallet-wrong','Wrong account'],['invalid-address','Invalid address'],['insufficient','Insufficient balance'],['fee-unavailable','Fee unavailable']]){const option=el('option','',label);option.value=value;option.selected=(state.gateC.environment.walletProblem||'')===value;wallet.append(option);}
 wallet.onchange=()=>{repo.setEnvironment({...state.gateC.environment,walletProblem:wallet.value});render('Wallet precondition');};bar.append(wallet);
 const p=state.gateC.payments.find(p=>p.id===route.id);if(p&&[p.payer,p.recipient].includes(actor)){
  for(const [label,type,extra,states] of [
   ['Accept exact closure','close',{},['received']],['Simulate unknown result','unknown',{},['started','sent','approval_waiting','submitted']],
   ['Verify no execution','no_effect',{result:'failed'},['unknown','recovering']],['Verify cancellation','no_effect',{result:'cancelled'},['approval_waiting','unknown','recovering']],['Verify expiry','no_effect',{result:'expired'},['approval_waiting','unknown','recovering']],
   ['Accept wallet submission','wallet_submitted',{},['approval_waiting']],['Accept exact wallet receipt','wallet_received',{},['submitted','unknown','recovering']],['Verify reversal','reverse',{},['closed','partial']]
  ])if(states.includes(p.state)&&(type!=='wallet_received'||p.method==='Wallet'))bar.append(button(label,()=>simulated(type,p,extra)));
 }
 requestAnimationFrame(()=>document.body.style.setProperty('--fixture-height',`${bar.getBoundingClientRect().height}px`));
}
function render(focusLabel){try{state=repo.read();const emptyFixture=fixtureMode&&currentActor()==='self'&&!state.group&&canonicalGroups(state).length===0&&state.expenses.length===0&&state.gateC.payments.length===0;if((!emptyFixture&&!routeParticipant(state))||!routeLocalSession(state))return;route=Object.fromEntries(new URLSearchParams(location.hash.slice(1)));route.page||='position';sessionStorage.setItem('chopdot.gate-c.route',location.hash);screen=null;
 ({position:positionPage,group:groupPage,person:personPage,settle:settlePage,scope:scopePage,methods:methodsPage,method_details:methodDetailsPage,amount:amountPage,payment:paymentPage,different:differentPage,details:detailsPage,record:recordPage,activity:activityPage}[route.page]||positionPage)();
 if(route.page==='payment'&&state.gateC.payments.some(p=>p.id===route.id&&[p.payer,p.recipient].includes(actor)))$('.app-content').append(link('Recovery options',()=>{location.href=`../gate-d/index.html${fixtureMode?'?fixtures=1':''}#${new URLSearchParams({page:'recovery',owner:'payment',id:route.id})}`;}));
 for(const a of $$('a:not([data-bound])')){a.onclick=guard(e=>{e.preventDefault();boundary(a.getAttribute('aria-label')||a.textContent.trim(),'This journey is outside the current integrated prototype. Your saved balances stay available.');});}
 screen.focus({preventScroll:true});toolbar();if(typeof focusLabel==='string')[...document.querySelectorAll('[aria-label]')].find(n=>n.getAttribute('aria-label')===focusLabel)?.focus({preventScroll:true});notifyParent();
 }catch(e){showError(e);toolbar();}}
window.addEventListener('hashchange',render);window.addEventListener('storage',e=>{if(e.key==='chopdot.preview-v2.guest')render();});
if(!location.hash&&sessionStorage.getItem('chopdot.gate-c.route'))location.hash=sessionStorage.getItem('chopdot.gate-c.route');else render();

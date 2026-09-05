/* Journey 13. Synthetic request service; no network, notifications, or payment execution. */
(function(root,factory){if(typeof module==='object')module.exports=factory(require('./people-fixtures.cjs'));else root.RequestModel=factory(root.PeopleModel);})(globalThis,function(P){
'use strict';
const clone=P.clone;
const routes=['compose','review','sources','submitting','unknown','failed','detail','duplicate','changed','nothing-due','unavailable','offline','payment-progress','paid','withdraw-confirm','withdrawing','withdraw-unknown','withdraw-failed','withdrawn','handoff','loading','error'];
function create(person='marc',scope='zurich',currency='CHF'){
 const data=P.create();data.mixed=true;
 return {data,context:{person,scope,currency,returnTo:{journey:'09',route:'person',person,scope,query:''}},route:'compose',note:'',review:null,command:null,requests:[],selected:null,sequence:0,saveMode:'success',handoff:null,settledSourceIds:[]};
}
function rawSource(s){return s.data.items.filter(x=>x.person===s.context.person&&x.currency===s.context.currency&&(s.context.scope==='all'||x.group===s.context.scope));}
function source(s){return rawSource(s).filter(x=>!s.settledSourceIds.includes(x.id));}
function amount(s){return source(s).reduce((n,x)=>n+(s.settledSourceIds.includes(x.id)?0:x.minor),0);}
function allowed(s){const {person,scope}=s.context;return s.data.viewer==='dev'&&person!=='dev'&&!!P.PEOPLE[person]&&(scope==='all'||!!P.GROUPS[scope])&&s.data.access&&(scope==='all'?rawSource(s).length>0:s.data.members[scope]?.includes(person))&&rawSource(s).every(x=>s.data.members[x.group]?.includes('dev')&&s.data.members[x.group]?.includes(person));}
function snapshot(s){const xs=source(s);return {requester:'dev',payer:s.context.person,recipient:'dev',currency:s.context.currency,amountMinor:amount(s),displayScale:s.context.currency==='DOT'?6:2,scope:s.context.scope,sourceItems:xs.map(x=>x.id),sourceGroups:[...new Set(xs.map(x=>x.group))],sourceVersion:JSON.stringify(xs.map(x=>[x.id,x.minor,x.version||1,s.settledSourceIds.includes(x.id)])),note:s.note.trim(),audience:['dev',s.context.person],returnTo:clone(s.context.returnTo)};}
function conflict(s){const ids=new Set(source(s).map(x=>x.id));return s.requests.find(r=>['active','payment-progress'].includes(r.status)&&r.payload.currency===s.context.currency&&r.payload.payer===s.context.person&&r.payload.sourceItems.some(id=>ids.has(id)));}
function guard(s){if(!s.data.online)return 'offline';if(!allowed(s))return 'unavailable';if(s.data.issue&&source(s).some(x=>x.id==='marc-zurich'))return 'issue';if(amount(s)<=0)return 'nothing-due';if(s.note.length>160)return 'note';return null;}
function preview(s){const g=guard(s);if(g)return {blocked:g};const existing=conflict(s);if(existing){s.selected=existing.id;return {blocked:'duplicate',id:existing.id};}s.review=snapshot(s);return clone(s.review);}
function sameScope(s,p){if(!allowed(s))return false;const n=snapshot(s);return ['requester','payer','recipient','currency','scope','amountMinor','displayScale','sourceVersion'].every(k=>n[k]===p[k])&&['sourceItems','sourceGroups','audience'].every(k=>JSON.stringify(n[k])===JSON.stringify(p[k]));}
function pending(s){return s.command&&['pending','unknown','recovering'].includes(s.command.status);}
function submit(s){
 if(pending(s))return clone(s.command);
 const g=guard(s);if(g)return {blocked:g};const e=conflict(s);if(e){s.selected=e.id;return {blocked:'duplicate',id:e.id};}
 if(!s.review||!sameScope(s,s.review)||s.note.trim()!==s.review.note)return {blocked:'changed'};
 const c={id:'demo-request-'+(++s.sequence),kind:'create',status:'pending',payload:clone(s.review)};s.command=c;return clone(c);
}
function current(s){return s.requests.find(r=>r.id===s.selected)||null;}
function accept(s,id){
 const c=s.command;if(!c||c.id!==id)return 'stale';if(c.status==='accepted')return 'accepted';if(!['pending','unknown','recovering'].includes(c.status))return 'invalid';
 if(c.kind==='withdraw'){
  const r=s.requests.find(x=>x.id===c.requestId);
  if(!r||s.data.viewer!==r.payload.requester||!allowed(s)){c.status='denied';return 'unavailable';}
  if(r.status==='payment-progress'||r.status==='paid'||r.version!==c.expectedVersion){c.status='conflict';return 'changed';}
  if(r.status!=='active'){c.status='conflict';return 'changed';}
  r.status='withdrawn';r.version++;c.status='accepted';return 'accepted';
 }
 if(!allowed(s)){c.status='denied';return 'unavailable';}
 if(!sameScope(s,c.payload)||(s.data.issue&&source(s).some(x=>x.id==='marc-zurich'))){c.status='conflict';return 'changed';}
 const e=conflict(s);if(e){c.status='duplicate';s.selected=e.id;return 'duplicate';}
 s.requests.push({id:c.id,payload:clone(c.payload),status:'active',delivery:'queued',version:1});s.selected=c.id;c.status='accepted';return 'accepted';
}
function notSaved(s,id){const c=s.command;if(!c||c.id!==id||!['pending','unknown','recovering'].includes(c.status))return false;c.status='not-saved';return true;}
function unknown(s,id){const c=s.command;if(!c||c.id!==id||c.status!=='pending')return false;c.status='unknown';return true;}
function recover(s){if(!s.data.online||!pending(s))return false;s.command.status='recovering';return true;}
function retry(s){if(!s.data.online||s.command?.status!=='not-saved')return null;s.command.status='pending';return clone(s.command);}
function deliver(s,id,result){const r=s.requests.find(x=>x.id===id);if(!r||r.status!=='active'||!['delivered','failed'].includes(result)||r.delivery==='delivered')return false;r.delivery=result;return true;}
function withdraw(s){
 if(pending(s))return clone(s.command);
 const r=current(s);if(!s.data.online)return {blocked:'offline'};if(!r||!allowed(s)||s.data.viewer!==r.payload.requester)return {blocked:'unavailable'};
 if(r.status!=='active')return {blocked:r.status==='payment-progress'?'payment-progress':'changed'};
 const c={id:'demo-withdraw-'+(++s.sequence),kind:'withdraw',status:'pending',requestId:r.id,expectedVersion:r.version};s.command=c;return clone(c);
}
// Demo-only observation from J11/J12. Request commands never change the expense read model.
function observePayment(s,status){const r=current(s);if(!r||!['payment-progress','paid'].includes(status)||r.status==='withdrawn'||r.status==='paid')return false;r.status=status;r.version++;if(status==='paid')s.settledSourceIds=[...new Set([...s.settledSourceIds,...r.payload.sourceItems])];return true;}
function restore(s){if(pending(s))return s.command.kind==='withdraw'?'withdraw-unknown':'unknown';const r=current(s);if(!r)return 'compose';return r.status==='active'?'detail':r.status;}
function routeBlocked(s,b){return b==='issue'?'unavailable':b==='note'?'compose':b;}
return {P,clone,routes,create,source,amount,allowed,snapshot,conflict,guard,preview,sameScope,pending,submit,current,accept,notSaved,unknown,recover,retry,deliver,withdraw,observePayment,restore,routeBlocked};
});

/* Journey 14. Synthetic receiving destinations only. Never authorizes or records a payment. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.ReceiveModel=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x));
 const routes=['methods','details','audience','review','preparing','recovery','failed','ready','code','expired','stop-confirm','stopping','stopped','changed','unavailable','empty','offline','copy-review','share-preview','share-return','recipient','boundary'];
 const names={dev:'Dev',marc:'Marc',sam:'Sam',jeanine:'Jeanine'};
 const destinations=[
  {id:'dev-twint',owner:'dev',method:'TWINT',currency:'CHF',network:null,version:1,active:true,fields:[['Name','Dev · demo'],['Mobile number','DEMO +41 00 000 00 00']],allowed:['dev']},
  {id:'dev-bank',owner:'dev',method:'Bank transfer',currency:'CHF',network:null,version:1,active:true,fields:[['Account holder','Dev · demo'],['IBAN','DEMO CH00 0000 0000 0000 0000 0'],['Bank','Example Bank · demo']],allowed:['dev']},
  {id:'dev-wallet',owner:'dev',method:'Wallet',currency:'DOT',network:'Demo network A',version:1,active:true,fields:[['Account','Dev · demo'],['Network','Demo network A'],['Asset','DOT'],['Address','DEMO-WALLET-ADDRESS-NOT-FOR-PAYMENT']],allowed:['dev']},
  {id:'ja-twint',owner:'jeanine',method:'TWINT',currency:'CHF',network:null,version:1,active:true,fields:[['Name','Jeanine · demo'],['Mobile number','DEMO +41 00 000 00 01']],allowed:['dev','jeanine']}
 ];
 function create(patch={}){return {route:'methods',viewer:'dev',online:true,access:true,now:0,sequence:0,destinations:clone(destinations),context:{owner:'dev',origin:'you',person:null,currency:null,amountMinor:null,scale:null,sourceItems:[],sourceGroups:[],sourceVersion:1,requestId:null,network:null,...patch},methodId:null,audience:null,review:null,command:null,records:[],selected:null,toast:'',copyState:'idle',shareResult:null,saveMode:'accepted',ledger:{expenses:'unchanged',payments:'unchanged',requests:'unchanged',memberships:'unchanged'}};}
 const dest=s=>s.destinations.find(d=>d.id===s.methodId);
 const own=s=>s.viewer===s.context.owner;
 const record=s=>s.records.find(r=>r.id===s.selected);
 const pending=s=>s.command&&['pending','unknown','recovering'].includes(s.command.status);
 const available=s=>s.destinations.filter(d=>d.owner===s.context.owner&&d.active&&d.allowed.includes(s.viewer)&&(!s.context.currency||d.currency===s.context.currency));
 const fieldNames={'TWINT':['Name','Mobile number'],'Bank transfer':['Account holder','IBAN','Bank'],'Wallet':['Account','Network','Asset','Address']};
 function shape(d){const keys=fieldNames[d?.method];if(!keys||!Array.isArray(d.fields)||d.fields.length!==keys.length||!d.fields.every((f,i)=>Array.isArray(f)&&f[0]===keys[i]&&typeof f[1]==='string'))return false;return d.method!=='Wallet'||(d.fields[1][1]===d.network&&d.fields[2][1]===d.currency);}
 function current(s){const d=dest(s);return !!(s.access&&d&&shape(d)&&d.active&&d.owner===s.context.owner&&d.allowed.includes(s.viewer)&&(!s.context.currency||d.currency===s.context.currency)&&(!s.context.network||d.network===s.context.network));}
 const valid=s=>s.online&&current(s);
 function snapshot(s){const d=dest(s);return d?{owner:d.owner,actor:s.viewer,audience:s.audience,destination:d.id,destinationVersion:d.version,method:d.method,currency:d.currency,network:d.network,fields:clone(d.fields),context:clone(s.context)}:null;}
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function choose(s,id){if(pending(s))return false;const d=s.destinations.find(d=>d.id===id);if(!d||!available(s).some(d=>d.id===id))return false;s.methodId=id;s.review=null;s.command=null;s.selected=null;s.audience=s.context.person;s.copyState='idle';s.route='details';return true;}
 function selectAudience(s,person){if(!own(s)||pending(s)||!names[person]||person===s.viewer||(s.context.person&&s.context.person!==person))return false;if(s.audience!==person)s.selected=null;s.audience=person;s.review=null;s.route='review';return review(s);}
 function review(s){if(!valid(s)||!own(s)||!s.audience||s.audience===s.viewer)return false;s.review=snapshot(s);s.route='review';return true;}
 function live(s,r=record(s)){if(!r)return false;const d=s.destinations.find(x=>x.id===r.payload.destination);return !!(s.access&&s.online&&r.payload.audience===s.audience&&r.payload.destination===s.methodId&&r.status==='active'&&s.now<r.expiresAt&&shape(d)&&d?.active&&d.owner===r.payload.owner&&d.version===r.payload.destinationVersion&&same(d.fields,r.payload.fields)&&d.currency===r.payload.currency&&d.network===r.payload.network&&same(s.context,r.payload.context));}
 function prepare(s){
  if(pending(s)){s.route='recovery';return false;}
  if(!valid(s)||!own(s)||!s.review||!same(s.review,snapshot(s))){s.route=s.online?'changed':'offline';return false;}
  const existing=s.records.find(r=>live(s,r)&&same(r.payload,s.review));if(existing){s.selected=existing.id;s.route='ready';return true;}
  s.command={id:'demo-command-'+(++s.sequence),type:'share',actor:s.viewer,payload:clone(s.review),status:'pending',issuedAt:s.now,deadline:s.now+60000};s.route='preparing';return true;
 }
 function stop(s){if(!own(s)||!live(s)||pending(s))return false;s.command={id:'demo-command-'+(++s.sequence),type:'stop',actor:s.viewer,recordId:s.selected,payload:clone(record(s).payload),status:'pending',issuedAt:s.now,deadline:s.now+60000};s.route='stopping';return true;}
 function result(s,id,outcome){
  const c=s.command;if(!c||c.id!==id||!['pending','unknown','recovering'].includes(c.status)||!['accepted','not-saved','unknown'].includes(outcome))return false;
  if(outcome==='unknown'){c.status='unknown';s.route='recovery';return true;}
  if(outcome==='not-saved'){c.status='not-saved';s.route='failed';return true;}
  if(c.actor!==s.viewer||!own(s)||!current(s)||!same(c.payload,snapshot(s))||s.now>c.deadline){c.status='rejected';s.route=s.access?'changed':'unavailable';return false;}
  if(c.type==='share'){
   const existing=s.records.find(r=>live(s,r)&&same(r.payload,c.payload));
   const r=existing||{id:'demo-share-'+c.id.split('-').pop(),commandId:c.id,payload:clone(c.payload),status:'active',expiresAt:s.now+86400000};
   if(!existing)s.records.push(r);s.selected=r.id;c.status='accepted';s.route='ready';
  }else{const r=s.records.find(r=>r.id===c.recordId);if(!r||r.status!=='active'){c.status='rejected';s.route='changed';return false;}r.status='stopped';c.status='accepted';s.route='stopped';}
  return true;
 }
 function recover(s){if(!s.online||!pending(s))return false;s.command.status='recovering';s.route='recovery';return true;}
 function retry(s){const c=s.command;if(!c||c.status!=='not-saved'||!own(s)||!valid(s))return false;if(s.now>c.deadline||!same(c.payload,snapshot(s))){s.route='changed';return false;}c.status='pending';s.route=c.type==='share'?'preparing':'stopping';return true;}
 function link(s){if(!own(s)||pending(s)||!live(s))return null;return 'https://example.invalid/chopdot/receive/'+record(s).id;}
 function openFor(s,viewer){const r=record(s);if(!live(s,r)||r.payload.audience!==viewer)return null;const p=r.payload;return clone({owner:p.owner,method:p.method,currency:p.currency,network:p.network,fields:p.fields,amount:p.context.amountMinor==null?null:{minor:p.context.amountMinor,scale:p.context.scale,currency:p.currency},requestId:p.context.requestId});}
 function raw(s){if(!valid(s))return null;const d=dest(s);return 'CHOPDOT DEMO — DO NOT PAY\n'+d.method+' · '+d.currency+'\n'+d.fields.map(([k,v])=>k+': '+v).join('\n');}
 function exported(s){return {method:dest(s)?.method,currency:dest(s)?.currency,network:dest(s)?.network,raw:raw(s),link:link(s)};}
 function restore(s,target='methods'){
  if(target==='boundary')return s.route='boundary';
  if(!s.access)return s.route='unavailable';
  if(!s.online)return s.route='offline';
  if(pending(s)){const expected=s.command.type==='share'?'preparing':'stopping';return s.route=(s.command.status==='pending'&&target===expected)?expected:'recovery';}
  if(s.command?.status==='not-saved')return s.route='failed';
  const r=record(s);
  if(!r&&['ready','code','stop-confirm','recipient','share-preview','share-return'].includes(target))return s.route=s.review?'review':s.methodId?'details':'methods';
  if(r&&['ready','code','stop-confirm','recipient','share-preview','share-return'].includes(target)){
   if(r.status==='stopped')return s.route='stopped';
   if(s.now>=r.expiresAt)return s.route='expired';
   if(!live(s,r))return s.route='changed';
  }
  if(s.methodId&&!valid(s))return s.route='unavailable';
  if(!own(s)&&['audience','review','ready','code','stop-confirm','share-preview','share-return'].includes(target))return s.route='details';
  return s.route=routes.includes(target)?target:'methods';
 }
 function refresh(s){if(!s.online||!s.access||pending(s))return false;s.review=null;s.command=null;s.selected=null;s.copyState='idle';s.route=available(s).length?'methods':'empty';return true;}
 function expire(s){const r=record(s);if(r)s.now=r.expiresAt+1;restore(s,s.route);}
 return {clone,routes,names,create,dest,own,record,pending,available,current,valid,snapshot,same,choose,selectAudience,review,live,prepare,stop,result,recover,retry,link,openFor,raw,exported,restore,refresh,expire};
});

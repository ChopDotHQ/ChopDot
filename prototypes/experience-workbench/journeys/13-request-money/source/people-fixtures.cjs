/* Journey 09 prototype model. No network, accounts, messages or money are changed. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.PeopleModel=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const PEOPLE={dev:{name:'You',initials:'DP',preferred:'TWINT'},jeanine:{name:'Jeanine',initials:'JA',preferred:'TWINT'},marc:{name:'Marc',initials:'M',preferred:'Bank transfer'},sam:{name:'Sam',initials:'S',preferred:'Wallet'},nina:{name:'Nina',initials:'N',preferred:null},luca:{name:'Luca',initials:'L',preferred:'Bank transfer'}};
 const GROUPS={zurich:{name:'Zurich Weekend',currency:'CHF',owner:'dev'},apartment:{name:'Apartment',currency:'CHF',owner:'jeanine'},ski:{name:'Ski Trip',currency:'CHF',owner:'marc'},geneva:{name:'Geneva Day',currency:'CHF',owner:'nina'},lisbon:{name:'Lisbon Weekend',currency:'EUR',owner:'luca'},hackathon:{name:'Hackathon',currency:'DOT',owner:'dev'},solo:{name:'Summer plans',currency:'CHF',owner:'dev'}};
 // Fixture read model from the approved balance examples; signed amounts are from Dev's view.
 const ITEMS=[['ja-apartment','jeanine','apartment','CHF',-7430],['ja-ski','jeanine','ski','CHF',2000],['marc-apartment','marc','apartment','CHF',2000],['marc-zurich','marc','zurich','CHF',3000],['marc-ski','marc','ski','CHF',3000],['marc-geneva','marc','geneva','CHF',4540],['sam-zurich','sam','zurich','CHF',2290],['sam-ski','sam','ski','CHF',2930],['sam-geneva','sam','geneva','CHF',3890],['nina-geneva','nina','geneva','CHF',-3000],['luca-lisbon','luca','lisbon','EUR',-1800],['sam-hackathon','sam','hackathon','DOT',2400000]].map(([id,person,group,currency,minor])=>({id,person,group,currency,minor}));
 const MEMBERS={zurich:['dev','jeanine','marc','sam'],apartment:['dev','jeanine','marc'],ski:['dev','jeanine','marc','sam'],geneva:['dev','marc','sam','nina'],lisbon:['dev','luca'],hackathon:['dev','sam'],solo:['dev']};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const routes=['members','directory','person','groups','preferences','roles','manage','remove-confirm','remove-blocked','remove-saving','remove-unknown','remove-failed','removed','access-changed','offline','loading','error','handoff'];
 function create(){return {route:'members',group:'zurich',scope:'zurich',person:null,viewer:'dev',owners:Object.fromEntries(Object.entries(GROUPS).map(([k,v])=>[k,v.owner])),online:true,access:true,query:'',mixed:false,privatePreference:false,issue:false,version:1,members:clone(MEMBERS),items:clone(ITEMS),invites:[{id:'invite-nina-zurich',person:'nina',group:'zurich'}],command:null,sequence:0,saveMode:'accepted',handoff:null};}
 function visibleGroups(s,p){return Object.keys(GROUPS).filter(g=>g!=='solo'&&(s.mixed||g!=='hackathon')&&s.members[g].includes('dev')&&s.members[g].includes(p));}
 function rows(s,p,scope=s.scope){return s.items.filter(x=>x.person===p&&(scope==='all'?s.mixed||x.group!=='hackathon':x.group===scope));}
 function balances(s,p,scope=s.scope){const out={};for(const x of rows(s,p,scope))out[x.currency]=(out[x.currency]||0)+x.minor;return out;}
 function amount(minor,currency){return currency+' '+(Math.abs(minor)/(currency==='DOT'?1e6:100)).toFixed(currency==='DOT'?6:2);}
 function name(p){if(!PEOPLE[p])throw Error('Unknown person');return PEOPLE[p].name;}
 function owner(s,g=s.group){return s.owners[g];}
 function canView(s){return s.scope==='all'||(s.access&&s.members[s.scope]?.includes(s.viewer));}
 function directory(s){return Object.keys(PEOPLE).filter(p=>p!=='dev'&&visibleGroups(s,p).length&&name(p).toLowerCase().includes(s.query.trim().toLowerCase()));}
 function affected(s,p,scope=s.scope){return s.issue&&rows(s,p,scope).some(x=>x.id==='marc-zurich');}
 function removalBlock(s){
  if(!canView(s))return 'access';
  if(!s.online)return 'offline';
  if(!GROUPS[s.group]||owner(s)!==s.viewer)return 'permission';
  if(s.person===s.viewer||s.person===owner(s))return 'owner';
  if(!s.members[s.group]?.includes(s.person))return 'missing';
  // Group membership removal requires the person to have no open group items, not just zero net.
  if(rows(s,s.person,s.group).some(x=>x.minor!==0)||affected(s,s.person,s.group))return 'balance';
  return null;
 }
 function requestRemoval(s){
  if(s.command&&['pending','unknown','recovering','accepted'].includes(s.command.status)){
   if(s.command.person===s.person&&s.command.group===s.group&&s.command.actor===s.viewer)return clone(s.command);
   if(s.command.status!=='accepted')return {blocked:'existing'};
  }
  const block=removalBlock(s);if(block)return {blocked:block};
  const c={id:'demo-remove-'+(++s.sequence),actor:s.viewer,person:s.person,group:s.group,expectedVersion:s.version,status:'pending'};s.command=c;return clone(c);
 }
 function acceptRemoval(s,id){
  const c=s.command;if(!c||c.id!==id)return 'stale';
  if(c.status==='accepted')return 'accepted';
  if(!['pending','unknown','recovering'].includes(c.status))return 'invalid';
  if(c.actor!==s.viewer||owner(s,c.group)!==s.viewer||!s.access){c.status='denied';return 'denied';}
  if(s.version!==c.expectedVersion){c.status='conflict';return 'conflict';}
  if(s.items.some(x=>x.group===c.group&&x.person===c.person&&x.minor!==0)){c.status='blocked';return 'blocked';}
  s.members[c.group]=s.members[c.group].filter(x=>x!==c.person);s.version++;c.status='accepted';return 'accepted';
 }
 function resolveScope(s,currency){
  if(!canView(s)||!s.online||s.viewer!=='dev'||s.person==='dev')return null;
  if(s.scope!=='all'&&!s.members[s.scope].includes(s.person))return null;
  if(affected(s,s.person))return null;
  const xs=rows(s,s.person).filter(x=>x.currency===currency);const net=xs.reduce((a,x)=>a+x.minor,0);if(!net)return null;
  return {kind:net<0?'settle':'request',payer:net<0?'dev':s.person,recipient:net<0?s.person:'dev',amountMinor:Math.abs(net),currency,person:s.person,scope:s.scope,sourceItems:xs.map(x=>x.id),sourceGroups:[...new Set(xs.map(x=>x.group))],paymentMethod:currency==='DOT'?'Wallet':PEOPLE[net<0?s.person:'dev'].preferred||null,version:s.version};
 }
 function preference(s){if(!canView(s)||s.privatePreference)return null;return PEOPLE[s.person]?.preferred||null;}
 function navigate(s,route,patch={}){if(!routes.includes(route))throw Error('Unknown route');Object.assign(s,patch,{route});return s;}
 return {PEOPLE,GROUPS,ITEMS,MEMBERS,routes,owner,create,clone,visibleGroups,rows,balances,amount,name,canView,directory,affected,removalBlock,requestRemoval,acceptRemoval,resolveScope,preference,navigate};
});

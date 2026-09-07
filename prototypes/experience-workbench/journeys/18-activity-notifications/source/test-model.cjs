'use strict';
const assert=require('node:assert/strict');
const m=require('./model.cjs');
let assertions=0; const cases=[];
const ok=(cond,msg)=>{assertions++;assert.ok(cond,msg)};
const eq=(a,b,msg)=>{assertions++;assert.deepEqual(a,b,msg)};
const scenario=(name,fn)=>{const before=assertions;try{fn();cases.push({name,passed:true,assertions:assertions-before})}catch(e){cases.push({name,passed:false,error:e.message,assertions:assertions-before});throw e}};
const viewer={id:'dev',groupIds:['g-zurich','g-house']};
const base=[
 {eventId:'p-wait',type:'payment.waiting',entityType:'payment',entityId:'p1',timestamp:'2026-09-07T15:02:00Z',actorId:'dev',counterpartyId:'jeanine',groupId:'g-zurich',groupLabel:'Zurich Weekend',amount:'54.30',currency:'CHF',method:'TWINT',status:'Waiting',resolved:false,title:'Payment still waiting',counterpartyName:'Jeanine'},
 {eventId:'r-new',type:'request.created',entityType:'request',entityId:'r1',timestamp:'2026-09-07T13:28:00Z',actorId:'marc',counterpartyId:'dev',groupId:'g-zurich',groupLabel:'Zurich Weekend',amount:'30.00',currency:'CHF',status:'Open',resolved:false,title:'Marc requested money',counterpartyName:'Marc'},
 {eventId:'e-review',type:'expense.review-needed',entityType:'expense',entityId:'e1',timestamp:'2026-09-07T10:11:00Z',actorId:'marc',counterpartyId:'dev',groupId:'g-zurich',groupLabel:'Zurich Weekend',amount:'84.60',currency:'CHF',status:'Review',resolved:false,title:'Dinner needs review'},
 {eventId:'s-confirm',type:'savings.confirmed',entityType:'savings_operation',entityId:'s1',timestamp:'2026-09-07T14:12:00Z',actorId:'dev',groupId:'g-house',groupLabel:'Alps House Fund',amount:'180.00',currency:'CHF',status:'Confirmed',resolved:true,title:'Savings contribution confirmed'},
 {eventId:'p-complete',type:'payment.complete',entityType:'payment',entityId:'p2',timestamp:'2026-09-07T11:06:00Z',actorId:'dev',counterpartyId:'jeanine',groupId:'g-zurich',groupLabel:'Zurich Weekend',amount:'54.30',currency:'CHF',method:'TWINT',status:'Complete',resolved:true,title:'Payment completed with Jeanine'},
 {eventId:'m-join',type:'member.joined',entityType:'membership',entityId:'m1',timestamp:'2026-09-07T09:18:00Z',actorId:'nina',groupId:'g-zurich',groupLabel:'Zurich Weekend',status:'Joined',resolved:true,title:'Nina joined Zurich Weekend'},
 {eventId:'tech-1',type:'payment.waiting',entityType:'payment',entityId:'p1',timestamp:'2026-09-07T15:03:00Z',technical:true,status:'Waiting'},
 {eventId:'junk',type:'rpc.polled',entityId:'p1',timestamp:'2026-09-07T15:04:00Z',technical:true}
];
scenario('meaningful domain events only',()=>{
 ok(m.isMeaningfulEvent(base[0]));ok(m.isMeaningfulEvent(base[3]));ok(!m.isMeaningfulEvent(base[6]));ok(!m.isMeaningfulEvent(base[7]));ok(!m.isMeaningfulEvent(null));
});
scenario('projection drops technical noise',()=>{
 const a=m.projectActivity(base,viewer);eq(a.items.length,6);ok(!a.items.some(x=>x.eventId==='tech-1'));ok(!a.items.some(x=>x.eventId==='junk'));ok(a.items[0].timestamp>=a.items[1].timestamp);eq(a.offline,false);
});
scenario('attention is canonical task state',()=>{
 const a=m.projectActivity(base,viewer);eq(m.attentionCount(a),3);ok(a.items.find(x=>x.eventId==='p-wait').attention);ok(a.items.find(x=>x.eventId==='r-new').attention);ok(a.items.find(x=>x.eventId==='e-review').attention);ok(!a.items.find(x=>x.eventId==='p-complete').attention);
});
scenario('notification unread is independent',()=>{
 const ns=[m.notificationCopy(base[0]),m.notificationCopy(base[1])];eq(m.unreadCount(ns),2);const read=m.markNotificationRead(ns[0]);ok(read.read);eq(m.unreadCount([read,ns[1]]),1);const a=m.projectActivity(base,viewer);eq(m.attentionCount(a),3);
});
scenario('mark all read does not resolve attention',()=>{
 const ns=[m.notificationCopy(base[0]),m.notificationCopy(base[1]),m.notificationCopy(base[2])];const done=m.markAllNotificationsRead(ns);eq(m.unreadCount(done),0);ok(done.every(n=>n.read));eq(m.attentionCount(m.projectActivity(base,viewer)),3);eq(base[0].resolved,false);eq(base[1].resolved,false);
});
scenario('feed actions are navigation only',()=>{
 const a=m.projectActivity(base,viewer);for(const item of a.items){const act=m.activityAction(item);eq(act.kind,'navigate');ok(typeof act.route==='string');ok(!('domain_event' in act));} 
});
scenario('waiting payment routes to J12',()=>{const item=m.projectActivity(base,viewer).items.find(x=>x.eventId==='p-wait');eq(item.route,'handoff-j12');eq(m.activityAction(item).route,'handoff-j12');eq(item.status,'Waiting');eq(item.amount,'54.30');eq(item.currency,'CHF');});
scenario('completed payment routes to J15',()=>{const item=m.projectActivity(base,viewer).items.find(x=>x.eventId==='p-complete');eq(item.route,'handoff-j15');eq(item.status,'Complete');ok(!item.attention);eq(item.method,'TWINT');eq(item.currency,'CHF');});
scenario('expense review routes to J07',()=>{const item=m.projectActivity(base,viewer).items.find(x=>x.eventId==='e-review');eq(item.route,'handoff-j07');ok(item.attention);eq(item.groupLabel,'Zurich Weekend');eq(item.amount,'84.60');});
scenario('savings event routes to J16 and stays read-only',()=>{const item=m.projectActivity(base,viewer).items.find(x=>x.eventId==='s-confirm');eq(item.route,'handoff-j16');ok(!item.attention);eq(item.amount,'180.00');eq(m.activityAction(item).kind,'navigate');});
scenario('filters preserve canonical items',()=>{const a=m.projectActivity(base,viewer);eq(m.filterActivity(a,'attention').length,3);eq(m.filterActivity(a,'payments').length,3);ok(m.filterActivity(a,'groups').length>=5);eq(m.filterActivity(a,'all').length,6);eq(a.items.length,6);});
scenario('search is local projection only',()=>{const a=m.projectActivity(base,viewer);eq(m.searchActivity(a,'Jeanine').length,2);eq(m.searchActivity(a,'house').length,1);eq(m.searchActivity(a,'DOT').length,0);eq(m.searchActivity(a,'').length,6);eq(a.items.length,6);});
scenario('currency buckets never merge assets',()=>{const extra={eventId:'dot',type:'request.created',entityType:'request',entityId:'r2',timestamp:'2026-09-07T12:00:00Z',actorId:'sam',counterpartyId:'dev',groupId:'g-zurich',groupLabel:'Crypto group',amount:'2.400000',currency:'DOT',status:'Open'};const a=m.projectActivity([...base,extra],viewer);const buckets=m.currencyBuckets(a.items);ok(buckets.CHF.length>=1);eq(buckets.DOT.length,1);eq(buckets.DOT[0].amount,'2.400000');ok(!('TOTAL' in buckets));eq(Object.keys(buckets).sort(),['CHF','DOT']);});
scenario('technical refreshes do not duplicate payment row',()=>{const variants=[...base,{eventId:'poll-2',type:'payment.waiting',entityId:'p1',timestamp:'2026-09-07T15:05:00Z',technical:true},{eventId:'poll-3',type:'payment.waiting',entityId:'p1',timestamp:'2026-09-07T15:06:00Z',technical:true}];const a=m.projectActivity(variants,viewer);eq(a.items.filter(x=>x.entityId==='p1').length,1);eq(a.items.find(x=>x.entityId==='p1').eventId,'p-wait');eq(a.items.length,6);ok(!a.items.some(x=>x.eventId==='poll-2'));ok(!a.items.some(x=>x.eventId==='poll-3'));});
scenario('duplicate durable delivery by event id dedupes',()=>{const duplicate={...base[1],timestamp:'2026-09-07T13:29:00Z'};const a=m.projectActivity([...base,duplicate],viewer);eq(a.items.filter(x=>x.eventId==='r-new').length,1);eq(a.items.length,6);eq(a.items.find(x=>x.eventId==='r-new').entityId,'r1');});
scenario('stale notification opens canonical current state',()=>{const old=m.notificationCopy(base[0]);const current=base.map(x=>x.eventId==='p-wait'?{...x,type:'payment.complete',status:'Complete',resolved:true}:x);const opened=m.openNotification(old,current,viewer);eq(opened.kind,'stale');ok(opened.stale);eq(opened.route,'handoff-j15');eq(opened.current.status,'Complete');eq(old.snapshotStatus,'Waiting');});
scenario('current notification stays current',()=>{const n=m.notificationCopy(base[1]);const opened=m.openNotification(n,base,viewer);eq(opened.kind,'current');ok(!opened.stale);eq(opened.route,'handoff-request');eq(opened.current.status,'Open');});
scenario('lost group access redacts ordinary group activity',()=>{const restricted={id:'dev',groupIds:['g-house']};const a=m.projectActivity(base,restricted);ok(!a.items.some(x=>x.eventId==='e-review'));ok(!a.items.some(x=>x.eventId==='m-join'));ok(a.items.some(x=>x.eventId==='s-confirm'));ok(a.items.some(x=>x.eventId==='p-complete'));});
scenario('personally relevant payment record survives reduced access minimally',()=>{const restricted={id:'dev',groupIds:[]};const a=m.projectActivity(base,restricted);const p=a.items.find(x=>x.eventId==='p-complete');ok(!!p);ok(p.accessReduced);ok(p.personallyRelevant);eq(p.amount,'54.30');eq(p.currency,'CHF');eq(p.groupLabel,'Zurich Weekend');ok(!('title' in p));});
scenario('opening inaccessible notification does not restore access',()=>{const n=m.notificationCopy(base[2]);const opened=m.openNotification(n,base,{id:'dev',groupIds:[]});eq(opened.kind,'access-changed');eq(opened.route,'activity');eq(opened.reason,'access-revoked');});
scenario('offline refresh never invents new activity',()=>{const a=m.projectActivity(base,viewer,{offline:true,cachedAt:'2026-09-07T15:00:00Z'});ok(a.stale);ok(a.offline);const newEvents=[...base,{eventId:'new',type:'member.joined',entityId:'m2',timestamp:'2026-09-07T16:00:00Z',groupId:'g-zurich'}];const r=m.refresh(a,newEvents,viewer,{online:false});ok(r.stale);ok(r.offline);eq(r.items.length,a.items.length);ok(!r.items.some(x=>x.eventId==='new'));});
scenario('online refresh projects canonical changes',()=>{const a=m.projectActivity(base,viewer,{offline:true});const newEvents=[...base,{eventId:'new',type:'member.joined',entityId:'m2',timestamp:'2026-09-07T16:00:00Z',actorId:'alex',groupId:'g-zurich',groupLabel:'Zurich Weekend',status:'Joined'}];const r=m.refresh(a,newEvents,viewer,{online:true,now:'2026-09-07T16:01:00Z'});ok(!r.stale);ok(!r.offline);ok(r.items.some(x=>x.eventId==='new'));eq(r.cachedAt,'2026-09-07T16:01:00Z');eq(r.items[0].eventId,'new');});
scenario('notification delivery is a snapshot not authority',()=>{const n=m.notificationCopy(base[0]);eq(n.snapshotStatus,'Waiting');eq(n.snapshotRoute,'handoff-j12');ok(!('confirm' in n));ok(!('execute' in n));ok(!('settle' in n));});
scenario('missing canonical state fails safely',()=>{const n=m.notificationCopy(base[1]);const opened=m.openNotification(n,[],viewer);eq(opened.kind,'unavailable');eq(opened.route,'activity');eq(opened.reason,'current-state-unavailable');});
scenario('resolved attention item leaves attention after canonical update',()=>{const current=base.map(x=>x.eventId==='e-review'?{...x,type:'expense.resolved',status:'Resolved',resolved:true}:x);const a=m.projectActivity(current,viewer);eq(m.attentionCount(a),2);const e=a.items.find(x=>x.entityId==='e1');ok(!!e);ok(!e.attention);eq(e.route,'handoff-j06');});
scenario('read/unread does not affect chronological ordering',()=>{const changed=base.map((x,i)=>({...x,read:i%2===0}));const a=m.projectActivity(changed,viewer);eq(a.items.length,6);ok(new Date(a.items[0].timestamp)>=new Date(a.items[1].timestamp));eq(a.items.find(x=>x.eventId==='p-wait').read,true);eq(a.items.find(x=>x.eventId==='r-new').read,false);});
scenario('activity projection preserves exact amounts as strings',()=>{const a=m.projectActivity(base,viewer);eq(a.items.find(x=>x.eventId==='p-wait').amount,'54.30');eq(a.items.find(x=>x.eventId==='r-new').amount,'30.00');eq(a.items.find(x=>x.eventId==='s-confirm').amount,'180.00');ok(a.items.every(x=>x.amount==null||typeof x.amount==='string'));});
scenario('routes only point to canonical owner journeys',()=>{const a=m.projectActivity(base,viewer);for(const item of a.items){ok(item.route?.startsWith('handoff-')===true);ok(!['confirm','execute','approve','settle'].includes(item.route));}});
scenario('projection does not mutate canonical source events',()=>{const copy=JSON.stringify(base);m.projectActivity(base,viewer);eq(JSON.stringify(base),copy);m.filterActivity(m.projectActivity(base,viewer),'attention');eq(JSON.stringify(base),copy);m.searchActivity(m.projectActivity(base,viewer),'Jeanine');eq(JSON.stringify(base),copy);});
scenario('notification read operations are immutable',()=>{const n=m.notificationCopy(base[0]);const before=JSON.stringify(n);const r=m.markNotificationRead(n);eq(JSON.stringify(n),before);ok(r!==n);ok(!n.read);ok(r.read);});

const result={ok:cases.every(c=>c.passed),assertions,scenarios:cases.length,cases};
console.log(JSON.stringify(result));

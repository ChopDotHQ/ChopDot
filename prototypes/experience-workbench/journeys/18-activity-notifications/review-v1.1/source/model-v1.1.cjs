'use strict';

const clone = v => JSON.parse(JSON.stringify(v));

const MEANINGFUL = new Set([
  'expense.created','expense.updated','expense.review-needed','expense.resolved',
  'request.created','request.delivered','request.withdrawn','request.paid',
  'payment.waiting','payment.complete','payment.failed','payment.partial','payment.reversed',
  'member.joined','member.removed','savings.confirmed','savings.withdrawn','savings.returned'
]);

const ROUTES = {
  'expense.review-needed':'handoff-j07','expense.created':'handoff-j06','expense.updated':'handoff-j06','expense.resolved':'handoff-j06',
  'request.created':'handoff-request','request.delivered':'handoff-j13','request.withdrawn':'handoff-j13','request.paid':'handoff-j15',
  'payment.waiting':'handoff-j12','payment.complete':'handoff-j15','payment.failed':'handoff-j12','payment.partial':'handoff-j12','payment.reversed':'handoff-j15',
  'member.joined':'handoff-j09','member.removed':'handoff-j09',
  'savings.confirmed':'handoff-j16','savings.withdrawn':'handoff-j16','savings.returned':'handoff-j16'
};
const ATTENTION_TYPES = new Set(['expense.review-needed','request.created','payment.waiting','payment.failed','payment.partial','payment.reversed']);

const isMeaningfulEvent = e => !!e && MEANINGFUL.has(e.type) && !e.technical;
const eventKey = e => e.eventId || `${e.type}:${e.entityType||'entity'}:${e.entityId||'unknown'}:${e.version??0}`;
const entityKey = e => `${e.entityType||'entity'}:${e.entityId||'unknown'}`;
function compare(a,b){
  const av=Number(a.version??0),bv=Number(b.version??0); if(av!==bv) return av-bv;
  const at=Date.parse(a.timestamp)||0,bt=Date.parse(b.timestamp)||0; if(at!==bt) return at-bt;
  return eventKey(a).localeCompare(eventKey(b));
}
function dedupe(events){
  const by=new Map();
  for(const e of events){
    if(!isMeaningfulEvent(e)) continue;
    const k=eventKey(e), old=by.get(k); if(!old||compare(old,e)<0) by.set(k,e);
  }
  return [...by.values()];
}
function latestByEntity(events){
  const out=new Map();
  for(const e of dedupe(events)){const k=entityKey(e),old=out.get(k);if(!old||compare(old,e)<0)out.set(k,e);}
  return out;
}
function redactForViewer(event,viewer){
  const e=clone(event); const hasAccess=!e.groupId||viewer.groupIds.includes(e.groupId); if(hasAccess)return e;
  const personal=['payment.complete','payment.failed','payment.partial','payment.reversed','payment.waiting'].includes(e.type)&&(e.actorId===viewer.id||e.counterpartyId===viewer.id);
  if(personal)return {eventId:e.eventId,type:e.type,entityType:e.entityType,entityId:e.entityId,version:e.version,timestamp:e.timestamp,status:e.status,amount:e.amount,currency:e.currency,method:e.method,reference:e.reference,groupLabel:e.groupLabel||'Past group',actorId:e.actorId,counterpartyId:e.counterpartyId,personallyRelevant:true,accessReduced:true,resolved:e.resolved};
  return {eventId:e.eventId,type:e.type,entityType:e.entityType,entityId:e.entityId,version:e.version,timestamp:e.timestamp,accessReduced:true,hidden:true};
}
function projectActivity(events,viewer,{offline=false,cachedAt=null}={}){
  const unique=dedupe(events), latest=latestByEntity(unique), items=[];
  for(const e of unique){
    const visible=redactForViewer(e,viewer); if(visible.hidden)continue;
    const cur=latest.get(entityKey(e)), isLatest=eventKey(cur)===eventKey(e);
    visible.route=ROUTES[e.type]||null; visible.historical=!isLatest;
    visible.currentType=cur?.type||e.type; visible.currentStatus=cur?.status??e.status;
    visible.attention=isLatest&&ATTENTION_TYPES.has(e.type)&&e.resolved!==true; visible.read=!!e.read;
    items.push(visible);
  }
  items.sort((a,b)=>compare(b,a));
  return {items,offline,cachedAt,stale:offline};
}
function notificationCopy(e){return {notificationId:`n:${eventKey(e)}`,eventId:eventKey(e),entityType:e.entityType,entityId:e.entityId,createdAt:e.timestamp,read:false,snapshotStatus:e.status||null,snapshotType:e.type,snapshotRoute:ROUTES[e.type]||null};}
const markNotificationRead=n=>({...n,read:true});
const markAllNotificationsRead=ns=>ns.map(n=>({...n,read:true}));
const attentionCount=a=>a.items.filter(x=>x.attention).length;
const unreadCount=ns=>ns.filter(n=>!n.read).length;
function openNotification(n,canonicalEvents,viewer){
  let key=n.entityType&&n.entityId?`${n.entityType}:${n.entityId}`:null;
  if(!key){const source=dedupe(canonicalEvents).find(e=>eventKey(e)===n.eventId);if(source)key=entityKey(source);}
  const current=key?latestByEntity(canonicalEvents).get(key):null;
  if(!current)return {kind:'unavailable',route:'activity',reason:'current-state-unavailable'};
  const visible=redactForViewer(current,viewer); if(visible.hidden)return {kind:'access-changed',route:'activity',reason:'access-revoked'};
  const stale=n.snapshotStatus!==(current.status||null)||n.snapshotType!==current.type;
  return {kind:stale?'stale':'current',route:ROUTES[current.type]||'activity',current:visible,stale};
}
function filterActivity(a,f){if(f==='attention')return a.items.filter(x=>x.attention);if(f==='payments')return a.items.filter(x=>x.type.startsWith('payment.')||x.type.startsWith('request.'));if(f==='groups')return a.items.filter(x=>x.groupId||x.groupLabel);return a.items;}
function searchActivity(a,q){q=(q||'').trim().toLowerCase();if(!q)return a.items;return a.items.filter(i=>[i.title,i.personName,i.counterpartyName,i.groupLabel,i.method,i.currency,i.status,i.type].filter(Boolean).join(' ').toLowerCase().includes(q));}
function currencyBuckets(items){const out={};for(const i of items){if(i.amount==null||!i.currency)continue;(out[i.currency]||=[]).push(i);}return out;}
const activityAction=i=>({kind:'navigate',route:i.route||'activity',entityId:i.entityId||null});
function refresh(a,events,viewer,{online=true,now=null}={}){if(!online)return {...a,offline:true,stale:true};return projectActivity(events,viewer,{offline:false,cachedAt:now});}
module.exports={MEANINGFUL,ROUTES,ATTENTION_TYPES,isMeaningfulEvent,eventKey,entityKey,compare,dedupe,latestByEntity,redactForViewer,projectActivity,notificationCopy,markNotificationRead,markAllNotificationsRead,attentionCount,unreadCount,openNotification,filterActivity,searchActivity,currencyBuckets,activityAction,refresh};

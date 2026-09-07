'use strict';

const clone = v => JSON.parse(JSON.stringify(v));

const MEANINGFUL = new Set([
  'expense.created','expense.updated','expense.review-needed','expense.resolved',
  'request.created','request.delivered','request.withdrawn','request.paid',
  'payment.waiting','payment.complete','payment.failed','payment.partial','payment.reversed',
  'member.joined','member.removed','savings.confirmed','savings.withdrawn','savings.returned'
]);

const ROUTES = {
  'expense.review-needed': 'handoff-j07',
  'expense.created': 'handoff-j06',
  'expense.updated': 'handoff-j06',
  'expense.resolved': 'handoff-j06',
  'request.created': 'handoff-request',
  'request.delivered': 'handoff-j13',
  'request.withdrawn': 'handoff-j13',
  'request.paid': 'handoff-j15',
  'payment.waiting': 'handoff-j12',
  'payment.complete': 'handoff-j15',
  'payment.failed': 'handoff-j12',
  'payment.partial': 'handoff-j12',
  'payment.reversed': 'handoff-j15',
  'member.joined': 'handoff-j09',
  'member.removed': 'handoff-j09',
  'savings.confirmed': 'handoff-j16',
  'savings.withdrawn': 'handoff-j16',
  'savings.returned': 'handoff-j16'
};

const ATTENTION_TYPES = new Set(['expense.review-needed','request.created','payment.waiting','payment.failed','payment.partial','payment.reversed']);

function isMeaningfulEvent(event) {
  return !!event && MEANINGFUL.has(event.type) && !event.technical;
}

function eventKey(event) {
  return event.eventId || `${event.type}:${event.entityType || 'entity'}:${event.entityId || 'unknown'}:${event.version ?? 0}`;
}

function redactForViewer(event, viewer) {
  const e = clone(event);
  const hasAccess = !e.groupId || viewer.groupIds.includes(e.groupId);
  if (hasAccess) return e;
  // A personally relevant settlement/payment record may remain minimally readable.
  const personallyRelevant = ['payment.complete','payment.failed','payment.partial','payment.reversed','payment.waiting'].includes(e.type) && (e.actorId===viewer.id || e.counterpartyId===viewer.id);
  if (personallyRelevant) {
    return {
      eventId:e.eventId, type:e.type, entityType:e.entityType, entityId:e.entityId,
      timestamp:e.timestamp, status:e.status, amount:e.amount, currency:e.currency,
      method:e.method, reference:e.reference, groupLabel:e.groupLabel || 'Past group',
      personallyRelevant:true, accessReduced:true
    };
  }
  return {eventId:e.eventId,type:e.type,timestamp:e.timestamp,accessReduced:true,hidden:true};
}

function projectActivity(events, viewer, {offline=false, cachedAt=null}={}) {
  const seen = new Set();
  const items = [];
  for (const event of events) {
    if (!isMeaningfulEvent(event)) continue;
    const key = eventKey(event);
    if (seen.has(key)) continue;
    seen.add(key);
    const visible = redactForViewer(event, viewer);
    if (visible.hidden) continue;
    visible.route = ROUTES[event.type] || null;
    visible.attention = ATTENTION_TYPES.has(event.type) && event.resolved !== true;
    visible.read = !!event.read;
    items.push(visible);
  }
  items.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
  return {items, offline, cachedAt, stale:offline};
}

function notificationCopy(event) {
  return {
    notificationId:`n:${eventKey(event)}`,
    eventId:eventKey(event),
    createdAt:event.timestamp,
    read:false,
    snapshotStatus:event.status || null,
    snapshotType:event.type,
    snapshotRoute:ROUTES[event.type] || null
  };
}

function markNotificationRead(notification) {
  return {...notification, read:true};
}

function markAllNotificationsRead(notifications) {
  return notifications.map(n=>({...n,read:true}));
}

function attentionCount(activity) {
  return activity.items.filter(x=>x.attention).length;
}

function unreadCount(notifications) {
  return notifications.filter(x=>!x.read).length;
}

function openNotification(notification, canonicalEvents, viewer) {
  const current = canonicalEvents.find(e=>eventKey(e)===notification.eventId || e.entityId===notification.entityId);
  if (!current) return {kind:'unavailable',route:'activity',reason:'current-state-unavailable'};
  const visible = redactForViewer(current, viewer);
  if (visible.hidden) return {kind:'access-changed',route:'activity',reason:'access-revoked'};
  const stale = notification.snapshotStatus !== (current.status || null) || notification.snapshotType !== current.type;
  return {kind:stale?'stale':'current',route:ROUTES[current.type] || 'activity',current:visible,stale};
}

function filterActivity(activity, filter) {
  const items=activity.items;
  if (filter==='attention') return items.filter(x=>x.attention);
  if (filter==='payments') return items.filter(x=>x.type.startsWith('payment.') || x.type.startsWith('request.'));
  if (filter==='groups') return items.filter(x=>x.groupId || x.groupLabel);
  return items;
}

function searchActivity(activity, query) {
  const q=(query||'').trim().toLowerCase();
  if (!q) return activity.items;
  return activity.items.filter(i=>[i.title,i.personName,i.counterpartyName,i.groupLabel,i.method,i.currency,i.status,i.type].filter(Boolean).join(' ').toLowerCase().includes(q));
}

function currencyBuckets(items) {
  const out={};
  for (const item of items) {
    if (item.amount == null || !item.currency) continue;
    (out[item.currency] ||= []).push(item);
  }
  return out;
}

function activityAction(item) {
  // Read-only projection: navigation only. No domain mutation event is emitted here.
  return {kind:'navigate',route:item.route || 'activity',entityId:item.entityId || null};
}

function refresh(activity, newCanonicalEvents, viewer, {online=true, now=null}={}) {
  if (!online) return {...activity,offline:true,stale:true};
  return projectActivity(newCanonicalEvents,viewer,{offline:false,cachedAt:now});
}

module.exports={
  MEANINGFUL,ROUTES,ATTENTION_TYPES,isMeaningfulEvent,eventKey,redactForViewer,projectActivity,
  notificationCopy,markNotificationRead,markAllNotificationsRead,attentionCount,unreadCount,
  openNotification,filterActivity,searchActivity,currencyBuckets,activityAction,refresh
};

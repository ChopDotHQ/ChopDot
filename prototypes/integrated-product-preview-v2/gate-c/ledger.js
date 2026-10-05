// Pure projections over the shared prototype state. Amounts are integer minor units.
export class SettlementError extends Error {
  constructor(code, message, detail = {}) { super(message); this.code = code; this.detail = detail; }
}
export const fail = (code, message, detail) => { throw new SettlementError(code, message, detail); };
export const allGroups = s => [...new Map([...(s.groups || []), ...(s.group ? [s.group] : [])].map(g => [g.id, g])).values()];
export const people = s => [{ id: 'self', name: 'You' }, ...(s.people || [])];
export const sum = xs => xs.reduce((a, b) => a + BigInt(b), 0n);
const key = (e, debtor, creditor) => JSON.stringify([e.id, debtor, creditor, e.money.currency, e.money.exponent]);
export function sources(s, actor, other = null) {
  const map = new Map();
  (s.expenses || []).filter(e => !e.deleted).forEach((e, index) => {
    for (const a of e.allocation.allocations) {
      const debtor = a.participantId, creditor = e.payerId;
      if (debtor === creditor || ![debtor, creditor].includes(actor)) continue;
      const counterparty = debtor === actor ? creditor : debtor;
      if (other && counterparty !== other) continue;
      const minor = BigInt(a.amount.minorUnits) * (debtor === actor ? 1n : -1n);
      if (!minor) continue;
      const id = key(e, debtor, creditor);
      map.set(id, { id, expenseId: e.id, revision: e.revision || 1, groupId: e.groupId || s.group?.id,
        counterparty, currency: e.money.currency, exponent: e.money.exponent,
        description: e.description, recordedOrder: index, originalMinor: minor.toString(),
        minor: minor.toString(), disputed: (e.issues || []).some(i => i.status === 'open') });
    }
  });
  // A correction or deletion cannot erase an accepted payment. Orphaned source
  // applications remain as a receivable/payable against the original pair.
  for (const p of s.gateC?.payments || []) {
    if (!['closed', 'partial'].includes(p.state) || ![p.payer, p.recipient].includes(actor)) continue;
    const counterparty = p.payer === actor ? p.recipient : p.payer;
    if (other && other !== counterparty) continue;
    const direction = p.payer === actor ? 1n : -1n;
    for (const app of p.applications) {
      const source = p.sources.find(r => r.id === app.sourceId);
      if (!source) fail('CORRUPT', 'Accepted payment source is missing.');
      let row = map.get(source.id);
      if (!row) {
        row = { ...source, counterparty, originalMinor: '0', minor: '0', disputed: false };
        map.set(row.id, row);
      }
      row.minor = (BigInt(row.minor) - direction * BigInt(app.minor)).toString();
    }
  }
  return [...map.values()].sort((a,b) => a.recordedOrder - b.recordedOrder || a.id.localeCompare(b.id));
}
export function balances(s, actor, groupId = null) {
  const result = {};
  for (const row of sources(s, actor).filter(r => !groupId || r.groupId === groupId)) {
    const k = `${row.currency}:${row.exponent}`;
    result[k] = (BigInt(result[k] || '0') - BigInt(row.minor)).toString();
  }
  return result;
}
export function pairs(s, actor, groupId = null) {
  const map = new Map();
  for (const row of sources(s, actor).filter(r => !groupId || r.groupId === groupId)) {
    const id = JSON.stringify([row.counterparty, row.currency, row.exponent]);
    const entry = map.get(id) || { other: row.counterparty, currency: row.currency, exponent: row.exponent, minor: 0n, rows: [] };
    entry.minor += BigInt(row.minor); entry.rows.push(row); map.set(id, entry);
  }
  return [...map.values()].map(e => ({ ...e, minor: e.minor.toString() }));
}
export function resolveScope(s, options) {
  const { payer, recipient, currency, exponent = 2, groupIds } = options;
  const ids = new Set(people(s).map(p => p.id));
  if (payer === recipient || !ids.has(payer) || !ids.has(recipient)) fail('PARTICIPANT', 'Choose two different people.');
  if (!Array.isArray(groupIds) || !groupIds.length || new Set(groupIds).size !== groupIds.length || groupIds.some(id => !allGroups(s).some(g => g.id === id))) fail('SCOPE', 'Choose the included groups.');
  let rows = sources(s, payer, recipient).filter(r => r.currency === currency && r.exponent === exponent && groupIds.includes(r.groupId) && BigInt(r.minor) !== 0n);
  if(options.sourceIds){
    if(!Array.isArray(options.sourceIds)||new Set(options.sourceIds).size!==options.sourceIds.length||options.sourceIds.some(id=>!rows.some(r=>r.id===id)))fail('SCOPE','Choose existing sources inside the selected groups and currency.');
    rows=rows.filter(r=>options.sourceIds.includes(r.id));
  }
  if (!rows.length) fail('SQUARE', 'There is no remaining balance in this scope.');
  if (rows.some(r => r.disputed)) fail('DISPUTE', 'An included expense has an open issue. Choose eligible sources or resolve the issue first.');
  const total = sum(rows.map(r => r.minor));
  if (total <= 0n) fail('SQUARE', 'You do not owe a payment in this scope.');
  return { rows, total: total.toString() };
}
export function makePlan(rows, amount, options = {}) {
  const units = BigInt(amount), total = sum(rows.map(r => r.minor));
  if (units <= 0n || units > total) fail('AMOUNT', 'Choose an amount above zero and no higher than the eligible balance.');
  const useOffsets = options.useOffsets !== false;
  const credit = -sum(rows.filter(r => BigInt(r.minor) < 0n).map(r => r.minor));
  if (units === total && credit && !useOffsets) fail('ALLOCATION', 'Include the shown offsets to clear this entire net balance, or choose a smaller amount.');
  const order = options.order || rows.filter(r => BigInt(r.minor) > 0n).map(r => r.id);
  const debts = rows.filter(r => BigInt(r.minor) > 0n);
  if (order.length !== debts.length || new Set(order).size !== order.length || order.some(id => !debts.some(r => r.id === id))) fail('ALLOCATION', 'Review the source application order.');
  const applied = Object.fromEntries(rows.map(r => [r.id, 0n]));
  let offset = useOffsets ? credit : 0n;
  if (useOffsets) for (const r of rows.filter(r => BigInt(r.minor) < 0n)) applied[r.id] = BigInt(r.minor);
  const cashCapacity = {};
  for (const id of order) {
    const debt = BigInt(debts.find(r => r.id === id).minor);
    const take = offset < debt ? offset : debt;
    applied[id] += take; offset -= take; cashCapacity[id] = debt - take;
  }
  let cash = units;
  if (options.cashBySource) {
    if (Object.keys(options.cashBySource).some(id => !order.includes(id))) fail('ALLOCATION', 'Payment allocation contains an unrelated source.');
    for (const id of order) {
      const n = BigInt(options.cashBySource[id] || '0');
      if (n < 0n || n > cashCapacity[id]) fail('ALLOCATION', 'A source payment exceeds its remaining obligation.');
      applied[id] += n; cash -= n;
    }
  } else for (const id of order) {
    const n = cash < cashCapacity[id] ? cash : cashCapacity[id];
    applied[id] += n; cash -= n;
  }
  if (cash || offset || sum(Object.values(applied)) !== units) fail('ALLOCATION', 'Source payments must add up exactly to the selected amount.');
  const applications = rows.map(r => ({ sourceId: r.id, minor: applied[r.id].toString() }));
  return { amount: units.toString(), useOffsets, order: [...order],
    applications, remaining: (total - units).toString(),
    after: rows.map(r => ({ ...r, minor: (BigInt(r.minor) - applied[r.id]).toString() })),
    // Explicit per-source money limits also define the accepted lower-receipt path.
    cashBySource: Object.fromEntries(order.map(id => [id, (applied[id] - (BigInt(debts.find(r => r.id === id).minor) - cashCapacity[id])).toString()])) };
}
export function lowerReceiptPlan(p, amount) {
  let left = BigInt(amount);
  if (left <= 0n || left > BigInt(p.amount)) fail('AMOUNT', 'Confirm only the amount received, up to the requested payment.');
  const cashBySource = {};
  for (const id of p.plan.order) {
    const limit = BigInt(p.plan.cashBySource[id]);
    const n = left < limit ? left : limit; cashBySource[id] = n.toString(); left -= n;
  }
  if (left) fail('ALLOCATION', 'Received amount does not fit the reviewed source plan.');
  return makePlan(p.sources, amount, { ...p.plan, cashBySource });
}
export const blockingPayment = p => !['closed','failed','cancelled','expired','reversed'].includes(p.state);
export function unresolved(s, p) {
  if (!blockingPayment(p)) return false;
  if (p.state !== 'partial') return true;
  const ids = new Set(p.sources.map(r => r.id));
  return sum(sources(s,p.payer,p.recipient).filter(r=>ids.has(r.id)).map(r=>r.minor)) > 0n;
}
export function guardCanonicalPayments(s, current, proposed) {
  if (!s.gateC) return;
  const after = { ...s, expenses: s.expenses.filter(e => e.id !== current?.id).concat(proposed ? [proposed] : []) };
  for (const p of s.gateC.payments.filter(p=>unresolved(s,p))) {
    const project = state => sources(state, p.payer, p.recipient).filter(r => r.currency === p.currency && r.exponent === p.exponent && p.groupIds.includes(r.groupId) && BigInt(r.minor)).map(r => [r.id, r.minor, r.disputed, p.sources.some(x=>x.id===r.id)?r.revision:null]).sort((a,b) => a[0].localeCompare(b[0]));
    if (JSON.stringify(project(s)) !== JSON.stringify(project(after))) fail('GUARD', 'An unresolved payment or partial remainder depends on this change. Review the payment first.', { paymentId: p.id });
  }
}

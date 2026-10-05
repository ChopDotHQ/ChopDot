import {
  moneyFromPreviewDecimal,
  moneyFromMinorUnits,
  allocateMoneyEvenly,
  assertAllocationSnapshot,
  moneyToDecimal,
} from "../money-v1.js";
import { evaluateExpenseMutationGuard } from "./contract/hardening-lib.mjs";

export const STORAGE_KEY = "chopdot.preview-v2.guest";
export const REASONS = [
  "My share",
  "I wasn't part of this",
  "Expense details",
  "Possible duplicate",
  "Ask a question",
];
export class DomainError extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.code = code;
    this.detail = detail;
  }
}
const fail = (code, message, detail) => {
  throw new DomainError(code, message, detail);
};
const clone = (x) => structuredClone(x);
export const participants = (s) => [
  { id: "self", name: "You" },
  ...(s.people || []),
];
export const activeExpenses = (s) => s.expenses.filter((e) => !e.deleted);
export function upgrade(input) {
  const s = clone(input || {});
  s.people ||= [];
  s.expenses ||= [];
  s.gateB ||= {
    version: 1,
    sequence: 0,
    history: [],
    operations: {},
    drafts: {},
    environment: { offline: false, settlements: [] },
  };
  for (const e of s.expenses) {
    e.ownerId ||= "self";
    e.revision ||= 1;
    e.groupId ||= s.group?.id;
    e.money ||= e.allocation?.total;
    if (!e.allocation)
      fail("CORRUPT", "Saved expense has no exact allocation.");
    e.date ||= "Date not recorded";
    e.method ||= "equal";
    e.reviews ||= Object.fromEntries(
      e.participantIds
        .filter((id) => id !== e.ownerId)
        .map((id) => [id, { status: "pending", revision: e.revision }]),
    );
    e.issues ||= [];
    e.receipt ||= null;
  }
  return s;
}
export function allocationFor(d, currency) {
  const ids = [...new Set(d.participantIds)].sort();
  if (!ids.length || ids.length !== d.participantIds.length)
    fail("MISSING", "Choose at least one distinct participant.");
  const total = moneyFromPreviewDecimal(d.amountText, currency);
  if (BigInt(total.minorUnits) <= 0n)
    fail("MISSING", "Enter an amount greater than zero.");
  let allocations;
  if (d.method === "exact") {
    allocations = ids.map((participantId) => ({
      participantId,
      amount: moneyFromPreviewDecimal(
        d.exact?.[participantId] || "0",
        currency,
      ),
    }));
  } else if (d.method === "shares") {
    const weights = ids.map((id) => {
      const v = String(d.shares?.[id] ?? "1");
      if (!/^(0|[1-9]\d{0,5})$/.test(v))
        fail("MISSING", "Shares must be whole numbers from 0 to 999999.");
      return BigInt(v);
    });
    const weight = weights.reduce((a, b) => a + b, 0n),
      units = BigInt(total.minorUnits);
    if (weight === 0n) fail("MISSING", "At least one person needs a share.");
    const amounts = weights.map((w) => (units * w) / weight);
    let remaining = units - amounts.reduce((a, b) => a + b, 0n);
    // Deterministic integer partition, stable participant ordering for remainder units.
    for (let i = 0; remaining > 0n; i++, remaining--) {
      if (weights[i % ids.length] > 0n) amounts[i % ids.length]++;
      else remaining++;
    }
    allocations = ids.map((participantId, i) => ({
      participantId,
      amount: moneyFromMinorUnits(amounts[i], currency),
    }));
  } else if (d.method === "equal")
    allocations = allocateMoneyEvenly(total, ids);
  else fail("MISSING", "Choose Equal, Exact or Shares.");
  const snapshot = { version: 1, total, allocations };
  try {
    assertAllocationSnapshot(snapshot, ids);
  } catch (e) {
    fail("ALLOCATION", e.message);
  }
  return snapshot;
}
export function newDraft(s, actor = "self", id = crypto.randomUUID()) {
  if (!s.group) fail("MISSING", "Create a group first.");
  return {
    id,
    operationId: crypto.randomUUID(),
    baseRevision: null,
    amountText: "",
    description: "",
    payerId: actor,
    participantIds: participants(s).map((p) => p.id),
    method: "equal",
    exact: {},
    shares: {},
    date: new Date().toISOString().slice(0, 10),
    receipt: null,
  };
}
export function editDraft(e) {
  return {
    id: e.id,
    operationId: crypto.randomUUID(),
    baseRevision: e.revision,
    amountText: moneyToDecimal(e.money),
    description: e.description,
    payerId: e.payerId,
    participantIds: [...e.participantIds],
    method: e.method,
    date: e.date,
    receipt: clone(e.receipt),
    exact: Object.fromEntries(
      e.allocation.allocations.map((a) => [
        a.participantId,
        moneyToDecimal(a.amount),
      ]),
    ),
    shares: clone(e.shares || {}),
  };
}
function proposal(s, d, actor, current) {
  const people = new Set(participants(s).map((p) => p.id));
  if (
    !people.has(actor) ||
    !people.has(d.payerId) ||
    d.participantIds.some((id) => !people.has(id))
  )
    fail("PARTICIPANT", "Choose people in this group.");
  if (!d.description?.trim()) fail("MISSING", "Add a description.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(d.date) ||
    Number.isNaN(Date.parse(d.date)) ||
    new Date(d.date).toISOString().slice(0, 10) !== d.date
  )
    fail("MISSING", "Choose a date.");
  if (
    d.receipt &&
    (typeof d.receipt.name !== "string" ||
      !/^data:image\/(png|jpeg|webp);base64,/.test(d.receipt.data || "") ||
      d.receipt.data.length > 1500000)
  )
    fail("RECEIPT", "Choose a PNG, JPEG or WebP image smaller than 1 MB.");
  const allocation = allocationFor(d, s.group.currency);
  return {
    ...(current || {}),
    id: d.id,
    groupId: s.group.id,
    ownerId: current?.ownerId || actor,
    revision: (current?.revision || 0) + 1,
    description: d.description.trim(),
    amountText: moneyToDecimal(allocation.total),
    money: allocation.total,
    allocation,
    currency: s.group.currency,
    payerId: d.payerId,
    participantIds: [...d.participantIds].sort(),
    method: d.method,
    shares: clone(d.shares || {}),
    date: d.date,
    receipt: clone(d.receipt),
    reviews: clone(current?.reviews || {}),
    issues: clone(current?.issues || []),
  };
}
export function position(s, actor) {
  const balances = {};
  for (const e of activeExpenses(s)) {
    const key = `${e.money.currency}:${e.money.exponent}`;
    const paid = e.payerId === actor ? BigInt(e.money.minorUnits) : 0n;
    const owed = BigInt(
      e.allocation.allocations.find((a) => a.participantId === actor)?.amount
        .minorUnits || "0",
    );
    balances[key] = (BigInt(balances[key] || "0") + paid - owed).toString();
  }
  return balances;
}
export function pendingFor(s, actor) {
  return activeExpenses(s).filter(
    (e) => e.reviews[actor] && e.reviews[actor].status !== "agreed",
  );
}
const numeric = (n) => {
  const v = Number(n);
  if (!Number.isSafeInteger(v))
    fail(
      "GUARD",
      "Settlement evidence exceeds the prototype reference adapter’s safe integer range.",
    );
  return v;
};
function effects(e) {
  return {
    expense_id: e.id,
    pair_currency_effects: e.allocation.allocations
      .filter((a) => a.participantId !== e.payerId)
      .map((a) => ({
        party_a: a.participantId,
        party_b: e.payerId,
        currency: e.money.currency,
        minor_units: numeric(a.amount.minorUnits),
      })),
  };
}
function dependencySnapshot(expenses, p) {
  let amount = 0n;
  const sources = [];
  let dispute = false;
  for (const e of expenses.filter((e) => !e.deleted)) {
    if (e.currency !== p.currency) continue;
    let effect = 0n;
    if (e.payerId === p.recipient_participant_id)
      effect += BigInt(
        e.allocation.allocations.find(
          (a) => a.participantId === p.payer_participant_id,
        )?.amount.minorUnits || "0",
      );
    if (e.payerId === p.payer_participant_id)
      effect -= BigInt(
        e.allocation.allocations.find(
          (a) => a.participantId === p.recipient_participant_id,
        )?.amount.minorUnits || "0",
      );
    if (effect !== 0n) {
      amount += effect;
      sources.push(e.id);
      dispute ||= e.issues.some((i) => i.status === "open");
    }
  }
  return {
    eligible_balance_minor_units: numeric(amount > 0n ? amount : 0n),
    dispute_eligible: !dispute,
    source_item_ids: sources.sort(),
  };
}
export function guardMutation(s, current, proposed, core, now) {
  const env = s.gateB.environment;
  if (!Array.isArray(env.settlements))
    fail("GUARD", "Settlement dependency evidence is unavailable.");
  const op = current
    ? proposed
      ? "expense.edit"
      : "expense.delete"
    : "expense.create";
  const evaluatedAt =
    env.evidenceSequence === s.gateB.sequence && env.evidenceAsOf
      ? env.evidenceAsOf
      : now;
  const fixture = {
    operation: op,
    group_id: s.group.id,
    evaluated_state_as_of: evaluatedAt,
    active_settlements: clone(env.settlements),
  };
  if (env.settlements.length) {
    fixture.current = current ? effects(current) : undefined;
    fixture.proposed = proposed ? effects(proposed) : undefined;
    const after = s.expenses.filter((e) => e.id !== current?.id);
    if (proposed) after.push(proposed);
    fixture.dependency_snapshot_before_by_payment_id = {};
    fixture.dependency_snapshot_after_by_payment_id = {};
    for (const p of env.settlements) {
      fixture.dependency_snapshot_before_by_payment_id[p.payment_id] =
        dependencySnapshot(s.expenses, p);
      fixture.dependency_snapshot_after_by_payment_id[p.payment_id] =
        dependencySnapshot(after, p);
    }
  }
  const result = evaluateExpenseMutationGuard(core, fixture);
  if (result.blocked)
    fail(
      "GUARD",
      `Expense changes are blocked by ${result.payment_id || "unresolved settlement evidence"}. Your details are saved.`,
      result,
    );
  return result;
}
const canEdit = (e, actor) => e.ownerId === actor; // No privileged role is asserted by this local prototype.
export function transition(
  input,
  command,
  core,
  now = new Date().toISOString(),
) {
  const s = upgrade(input),
    { actor, type, id, operationId } = command;
  if (!participants(s).some((p) => p.id === actor))
    fail("PERMISSION", "This person is not in the group.");
  if (!operationId) fail("OPERATION", "An operation identity is required.");
  const fingerprint = JSON.stringify(command);
  const prior = s.gateB.operations[operationId];
  if (prior) {
    if (prior.fingerprint !== fingerprint)
      fail(
        "OPERATION",
        "This operation identity already belongs to another change.",
      );
    return s;
  }
  if (type === "create" && id !== command.draft?.id)
    fail("LINEAGE", "The create command must use its draft expense identity.");
  const current = s.expenses.find((e) => e.id === id);
  if (type !== "create" && (!current || current.deleted))
    fail("NOT_FOUND", "This expense is no longer available.");
  if (type !== "create" && command.revision !== current.revision)
    fail(
      "CONFLICT",
      "This expense changed. Review the latest version before trying again.",
    );
  let next;
  if (type === "create" || type === "edit") {
    if (type === "edit" && !canEdit(current, actor))
      fail("PERMISSION", "Only the expense owner can change this expense.");
    if (type === "create" && s.expenses.some((e) => e.id === command.draft.id))
      fail("CONFLICT", "This expense identity already exists.");
    if (type === "edit" && command.draft.id !== current.id)
      fail("LINEAGE", "An edit must preserve the expense identity.");
    if (command.draft.operationId !== operationId)
      fail("OPERATION", "Keep the original save operation identity.");
    next = proposal(s, command.draft, actor, current);
    if (
      type === "create" &&
      !command.allowDuplicate &&
      activeExpenses(s).some(
        (e) =>
          e.description.toLowerCase() === next.description.toLowerCase() &&
          e.amountText === next.amountText &&
          e.payerId === next.payerId &&
          e.date === next.date,
      )
    )
      fail("DUPLICATE", "This looks like an expense already in the group.");
    guardMutation(s, current, next, core, now);
    for (const pid of new Set([
      ...Object.keys(next.reviews),
      ...next.participantIds.filter((p) => p !== next.ownerId),
    ]))
      next.reviews[pid] = {
        status: type === "edit" ? "needs_review_again" : "pending",
        revision: next.revision,
      };
  } else if (type === "delete") {
    if (!canEdit(current, actor))
      fail("PERMISSION", "Only the expense owner can delete this expense.");
    guardMutation(s, current, null, core, now);
    next = { ...current, deleted: true, revision: current.revision + 1 };
  } else {
    next = clone(current);
    const issue = next.issues.find((i) => i.id === command.issueId);
    if (type === "reply") {
      if (!canEdit(current, actor) || !issue || issue.status !== "open")
        fail(
          "PERMISSION",
          "Only the expense owner can reply to an open issue.",
        );
      if (!command.note?.trim()) fail("MISSING", "Write a reply.");
      issue.replies.push({
        actor,
        note: command.note.trim(),
        at: now,
        revision: next.revision,
      });
    } else {
      if (!next.reviews[actor])
        fail("PERMISSION", "There is no review assigned to this person.");
      if (type === "agree") {
        next.reviews[actor] = { status: "agreed", revision: next.revision };
        for (const i of next.issues.filter(
          (i) => i.reviewerId === actor && i.status === "open",
        )) {
          i.status = "resolved";
          i.resolvedAt = now;
        }
      } else if (type === "issue") {
        if (!REASONS.includes(command.reason))
          fail("MISSING", "Choose a reason.");
        if (
          next.issues.some((i) => i.reviewerId === actor && i.status === "open")
        )
          fail("CONFLICT", "Your issue is already open.");
        next.issues.push({
          id: operationId,
          reviewerId: actor,
          reason: command.reason,
          note: command.note?.trim() || "",
          status: "open",
          createdAt: now,
          replies: [],
        });
        next.reviews[actor] = { status: "issue", revision: next.revision };
      } else if (type === "withdraw" || type === "still_off") {
        if (!issue || issue.reviewerId !== actor || issue.status !== "open")
          fail(
            "PERMISSION",
            "Only the person who raised this issue can reassess it.",
          );
        if (type === "withdraw") {
          issue.status = "withdrawn";
          issue.resolvedAt = now;
          next.reviews[actor] = { status: "pending", revision: next.revision };
        } else {
          if (!REASONS.includes(command.reason))
            fail("MISSING", "Choose a reason.");
          issue.reason = command.reason;
          issue.note = command.note?.trim() || "";
          next.reviews[actor] = { status: "issue", revision: next.revision };
          issue.replies.push({
            actor,
            note: command.note?.trim() || "Still off",
            reason: command.reason,
            at: now,
            revision: next.revision,
          });
        }
      } else fail("OPERATION", "Unknown operation.");
    }
  }
  if (current)
    s.expenses[s.expenses.findIndex((e) => e.id === current.id)] = next;
  else s.expenses.push(next);
  s.gateB.history.push({
    operationId,
    type,
    actor,
    expenseId: next.id,
    at: now,
    before: current ? clone(current) : null,
    after: clone(next),
    localOnly: true,
    offline: s.gateB.environment.offline === true,
  });
  s.gateB.operations[operationId] = { fingerprint, expenseId: next.id };
  s.gateB.sequence++;
  if (type === "create" || type === "edit") delete s.gateB.drafts[actor];
  return s;
}
export function repository(storage, core, assertWriter = () => {}) {
  const read = () => upgrade(JSON.parse(storage.getItem(STORAGE_KEY) || "{}"));
  const write = (s) => {
    assertWriter();
    storage.setItem(STORAGE_KEY, JSON.stringify(s));
    return s;
  };
  return {
    read,
    saveDraft(actor, draft) {
      const s = read();
      s.gateB.drafts[actor] = clone(draft);
      return write(s);
    },
    commit(command) {
      const s = read();
      if (s.gateB.environment.failSave)
        fail("SAVE", "Couldn’t save. Your details are still here.");
      return write(transition(s, command, core));
    },
    setEnvironment(environment) {
      const s = read();
      s.gateB.environment = clone(environment);
      return write(s);
    },
  };
}

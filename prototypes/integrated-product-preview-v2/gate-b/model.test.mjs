import test from "../test-runner.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  upgrade,
  transition,
  newDraft,
  editDraft,
  allocationFor,
  position,
  activeExpenses,
  pendingFor,
  repository,
  STORAGE_KEY,
} from "./model.js";
const core = JSON.parse(
  readFileSync(new URL("./contract/semantic-core.json", import.meta.url)),
);
const now = "2026-09-28T12:00:00.000Z";
const seed = () =>
  upgrade({
    group: { id: "g1", name: "Trip", currency: "CHF" },
    people: [
      { id: "p1", name: "Jeanine" },
      { id: "p2", name: "Marc" },
      { id: "p3", name: "Sam" },
    ],
    expenses: [],
  });
function draft(s, patch = {}) {
  return {
    ...newDraft(s, "self", "expense-1"),
    amountText: "128.00",
    description: "Dinner",
    date: "2026-09-28",
    ...patch,
  };
}
function create(s = seed(), patch = {}, actor = "self") {
  const d = draft(s, patch);
  return transition(
    s,
    {
      type: "create",
      actor,
      id: d.id,
      operationId: d.operationId,
      draft: d,
      allowDuplicate: false,
    },
    core,
    now,
  );
}
function command(s, type, actor = "self", extra = {}) {
  const e = s.expenses[0];
  return {
    type,
    actor,
    id: e.id,
    revision: e.revision,
    operationId: crypto.randomUUID(),
    ...extra,
  };
}
function edit(s, patch = {}) {
  const d = { ...editDraft(s.expenses[0]), ...patch };
  return transition(
    s,
    command(s, "edit", "self", { draft: d, operationId: d.operationId }),
    core,
    now,
  );
}
const reject = (fn, code) => assert.throws(fn, (e) => e.code === code);
function settlement(s, status = "active", overrides = {}) {
  s = structuredClone(s);
  s.gateB.environment.settlements = [
    {
      payment_id: "pay-1",
      payer_participant_id: "p1",
      recipient_participant_id: "self",
      currency: "CHF",
      source_item_ids: ["expense-1"],
      prepared_amount_minor_units: 3200,
      resolution_status: status,
      ...overrides,
    },
  ];
  return s;
}

test("equal split conserves 128/3 deterministically by stable identity", () => {
  const a = allocationFor(
    draft(seed(), { participantIds: ["self", "p2", "p1"] }),
    "CHF",
  );
  assert.deepEqual(
    a.allocations.map((r) => [r.participantId, r.amount.minorUnits]),
    [
      ["p1", "4267"],
      ["p2", "4267"],
      ["self", "4266"],
    ],
  );
});
test("exact amounts bind to participants and exact partition", () => {
  const a = allocationFor(
    draft(seed(), {
      participantIds: ["p1", "self"],
      method: "exact",
      exact: { p1: "40", self: "88" },
    }),
    "CHF",
  );
  assert.equal(a.allocations[0].amount.minorUnits, "4000");
  reject(
    () =>
      allocationFor(
        draft(seed(), { method: "exact", exact: { self: "100" } }),
        "CHF",
      ),
    "ALLOCATION",
  );
});
test("weighted split includes zero shares and preserves exact total", () => {
  const a = allocationFor(
    draft(seed(), {
      amountText: "0.05",
      participantIds: ["self", "p1", "p2"],
      method: "shares",
      shares: { p1: "0", p2: "1", self: "2" },
    }),
    "CHF",
  );
  assert.deepEqual(
    a.allocations.map((r) => r.amount.minorUnits),
    ["0", "2", "3"],
  );
  reject(
    () =>
      allocationFor(
        draft(seed(), {
          method: "shares",
          shares: { self: 0, p1: 0, p2: 0, p3: 0 },
        }),
        "CHF",
      ),
    "MISSING",
  );
});
test("input ordering cannot change allocation and duplicate participants rejected", () => {
  let d = draft(seed());
  const a = allocationFor(d, "CHF");
  d.participantIds.reverse();
  assert.deepEqual(allocationFor(d, "CHF"), a);
  d.participantIds.push("self");
  reject(() => allocationFor(d, "CHF"), "MISSING");
});
test("fractional minor units, negative and unsafe boundary rejected without float rounding", () => {
  assert.throws(() =>
    allocationFor(draft(seed(), { amountText: "1.001" }), "CHF"),
  );
  assert.throws(() =>
    allocationFor(draft(seed(), { amountText: "-1" }), "CHF"),
  );
  assert.throws(() =>
    allocationFor(
      draft(seed(), { amountText: "100000000000000000000000000000" }),
      "CHF",
    ),
  );
});
test("large exact amounts retain precision", () => {
  const s = create(seed(), { amountText: "900719925474099.93" });
  assert.equal(s.expenses[0].money.minorUnits, "90071992547409993");
  assert.equal(Object.values(position(s, "self"))[0], "67553994410557495");
});
test("payer and allocation attribution stay in group", () => {
  reject(() => create(seed(), { payerId: "outsider" }), "PARTICIPANT");
  reject(() => create(seed(), { participantIds: ["outsider"] }), "PARTICIPANT");
});
test("required fields and date reject without effects", () => {
  reject(() => create(seed(), { description: " " }), "MISSING");
  reject(() => create(seed(), { date: "tomorrow" }), "MISSING");
  reject(() => create(seed(), { amountText: "0" }), "MISSING");
});
test("create, inspect projection, edit and delete retain lineage and append old-new history", () => {
  const a = create();
  const b = edit(a, { amountText: "100.01", description: "Dinner corrected" });
  assert.equal(b.expenses.length, 1);
  assert.equal(b.expenses[0].id, "expense-1");
  assert.equal(b.expenses[0].revision, 2);
  assert.equal(b.gateB.history[1].before.amountText, "128.00");
  assert.equal(b.gateB.history[1].after.amountText, "100.01");
  const c = transition(b, command(b, "delete"), core, now);
  assert.equal(activeExpenses(c).length, 0);
  assert.deepEqual(position(c, "self"), {});
  assert.equal(c.gateB.history.length, 3);
  assert.equal(c.expenses[0].deleted, true);
  assert.equal(a.expenses[0].revision, 1);
});
test("create cannot replace another expense (GB-SEC-001)", () => {
  const s = create();
  const d = draft(s, { id: "new-id", amountText: "99" });
  reject(
    () =>
      transition(
        s,
        command(s, "create", "p1", { draft: d, operationId: d.operationId }),
        core,
        now,
      ),
    "LINEAGE",
  );
  assert.equal(s.expenses[0].id, "expense-1");
});
test("owner-only edit/delete cannot be bypassed", () => {
  const s = create(),
    d = editDraft(s.expenses[0]);
  reject(
    () =>
      transition(
        s,
        command(s, "edit", "p1", { draft: d, operationId: d.operationId }),
        core,
        now,
      ),
    "PERMISSION",
  );
  reject(
    () => transition(s, command(s, "delete", "p1"), core, now),
    "PERMISSION",
  );
});
test("editing cannot replace expense identity", () => {
  const s = create(),
    d = { ...editDraft(s.expenses[0]), id: "new" };
  reject(
    () =>
      transition(
        s,
        command(s, "edit", "self", { draft: d, operationId: d.operationId }),
        core,
        now,
      ),
    "LINEAGE",
  );
});
test("replay of accepted command has no second history or effect", () => {
  const s = seed(),
    d = draft(s),
    c = {
      type: "create",
      actor: "self",
      id: d.id,
      draft: d,
      operationId: d.operationId,
    };
  const a = transition(s, c, core, now),
    b = transition(a, c, core, now);
  assert.deepEqual(a, b);
  reject(
    () => transition(a, { ...c, draft: { ...d, amountText: "99" } }, core, now),
    "OPERATION",
  );
});
test("failure preserves original state and operation for retry", () => {
  const memory = new Map([[STORAGE_KEY, JSON.stringify(seed())]]);
  let full = true;
  const storage = {
    getItem: (k) => memory.get(k),
    setItem(k, v) {
      if (full) throw Error("quota");
      memory.set(k, v);
    },
  };
  const repo = repository(storage, core),
    d = draft(seed()),
    c = {
      type: "create",
      id: d.id,
      actor: "self",
      operationId: d.operationId,
      draft: d,
    };
  assert.throws(() => repo.commit(c), /quota/);
  assert.equal(repo.read().expenses.length, 0);
  full = false;
  repo.commit(c);
  repo.commit(c);
  assert.equal(repo.read().gateB.history.length, 1);
});
test("draft Back/reopen/reload retains exact split and operation identity", () => {
  const m = new Map([[STORAGE_KEY, JSON.stringify(seed())]]),
    storage = { getItem: (k) => m.get(k), setItem: (k, v) => m.set(k, v) };
  const d = draft(seed(), {
    method: "exact",
    exact: { self: "128", p1: "0", p2: "0", p3: "0" },
  });
  repository(storage, core).saveDraft("self", d);
  assert.deepEqual(repository(storage, core).read().gateB.drafts.self, d);
});
test("edit resets all current reviewers including removed participants and preserves history", () => {
  let s = create();
  s = transition(s, command(s, "agree", "p1"), core, now);
  s = transition(s, command(s, "agree", "p2"), core, now);
  const before = structuredClone(s.gateB.history);
  s = edit(s, { participantIds: ["self", "p2"] });
  assert.equal(s.expenses[0].reviews.p1.status, "needs_review_again");
  assert.equal(s.expenses[0].reviews.p2.status, "needs_review_again");
  assert.equal(s.expenses[0].reviews.p3.status, "needs_review_again");
  assert.deepEqual(s.gateB.history.slice(0, before.length), before);
  assert.equal(pendingFor(s, "p1").length, 1);
  s = transition(s, command(s, "agree", "p1"), core, now);
  assert.equal(s.expenses[0].reviews.p1.status, "agreed");
});
test("same-value accepted edit still resets reviewers", () => {
  let s = create();
  s = transition(s, command(s, "agree", "p1"), core, now);
  s = edit(s);
  assert.equal(s.expenses[0].reviews.p1.status, "needs_review_again");
});
test("issue persists across owner reply and edit, only reviewer resolves", () => {
  let s = create();
  const issueCmd = command(s, "issue", "p1", {
    reason: "My share",
    note: "I only had drinks.",
  });
  s = transition(s, issueCmd, core, now);
  const issueId = issueCmd.operationId;
  s = transition(
    s,
    command(s, "reply", "self", { issueId, note: "Updating now" }),
    core,
    now,
  );
  s = edit(s, { amountText: "99" });
  assert.equal(s.expenses[0].issues[0].status, "open");
  reject(
    () => transition(s, command(s, "agree", "self"), core, now),
    "PERMISSION",
  );
  reject(
    () => transition(s, command(s, "withdraw", "p2", { issueId }), core, now),
    "PERMISSION",
  );
  s = transition(
    s,
    command(s, "still_off", "p1", {
      issueId,
      reason: "My share",
      note: "Still incorrect",
    }),
    core,
    now,
  );
  assert.equal(s.expenses[0].issues[0].status, "open");
  s = transition(s, command(s, "agree", "p1"), core, now);
  assert.equal(s.expenses[0].issues[0].status, "resolved");
  assert.equal(s.expenses[0].issues[0].replies.length, 2);
});
test("withdraw returns pending review without owner-fabricated agreement", () => {
  let s = create(),
    c = command(s, "issue", "p1", { reason: "Expense details" });
  s = transition(s, c, core, now);
  s = transition(
    s,
    command(s, "withdraw", "p1", { issueId: c.operationId }),
    core,
    now,
  );
  assert.equal(s.expenses[0].reviews.p1.status, "pending");
  assert.equal(s.expenses[0].issues[0].status, "withdrawn");
});
test("opening reasons has no state effect, invalid reason and duplicate issue rejected", () => {
  let s = create();
  const before = structuredClone(s);
  reject(
    () =>
      transition(
        s,
        command(s, "issue", "p1", { reason: "invented" }),
        core,
        now,
      ),
    "MISSING",
  );
  assert.deepEqual(s, before);
  s = transition(
    s,
    command(s, "issue", "p1", { reason: "My share" }),
    core,
    now,
  );
  reject(
    () =>
      transition(
        s,
        command(s, "issue", "p1", { reason: "My share" }),
        core,
        now,
      ),
    "CONFLICT",
  );
});
test("stale edit and stale agreement cannot overwrite accepted owner truth", () => {
  const s = create(),
    d = editDraft(s.expenses[0]),
    latest = edit(s, { amountText: "100" });
  reject(
    () =>
      transition(
        latest,
        command(s, "edit", "self", { draft: d, operationId: d.operationId }),
        core,
        now,
      ),
    "CONFLICT",
  );
  reject(
    () => transition(latest, command(s, "agree", "p1"), core, now),
    "CONFLICT",
  );
});
test("deleted expense is not current and cannot review, edit or recreate its identity", () => {
  const s = create(),
    deleted = transition(s, command(s, "delete"), core, now);
  reject(
    () => transition(deleted, command(s, "agree", "p1"), core, now),
    "NOT_FOUND",
  );
  reject(() => create(deleted), "CONFLICT");
});
test("duplicate detection allows explicit add anyway with distinct lineage", () => {
  const s = create(),
    d = draft(s, { id: "expense-2" }),
    c = {
      type: "create",
      actor: "self",
      id: d.id,
      draft: d,
      operationId: d.operationId,
    };
  reject(() => transition(s, c, core, now), "DUPLICATE");
  const b = transition(s, { ...c, allowDuplicate: true }, core, now);
  assert.equal(b.expenses.length, 2);
});
test("offline accepted local history does not claim remote sync", () => {
  const s = seed();
  s.gateB.environment.offline = true;
  const result = create(s);
  assert.equal(result.gateB.history[0].offline, true);
  assert.equal(result.gateB.history[0].localOnly, true);
});
for (const status of ["active", "unknown_effect", "open_remainder"])
  for (const type of ["create", "edit", "delete"])
    test(`guard ${status} blocks dependent ${type}`, () => {
      const s = settlement(create(), status);
      if (type === "create")
        reject(() => create(s, { id: "e2", description: "Another" }), "GUARD");
      else if (type === "edit")
        reject(() => edit(s, { description: "Changed" }), "GUARD");
      else
        reject(() => transition(s, command(s, "delete"), core, now), "GUARD");
    });
test("unrelated expense can create/edit/delete during active dependency", () => {
  const s = settlement(create());
  let b = create(s, {
    id: "independent",
    description: "Coffee",
    payerId: "p2",
    participantIds: ["p2", "p3"],
  });
  const e = b.expenses[1],
    d = { ...editDraft(e), description: "Tea" };
  b = transition(
    b,
    {
      type: "edit",
      id: e.id,
      actor: "self",
      revision: e.revision,
      operationId: d.operationId,
      draft: d,
    },
    core,
    now,
  );
  b = transition(
    b,
    {
      type: "delete",
      id: e.id,
      actor: "self",
      revision: b.expenses[1].revision,
      operationId: crypto.randomUUID(),
    },
    core,
    now,
  );
  assert.equal(activeExpenses(b).length, 1);
});
test("proposed payer/participant dependency is guarded even if current expense independent", () => {
  let s = create(seed(), { payerId: "p2", participantIds: ["p2", "p3"] });
  s = settlement(s, "active", { source_item_ids: ["other"] });
  reject(
    () => edit(s, { payerId: "self", participantIds: ["self", "p1"] }),
    "GUARD",
  );
});
test("missing dependency evidence fails closed", () => {
  const s = create();
  s.gateB.environment.settlements = null;
  reject(() => edit(s), "GUARD");
  const b = settlement(create());
  delete b.gateB.environment.settlements[0].source_item_ids;
  reject(() => edit(b), "GUARD");
});
test("terminal state requires fresh authoritative reconciliation", () => {
  for (const status of ["authoritative_terminal", "reconciled_no_effect"]) {
    const s = settlement(create(), status);
    reject(() => edit(s), "GUARD");
    const b = settlement(create(), status, {
      reconciliation_evidence: { authority_verified: true, as_of: now },
    });
    assert.equal(edit(b).expenses[0].revision, 2);
    const stale = settlement(create(), status, {
      reconciliation_evidence: {
        authority_verified: true,
        as_of: "2026-09-27T00:00:00Z",
      },
    });
    reject(() => edit(stale), "GUARD");
  }
});
test("release evidence is bound to evaluated state sequence", () => {
  const s = settlement(create(), "authoritative_terminal", {
    reconciliation_evidence: { authority_verified: true, as_of: now },
  });
  s.gateB.environment.evidenceAsOf = now;
  s.gateB.environment.evidenceSequence = s.gateB.sequence;
  const d = editDraft(s.expenses[0]);
  assert.equal(
    transition(
      s,
      command(s, "edit", "self", { draft: d, operationId: d.operationId }),
      core,
      "2026-09-28T13:00:00Z",
    ).expenses[0].revision,
    2,
  );
});
test("large money guard adapter fails closed rather than rounding", () => {
  const s = settlement(create(seed(), { amountText: "90071992547409999" }));
  reject(() => edit(s), "GUARD");
});
test("raising issue remains allowed during settlement and preserves dependency evidence", () => {
  const s = settlement(create());
  const b = transition(
    s,
    command(s, "issue", "p1", { reason: "My share" }),
    core,
    now,
  );
  assert.equal(b.expenses[0].issues[0].status, "open");
  assert.deepEqual(
    b.gateB.environment.settlements,
    s.gateB.environment.settlements,
  );
});
test("Gate A expense upgrade preserves exact allocation and identity", () => {
  const s = create();
  delete s.expenses[0].ownerId;
  delete s.expenses[0].reviews;
  delete s.expenses[0].revision;
  const result = upgrade(s);
  assert.deepEqual(result.expenses[0].allocation, s.expenses[0].allocation);
  assert.equal(result.expenses[0].id, "expense-1");
  assert.equal(result.expenses[0].ownerId, "self");
});

test("calendar dates cannot normalize into another day", () => {
  reject(() => create(seed(), { date: "2026-02-31" }), "MISSING");
});
test("storage writes require the caller writer lease", () => {
  const s = seed(),
    storage = {
      getItem: () => JSON.stringify(s),
      setItem: () => assert.fail("must not write"),
    };
  const repo = repository(storage, core, () => {
    throw Error("lease missing");
  });
  assert.throws(() => repo.saveDraft("self", draft(s)), /lease missing/);
});

import {publishPrototypeRoute} from '../prototype-route.js';
import {currentActor,routeParticipant} from '../create-join/authority.js';
import {routeLocalSession} from '../session-guard.js';
import {
  requirePrototypeWriter,
  assertPrototypeWriter,
} from "../prototype-writer.js";
await requirePrototypeWriter();
import {
  repository,
  participants,
  activeExpenses,
  pendingFor,
  position,
  newDraft,
  editDraft,
  allocationFor,
  REASONS,
  DomainError,
  savedDraft,
} from "./model.js";
import { formatPreviewMoney, moneyFromMinorUnits } from "../money-v1.js";
import { pairs as settlementPairs } from "../gate-c/ledger.js";

const app = document.querySelector("#app");
const core = await fetch("./contract/semantic-core.json").then((r) => {
  if (!r.ok) throw Error("Contract unavailable");
  return r.json();
});
const templates = Object.fromEntries(
  await Promise.all(
    ["j05", "j06", "j07", "j08"].map(async (j) => [
      j,
      new DOMParser().parseFromString(
        await fetch(`./goldens/${j}.html`).then((r) => {
          if (!r.ok) throw Error("Golden unavailable");
          return r.text();
        }),
        "text/html",
      ),
    ]),
  ),
);
const repo = repository(localStorage, core, assertPrototypeWriter);
const fixtureMode = new URLSearchParams(location.search).has("fixtures");
let actor = currentActor()!=='self'?currentActor():fixtureMode
  ? sessionStorage.getItem("chopdot.gate-b.actor") || "self"
  : "self";
let state,
  screen,
  draft,
  route,
  renderedRevision,
  lastError = null,
  busy = false,
  renderGeneration = 0;
const $ = (s) => screen.querySelector(s),
  $$ = (s) => [...screen.querySelectorAll(s)];
const text = (selector, value) => {
  const el = $(selector);
  if (el) el.textContent = String(value ?? "");
};
const element = (tag, cls, value) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (value !== undefined) el.textContent = value;
  return el;
};
const name = (id) =>
  id === actor
    ? "You"
    : id === "self"
      ? (state.group?.membershipManaged ? (state.gateD?.account.displayName==='You'?'Group owner':state.gateD?.account.displayName||'Group owner') : "Guest")
      : participants(state).find((p) => p.id === id)?.name || id;
const initials = (id) =>
  name(id)
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
const money = (m) => formatPreviewMoney(m);
const share = (e) =>
  money(
    e.allocation.allocations.find((a) => a.participantId === actor)?.amount ||
      moneyFromMinorUnits(0n, e.currency),
  );
const method = (d) =>
  ({ equal: "Equal", exact: "Exact", shares: "Shares" })[d.method] || "Equal";
const dateLabel = (date) =>
  date === new Date().toISOString().slice(0, 10) ? "Today" : date;
const splitSummary = (snapshot) => {
  const values = snapshot.allocations.map((a) => BigInt(a.amount.minorUnits));
  const min = values.reduce((a, b) => (a < b ? a : b)),
    max = values.reduce((a, b) => (a > b ? a : b));
  return min === max
    ? `${money(snapshot.allocations[0].amount)} each`
    : `${money(moneyFromMinorUnits(min, snapshot.total.currency))}–${money(moneyFromMinorUnits(max, snapshot.total.currency))}`;
};
const short = (e) =>
  `${money(e.money)} · ${name(e.payerId)} paid · ${dateLabel(e.date)}`;
const action = (selector, fn) =>
  $$(selector).forEach((el) => {
    el.dataset.bound = "true";
    el.onclick = (event) => {
      event.preventDefault();
      if (!busy)
        try {
          fn(event);
        } catch (e) {
          showError(e);
        }
    };
  });
function nav(page, id = route?.id || "", extra = {}) {
  const params = new URLSearchParams({ page, ...(id ? { id } : {}), ...extra });
  location.hash = params.toString();
  publishPrototypeRoute('chopdot-gate-b-route', location.hash);
}
function mount(j, id) {
  const template = templates[j].getElementById(id);
  if (!template) throw Error(`Missing Golden ${j}/${id}`);
  document.querySelector("#golden-style").textContent = [
    ...templates[j].querySelectorAll("style"),
  ]
    .map((s) => s.textContent)
    .join("\n");
  screen = template.cloneNode(true);
  screen.dataset.journey = j;
  screen.dataset.golden = id;
  screen.tabIndex = -1;
  app.replaceChildren(screen);
  screen.querySelectorAll("script").forEach((n) => n.remove());
  text(".header-title span", state.group?.name || "Local group");
  action('[aria-label="Back"]', () => nav("group", ""));
}
function note(message, error = false) {
  const n = element("p", `gb-note${error ? " gb-error" : ""}`, message);
  n.role = error ? "alert" : "status";
  ($(".app-content") || $(".handoff") || screen).prepend(n);
  return n;
}
const draftPartition=()=>state.expenses.find(e=>e.id===draft?.id)?.money||{currency:state.group.currency,exponent:state.group.exponent??2};
function persistDraft() {
  repo.saveDraft(actor, draft);
}
function draftFor(id) {
  const saved = savedDraft(state,actor);
  if (saved && (!id || saved.id === id)) return structuredClone(saved);
  const e = state.expenses.find((e) => e.id === id && !e.deleted);
  if (id && !e)
    throw new DomainError("NOT_FOUND", "This expense is no longer available.");
  return e ? editDraft(e) : newDraft(state, actor);
}
function openEditor(e) {
  draft = e
    ? draftFor(e.id)
    : savedDraft(state,actor)?.baseRevision === null
      ? structuredClone(savedDraft(state,actor))
      : newDraft(state, actor);
  persistDraft();
  nav("editor", draft.id);
}
function backEditor() {
  nav("editor", draft.id);
}
function fillSummary(e) {
  text(".amount-display", money(e.money));
  text(".detail-hero h1, .question-hero h1", e.description);
  text(
    ".detail-hero .meta",
    `Added by ${name(e.ownerId)} · Revision ${e.revision}`,
  );
  text(
    ".question-hero .meta",
    `${name(e.payerId)} paid · ${e.date} · ${e.participantIds.length} people`,
  );
  const facts = $$(".fact b, .context b");
  [
    name(e.payerId),
    share(e),
    facts[2]?.closest(".fact") ? e.date : method(e),
  ].forEach((v, i) => {
    if (facts[i]) facts[i].textContent = v;
  });
  text(".receipt-top b", e.description);
  text(".receipt-meta", `${name(e.payerId)} paid · ${dateLabel(e.date)}`);
  text(".receipt-amount", money(e.money));
  text(".shares b", share(e));
}
function splitRows(e, container) {
  if (!container) return;
  container.replaceChildren();
  for (const a of [...e.allocation.allocations].sort((a, b) =>
    a.participantId === actor ? -1 : b.participantId === actor ? 1 : 0,
  )) {
    const row = element("div", "split-person");
    row.append(
      element(
        "div",
        `avatar${a.participantId === actor ? " you" : ""}`,
        initials(a.participantId),
      ),
    );
    const who = element("div");
    who.append(
      element("b", "", name(a.participantId)),
      element("span", "", "Included"),
    );
    row.append(who, element("div", "split-amount", money(a.amount)));
    container.append(row);
  }
}
function group() {
  mount("j08", "active");
  const expenses = activeExpenses(state),
    pending = pendingFor(state, actor),
    issues = expenses.flatMap((e) =>
      e.ownerId === actor
        ? e.issues.filter((i) => i.status === "open").map((i) => ({ e, i }))
        : [],
    );
  const spending=new Map();for(const e of expenses){const key=JSON.stringify([e.money.currency,e.money.exponent]);spending.set(key,(spending.get(key)||0n)+BigInt(e.money.minorUnits));}
  text(".header-title b", state.group.name);
  text(
    ".header-title span",
    `${participants(state).length} ${participants(state).length===1?'person':'people'} · ${state.group.currency}`,
  );
  const stack = $(".people-stack");
  stack.replaceChildren(
    ...participants(state).map((p) =>
      element(
        "span",
        p.id === actor ? "person-dot" : "person-dot light",
        initials(p.id),
      ),
    ),
  );
  text(
    ".meta-copy b",
    (spending.size?[...spending].map(([key,n])=>{const[c,x]=JSON.parse(key);return money(moneyFromMinorUnits(n,c,x));}).join(' · '):money(moneyFromMinorUnits('0',state.group.currency,state.group.exponent??2)))+' spent',
  );
  text(
    ".meta-copy span",
    `${expenses.length} ${expenses.length === 1 ? "expense" : "expenses"}`,
  );
  const tasks = [
    ...issues.map(({ e, i }) => ({
      e,
      label: `${name(i.reviewerId)} flagged ${e.description}`,
      page: "issue",
      issue: i.id,
    })),
    ...pending.map((e) => ({
      e,
      label: `Review ${e.description}`,
      page: "review",
    })),
  ];
  const balances=position(state,actor),defaultKey=`${state.group.currency}:${state.group.exponent??2}`,displayKey=BigInt(balances[defaultKey]||0)!==0n?defaultKey:Object.keys(balances).find(k=>BigInt(balances[k])!==0n)||defaultKey,[displayCurrency,displayExponentText]=displayKey.split(':'),displayExponent=Number(displayExponentText),units=BigInt(balances[displayKey]||0);
  text(
    ".hero",
    !expenses.length
      ? "Ready when you are."
      : tasks.length === 1
        ? "One thing needs you."
        : tasks.length
          ? `${tasks.length} things need you.`
          : "Nothing needs you.",
  );
  text(
    ".attention-title",
    tasks.length === 1
      ? tasks[0].label
      : tasks.length
        ? "Needs your attention"
        : !expenses.length
          ? "No expenses yet."
          : "You’re up to date.",
  );
  text(
    ".attention-sub",
    tasks.length === 1
      ? "Then you’re done here."
      : tasks.length
        ? "Review when you’re ready."
        : "No action needed from you.",
  );
  const taskTemplate = $(".attention-item");
  taskTemplate.remove();
  for (const task of tasks) {
    const item = taskTemplate.cloneNode(true);
    item.querySelector(".ai-title").textContent = task.e.description;
    item.querySelector(".ai-sub").textContent = short(task.e);
    item.href = "#";
    item.dataset.bound = "true";
    item.onclick = (ev) => {
      ev.preventDefault();
      nav(task.page, task.e.id, task.issue ? { issue: task.issue } : {});
    };
    $(".attention").append(item);
  }
  const allSquare = participants(state).every((p) =>
    Object.values(position(state, p.id)).every((v) => BigInt(v) === 0n),
  );
  text(
    ".position-label",
    units > 0n
      ? "You’re owed"
      : units < 0n
        ? "You owe"
        : allSquare
          ? "Everyone’s square."
          : "You’re square.",
  );
  text(
    ".position-value",
    money(
      moneyFromMinorUnits(units<0n?-units:units,displayCurrency,displayExponent),
    ),
  );
  $(".position-value").classList.toggle("positive", units > 0n);
  const pairs = {};
  for (const e of expenses) {
    for (const a of e.allocation.allocations) {
      if (a.participantId === e.payerId) continue;
      if (e.payerId === actor)
        pairs[a.participantId] =
          (pairs[a.participantId] || 0n) + BigInt(a.amount.minorUnits);
      else if (a.participantId === actor)
        pairs[e.payerId] =
          (pairs[e.payerId] || 0n) - BigInt(a.amount.minorUnits);
    }
  }
  if (state.gateC) {
    for (const id of Object.keys(pairs)) delete pairs[id];
    for (const p of settlementPairs(state, actor, state.group.id))
      if(p.currency===displayCurrency&&p.exponent===displayExponent) pairs[p.other]=-BigInt(p.minor);
  }
  const involved = Object.keys(pairs).filter((id) => pairs[id] !== 0n);
  text(".position-side b", involved.map(name).join(" + "));
  text(
    ".position-side span",
    involved.length
      ? involved.every((id) => pairs[id] > 0n)
        ? "owe you"
        : involved.every((id) => pairs[id] < 0n)
          ? "you owe"
          : `across ${involved.length} people`
      : "",
  );
  const list = $(".card.list"),
    rowTemplate = list.querySelector(".row");
  list.replaceChildren();
  for (const e of [...expenses].reverse()) {
    const row = rowTemplate.cloneNode(true);
    row.querySelector(".row-title").textContent = e.description;
    row.querySelector(".row-sub").textContent =
      `${name(e.payerId)} paid · ${dateLabel(e.date)}`;
    row.querySelector(".row-amount b").textContent = money(e.money);
    row.querySelector(".row-amount span").textContent = e.issues.some(
      (i) => i.status === "open",
    )
      ? "Open issue"
      : e.reviews[actor]?.status && e.reviews[actor].status !== "agreed"
        ? "Review"
        : `Split ${e.participantIds.length} ${e.participantIds.length===1?'way':'ways'}`;
    row.dataset.bound = "true";
    row.onclick = (ev) => {
      ev.preventDefault();
      nav("detail", e.id);
    };
    list.append(row);
  }
  if (!expenses.length) {
    list.append(element("p", "caption", "Add an expense or invite people."));
    for (const [label, go] of [
      ["Add expense", () => openEditor()],
      ["Invite people", () => {location.href=`../create-join/index.html${fixtureMode?'?fixtures=1':''}#page=invite`}],
    ]) {
      const a = element(
        "a",
        label === "Add expense" ? "btn dark" : "btn soft",
        label,
      );
      a.href = "#";
      a.dataset.bound = "true";
      a.onclick = (ev) => {
        ev.preventDefault();
        go();
      };
      list.append(a);
    }
  }
  text(
    '[href="#members-handoff"] span',
    `${participants(state).length} ${participants(state).length===1?'member':'members'}`,
  );
  text(
    '[href="#settle-handoff"] span',
    `${involved.length} ${involved.length === 1 ? "balance" : "balances"} open`,
  );
  action('[href="#settle-handoff"],[href="#balances-handoff"]', () => {
    location.href = `../gate-c/index.html${fixtureMode ? '?fixtures=1' : ''}#${new URLSearchParams({page:'group',group:state.group.id})}`;
  });
  action('[href="#global-people"]', () => {
    location.href = `../gate-c/index.html${fixtureMode ? '?fixtures=1' : ''}#page=position`;
  });
  action('[href="#add-handoff"]', () => openEditor());
  action('[href="#expenses-handoff"]', () => {
    $(".card.list").scrollIntoView({ block: "start" });
  });
  action('[href="#members-handoff"]', () =>
    nav("people", ""),
  );
  action('[href="#home-handoff"]', () => {
    if (parent !== window)
      parent.postMessage({ type: "chopdot-gate-b-home" }, location.origin);
    else location.href = "../index.html";
  });
  const familyNav=element('div','gb-family-actions');for(const[label,family,page]of [['Group settings','26','settings'],['Savings','16','list'],['Insights','19','overview']]){const b=element('button','btn soft',label);b.onclick=()=>{location.href='../expansion/index.html'+(fixtureMode?'?fixtures=1':'')+'#'+new URLSearchParams({family,page,group:family==='26'?state.group.id:''});};familyNav.append(b);}$('.app-content').append(familyNav);
  for(const[key,n]of Object.entries(balances).filter(([key])=>key!==displayKey)){const[c,x]=key.split(':');note((BigInt(n)>0n?'Also owed ':BigInt(n)<0n?'Also owe ':'No net position in ')+money(moneyFromMinorUnits(BigInt(n)<0n?-BigInt(n):BigInt(n),c,Number(x))));}
  if(state.group.archived){note('Archived · history and outstanding positions are preserved. Restore this group before new expenses or invitations.');for(const n of $$('.app-content a,.app-content button,.add-tab'))if(/^(Add expense|Invite people)$/i.test(n.textContent.trim())){n.setAttribute('aria-disabled','true');n.onclick=e=>e.preventDefault();}}
  if (state.gateB.environment.offline)
    note(
      "Offline. Showing saved group data. This prototype stores changes on this device only.",
    );
}
function editor() {
  draft = draftFor(route.id);
  const editing = draft.baseRevision !== null;
  if (
    editing &&
    state.expenses.find((e) => e.id === draft.id)?.ownerId !== actor
  )
    throw new DomainError(
      "PERMISSION",
      "Only the expense owner can edit this expense.",
    );
  mount(editing ? "j06" : "j05", editing ? "edit" : "entry");
  text(".currency", draftPartition().currency);
  for (const [selector, field, label] of [
    ["input.amount", "amountText", "Amount"],
    ["input.description", "description", "Description"],
  ]) {
    const input = $(selector);
    input.value = draft[field];
    input.setAttribute("aria-label", label);
    if (field === "amountText") input.inputMode = "decimal";
    input.oninput = () => {
      draft[field] = input.value;
      try {
        persistDraft();
      } catch (e) {
        showError(e);
      }
    };
  }
  const rows = $$(".config-row");
  rows[0].querySelector(".row-value").childNodes[0].textContent =
    `${name(draft.payerId)} `;
  rows[1].querySelector(".row-title").textContent =
    draft.method === "equal" ? "Split equally" : `Split by ${draft.method}`;
  let summary = "";
  try {
    summary = ` · ${splitSummary(allocationFor(draft, draftPartition().currency, draftPartition().exponent))}`;
  } catch {}
  rows[1].querySelector(".row-sub").textContent =
    `${draft.participantIds.length} people${summary}`;
  rows[1].querySelector(".row-value").childNodes[0].textContent =
    draft.participantIds.length === participants(state).length
      ? "Everyone "
      : "Selected ";
  rows[2].querySelector(".row-title").textContent = dateLabel(draft.date);
  rows[2].querySelector(".row-sub").textContent = draft.receipt
    ? "Receipt attached"
    : "No receipt";
  rows.forEach((r, i) => {
    r.dataset.bound = "true";
    r.onclick = (ev) => {
      ev.preventDefault();
      persistDraft();
      nav(["payer", "split", "details"][i], draft.id);
    };
  });
  action(".app-footer .primary", () => saveExpense());
  action('[aria-label="Back"], .app-footer .text-link', () => {
    persistDraft();
    nav(editing ? "detail" : "group", editing ? draft.id : "");
  });
  if (state.gateB.environment.offline) {
    screen.dataset.state = editing ? "offline_edit" : "offline";
    note(
      "Offline. You can save on this device. No remote sync runs in this prototype.",
    );
  }
}
function payer() {
  mount("j05", "payer");
  text(".header-title span", draft.description || state.group.name);
  const list = $(".member-list"),
    template = list.querySelector(".member");
  list.replaceChildren();
  for (const p of participants(state)) {
    const row = template.cloneNode(true);
    row.querySelector(".avatar").textContent = initials(p.id);
    row.querySelector("b").textContent = name(p.id);
    row.querySelector(":scope > div > span").textContent =
      draft.payerId === p.id ? "Selected" : "Member";
    row.querySelector(".radio").classList.toggle("on", draft.payerId === p.id);
    row.dataset.bound = "true";
    row.onclick = (ev) => {
      ev.preventDefault();
      draft.payerId = p.id;
      persistDraft();
      backEditor();
    };
    list.append(row);
  }
  action('[aria-label="Back"],.app-footer a', backEditor);
}
function split() {
  mount("j05", "split");
  text(".header-title span", draft.amountText || "Enter amount");
  const list = $(".member-list"),
    template = list.querySelector(".member");
  list.replaceChildren();
  let snapshot;
  try {
    snapshot = allocationFor(draft, draftPartition().currency, draftPartition().exponent);
  } catch {}
  for (const p of participants(state)) {
    const row = template.cloneNode(true),
      selected = draft.participantIds.includes(p.id);
    row.tabIndex = 0;
    row.role = "checkbox";
    row.setAttribute("aria-checked", selected);
    row.setAttribute("aria-label", name(p.id));
    row.dataset.focusKey = `participant:${p.id}`;
    row.querySelector(".avatar").textContent = initials(p.id);
    row.querySelector("b").textContent = name(p.id);
    row.querySelector(":scope > div > span").textContent =
      snapshot?.allocations.find((a) => a.participantId === p.id)
        ? money(
            snapshot.allocations.find((a) => a.participantId === p.id).amount,
          )
        : selected
          ? "Included"
          : "Not included";
    row.querySelector(".select").classList.toggle("on", selected);
    row.onclick = () => {
      draft.participantIds = selected
        ? draft.participantIds.filter((id) => id !== p.id)
        : [...draft.participantIds, p.id];
      persistDraft();
      render({ focusKey: row.dataset.focusKey });
    };
    row.onkeydown = (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        row.click();
      }
    };
    list.append(row);
  }
  text(
    ".split-summary b",
    draft.method === "equal" ? "Split equally" : `${method(draft)} split`,
  );
  text(
    ".split-total",
    snapshot ? splitSummary(snapshot) : `${draft.participantIds.length} people`,
  );
  $(".text-link")?.remove();
  action('[href="#method"]', () => nav("method", draft.id));
  action('[aria-label="Back"]', backEditor);
  action(".app-footer a", () => {
    if (!draft.participantIds.length)
      throw new DomainError("MISSING", "Choose at least one participant.");
    backEditor();
  });
}
function methodPage() {
  mount("j05", "method");
  text(".header-title span", `${draft.participantIds.length} people`);
  text(".shares span", `${draft.participantIds.length} people`);
  try {
    text(
      ".shares b",
      splitSummary(
        allocationFor({ ...draft, method: "equal" }, draftPartition().currency, draftPartition().exponent),
      ),
    );
  } catch {
    text(".shares b", "Enter an amount");
  }
  action(".segment", (event) => {
    const selected = event.currentTarget.textContent.trim().toLowerCase();
    draft.method = selected;
    persistDraft();
    nav(selected === "equal" ? "editor" : selected, draft.id);
  });
  action(".app-footer a", () => {
    draft.method = "equal";
    persistDraft();
    backEditor();
  });
  action('[aria-label="Back"]', () => nav("split", draft.id));
}
function customSplit(kind) {
  mount("j05", kind);
  draft.method = kind;
  persistDraft();
  text(
    ".header-title span",
    `Total ${draftPartition().currency} ${draft.amountText}`,
  );
  const card = $(".app-content>.card"),
    template = card.querySelector(".amount-row");
  card.querySelectorAll(".amount-row").forEach((r) => r.remove());
  $(".text-link")?.remove();
  let snapshot;
  try {
    snapshot = allocationFor(draft, draftPartition().currency, draftPartition().exponent);
  } catch {}
  for (const id of [...draft.participantIds].sort()) {
    const row = template.cloneNode(true);
    row.querySelector(".avatar").textContent = initials(id);
    row.querySelector(".row-title").textContent = name(id);
    const field = element("input", "amount-field");
    field.type = "text";
    field.inputMode = kind === "exact" ? "decimal" : "numeric";
    field.setAttribute(
      "aria-label",
      `${name(id)} ${kind === "exact" ? "amount" : "shares"}`,
    );
    field.value =
      (kind === "exact" ? draft.exact : draft.shares)[id] ??
      (kind === "exact" ? "0.00" : "1");
    row.querySelector(".amount-field").replaceWith(field);
    const sub = row.querySelector(".row-sub");
    if (sub) {
      sub.dataset.shareId = id;
      sub.textContent = snapshot
        ? money(snapshot.allocations.find((a) => a.participantId === id).amount)
        : "Shares";
    }
    field.oninput = () => {
      (kind === "exact" ? draft.exact : draft.shares)[id] = field.value;
      try {
        persistDraft();
        const a = allocationFor(draft, draftPartition().currency, draftPartition().exponent);
        text(".sum b", money(a.total));
        for (const display of card.querySelectorAll("[data-share-id]"))
          display.textContent = money(
            a.allocations.find(
              (row) => row.participantId === display.dataset.shareId,
            ).amount,
          );
      } catch (e) {
        text(
          ".sum b",
          e.code === "ALLOCATION"
            ? "Amounts must add to total"
            : "Check amounts",
        );
      }
    };
    card.insertBefore(row, card.querySelector(".sum"));
  }
  text(".sum span", kind === "exact" ? "Total" : "Expense total");
  text(
    ".sum b",
    snapshot ? money(snapshot.total) : "Amounts must add to total",
  );
  action(".app-footer a", () => {
    allocationFor(draft, draftPartition().currency, draftPartition().exponent);
    persistDraft();
    backEditor();
  });
  action('[aria-label="Back"]', () => nav("method", draft.id));
}
function details() {
  mount("j05", "details");
  text(".header-title span", draft.description);
  const date = element("input", "gb-input");
  date.type = "date";
  date.value = draft.date;
  date.setAttribute("aria-label", "Expense date");
  date.onchange = () => {
    draft.date = date.value;
    persistDraft();
  };
  $(".date-options").after(date);
  action(".date-chip", (e) => {
    const label = e.currentTarget.textContent.trim();
    if (label === "Choose date") {
      date.focus();
      return;
    }
    const when = new Date();
    if (label === "Yesterday") when.setDate(when.getDate() - 1);
    draft.date = when.toISOString().slice(0, 10);
    date.value = draft.date;
    persistDraft();
  });
  text(".receipt-box b", draft.receipt ? "Receipt attached" : "Add receipt");
  text(".receipt-box div span", draft.receipt?.name || "Photo or file");
  action(".receipt-box", () => nav("receipt", draft.id));
  action('[aria-label="Back"],.app-footer a', backEditor);
}
function receipt() {
  mount("j05", "receipt");
  text(".header-title span", draft.description);
  text(".locked h2", draft.receipt ? "Receipt ready." : "Add receipt");
  text(
    ".locked p",
    draft.receipt?.name || "PNG, JPEG or WebP · up to 1 MB · this device only",
  );
  const input = element("input", "gb-input");
  input.type = "file";
  input.accept = "image/png,image/jpeg,image/webp";
  input.setAttribute("aria-label", "Receipt file");
  $(".app-content").append(input);
  input.onchange = async () => {
    const f = input.files[0];
    if (!f) return;
    try {
      if (
        f.size > 1000000 ||
        !["image/png", "image/jpeg", "image/webp"].includes(f.type)
      )
        throw Error("Choose a PNG, JPEG or WebP image smaller than 1 MB.");
      const data = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(f);
      });
      draft.receipt = { name: f.name, data };
      persistDraft();
      render();
    } catch (e) {
      showError(e);
    }
  };
  if (draft.receipt) {
    const img = element("img", "gb-receipt");
    img.alt = draft.receipt.name;
    img.src = draft.receipt.data;
    $(".app-content").append(img);
    const remove = element("button", "secondary", "Remove receipt");
    remove.onclick = () => {
      draft.receipt = null;
      persistDraft();
      render();
    };
    $(".app-content").append(remove);
  }
  action('[aria-label="Back"]', () => nav("details", draft.id));
  action(".app-footer a", backEditor);
}
async function saveExpense(allowDuplicate = false) {
  persistDraft();
  const editing = draft.baseRevision !== null;
  try {
    allocationFor(draft, draftPartition().currency, draftPartition().exponent);
    if (!draft.description.trim())
      throw new DomainError("MISSING", "Add a description.");
  } catch (e) {
    screen.dataset.state = "missing";
    showError(e);
    return;
  }
  const command = {
    type: editing ? "edit" : "create",
    actor,
    id: draft.id,
    operationId: draft.operationId,
    revision: draft.baseRevision,
    draft: structuredClone(draft),
    allowDuplicate,
  };
  busy = true;
  screen.dataset.state = "saving";
  const button = $(".app-footer .primary");
  if (button) {
    button.setAttribute("aria-disabled", "true");
    button.textContent = "Saving…";
  }
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
  try {
    repo.commit(command);
    lastError = null;
    nav(editing ? "updated" : "success", draft.id);
  } catch (e) {
    lastError = e;
    nav(
      e.code === "DUPLICATE"
        ? "duplicate"
        : e.code === "GUARD"
          ? "locked"
          : e.code === "CONFLICT"
            ? "conflict"
            : e.code === "PERMISSION"
              ? "no_permission"
              : "save_error",
      draft.id,
    );
  } finally {
    busy = false;
  }
}
function detail(e) {
  mount("j06", e.ownerId === actor ? "detail" : "other");
  fillSummary(e);
  const reviews = Object.values(e.reviews),
    agreed = reviews.filter((r) => r.status === "agreed").length,
    open = e.issues.filter((i) => i.status === "open");
  text(
    ".status-card b",
    open.length
      ? `${open.length} open ${open.length === 1 ? "issue" : "issues"}`
      : `${agreed} of ${reviews.length} reviewed`,
  );
  text(
    ".status-card div span",
    e.reviews[actor]?.status === "needs_review_again"
      ? "Expense changed. Review again."
      : e.reviews[actor]?.status === "agreed"
        ? "Looks right"
        : e.reviews[actor]
          ? "Needs your review"
          : `Added by ${name(e.ownerId)}`,
  );
  splitRows(e, $(".split-preview"));
  $$(".split-preview .split-person")
    .slice(2)
    .forEach((row) => row.remove());
  text('[href="#receipt-view"] div span', e.receipt?.name || "No receipt");
  text(
    '[href="#history"] div span',
    `${state.gateB.history.filter((h) => h.expenseId === e.id).length} accepted changes`,
  );
  action('[href="#edit"]', () => openEditor(e));
  action('[href="#more-own"]', () => nav("more", e.id));
  action('[href="#review-handoff"]', () =>
    nav(
      e.ownerId === actor && open.length
        ? "issue"
        : e.reviews[actor]
          ? "review"
          : "history",
      e.id,
      open.length ? { issue: open[0].id } : {},
    ),
  );
  action('[href="#split-view"]', () => nav("view_split", e.id));
  action('[href="#receipt-view"]', () => nav("view_receipt", e.id));
  action('[href="#history"]', () => nav("history", e.id));
  action('[href="#group"]', () => nav("group", ""));
  for (const i of open) {
    const a = element(
      "a",
      "gb-issue-link",
      `${name(i.reviewerId)}: ${i.reason}`,
    );
    a.href = "#";
    a.dataset.bound = "true";
    a.onclick = (ev) => {
      ev.preventDefault();
      nav("issue", e.id, { issue: i.id });
    };
    $(".status-card").after(a);
  }
  if (state.gateB.environment.offline) {
    screen.dataset.state = "offline_detail";
    note("Offline. Showing saved expense details.");
  }
}
function readableChanges(before, after) {
  if (!before) return [short(after), `Added by ${name(after.ownerId)}`];
  const changes = [];
  const pairs = [
    ["Description", before.description, after.description],
    ["Amount", money(before.money), money(after.money)],
    ["Paid by", name(before.payerId), name(after.payerId)],
    ["Date", before.date, after.date],
    [
      "Participants",
      before.participantIds.map(name).join(", "),
      after.participantIds.map(name).join(", "),
    ],
    ["Method", method(before), method(after)],
    ["Your share", share(before), share(after)],
    ["Receipt", before.receipt?.name || "None", after.receipt?.name || "None"],
  ];
  for (const [label, old, value] of pairs)
    if (old !== value) changes.push(`${label}: ${old} → ${value}`);
  for (const id of new Set([
    ...before.participantIds,
    ...after.participantIds,
  ])) {
    if (id === actor) continue;
    const amount = (e) =>
      money(
        e.allocation.allocations.find((a) => a.participantId === id)?.amount ||
          moneyFromMinorUnits(0n, e.currency),
      );
    if (amount(before) !== amount(after))
      changes.push(`${name(id)}’s share: ${amount(before)} → ${amount(after)}`);
  }
  if (after.deleted && !before.deleted)
    changes.push("Expense removed; accepted history retained.");
  for (const id of Object.keys(after.reviews)) {
    if (before.reviews[id]?.status !== after.reviews[id].status)
      changes.push(
        `${name(id)}: ${(before.reviews[id]?.status || "not assigned").replaceAll("_", " ")} → ${after.reviews[id].status.replaceAll("_", " ")}`,
      );
  }
  for (const issue of after.issues) {
    const old = before.issues.find((i) => i.id === issue.id);
    if (JSON.stringify(old) !== JSON.stringify(issue)) {
      changes.push(
        `${name(issue.reviewerId)} · ${issue.reason}: ${old?.status || "not raised"} → ${issue.status}${issue.note ? ` · ${issue.note}` : ""}`,
      );
      for (const reply of issue.replies.slice(old?.replies.length || 0))
        changes.push(`${name(reply.actor)} replied: ${reply.note}`);
    }
  }
  return changes.length
    ? changes
    : ["Details saved without changing the amount or split."];
}
function historyPage(e) {
  mount("j06", "history");
  text(".header-title span", e.description);
  const list = $(".change-list");
  list.replaceChildren();
  for (const h of state.gateB.history.filter((h) => h.expenseId === e.id)) {
    const row = element("div", "change");
    row.append(
      element("b", "", `${name(h.actor)} · ${h.type}`),
      element("span", "", h.at),
      element("p", "gb-history", readableChanges(h.before, h.after).join("\n")),
    );
    list.append(row);
  }
  if (!list.childElementCount)
    list.append(
      element(
        "p",
        "caption",
        "Created in the accepted Gate A preview. Earlier change history was not recorded.",
      ),
    );
  action('[aria-label="Back"],.app-footer a', () => nav("detail", e.id));
}
function changesPage(e) {
  mount("j07", "changes");
  text(".header-title span", e.description);
  text(".hero", "What changed.");
  text(".eyebrow", "Accepted expense changes");
  const list = $(".change-list");
  if (list) {
    list.replaceChildren();
    const history = state.gateB.history.filter(
      (h) => h.expenseId === e.id && h.type === "edit",
    );
    for (const h of history) {
      const row = element("div", "change");
      row.append(
        element("b", "", `${name(h.actor)} · ${h.at}`),
        element(
          "p",
          "gb-history",
          readableChanges(h.before, h.after).join("\n"),
        ),
      );
      list.append(row);
    }
    if (!history.length)
      list.append(element("p", "", "No accepted correction recorded."));
  }
  action('[aria-label="Back"],.app-footer a', () => nav("review", e.id));
}
function viewSplit(e) {
  mount("j06", "split-view");
  text(".header-title span", e.description);
  const content = $(".app-content");
  content.replaceChildren();
  const card = element("section", "card split-preview");
  content.append(card);
  splitRows(e, card);
  action('[aria-label="Back"],.app-footer a', () =>
    nav(route.from === "review" ? "review" : "detail", e.id),
  );
}
function viewReceipt(e) {
  mount("j06", "receipt-view");
  text(".header-title span", e.description);
  const content = $(".app-content");
  content.replaceChildren();
  if (e.receipt) {
    const img = element("img", "gb-receipt");
    img.src = e.receipt.data;
    img.alt = e.receipt.name;
    content.append(img);
  } else content.append(element("p", "caption", "No receipt attached."));
  action('[aria-label="Back"],.app-footer a', () => nav("detail", e.id));
}
function more(e) {
  if (e.ownerId !== actor)
    throw new DomainError(
      "PERMISSION",
      "Only the expense owner can change this expense.",
    );
  mount("j06", "more-own");
  text(".header-title span", e.description);
  action('[href="#edit"]', () => openEditor(e));
  action('[href="#delete-confirm"]', () => nav("delete", e.id));
  action('[aria-label="Back"],.app-footer a', () => nav("detail", e.id));
}
function deletePage(e) {
  if (e.ownerId !== actor)
    throw new DomainError(
      "PERMISSION",
      "Only the expense owner can delete this expense.",
    );
  mount("j06", "delete-confirm");
  text(".confirm-sheet h1", `Delete ${e.description}?`);
  fillSummary(e);
  const revision = e.revision,
    operationId = crypto.randomUUID();
  action(".danger-button", () => {
    try {
      repo.commit({ type: "delete", id: e.id, actor, revision, operationId });
      nav("deleted", e.id);
    } catch (error) {
      showError(error);
    }
  });
  action('[aria-label="Back"],.secondary', () => nav("detail", e.id));
}
function queue() {
  mount("j07", "queue");
  const expenses = pendingFor(state, actor),
    list = $(".queue-list"),
    template = list.querySelector(".queue-row");
  text(".eyebrow", `${expenses.length} need you`);
  list.replaceChildren();
  for (const e of expenses) {
    const row = template.cloneNode(true);
    row.querySelector("div b").textContent = e.description;
    row.querySelector(":scope > div > span").textContent =
      `${name(e.payerId)} paid · Your share ${share(e)}`;
    row.querySelector(".queue-amount b").textContent = money(e.money);
    row.dataset.bound = "true";
    row.onclick = (ev) => {
      ev.preventDefault();
      nav("review", e.id);
    };
    list.append(row);
  }
  if (!expenses.length)
    list.append(element("p", "caption", "Nothing needs you."));
  action('[aria-label="Back"],.app-footer a', () => nav("group", ""));
}
function review(e) {
  if (!e.reviews[actor]) {
    nav("detail", e.id);
    return;
  }
  const issue = e.issues.find(
    (i) => i.reviewerId === actor && i.status === "open",
  );
  if (issue) {
    nav("issue", e.id, { issue: issue.id });
    return;
  }
  mount(
    "j07",
    e.reviews[actor].status === "agreed"
      ? "already"
      : e.reviews[actor].status === "needs_review_again"
        ? "changed"
        : state.gateB.environment.offline
          ? "offline"
          : "review",
  );
  fillSummary(e);
  const count = pendingFor(state, actor).length;
  text(".header-title span", `${count} needing review`);
  text(".review-progress span:first-child", `1 of ${Math.max(1, count)}`);
  text(".review-progress span:last-child", e.description);
  if ($(".progress-fill"))
    $(".progress-fill").style.width = `${100 / Math.max(1, count)}%`;
  text(".eyebrow", `Your share · ${share(e)}`);
  text(
    ".split-summary b",
    `${e.participantIds.length} people · ${method(e).toLowerCase()} split`,
  );
  text(".split-total", splitSummary(e.allocation));
  text(".choice-summary div span", "Accepted expense changes");
  if (e.reviews[actor].status === "needs_review_again")
    text(".notice-line b", `${e.description} changed.`);
  if (e.reviews[actor].status === "agreed") {
    text(".hero", e.description);
    text(
      ".status-banner div span",
      "Your current review is saved on this device.",
    );
  }
  action(
    '[href="#saving"],[href="#offline-saved"],[href="#reviewed-again"]',
    () => reviewCommand(e, "agree"),
  );
  action('[href="#changes"]', () => nav("changes", e.id));
  action('[href="#reasons"]', () => nav("reasons", e.id));
  action('[href="#split"]', () => nav("view_split", e.id, { from: "review" }));
  action('[aria-label="Back"], [href="#queue"]', () => nav("queue", ""));
  action('[href="#group"]', () => nav("group", ""));
  if (e.reviews[actor].status === "needs_review_again") {
    const n = note(
      "Expense changed. Review the current details before agreeing.",
    );
    const a = element("a", "", "View changes");
    a.href = "#";
    a.dataset.bound = "true";
    a.onclick = (ev) => {
      ev.preventDefault();
      nav("history", e.id);
    };
    n.append(document.createTextNode(" "), a);
  }
}
function reasons(e) {
  if (!e.reviews[actor])
    throw new DomainError(
      "PERMISSION",
      "No review is assigned to this person.",
    );
  mount("j07", "reasons");
  text(".header-title span", e.description);
  text(".eyebrow", `Tell ${name(e.ownerId)}`);
  action(".reason", (ev) =>
    nav("note", e.id, {
      reason: ev.currentTarget.querySelector("b").textContent,
      ...(route.issue ? { issue: route.issue } : {}),
    }),
  );
  action('[aria-label="Back"],.app-footer a', () => nav("review", e.id));
}
function notePage(e) {
  mount("j07", "note-share");
  const reason = REASONS.includes(route.reason) ? route.reason : REASONS[0];
  text(".header-title span", e.description);
  text(".selected-reason b", reason);
  text(".selected-reason div span", "");
  text(".hero", `What should ${name(e.ownerId)} know?`);
  text(".primary", `Send to ${name(e.ownerId)}`);
  const input = element("textarea", "note-area");
  input.placeholder = "Add a note (optional)";
  input.setAttribute("aria-label", "Optional note");
  const key = `chopdot.gate-b.note:${actor}:${e.id}:${reason}`;
  input.value = sessionStorage.getItem(key) || "";
  input.oninput = () => sessionStorage.setItem(key, input.value);
  $(".note-area").replaceWith(input);
  const operationId = crypto.randomUUID();
  action(".primary", () =>
    reviewCommand(e, route.issue ? "still_off" : "issue", {
      reason,
      note: input.value,
      operationId,
      ...(route.issue ? { issueId: route.issue } : {}),
    }),
  );
  action('[aria-label="Back"],.secondary', () =>
    nav("reasons", e.id, route.issue ? { issue: route.issue } : {}),
  );
}
function issuePage(e) {
  const issue =
    e.issues.find((i) => i.id === route.issue) ||
    e.issues.find(
      (i) =>
        i.status === "open" && (i.reviewerId === actor || e.ownerId === actor),
    );
  if (!issue) {
    nav("review", e.id);
    return;
  }
  const owner = e.ownerId === actor,
    isReviewer = issue.reviewerId === actor;
  if (!owner && !isReviewer)
    throw new DomainError(
      "PERMISSION",
      "This issue belongs to its reviewer and the expense owner.",
    );
  const replied = issue.replies.at(-1)?.actor === e.ownerId,
    changed = e.reviews[actor]?.status === "needs_review_again";
  mount(
    "j07",
    issue.status !== "open"
      ? "resolved"
      : owner
        ? "owner-issue"
        : replied || changed
          ? "member-reply"
          : "waiting-share",
  );
  fillSummary(e);
  text(
    ".header-title b",
    issue.status !== "open"
      ? "Resolved"
      : owner
        ? "Needs your attention"
        : replied
          ? `${name(e.ownerId)} replied`
          : changed
            ? "Expense updated"
            : `Waiting on ${name(e.ownerId)}`,
  );
  text(".header-title span", e.description);
  text(".issue-summary .label", `${name(issue.reviewerId)} flagged`);
  text(".issue-summary h2", issue.reason);
  text(".issue-summary p", issue.note || "No note added.");
  text(
    ".status-banner div b",
    owner
      ? "Reply or update the expense"
      : `${name(e.ownerId)} is reviewing it`,
  );
  text(
    ".status-banner div span",
    owner
      ? `${name(issue.reviewerId)} is waiting`
      : `You flagged: ${issue.reason}`,
  );
  const last = issue.replies.filter((r) => r.actor === e.ownerId).at(-1);
  text(".message-head b", replied ? name(e.ownerId) : name(issue.reviewerId));
  text(
    ".message-head span.avatar",
    initials(replied ? e.ownerId : issue.reviewerId),
  );
  text(".message-head div span", issue.reason);
  text(
    ".message-text",
    replied
      ? last.note
      : changed
        ? "The owner updated the expense. Review the current details."
        : issue.note || "No note added.",
  );
  action('[href="#edit-handoff"]', () => openEditor(e));
  action('[href="#reply"]', () => nav("reply", e.id, { issue: issue.id }));
  action('[href="#withdraw"]', () =>
    nav("withdraw", e.id, { issue: issue.id }),
  );
  action('[href="#resolved-reply"]', () => reviewCommand(e, "agree"));
  action('[href="#reasons"]', () => nav("reasons", e.id, { issue: issue.id }));
  action('[aria-label="Back"],[href="#group"],[href="#group-reviewed"]', () =>
    nav("group", ""),
  );
  text(".success-wrap p", "The issue is no longer open.");
  if (isReviewer && issue.status === "open" && (replied || changed)) {
    const withdraw = element("a", "text-link", "Withdraw request");
    withdraw.href = "#";
    withdraw.dataset.bound = "true";
    withdraw.onclick = (ev) => {
      ev.preventDefault();
      nav("withdraw", e.id, { issue: issue.id });
    };
    $(".app-footer").append(withdraw);
  }
}
function reply(e) {
  const issue = e.issues.find((i) => i.id === route.issue);
  if (!issue || e.ownerId !== actor)
    throw new DomainError("PERMISSION", "Only the expense owner can reply.");
  mount("j07", "reply");
  text(".header-title b", `Reply to ${name(issue.reviewerId)}`);
  text(".header-title span", e.description);
  text(".message-head .avatar", initials(issue.reviewerId));
  text(".message-head b", name(issue.reviewerId));
  text(".message-head div span", issue.reason);
  text(".message-text", issue.note || "No note added.");
  const input = element("textarea", "reply-box");
  input.setAttribute("aria-label", "Your reply");
  input.placeholder = "Write a reply";
  const key = `chopdot.gate-b.reply:${actor}:${issue.id}`;
  input.value = sessionStorage.getItem(key) || "";
  input.oninput = () => sessionStorage.setItem(key, input.value);
  $(".reply-box").replaceWith(input);
  const operationId = crypto.randomUUID();
  action(".primary", () =>
    reviewCommand(e, "reply", {
      issueId: issue.id,
      note: input.value,
      operationId,
    }),
  );
  action('[aria-label="Back"],.secondary', () =>
    nav("issue", e.id, { issue: issue.id }),
  );
}
function withdraw(e) {
  mount("j07", "withdraw");
  text(".header-title span", e.description);
  text(".confirm-sheet p", `${e.description} returns to “Needs your review.”`);
  action(".primary", () =>
    reviewCommand(e, "withdraw", { issueId: route.issue }),
  );
  action('[aria-label="Back"],.secondary', () =>
    nav("issue", e.id, { issue: route.issue }),
  );
}
function reviewCommand(e, type, extra = {}) {
  const command = {
    type,
    actor,
    id: e.id,
    revision: renderedRevision,
    operationId: crypto.randomUUID(),
    ...extra,
  };
  try {
    repo.commit(command);
    const hadIssue = e.issues.some(
      (i) => i.reviewerId === actor && i.status === "open",
    );
    const result =
      type === "agree"
        ? hadIssue
          ? "resolved_reply"
          : e.reviews[actor]?.status === "needs_review_again"
            ? "reviewed_again"
            : "reviewed"
        : type === "withdraw"
          ? "review"
          : type === "reply"
            ? "reply_sent"
            : "issue_sent";
    nav(result, e.id, {
      issue: type === "issue" ? command.operationId : extra.issueId || "",
      op: command.operationId,
    });
  } catch (error) {
    if (error.code === "SAVE") {
      sessionStorage.setItem(
        "chopdot.gate-b.pending-review",
        JSON.stringify(command),
      );
      nav("review_error", e.id);
    } else showError(error);
  }
}
function reviewReceipt(e) {
  const event = state.gateB.history.find(
    (h) => h.operationId === route.op && h.expenseId === e.id,
  );
  if (!event) {
    nav("detail", e.id);
    return;
  }
  const issue = e.issues.find((i) => i.id === route.issue);
  const mapping = {
    issue_sent: "issue-sent-share",
    reply_sent: "reply-sent",
    resolved_reply: "resolved-reply",
    reviewed_again: "reviewed-again",
  };
  mount("j07", mapping[route.page]);
  text(".header-title span", e.description);
  if (route.page === "issue_sent") {
    text(".header-title b", `Sent to ${name(e.ownerId)}`);
    text(".success-wrap h1", `${name(e.ownerId)} has it.`);
    text(".progress-card b", issue?.reason);
    text(".progress-card span", issue?.note || "No note added.");
    action(".primary", () => nav("issue", e.id, { issue: issue.id }));
    action(".secondary", () => nav("queue", ""));
  } else if (route.page === "reply_sent") {
    text(".success-wrap h1", `${name(issue.reviewerId)} can review.`);
    text(".primary", "View status");
    action(".primary", () => nav("issue", e.id, { issue: issue.id }));
  } else {
    if (route.page === "resolved_reply")
      text(".success-wrap p", `You reviewed ${e.description}.`);
    action(".app-footer a", () => nav("group", ""));
  }
  if (state.gateB.environment.offline)
    note("Saved on this device only. Remote sync is outside this prototype.");
}
function reviewError(e) {
  mount("j07", "save-error");
  fillSummary(e);
  text(".header-title span", e.description);
  action(".primary", () => {
    const c = JSON.parse(
      sessionStorage.getItem("chopdot.gate-b.pending-review") || "null",
    );
    if (!c || c.actor !== actor || c.id !== e.id)
      throw Error("No retry is available. Review the expense again.");
    try {
      repo.commit(c);
      sessionStorage.removeItem("chopdot.gate-b.pending-review");
      nav(
        c.type === "agree"
          ? "reviewed"
          : c.type === "reply"
            ? "reply_sent"
            : "issue_sent",
        e.id,
        { op: c.operationId, issue: c.issueId || c.operationId },
      );
    } catch (error) {
      showError(error);
    }
  });
  action('[aria-label="Back"],.secondary', () => nav("review", e.id));
}

function reviewed(e) {
  if (state.gateB.environment.offline) {
    mount("j07", "offline-saved");
    text(".header-title span", e.description);
    text(
      ".success-wrap p",
      "Saved on this device. Remote sync is outside this prototype.",
    );
    action(".app-footer a", () => nav("group", ""));
    return;
  }
  mount("j07", "reviewed");
  text(".success-wrap h1", `${e.description} looks right.`);
  const reviews = Object.values(e.reviews);
  text(
    ".success-wrap p",
    `${reviews.filter((r) => r.status === "agreed").length} of ${reviews.length} reviewed.`,
  );
  const pending = pendingFor(state, actor);
  text(
    ".progress-card b",
    pending.length ? `${pending.length} expenses left` : "All reviewed.",
  );
  text(".progress-card span", pending[0]?.description || "Nothing needs you.");
  if ($(".progress-fill"))
    $(".progress-fill").style.width = pending.length ? "50%" : "100%";
  action(".primary", () =>
    nav(pending.length ? "review" : "group", pending[0]?.id || ""),
  );
  if (!pending.length) text(".primary", "Back to group");
  action(".secondary", () => nav("group", ""));
}
function saved(e, editing) {
  mount(
    editing ? "j06" : "j05",
    state.gateB.environment.offline
      ? "offline-saved"
      : editing
        ? "updated"
        : "success",
  );
  fillSummary(e);
  text(
    ".success-wrap h1",
    `${e.description} ${editing ? "updated" : "added"}.`,
  );
  text(
    ".success-wrap p",
    state.gateB.environment.offline
      ? "Saved on this device. Remote sync is outside this prototype."
      : `Split between ${e.participantIds.length} people.`,
  );
  text(".header-title span", state.group.name);
  action(".app-footer .primary", () =>
    nav(editing ? "detail" : "group", editing ? e.id : ""),
  );
  action(".app-footer .secondary,.app-footer .text-link", () => {
    if (editing) nav("group", "");
    else {
      state = repo.read();
      openEditor();
    }
  });
}
function recovery() {
  draft = draftFor(route.id);
  const editing = draft.baseRevision !== null;
  if (route.page === "conflict") {
    mount("j06", "conflict");
    const current = state.expenses.find((e) => e.id === draft.id);
    text(".header-title span", current?.description || draft.description);
    text(".hero", "This expense changed.");
    const rows = $$(".version-row");
    if (rows[0]) {
      rows[0].querySelector("b").textContent = "Current accepted version";
      rows[0].querySelector(":scope > div > span").textContent = current
        ? `${current.description} · ${short(current)} · ${current.participantIds.map(name).join(", ")} · ${method(current)}`
        : "Expense deleted";
    }
    if (rows[1]) {
      rows[1].querySelector("b").textContent = "Your saved version";
      rows[1].querySelector(":scope > div > span").textContent =
        `${draft.description} · ${draftPartition().currency} ${draft.amountText} · ${name(draft.payerId)} paid · ${draft.date} · ${draft.participantIds.map(name).join(", ")} · ${method(draft)}`;
    }
    action(".primary", () => {
      if (!current || current.deleted) {
        nav("detail", draft.id);
        return;
      }
      draft.baseRevision = current.revision;
      draft.operationId = crypto.randomUUID();
      persistDraft();
      backEditor();
    });
    text(".primary", "Review my edits against current version");
    action(".secondary", () => {
      draft = editDraft(current);
      persistDraft();
      nav("detail", current.id);
    });
    text(".secondary", "Keep current version");
    action('[aria-label="Back"]', backEditor);
    return;
  }
  mount(
    editing ? "j06" : "j05",
    route.page === "locked"
      ? "locked"
      : route.page === "duplicate"
        ? "duplicate"
        : editing
          ? "save-error"
          : "error",
  );
  if (route.page === "locked") {
    text(".locked h2,.permission h2", "This change is blocked.");
    text(
      ".locked p,.permission p",
      lastError?.message ||
        "Unresolved settlement dependency. Your details are saved.",
    );
    if (editing) {
      fillSummary(state.expenses.find((e) => e.id === draft.id));
      text(".detail-hero .meta", "Your edits are saved as a draft.");
    }
    action(".app-footer a", backEditor);
    text(".app-footer a", "Back to expense");
  } else if (route.page === "duplicate") {
    const other = activeExpenses(state).find(
      (e) =>
        e.description.toLowerCase() === draft.description.toLowerCase() &&
        e.money.minorUnits ===
          allocationFor(draft, draftPartition().currency, draftPartition().exponent).total.minorUnits &&
        e.payerId === draft.payerId &&
        e.date === draft.date,
    );
    if (other) {
      fillSummary(other);
      const notice = $(".notice div");
      notice.replaceChildren(
        element("b", "", other.description),
        element("p", "", `${name(other.ownerId)} added a similar expense.`),
      );
      const a = element("a", "text-link", "View existing expense");
      a.href = "#";
      a.dataset.bound = "true";
      a.onclick = (ev) => {
        ev.preventDefault();
        nav("detail", other.id);
      };
      $(".app-content").append(a);
    }
    action(".primary", () => saveExpense(true));
    action(".secondary", backEditor);
  } else {
    text(".currency", draftPartition().currency);
    text(".amount", draft.amountText);
    text(".description", draft.description);
    action(".primary", () => saveExpense());
    action(".secondary", backEditor);
  }
  action('[aria-label="Back"]', backEditor);
}
function people() {
  location.href=`../expansion/index.html${fixtureMode?'?fixtures=1':''}#${new URLSearchParams({family:'09',page:'members',group:state.group.id})}`;
}

function boundary(label) {
  mount("j08", "settle-handoff");
  text("h1", label || "Outside this prototype");
  text(
    ".handoff>p",
    "This handoff is outside Gate B. No settlement, sign-in or production action is performed.",
  );
  const card = $(".handoff .card");
  if (card) card.remove();
  action("a", () => nav("group", ""));
  $$("a").forEach((a) => {
    if (!a.querySelector("svg")) a.textContent = "Back to group";
  });
}
function showError(error) {
  lastError = error;
  if (error.code === "CONFLICT") {
    if (route.page === "editor" || draft?.id === route.id) {
      nav("conflict", route.id);
      return;
    }
    note(error.message, true);
    const refresh = element("button", "secondary", "Review latest version");
    refresh.onclick = () => render();
    $(".app-content").append(refresh);
    return;
  }
  if (error.code === "NOT_FOUND" || error.code === "PERMISSION") {
    const denied = state.expenses.find((e) => e.id === route.id && !e.deleted);
    mount(
      "j06",
      error.code === "NOT_FOUND" || !denied ? "not-found" : "no-permission",
    );
    action("a", () => nav("group", ""));
    if (error.code === "PERMISSION" && denied) {
      fillSummary(denied);
      text(".permission h2", `${name(denied.ownerId)} owns this expense.`);
      text(
        ".permission p",
        denied.reviews[actor]
          ? `You can review it. ${name(denied.ownerId)} can edit it.`
          : `${name(denied.ownerId)} can edit it.`,
      );
      const handoff = $('[href="#review-handoff"]');
      if (denied.reviews[actor])
        action('[href="#review-handoff"]', () => nav("review", denied.id));
      else if (handoff) handoff.remove();
    }
    return;
  }
  if(error.code==='GUEST_PROOF'){const a=element('a','secondary','Recover your existing participant');a.href='../create-join/index.html#page=recovery';a.dataset.bound='true';screen.append(a);}
  note(
    error.message ||
      "Couldn’t complete this action. Your saved state is unchanged.",
    true,
  );
}
function fixtureToolbar() {
  if(currentActor()!=='self')return;
  if (!fixtureMode) return;
  const bar = document.querySelector("#fixtures");
  bar.hidden = false;
  document.body.classList.add("fixture-mode");
  bar.replaceChildren(
    element(
      "b",
      "",
      "Local test fixtures — no authentication or settlement execution",
    ),
  );
  const actorLabel = element("label", "", "Person "),
    select = element("select");
  select.setAttribute("aria-label", "Test person");
  for (const p of participants(state)) {
    const option = element("option", "", p.name);
    option.value = p.id;
    option.selected = p.id === actor;
    select.append(option);
  }
  select.onchange = () => {
    actor = select.value;
    sessionStorage.setItem("chopdot.gate-b.actor", actor);
    nav("group", "");
    render();
  };
  actorLabel.append(select);
  bar.append(actorLabel);
  for (const [key, label] of [
    ["offline", "Offline"],
    ["failSave", "Save failure"],
    ["slowRead", "Slow read"],
  ]) {
    const wrap = element("label", "", label + " "),
      input = element("input");
    input.type = "checkbox";
    input.checked = state.gateB.environment[key] === true;
    input.dataset.focusKey = `fixture:${key}`;
    input.onchange = () => {
      repo.setEnvironment({
        ...repo.read().gateB.environment,
        [key]: input.checked,
      });
      render({ focusKey: input.dataset.focusKey });
    };
    wrap.append(input);
    bar.append(wrap);
  }
  const label = element("label", "", "Settlement precondition "),
    sel = element("select");
  sel.setAttribute("aria-label", "Settlement precondition");
  sel.dataset.focusKey = "fixture:settlement";
  for (const v of [
    "none",
    "active",
    "unknown_effect",
    "open_remainder",
    "incomplete",
    "authoritative_terminal",
    "reconciled_no_effect",
  ]) {
    const opt = element("option", "", v);
    opt.value = v;
    opt.selected = (state.gateB.environment.fixture || "none") === v;
    sel.append(opt);
  }
  sel.onchange = () => {
    const e = activeExpenses(state)[0],
      other = participants(state).find((p) => p.id !== (e?.payerId || actor));
    const now = new Date().toISOString();
    let settlements = [];
    if (sel.value === "incomplete") settlements = null;
    else if (sel.value !== "none") {
      if (!other) {
        note(
          "Add another person in Gate A to exercise a settlement pair.",
          true,
        );
        return;
      }
      settlements = [
        {
          payment_id: "external-fixture-payment-1",
          payer_participant_id: other.id,
          recipient_participant_id: e?.payerId || actor,
          currency: state.group.currency,
          source_item_ids: e ? [e.id] : [],
          prepared_amount_minor_units: e
            ? Number(
                e.allocation.allocations.find(
                  (a) => a.participantId === other.id,
                )?.amount.minorUnits || 0,
              )
            : 0,
          resolution_status: sel.value,
          ...(["authoritative_terminal", "reconciled_no_effect"].includes(
            sel.value,
          )
            ? {
                reconciliation_evidence: {
                  authority_verified: true,
                  as_of: now,
                },
              }
            : {}),
        },
      ];
    }
    repo.setEnvironment({
      ...repo.read().gateB.environment,
      settlements,
      fixture: sel.value,
      evidenceSequence: state.gateB.sequence,
      evidenceAsOf: now,
    });
    render({ focusKey: sel.dataset.focusKey });
  };
  label.append(sel);
  bar.append(label);
}
async function render({ focusKey } = {}) {
  const generation = ++renderGeneration;
  try {
    state = repo.read();
    const emptyOwn = currentActor()==='self'&&!state.group&&!(state.groups||[]).length&&!state.expenses.length&&!(state.gateC?.payments||[]).length;
    if((!emptyOwn&&!routeParticipant(state))||!routeLocalSession(state))return;
    if(state.group?.kind==='savings'){location.href='../expansion/index.html'+(new URLSearchParams(location.search).has('fixtures')?'?fixtures=1':'')+'#'+new URLSearchParams({family:'16',page:'home',group:state.group.id});return;}
    if (!state.group) {
      app.replaceChildren(
        element(
          "p",
          "",
          "Create a local group in the accepted Gate A preview first.",
        ),
      );
      const a = element("a", "", "Open Gate A");
      a.href = "../index.html";
      a.target = "_top";
      app.append(a);
      return;
    }
    if (!participants(state).some((p) => p.id === actor)) actor = "self";
    const params = new URLSearchParams(location.hash.slice(1));
    route = Object.fromEntries(params);
    route.page ||= "group";
    sessionStorage.setItem("chopdot.gate-b.route", location.hash);
    if (route.page === "detail") {
      mount("j06", "loading");
      fixtureToolbar();
      await new Promise((resolve) =>
        setTimeout(resolve, state.gateB.environment.slowRead ? 350 : 0),
      );
      if (generation !== renderGeneration) return;
      state = repo.read();
    }
    const e = state.expenses.find(
      (e) => e.id === route.id && (!e.groupId || e.groupId===state.group.id) && (!e.deleted || route.page === "deleted"),
    );
    renderedRevision = e?.revision;
    const editorPages = [
      "payer",
      "split",
      "method",
      "exact",
      "shares",
      "details",
      "receipt",
    ];
    if (editorPages.includes(route.page)) draft = draftFor(route.id);
    const routes = {
      no_permission: () =>
        showError(
          new DomainError(
            "PERMISSION",
            "Only the expense owner can change this expense.",
          ),
        ),
      group,
      editor,
      payer,
      split,
      method: methodPage,
      exact: () => customSplit("exact"),
      shares: () => customSplit("shares"),
      details,
      receipt,
      queue,
      people,
      boundary: () => boundary(route.label),
      locked: recovery,
      duplicate: recovery,
      save_error: recovery,
      conflict: recovery,
    };
    const expenseRoutes = {
      review_error: reviewError,
      issue_sent: reviewReceipt,
      reply_sent: reviewReceipt,
      resolved_reply: reviewReceipt,
      reviewed_again: reviewReceipt,
      deleted: (e) => {
        mount("j06", "deleted");
        text(".deleted-wrap h1", `${e.description} removed.`);
        action(".app-footer a", () => nav("group", ""));
      },
      changes: changesPage,
      detail,
      history: historyPage,
      view_split: viewSplit,
      view_receipt: viewReceipt,
      more,
      delete: deletePage,
      review,
      reasons,
      note: notePage,
      issue: issuePage,
      reply,
      withdraw,
      reviewed,
      success: (e) => saved(e, false),
      updated: (e) => saved(e, true),
    };
    if (routes[route.page]) routes[route.page]();
    else if (expenseRoutes[route.page]) {
      if (!e)
        throw new DomainError(
          "NOT_FOUND",
          "This expense is no longer available.",
        );
      expenseRoutes[route.page](e);
    } else group();
    action('[href="#global-activity"]',()=>{location.href=`../gate-d/index.html${fixtureMode?'?fixtures=1':''}#page=activity`;});
    action('[href="#global-you"]',()=>{location.href=`../gate-d/index.html${fixtureMode?'?fixtures=1':''}#page=account-overview`;});
    if(['locked','duplicate','save_error','conflict'].includes(route.page)){
      const recoveryLink=element('a','gb-recovery-link','Shared recovery');recoveryLink.href='#';recoveryLink.dataset.bound='true';recoveryLink.onclick=event=>{event.preventDefault();location.href=`../gate-d/index.html${fixtureMode?'?fixtures=1':''}#${new URLSearchParams({page:'recovery',owner:'expense',id:route.id||'',returnPage:route.page,operation:draft?.operationId||'',reason:route.page==='conflict'?'CONFLICT':route.page==='duplicate'?'DUPLICATE':'SAVE'})}`;};$('.app-content').append(recoveryLink);
    }
    if(sessionStorage.getItem('chopdot.gate-d.return')&&route.page==='detail'){
      const back=element('a','gb-recovery-link','Back to Activity');back.href=`../gate-d/index.html${fixtureMode?'?fixtures=1':''}#page=${sessionStorage.getItem('chopdot.gate-d.return')==='notifications'?'notifications':'activity'}`;back.dataset.bound='true';$('.app-content').append(back);
    }
    publishPrototypeRoute('chopdot-gate-b-route',location.hash||'#page=group');
    // Every remaining Golden-only link becomes an explicit boundary, never a static fixture outcome.
    for (const a of $$("a:not([data-bound])")) {
      a.onclick = (ev) => {
        ev.preventDefault();
        nav("boundary", "", {
          label:
            a.getAttribute("aria-label") || a.textContent.trim() || "Handoff",
        });
      };
    }
    screen.focus({ preventScroll: true });
    fixtureToolbar();
    // A same-screen update must leave a keyboard user on the control they operated.
    // Route navigation still starts at the newly mounted screen.
    if (focusKey)
      [...document.querySelectorAll("[data-focus-key]")]
        .find((el) => el.dataset.focusKey === focusKey)
        ?.focus({ preventScroll: true });
  } catch (e) {
    if (
      screen ||
      (state?.group && ["PERMISSION", "NOT_FOUND"].includes(e.code))
    ) {
      showError(e);
      fixtureToolbar();
    } else {
      app.replaceChildren(
        element(
          "p",
          "gb-error",
          `Saved data could not be read: ${e.message}. It has not been overwritten.`,
        ),
      );
    }
  }
}
window.addEventListener("hashchange", render);
window.addEventListener("storage", (event) => {
  if (event.key === "chopdot.preview-v2.guest") {
    if (
      [
        "editor",
        "payer",
        "split",
        "exact",
        "shares",
        "details",
        "receipt",
        "note",
        "reply",
      ].includes(route.page)
    )
      note(
        "Saved state changed in another tab. Your draft is retained; save will check the latest revision.",
      );
    else render();
  }
});
if (!location.hash && sessionStorage.getItem("chopdot.gate-b.route"))
  location.hash = sessionStorage.getItem("chopdot.gate-b.route");
else render();

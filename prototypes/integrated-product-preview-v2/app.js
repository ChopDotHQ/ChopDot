const frame = document.getElementById('product-frame');
const frontDoor = document.getElementById('front-door');
const accountWall = document.getElementById('account-wall');
const guestEntry = document.getElementById('guest-entry');
const createAccount = document.getElementById('create-account');
const signIn = document.getElementById('sign-in');
const accountWallBack = document.getElementById('account-wall-back');
const accountWallCreate = document.getElementById('account-wall-create');
const accountWallCancel = document.getElementById('account-wall-cancel');
const accountWallSignIn = document.getElementById('account-wall-signin');

const SOURCES = Object.freeze({
  j01: '../experience-workbench/journeys/01-enter-chopdot/v1-candidate.html',
  j01GuestInvite: '../experience-workbench/journeys/01-enter-chopdot/phase-c1-guest-v1-candidate.html',
  j02: '../experience-workbench/journeys/02-home-orientation/v1.4-inherited-icons.html',
  j03: '../experience-workbench/journeys/03-create-group/v2-golden-candidate.html',
  j05: '../experience-workbench/journeys/05-add-expense/source/core.html#entry',
});

const params = new URLSearchParams(window.location.search);
const entryMode = params.get('entry');
const GUEST_KEY = 'chopdot.preview-v2.guest';

let currentJourney = 'J01';
let currentFlow = 'front-door';
let homeMode = 'account';
let monitorTimer = null;
let lastEntryState = null;

function productModeCss() {
  return `
    html,body{width:100%!important;height:100%!important;background:#f7f7f8!important}
    .lab{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;height:100dvh!important;display:block!important;padding:0!important;overflow:hidden!important}
    .labpanel{display:none!important}
    .stage{position:absolute!important;inset:0!important;display:block!important;overflow:hidden!important}
    .device{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-height:none!important;border:0!important;border-radius:0!important;box-shadow:none!important}
    .entry-demobadge,.entry-demohelp{display:none!important}
  `;
}

function applyProductMode(doc) {
  if (!doc?.head) return;
  if (!doc.getElementById('chopdot-integrated-v2-mode')) {
    const style = doc.createElement('style');
    style.id = 'chopdot-integrated-v2-mode';
    style.textContent = productModeCss();
    doc.head.appendChild(style);
  }
  doc.documentElement.dataset.integratedPreview = 'golden-faithful-v2';
}

function loadGuestState() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(GUEST_KEY) || 'null');
    return {
      mode: 'guest-local',
      accountCreated: false,
      participantCreated: false,
      group: null,
      people: [],
      expenses: [],
      selectedPayerId: 'self',
      selectedParticipantIds: ['self'],
      ...parsed,
      people: Array.isArray(parsed?.people) ? parsed.people : [],
      expenses: Array.isArray(parsed?.expenses) ? parsed.expenses : [],
      selectedPayerId: typeof parsed?.selectedPayerId === 'string' ? parsed.selectedPayerId : 'self',
      selectedParticipantIds: Array.isArray(parsed?.selectedParticipantIds) ? parsed.selectedParticipantIds : ['self'],
    };
  } catch {
    return { mode: 'guest-local', accountCreated: false, participantCreated: false, group: null, people: [], expenses: [], selectedPayerId: 'self', selectedParticipantIds: ['self'] };
  }
}

function saveGuestState(patch) {
  const next = { ...loadGuestState(), ...patch };
  window.localStorage.setItem(GUEST_KEY, JSON.stringify(next));
  return next;
}

function stopMonitor() {
  if (monitorTimer) window.clearInterval(monitorTimer);
  monitorTimer = null;
}

function hideHostSurfaces() {
  frontDoor.hidden = true;
  accountWall.hidden = true;
  frame.hidden = true;
}

function showFrame() {
  hideHostSurfaces();
  frame.hidden = false;
}

function showFrontDoor() {
  stopMonitor();
  currentJourney = 'J01';
  currentFlow = 'front-door';
  homeMode = 'account';
  hideHostSurfaces();
  frontDoor.hidden = false;
}

function showAccountWall() {
  stopMonitor();
  currentJourney = 'ACCOUNT_BOUNDARY';
  currentFlow = 'guest-share-boundary';
  hideHostSurfaces();
  accountWall.hidden = false;
}

function recordEntryState(entryState) {
  lastEntryState = entryState ? JSON.parse(JSON.stringify(entryState)) : null;
  window.sessionStorage.setItem('chopdot.preview-v2.last-entry', JSON.stringify({
    recordedAt: new Date().toISOString(),
    state: lastEntryState,
  }));
}

function openHome(entryState = lastEntryState, mode = 'account') {
  stopMonitor();
  if (entryState) recordEntryState(entryState);
  homeMode = mode;
  currentJourney = 'J02';
  currentFlow = mode;
  showFrame();
  frame.src = SOURCES.j02;
}

function openGuestHome() {
  const existing = loadGuestState();
  saveGuestState({
    ...existing,
    mode: 'guest-local',
    accountCreated: false,
    participantCreated: false,
    enteredAt: existing.enteredAt || new Date().toISOString(),
  });
  openHome(null, 'guest');
}

function openGuestCreateGroup() {
  currentJourney = 'J03';
  currentFlow = 'guest-local-create';
  showFrame();
  frame.src = `${SOURCES.j03}#entry`;
}

function openGuestExpense() {
  const state = loadGuestState();
  if (!state.group) {
    openGuestCreateGroup();
    return;
  }
  currentJourney = 'J05';
  currentFlow = 'guest-local-expense';
  showFrame();
  frame.src = SOURCES.j05;
}

function openAuth(flow = 'create') {
  stopMonitor();
  currentJourney = 'J01';
  currentFlow = flow;
  homeMode = 'account';
  showFrame();
  frame.src = `${SOURCES.j01}#welcome`;
}

function watchGoldenEntry() {
  stopMonitor();
  monitorTimer = window.setInterval(() => {
    const win = frame.contentWindow;
    const demo = win?.EntryDemo;
    if (!demo?.get) return;
    const state = demo.get();
    if (!state?.route) return;
    lastEntryState = state;
    if (state.route === 'home-reference' && state.verified) {
      const convertingGuest = currentFlow === 'convert-create' || currentFlow === 'convert-signin';
      if (convertingGuest) {
        saveGuestState({ accountCreated: true });
        openHome(state, 'converted');
      } else {
        openHome(state, 'account');
      }
    }
  }, 80);
}

function watchGuestInviteSuccessor() {
  stopMonitor();
  monitorTimer = window.setInterval(() => {
    const body = frame.contentDocument?.body;
    if (!body) return;
    if (body.dataset.outcome === 'j04-private-invite') {
      window.sessionStorage.setItem('chopdot.preview-v2.pending-invite', JSON.stringify({
        provenance: 'invite',
        mode: 'guest',
        participantCreated: false,
        nextOwner: 'J04',
      }));
      stopMonitor();
    }
  }, 80);
}

function svg(path) {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

const ICONS = Object.freeze({
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  receipt: '<path d="M4 2v20l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2V2l-2 2-2-2-2 2-2-2-2 2-2-2-2 2-2-2Z"/><path d="M16 8h-6"/><path d="M16 12h-6"/>',
  people: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
});

function addLocalHomeCss(doc) {
  if (doc.getElementById('chopdot-local-home')) return;
  const style = doc.createElement('style');
  style.id = 'chopdot-local-home';
  style.textContent = `
    .local-empty{padding:22px 18px;text-align:center}
    .local-empty-icon{width:48px;height:48px;border-radius:16px;background:var(--surface2);display:grid;place-items:center;margin:0 auto 11px}
    .local-empty-icon .icon{width:22px;height:22px}
    .local-empty-title{font-size:14px;font-weight:730}
    .local-empty-sub{font-size:11px;line-height:1.45;color:var(--secondary);margin-top:4px}
    .local-actions{display:grid;gap:10px}
    .local-action{min-height:46px;border:1px dashed #ccccd2;border-radius:16px;display:flex;align-items:center;justify-content:center;gap:7px;color:var(--secondary);font-size:12px;background:transparent}
    .local-action.primary{border-style:solid;border-color:#111;background:#111;color:#fff;font-weight:700}
    .local-action .icon{width:16px;height:16px}
  `;
  doc.head.appendChild(style);
}

function renderLocalHomeState(doc, { converted = false } = {}) {
  if (!doc?.body) return;
  addLocalHomeCss(doc);
  const state = loadGuestState();
  doc.documentElement.dataset.previewMode = converted ? 'converted' : 'guest';
  doc.body.dataset.previewMode = converted ? 'converted' : 'guest';

  const avatar = doc.querySelector('.avatar');
  if (avatar) {
    const label = converted ? (lastEntryState?.name || lastEntryState?.email || 'You') : 'Guest';
    avatar.textContent = converted ? String(label).trim().slice(0, 1).toUpperCase() || 'Y' : 'G';
    avatar.setAttribute('aria-label', converted ? 'Account' : 'Guest');
    avatar.title = converted ? 'Account' : 'Guest';
  }
  const bell = doc.querySelector('.bell');
  if (bell && !converted) bell.style.display = 'none';
  const notification = doc.querySelector('.notif');
  if (notification) notification.style.display = 'none';

  const content = doc.querySelector('.app-content');
  if (!content) return;

  if (!state.group) {
    content.innerHTML = `
      <div><div class="eyebrow">${converted ? 'Your groups' : 'Guest'}</div><h1 class="hero">Start your first split.</h1></div>
      <div class="section-head"><h2 class="h2">Your groups</h2></div>
      <section class="card local-empty">
        <span class="local-empty-icon">${svg(ICONS.people)}</span>
        <div class="local-empty-title">No groups yet.</div>
        <div class="local-empty-sub">${converted ? 'Create one when you’re ready.' : 'Start locally. Share when you’re ready.'}</div>
      </section>
      <div class="local-actions"><button class="local-action primary guest-start-group" type="button">${svg(ICONS.plus)} Start a group</button></div>
    `;
  } else {
    const expenseCount = state.expenses.length;
    const noun = expenseCount === 1 ? 'expense' : 'expenses';
    const peopleCount = 1 + state.people.length;
    const peopleLabel = peopleCount === 1 ? 'only you' : `${peopleCount} people`;
    content.innerHTML = `
      <div><div class="eyebrow">${converted ? 'Account ready' : 'Saved locally'}</div><h1 class="hero">${converted ? 'Your work is still here.' : 'Keep going.'}</h1></div>
      <div class="section-head"><h2 class="h2">Your groups</h2></div>
      <section class="card group">
        <div class="group-top">
          <div><div class="group-name clamp" data-local-group-name></div><div class="group-meta clamp" data-local-group-meta></div></div>
          <div class="group-balance">${expenseCount} ${noun}</div>
        </div>
        <div class="group-status">
          <div class="status-left"><span class="status-dot"></span><span class="status-text clamp">${converted ? 'Ready to share' : 'Saved on this device'}</span></div>
        </div>
      </section>
      <div class="local-actions">
        <button class="local-action primary guest-add-expense" type="button">${svg(ICONS.receipt)} Add expense</button>
        ${converted ? '' : `<button class="local-action guest-invite" type="button">${svg(ICONS.people)} Invite someone</button>`}
      </div>
    `;
  }

  // Group names and restored currency labels are data, never markup.
  const localName = content.querySelector('[data-local-group-name]');
  if (localName) localName.textContent = String(state.group?.name || '');
  const localMeta = content.querySelector('[data-local-group-meta]');
  if (localMeta && state.group) {
    const count = 1 + state.people.length;
    localMeta.textContent = `${state.group.currency} · ${count === 1 ? 'only you' : `${count} people`}${converted ? '' : ' · local'}`;
  }

  const wallet = doc.querySelector('.wallet');
  if (wallet) wallet.style.display = 'none';

  const start = content.querySelector('.guest-start-group');
  if (start) start.addEventListener('click', openGuestCreateGroup);
  const add = content.querySelector('.guest-add-expense');
  if (add) add.addEventListener('click', openGuestExpense);
  const invite = content.querySelector('.guest-invite');
  if (invite) invite.addEventListener('click', showAccountWall);

  const centerAdd = doc.querySelector('.add-tab');
  if (centerAdd) {
    if (!state.group) {
      centerAdd.style.visibility = 'hidden';
      centerAdd.style.pointerEvents = 'none';
      centerAdd.setAttribute('aria-hidden', 'true');
      centerAdd.tabIndex = -1;
    } else {
      centerAdd.addEventListener('click', (event) => {
        event.preventDefault();
        openGuestExpense();
      }, { once: true });
    }
  }
}

function addGuestGroupPeopleCss(doc) {
  if (doc.getElementById('chopdot-local-group-people')) return;
  const style = doc.createElement('style');
  style.id = 'chopdot-local-group-people';
  style.textContent = `
    .guest-group-people-editor{margin-top:12px;padding:14px 14px 12px}
    .guest-group-editor-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}
    .guest-group-editor-head b{display:block;font-size:14px}
    .guest-group-editor-head span{display:block;margin-top:2px;font-size:11px;line-height:1.4;color:var(--muted)}
    .guest-group-person-list{display:grid;gap:8px;margin-bottom:12px}
    .guest-group-person{display:flex;align-items:center;gap:10px;min-height:42px}
    .guest-group-person-avatar{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#f0f0f3;font-size:12px;font-weight:750}
    .guest-group-person-copy{min-width:0}
    .guest-group-person-copy b{display:block;font-size:13px}
    .guest-group-person-copy span{display:block;margin-top:2px;font-size:10px;color:var(--muted)}
    .guest-group-add-row{display:grid;grid-template-columns:1fr auto;gap:8px}
    .guest-group-add-row input{min-width:0;height:42px;border:1px solid var(--border);border-radius:12px;padding:0 12px;background:#fff;color:var(--ink);font:inherit;font-size:13px;outline:none}
    .guest-group-add-row input:focus{border-color:#111}
    .guest-group-add-row button,.guest-group-editor-done{min-height:42px;border-radius:12px;font:inherit;font-weight:750;cursor:pointer}
    .guest-group-add-row button{border:0;background:#111;color:#fff;padding:0 14px}
    .guest-group-editor-done{width:100%;margin-top:9px;border:1px solid var(--border);background:#fff;color:var(--ink)}
  `;
  doc.head.appendChild(style);
}

function returnToLocalHome() {
  // Only the current in-memory verified entry can retain converted presentation.
  // Never promote a stored accountCreated flag or restored session JSON to proof.
  const converted = homeMode === 'converted'
    && lastEntryState?.verified === true
    && lastEntryState?.route === 'home-reference';
  openHome(converted ? lastEntryState : null, converted ? 'converted' : 'guest');
}

function draftSaveNotice(doc, message = '') {
  let notice = doc.getElementById('local-draft-save-error');
  if (!notice && message) {
    notice = doc.createElement('p');
    notice.id = 'local-draft-save-error';
    notice.setAttribute('role', 'alert');
    (doc.querySelector('#entry .app-content') || doc.querySelector('#entry'))?.append(notice);
  }
  if (notice) {
    notice.textContent = message;
    notice.hidden = !message;
  }
}

function persistLocalExpenseDraft(doc) {
  const current = loadGuestState();
  const amount = doc.querySelector('#entry .amount');
  const description = doc.querySelector('#entry .description');
  if (!current.group || !amount || !description) return false;
  const draft = {
    version: 1,
    groupId: current.group.id,
    currency: current.group.currency,
    amountText: amount.value,
    description: description.value,
    payerId: current.selectedPayerId || 'self',
    participantIds: [...(current.selectedParticipantIds || ['self'])],
    method: 'equal', date: 'today', receipt: null,
  };
  try {
    saveGuestState({ expenseDraft: draft });
    draftSaveNotice(doc);
    return true;
  } catch {
    draftSaveNotice(doc, "Couldn't save on this device. Your details are still here.");
    return false;
  }
}

function restoreLocalExpenseDraft(doc) {
  const current = loadGuestState();
  const draft = current.expenseDraft;
  const matches = draft?.version === 1 && draft.groupId === current.group?.id
    && draft.currency === current.group?.currency;
  const amount = doc.querySelector('#entry .amount');
  const description = doc.querySelector('#entry .description');
  // A new expense is not the Golden's example Dinner. Existing saved records stay intact.
  if (amount) amount.value = matches && typeof draft.amountText === 'string' ? draft.amountText : '';
  if (description) description.value = matches && typeof draft.description === 'string' ? draft.description : '';
  if (matches) {
    saveGuestState({
      selectedPayerId: draft.payerId,
      selectedParticipantIds: Array.isArray(draft.participantIds) ? [...draft.participantIds] : [],
    });
  }
}

function localEqualShareView(amount, participantIds) {
  // Same common-case division as the existing Gate A, shared across all summaries.
  // Canonical integer allocation/rounding remains a separate Gate B qualification.
  const ids = [...new Set(Array.isArray(participantIds) ? participantIds : [])];
  const value = Number(amount);
  const total = Number.isFinite(value) ? value : 0;
  const each = ids.length ? total / ids.length : 0;
  return { ids, total, count: ids.length, each, self: ids.includes('self') ? each : 0 };
}

function renderGuestGroupPeopleEditor(doc, screen) {
  addGuestGroupPeopleCss(doc);
  let panel = screen.querySelector('.guest-group-people-editor');
  if (!panel) {
    panel = doc.createElement('section');
    panel.className = 'card guest-group-people-editor';
    screen.querySelector('.group-card')?.after(panel);
  }
  // This template is constant. User-provided and restored labels are text nodes below.
  panel.innerHTML = `
    <div class="guest-group-editor-head"><div><b>People in this split</b><span>Add names now. Invite them only when you're ready to share.</span></div></div>
    <div class="guest-group-person-list"></div>
    <div class="guest-group-add-row">
      <input aria-label="Person name" maxlength="60" autocomplete="off" placeholder="e.g. Jeanine" />
      <button type="button">Add</button>
    </div>
    <button class="guest-group-editor-done" type="button">Done</button>
  `;
  const list = panel.querySelector('.guest-group-person-list');
  for (const person of localPeople()) {
    const row = doc.createElement('div');
    row.className = 'guest-group-person';
    const avatar = doc.createElement('span');
    avatar.className = 'guest-group-person-avatar';
    avatar.textContent = person.self ? 'Y' : String(person.initials || initialsFor(person.name));
    const copy = doc.createElement('div');
    copy.className = 'guest-group-person-copy';
    const name = doc.createElement('b');
    name.textContent = String(person.name);
    const hint = doc.createElement('span');
    hint.textContent = person.self ? 'Already here' : 'You can invite them later';
    copy.append(name, hint);
    row.append(avatar, copy);
    list.append(row);
  }
  const input = panel.querySelector('input');
  const commit = () => {
    const name = String(input.value || '').trim();
    if (!name) { input.focus(); return; }
    const current = loadGuestState();
    const id = `local-person-${Date.now()}`;
    const people = [...current.people, { id, name, initials: initialsFor(name), localDraft: true }];
    const selectedParticipantIds = [...new Set([...(current.selectedParticipantIds || ['self']), id])];
    saveGuestState({ people, selectedParticipantIds });
    syncGuestGroupSuccess(doc);
    renderGuestGroupPeopleEditor(doc, screen);
  };
  panel.querySelector('.guest-group-add-row button').addEventListener('click', commit);
  input.addEventListener('keydown', event => { if (event.key === 'Enter') commit(); });
  panel.querySelector('.guest-group-editor-done').addEventListener('click', () => panel.remove());
  input.focus();
}

function syncGuestGroupSuccess(doc) {
  const state = loadGuestState();
  if (!state.group) return;
  for (const id of ['success', 'success-eur', 'success-usd']) {
    const screen = doc.getElementById(id);
    if (!screen) continue;
    const title = screen.querySelector('.success-title');
    if (title) title.textContent = `${state.group.name} is ready.`;
    const successSub = screen.querySelector('.success-sub');
    if (successSub) successSub.textContent = 'Add people or add an expense.';
    const name = screen.querySelector('.group-name');
    if (name) name.textContent = state.group.name;
    const peopleCount = 1 + state.people.length;
    const meta = screen.querySelector('.group-meta');
    if (meta) meta.textContent = `${state.group.currency} · ${peopleCount === 1 ? 'only you' : `${peopleCount} people`}`;
    const peopleStat = screen.querySelector('.group-state .state-item:first-child b');
    if (peopleStat) peopleStat.textContent = String(peopleCount);
    const emptyTitle = screen.querySelector('.empty-title');
    if (emptyTitle) emptyTitle.textContent = 'Add people to this split.';
    const emptySub = screen.querySelector('.empty-sub');
    if (emptySub) emptySub.textContent = 'You can invite them later.';
    const addPeople = screen.querySelector('a[href="#invite-handoff"]');
    if (addPeople) {
      for (const node of addPeople.childNodes) {
        if (node.nodeType === 3 && node.textContent.trim()) node.textContent = ' Add people';
      }
      if (!addPeople.textContent.trim().includes('Add people')) addPeople.append('Add people');
      addPeople.setAttribute('aria-label', 'Add people');
    }
    const balance = screen.querySelector('.group-balance');
    if (balance) balance.textContent = state.group.currency === 'EUR' ? '€0.00' : state.group.currency === 'USD' ? '$0.00' : 'CHF 0.00';
    if (!screen.querySelector('.guest-local-note')) {
      const note = doc.createElement('div');
      note.className = 'quiet guest-local-note';
      note.textContent = 'Local draft · saved on this device';
      const main = screen.querySelector('.content');
      if (main) main.insertBefore(note, main.children[2] || null);
    }
  }
}

function applyGuestCreateGroupState(doc) {
  if (!doc?.body) return;
  let pendingCurrency = 'CHF';

  const rememberGroup = (currency = pendingCurrency) => {
    const input = doc.querySelector('#entry .name-input');
    const name = String(input?.value || 'Untitled group').trim() || 'Untitled group';
    pendingCurrency = currency;
    saveGuestState({ group: { id: 'local-group-1', name, currency, shared: false } });
    syncGuestGroupSuccess(doc);
  };

  syncGuestGroupSuccess(doc);

  doc.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');

    if (href === '#success') rememberGroup('CHF');
    if (href === '#success-eur') rememberGroup('EUR');
    if (href === '#success-usd') rememberGroup('USD');

    if (href === '#invite-handoff') {
      event.preventDefault();
      rememberGroup(loadGuestState().group?.currency || pendingCurrency);
      const screen = anchor.closest('.screen');
      if (screen) renderGuestGroupPeopleEditor(doc, screen);
      return;
    }

    if (href === '#expense-handoff') {
      event.preventDefault();
      rememberGroup(loadGuestState().group?.currency || pendingCurrency);
      openGuestExpense();
    }
  });

  frame.contentWindow?.addEventListener('hashchange', () => syncGuestGroupSuccess(doc));
}

function formatMoney(currency, value) {
  const amount = Number(value || 0);
  if (currency === 'EUR') return `€${amount.toFixed(2)}`;
  if (currency === 'USD') return `$${amount.toFixed(2)}`;
  return `CHF ${amount.toFixed(2)}`;
}


function localPeople(state = loadGuestState()) {
  return [
    { id: 'self', name: 'You', initials: 'Y', self: true },
    ...state.people.map((person) => ({
      id: person.id,
      name: person.name,
      initials: person.initials || initialsFor(person.name),
      self: false,
    })),
  ];
}

function initialsFor(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}

function personById(id, state = loadGuestState()) {
  return localPeople(state).find((person) => person.id === id) || localPeople(state)[0];
}

function addGuestExpenseCss(doc) {
  if (doc.getElementById('chopdot-local-expense')) return;
  const style = doc.createElement('style');
  style.id = 'chopdot-local-expense';
  style.textContent = `
    .guest-member-button{width:100%;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
    .guest-add-person{width:100%;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
    .guest-add-person .avatar{display:grid;place-items:center;background:var(--surface2);color:var(--ink);font-size:20px;font-weight:500}
    .guest-person-editor{margin-top:12px;padding:14px;border:1px solid var(--border);border-radius:18px;background:var(--surface)}
    .guest-person-editor label{display:block;font-size:11px;color:var(--secondary);margin-bottom:7px}
    .guest-person-editor input{width:100%;height:44px;border:1px solid var(--border);border-radius:13px;padding:0 12px;background:#fff;color:var(--ink);font:inherit;font-size:14px;outline:none}
    .guest-person-editor input:focus{border-color:#111}
    .guest-person-actions{display:flex;gap:8px;margin-top:10px}
    .guest-person-actions button{min-height:40px;border-radius:12px;padding:0 14px;font:inherit;font-weight:700;cursor:pointer}
    .guest-person-save{flex:1;border:0;background:#111;color:#fff}
    .guest-person-cancel{border:1px solid var(--border);background:#fff;color:var(--ink)}
    .guest-local-note{font-size:11px;color:var(--secondary)}
  `;
  doc.head.appendChild(style);
}

function openLocalPersonEditor(doc, context) {
  addGuestExpenseCss(doc);
  const screen = doc.getElementById(context === 'payer' ? 'payer' : 'split');
  const list = screen?.querySelector('.member-list');
  if (!screen || !list) return;
  screen.querySelector('.guest-person-editor')?.remove();

  const editor = doc.createElement('section');
  editor.className = 'guest-person-editor';
  editor.innerHTML = `
    <label>Person name</label>
    <input aria-label="Person name" maxlength="60" autocomplete="off" placeholder="e.g. Jeanine" />
    <div class="guest-person-actions">
      <button class="guest-person-save" type="button">Add person</button>
      <button class="guest-person-cancel" type="button">Cancel</button>
    </div>
    <div class="guest-local-note" style="margin-top:8px">You can invite them later.</div>
  `;
  list.after(editor);
  const input = editor.querySelector('input');
  input.focus();

  editor.querySelector('.guest-person-cancel').addEventListener('click', () => editor.remove());
  editor.querySelector('.guest-person-save').addEventListener('click', () => {
    const name = String(input.value || '').trim();
    if (!name) {
      input.focus();
      return;
    }
    const state = loadGuestState();
    const id = `local-person-${Date.now()}`;
    const nextPeople = [...state.people, { id, name, initials: initialsFor(name), localDraft: true }];
    const nextParticipants = Array.from(new Set([...(state.selectedParticipantIds || ['self']), id]));
    saveGuestState({
      people: nextPeople,
      selectedParticipantIds: nextParticipants,
      ...(context === 'payer' ? { selectedPayerId: id } : {}),
    });
    editor.remove();
    renderGuestExpensePeople(doc);
    syncGuestExpenseEntry(doc);
    if (context === 'payer') frame.contentWindow.location.hash = '#entry';
  });
}

function makeGuestPersonRow(doc, person, { context, selected }) {
  const row = doc.createElement('button');
  row.type = 'button';
  row.className = 'member guest-member-button';
  row.dataset.personId = person.id;

  const avatar = doc.createElement('span');
  avatar.className = person.self ? 'avatar you' : 'avatar';
  avatar.textContent = person.self ? 'Y' : person.initials;

  const copy = doc.createElement('div');
  const name = doc.createElement('b');
  name.textContent = person.name;
  const sub = doc.createElement('span');
  sub.textContent = person.self ? (selected ? 'Selected' : 'You') : (person.id.startsWith('local-person-') ? 'You can invite later' : 'Member');
  copy.append(name, sub);

  const indicator = doc.createElement('span');
  indicator.className = context === 'payer' ? `radio${selected ? ' on' : ''}` : `select${selected ? ' on' : ''}`;
  if (context === 'split' && selected) indicator.innerHTML = svg('<path d="m5 12 4 4L19 6"></path>');

  row.append(avatar, copy, indicator);
  row.addEventListener('click', () => {
    const state = loadGuestState();
    if (context === 'payer') {
      saveGuestState({ selectedPayerId: person.id });
      renderGuestExpensePeople(doc);
      syncGuestExpenseEntry(doc);
      frame.contentWindow.location.hash = '#entry';
      return;
    }

    const selectedIds = new Set(state.selectedParticipantIds || ['self']);
    if (selectedIds.has(person.id)) {
      if (selectedIds.size === 1) return;
      selectedIds.delete(person.id);
    } else {
      selectedIds.add(person.id);
    }
    saveGuestState({ selectedParticipantIds: Array.from(selectedIds) });
    renderGuestExpensePeople(doc);
    syncGuestExpenseEntry(doc);
  });
  return row;
}

function makeAddPersonRow(doc, context) {
  const row = doc.createElement('button');
  row.type = 'button';
  row.className = 'member guest-add-person';
  row.innerHTML = `<span class="avatar">+</span><div><b>Add person</b><span>Add now. Invite later.</span></div><span></span>`;
  row.addEventListener('click', () => openLocalPersonEditor(doc, context));
  return row;
}

function renderGuestExpensePeople(doc) {
  addGuestExpenseCss(doc);
  const state = loadGuestState();
  const people = localPeople(state);
  const selectedParticipants = new Set(state.selectedParticipantIds || ['self']);

  const payerList = doc.querySelector('#payer .member-list');
  if (payerList) {
    payerList.replaceChildren();
    for (const person of people) {
      payerList.appendChild(makeGuestPersonRow(doc, person, {
        context: 'payer',
        selected: person.id === (state.selectedPayerId || 'self'),
      }));
    }
    payerList.appendChild(makeAddPersonRow(doc, 'payer'));
  }

  const splitList = doc.querySelector('#split .member-list');
  if (splitList) {
    splitList.replaceChildren();
    for (const person of people) {
      splitList.appendChild(makeGuestPersonRow(doc, person, {
        context: 'split',
        selected: selectedParticipants.has(person.id),
      }));
    }
    splitList.appendChild(makeAddPersonRow(doc, 'split'));
  }
}

function syncGuestExpenseEntry(doc) {
  const state = loadGuestState();
  const group = state.group;
  if (!group) return;
  persistLocalExpenseDraft(doc);
  const amount = doc.querySelector('#entry .amount')?.value || 0;
  const description = String(doc.querySelector('#entry .description')?.value || 'Expense').trim() || 'Expense';
  const payer = personById(state.selectedPayerId || 'self', state);
  const selected = (state.selectedParticipantIds || ['self']).filter(id => localPeople(state).some(p => p.id === id));
  const view = localEqualShareView(amount, selected);
  const set = (selector, value) => { const node = doc.querySelector(selector); if (node) node.textContent = value; };
  set('#entry .header-title span', group.name);
  set('#entry .currency', group.currency);
  const payerValue = doc.querySelector('#entry a[href="#payer"] .row-value');
  if (payerValue?.firstChild) payerValue.firstChild.textContent = `${payer.name} `;
  set('#entry a[href="#split"] .row-sub', `${view.count} ${view.count === 1 ? 'person' : 'people'} · ${formatMoney(group.currency, view.each)} each`);
  const splitValue = doc.querySelector('#entry a[href="#split"] .row-value');
  if (splitValue?.firstChild) splitValue.firstChild.textContent = view.count === localPeople(state).length ? 'Everyone ' : `${view.count} selected `;
  set('#payer .header-title span', `${description} · ${formatMoney(group.currency, view.total)}`);
  set('#split .header-title span', formatMoney(group.currency, view.total));
  const total = doc.querySelector('#split .split-total');
  if (total) {
    // Replace only text, retaining the approved SVG affordance.
    for (const child of [...total.childNodes]) if (child.nodeType === 3) child.remove();
    total.prepend(doc.createTextNode(`${formatMoney(group.currency, view.each)} each `));
  }
  for (const row of doc.querySelectorAll('#split .guest-member-button')) {
    const copy = row.querySelector(':scope > div > span');
    if (copy) copy.textContent = view.ids.includes(row.dataset.personId)
      ? formatMoney(group.currency, view.each) : 'Not included';
  }
}

function applyGuestExpenseState(doc) {
  const group = loadGuestState().group;
  if (!doc?.body || !group) return;
  // The isolated Golden's example shortcut must not replace live local selections.
  for (const shortcut of doc.querySelectorAll('a[href="split-methods.html#split-two"]')) {
    shortcut.hidden = true;
    shortcut.style.display = 'none';
  }
  let editing = true;
  restoreLocalExpenseDraft(doc);
  renderGuestExpensePeople(doc);
  const amountInput = doc.querySelector('#entry .amount');
  const descriptionInput = doc.querySelector('#entry .description');
  for (const input of [amountInput, descriptionInput]) {
    input?.addEventListener('input', () => {
      input.setCustomValidity('');
      if (editing) syncGuestExpenseEntry(doc);
    });
  }
  syncGuestExpenseEntry(doc);

  const syncSuccess = () => {
    const current = loadGuestState();
    const expense = current.expenses.at(-1);
    const success = doc.querySelector('#success');
    if (!expense || !success) return;
    const payer = personById(expense.payerId || 'self', current);
    const view = localEqualShareView(expense.amount, expense.participantIds || ['self']);
    const set = (selector, value) => { const node = success.querySelector(selector); if (node) node.textContent = value; };
    set('.header-title span', group.name);
    set('h1', `${expense.description} added.`);
    set('.success-wrap > p', `Split between ${view.count} ${view.count === 1 ? 'person' : 'people'} · saved locally.`);
    set('.receipt-top b', expense.description);
    set('.receipt-meta', `${payer.name} paid · Today`);
    set('.receipt-amount', formatMoney(expense.currency || group.currency, view.total));
    set('.shares b', formatMoney(expense.currency || group.currency, view.self));
  };
  const beginAnother = () => {
    if (editing) return;
    editing = true;
    const current = loadGuestState();
    saveGuestState({ expenseDraft: null, selectedPayerId: 'self', selectedParticipantIds: localPeople(current).map(p => p.id) });
    restoreLocalExpenseDraft(doc);
    renderGuestExpensePeople(doc);
    syncGuestExpenseEntry(doc);
  };
  doc.addEventListener('click', event => {
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (href === '#group' && anchor.closest('#entry')) {
      event.preventDefault();
      if (persistLocalExpenseDraft(doc)) returnToLocalHome();
      return;
    }
    if (href === '#success' && anchor.closest('#entry')) {
      event.preventDefault();
      if (!editing) return;
      const raw = String(amountInput?.value || '').trim();
      const amount = Number(raw);
      const description = String(descriptionInput?.value || '').trim();
      const current = loadGuestState();
      const ids = [...new Set(current.selectedParticipantIds || ['self'])];
      const validIds = new Set(localPeople(current).map(p => p.id));
      if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(raw) || !Number.isFinite(amount) || amount <= 0) {
        amountInput?.setCustomValidity('Enter an amount greater than zero.');
        amountInput?.reportValidity();
        return;
      }
      if (!description) {
        descriptionInput?.setCustomValidity('Enter a description.');
        descriptionInput?.reportValidity();
        return;
      }
      if (!ids.length || ids.some(id => !validIds.has(id)) || !validIds.has(current.selectedPayerId || 'self')) {
        draftSaveNotice(doc, 'Choose a payer and the people sharing this expense.');
        return;
      }
      try {
        saveGuestState({
          expenses: [...current.expenses, {
            id: `local-expense-${current.expenses.length + 1}`,
            amount, description, currency: group.currency,
            payerId: current.selectedPayerId || 'self', participantIds: ids,
          }],
          expenseDraft: null,
          selectedPayerId: 'self',
          selectedParticipantIds: localPeople(current).map(person => person.id),
        });
      } catch {
        draftSaveNotice(doc, "Couldn't save on this device. Your details are still here.");
        return;
      }
      editing = false;
      syncSuccess();
      frame.contentWindow.location.hash = '#success';
      return;
    }
    if (href === '#entry' && anchor.closest('#success')) beginAnother();
    if (href === '#group-updated') {
      event.preventDefault();
      returnToLocalHome();
    }
  });
  frame.contentWindow?.addEventListener('pagehide', () => { if (editing) persistLocalExpenseDraft(doc); });
  frame.contentWindow?.addEventListener('hashchange', () => {
    const hash = frame.contentWindow.location.hash;
    if (hash === '#group') {
      if (!editing || persistLocalExpenseDraft(doc)) returnToLocalHome();
      else frame.contentWindow.location.hash = '#entry';
      return;
    }
    if (hash === '#entry' && !editing) beginAnother();
    if (hash === '#success') syncSuccess();
  });
}

function enterAuthFormIfNeeded(doc) {
  if (!['create', 'signin', 'convert-create', 'convert-signin'].includes(currentFlow)) return;
  const screen = doc.querySelector('#entry-screen');
  if (screen?.dataset.state !== 'welcome') return;
  const emailAction = doc.querySelector('[data-action="EMAIL"]');
  if (emailAction) emailAction.click();
}

frame.addEventListener('load', () => {
  const doc = frame.contentDocument;
  applyProductMode(doc);

  if (currentJourney === 'J02') {
    if (homeMode === 'guest') renderLocalHomeState(doc, { converted: false });
    if (homeMode === 'converted') renderLocalHomeState(doc, { converted: true });
    return;
  }

  if (currentJourney === 'J03' && currentFlow === 'guest-local-create') {
    applyGuestCreateGroupState(doc);
    return;
  }

  if (currentJourney === 'J05' && currentFlow === 'guest-local-expense') {
    applyGuestExpenseState(doc);
    return;
  }

  if (currentJourney === 'J01' && currentFlow === 'guest-invite') {
    watchGuestInviteSuccessor();
    return;
  }

  enterAuthFormIfNeeded(doc);
  if (currentJourney === 'J01') watchGoldenEntry();
});

function openInvite(mode = 'account') {
  stopMonitor();
  currentJourney = 'J01';
  currentFlow = mode === 'guest' ? 'guest-invite' : 'invite';
  showFrame();
  frame.src = mode === 'guest' ? `${SOURCES.j01GuestInvite}#invite` : `${SOURCES.j01}#invite`;
}

guestEntry.addEventListener('click', openGuestHome);
createAccount.addEventListener('click', () => openAuth('create'));
signIn.addEventListener('click', () => openAuth('signin'));
accountWallBack.addEventListener('click', openGuestHome);
accountWallCancel.addEventListener('click', openGuestHome);
accountWallCreate.addEventListener('click', () => openAuth('convert-create'));
accountWallSignIn.addEventListener('click', () => openAuth('convert-signin'));

window.ChopDotPreviewV2 = Object.freeze({
  sources: SOURCES,
  getCurrentJourney: () => currentJourney,
  getCurrentFlow: () => currentFlow,
  getHomeMode: () => homeMode,
  getGuestState: () => JSON.parse(JSON.stringify(loadGuestState())),
  getLastEntryState: () => lastEntryState && JSON.parse(JSON.stringify(lastEntryState)),
  showFrontDoor,
  showAccountWall,
  openGuestHome,
  openGuestCreateGroup,
  openGuestExpense,
  openAuth,
  openInvite,
  openHome: () => openHome(lastEntryState, 'account'),
});

if (entryMode === 'invite') openInvite('account');
else if (entryMode === 'guest-invite') openInvite('guest');
else showFrontDoor();

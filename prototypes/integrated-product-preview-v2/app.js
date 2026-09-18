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
      expenses: [],
      ...parsed,
      expenses: Array.isArray(parsed?.expenses) ? parsed.expenses : [],
    };
  } catch {
    return { mode: 'guest-local', accountCreated: false, participantCreated: false, group: null, expenses: [] };
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
    content.innerHTML = `
      <div><div class="eyebrow">${converted ? 'Account ready' : 'Saved locally'}</div><h1 class="hero">${converted ? 'Your work is still here.' : 'Keep going.'}</h1></div>
      <div class="section-head"><h2 class="h2">Your groups</h2></div>
      <section class="card group">
        <div class="group-top">
          <div><div class="group-name clamp">${state.group.name}</div><div class="group-meta clamp">${state.group.currency} · only you${converted ? '' : ' · local'}</div></div>
          <div class="group-balance">${expenseCount} ${noun}</div>
        </div>
        <div class="group-status">
          <div class="status-left"><span class="status-dot"></span><span class="status-text clamp">${converted ? 'Ready to share' : 'Saved on this device'}</span></div>
          <span class="status-action">Open</span>
        </div>
      </section>
      <div class="local-actions">
        <button class="local-action primary guest-add-expense" type="button">${svg(ICONS.receipt)} Add expense</button>
        <button class="local-action guest-invite" type="button">${svg(ICONS.people)} Invite someone</button>
      </div>
    `;
  }

  const wallet = doc.querySelector('.wallet');
  if (wallet) wallet.style.display = 'none';

  const start = content.querySelector('.guest-start-group');
  if (start) start.addEventListener('click', openGuestCreateGroup);
  const add = content.querySelector('.guest-add-expense');
  if (add) add.addEventListener('click', openGuestExpense);
  const invite = content.querySelector('.guest-invite');
  if (invite) invite.addEventListener('click', () => converted ? openInvite('account') : showAccountWall());

  const centerAdd = doc.querySelector('.add-tab');
  if (centerAdd) {
    centerAdd.addEventListener('click', (event) => {
      event.preventDefault();
      if (loadGuestState().group) openGuestExpense();
      else openGuestCreateGroup();
    }, { once: true });
  }
}

function syncGuestGroupSuccess(doc) {
  const state = loadGuestState();
  if (!state.group) return;
  for (const id of ['success', 'success-eur', 'success-usd']) {
    const screen = doc.getElementById(id);
    if (!screen) continue;
    const title = screen.querySelector('.success-title');
    if (title) title.textContent = `${state.group.name} is ready.`;
    const name = screen.querySelector('.group-name');
    if (name) name.textContent = state.group.name;
    const meta = screen.querySelector('.group-meta');
    if (meta) meta.textContent = `${state.group.currency} · only you`;
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
      showAccountWall();
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

function applyGuestExpenseState(doc) {
  const state = loadGuestState();
  const group = state.group;
  if (!doc?.body || !group) return;

  const syncEntry = () => {
    const amountInput = doc.querySelector('#entry .amount');
    const amount = Number(amountInput?.value || 0);
    for (const header of doc.querySelectorAll('.header-title span')) {
      if (/Zurich Weekend|Dinner · CHF 128|CHF 128/.test(header.textContent || '')) {
        header.textContent = header.closest('#entry') ? group.name : header.textContent;
      }
    }
    const currency = doc.querySelector('#entry .currency');
    if (currency) currency.textContent = group.currency;
    const splitRow = doc.querySelector('#entry a[href="#split"]');
    if (splitRow) {
      const sub = splitRow.querySelector('.row-sub');
      const value = splitRow.querySelector('.row-value');
      if (sub) sub.textContent = `1 person · ${formatMoney(group.currency, amount)} each`;
      if (value) value.childNodes[0].textContent = 'You ';
    }
    const splitHeader = doc.querySelector('#split .header-title span');
    if (splitHeader) splitHeader.textContent = formatMoney(group.currency, amount);
    const splitMember = doc.querySelector('#split .member .avatar.you')?.closest('.member');
    if (splitMember) {
      const share = splitMember.querySelector('span:not(.avatar):not(.select)');
      if (share) share.textContent = formatMoney(group.currency, amount);
    }
  };

  for (const selector of ['#payer .member', '#split .member']) {
    for (const member of doc.querySelectorAll(selector)) {
      if (!member.querySelector('.avatar.you')) member.style.display = 'none';
    }
  }

  const amountInput = doc.querySelector('#entry .amount');
  if (amountInput) amountInput.addEventListener('input', syncEntry);
  syncEntry();

  const syncSuccess = () => {
    const latest = loadGuestState();
    const expense = latest.expenses.at(-1);
    if (!expense) return;
    const success = doc.querySelector('#success');
    if (!success) return;
    const header = success.querySelector('.header-title span');
    if (header) header.textContent = group.name;
    const h1 = success.querySelector('h1');
    if (h1) h1.textContent = `${expense.description} added.`;
    const p = success.querySelector('.success-wrap > p');
    if (p) p.textContent = 'Saved locally.';
    const label = success.querySelector('.receipt-top b');
    if (label) label.textContent = expense.description;
    const total = success.querySelector('.receipt-amount');
    if (total) total.textContent = formatMoney(group.currency, expense.amount);
    const share = success.querySelector('.shares b');
    if (share) share.textContent = formatMoney(group.currency, expense.amount);
  };

  doc.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');

    if (href === '#success' && anchor.closest('#entry')) {
      const amount = Number(doc.querySelector('#entry .amount')?.value || 0);
      const description = String(doc.querySelector('#entry .description')?.value || '').trim() || 'Expense';
      const latest = loadGuestState();
      saveGuestState({
        expenses: [...latest.expenses, { id: `local-expense-${latest.expenses.length + 1}`, amount, description, currency: group.currency }],
      });
      window.setTimeout(syncSuccess, 0);
    }

    if (href === '#group-updated') {
      event.preventDefault();
      openGuestHome();
    }
  });

  frame.contentWindow?.addEventListener('hashchange', syncSuccess);
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

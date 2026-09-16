import { JOURNEYS, JOURNEY_BY_SLUG, routeForJourney } from './journeys.js';
import {
  loadState, saveState, resetState, updateState, selectedGroup, selectedGroupExpenses,
  peopleForSelectedGroup, overallPosition, addActivity, injectFailure,
} from './state.js';
import { hostLabel, capabilities, requestSignature, scanQr, share } from './platform.js';

const app = document.querySelector('#app');
const reviewer = document.querySelector('#reviewer');
let state = loadState();

const money = (value, currency = 'CHF') => `${value < 0 ? '−' : ''}${currency} ${Math.abs(value).toFixed(2)}`;
const esc = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));
const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function currentSlug() {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  if (JOURNEY_BY_SLUG.has(raw)) return raw;
  return routeForJourney(state.lastJourneyId || '01');
}

function currentJourney() {
  return JOURNEY_BY_SLUG.get(currentSlug()) || JOURNEY_BY_SLUG.get('home');
}

function navigate(slug) {
  if (!JOURNEY_BY_SLUG.has(slug)) slug = 'home';
  if (window.location.hash === `#${slug}`) render();
  else window.location.hash = slug;
}

function persist(mutator) {
  state = updateState(state, mutator);
  render();
}

function card(content, cls = '') { return `<section class="card ${cls}">${content}</section>`; }
function button(label, action, cls = 'primary', attrs = '') { return `<button class="btn ${cls}" data-action="${action}" ${attrs}>${label}</button>`; }
function navButton(label, slug, cls = 'secondary') { return `<button class="btn ${cls}" data-nav="${slug}">${label}</button>`; }
function actionRow(title, sub, slug) { return `<button class="action-row" data-nav="${slug}"><div><div class="action-title">${title}</div><div class="action-sub">${sub}</div></div><span class="chev">›</span></button>`; }
function heading(eyebrow, title) { return `<div><div class="eyebrow">${eyebrow}</div><h1 class="hero">${title}</h1></div>`; }

function header() {
  const unread = state.notifications.filter((n) => !n.read).length;
  return `<header class="app-header">
    <button class="brand" data-nav="home" style="border:0;background:transparent;padding:0"><span class="mark"></span><span>ChopDot</span></button>
    <div class="header-actions">
      <button class="icon-btn" data-nav="activity" aria-label="Activity">${unread ? '●' : '○'}</button>
      <button class="avatar" data-nav="account" aria-label="Account">DP</button>
    </div>
  </header>`;
}

function footer() {
  const slug = currentSlug();
  if (slug === 'enter') return '<footer class="app-footer"></footer>';
  const active = (...slugs) => slugs.includes(slug) ? 'active' : '';
  return `<footer class="app-footer"><nav class="tabbar" aria-label="Primary">
    <button class="tab ${active('home','group','position','insights')}" data-nav="home"><span class="tab-icon">⌂</span><span>Home</span></button>
    <button class="tab ${active('people','request','receive')}" data-nav="people"><span class="tab-icon">◎</span><span>People</span></button>
    <button class="add-tab" data-nav="add-expense" aria-label="Add expense">+</button>
    <button class="tab ${active('activity','settlement-history')}" data-nav="activity"><span class="tab-icon">◴</span><span>Activity</span></button>
    <button class="tab ${active('account','payment-methods','wallet','storage','import','export')}" data-nav="account"><span class="tab-icon">◉</span><span>You</span></button>
  </nav></footer>`;
}

function renderEnter() {
  return `${heading('Private by default', 'Shared money without surrendering control.')}
    ${card(`<div class="pad stack">
      <div class="notice"><div class="h3">Try ChopDot as a guest</div><div class="caption">You can join and participate first. Linking an account later keeps the same Participant and history.</div></div>
      <div class="btn-row one">${button('Continue as guest', 'continue-guest')}</div>
      <div class="btn-row one">${button('Use existing account', 'link-account', 'secondary')}</div>
      <div class="micro">Integrated preview · deterministic local state · no real money or signatures.</div>
    </div>`)}`;
}

function renderHome() {
  const position = overallPosition(state);
  const groups = state.groups.filter((g) => !g.archived);
  const attention = state.expenses.filter((e) => e.status === 'needs-review' || e.status === 'issue');
  return `${heading('Shared money, at a glance', position.net >= 0 ? 'You’re almost square.' : 'A couple things need you.')}
    <div class="host-strip"><b>${hostLabel()}</b><span>${capabilities.signing === 'host' ? 'host signing' : 'simulated capabilities'}</span></div>
    ${card(`<div class="pad money-line"><div><div class="caption">Overall position</div><div class="amount ${position.net >= 0 ? 'positive' : 'negative'}">${money(position.net)}</div></div><div class="side">You owe <b>${money(position.youOwe)}</b><br>Owed to you <b>${money(position.owedToYou)}</b></div></div>`) }
    ${attention.length ? card(`<div class="pad"><div class="h3">${attention.length} thing${attention.length === 1 ? '' : 's'} need you</div><div class="caption">Review before settling.</div></div>${attention.map((e) => actionRow(esc(e.title), `${e.currency} ${e.amount.toFixed(2)} · ${e.status === 'issue' ? 'Issue raised' : 'Needs review'}`, 'review')).join('')}`, 'action-list') : card(`<div class="pad row"><div><div class="h3">Nothing urgent</div><div class="caption">Your groups are caught up.</div></div><span class="pill good">Clear</span></div>`) }
    <div class="section-head"><h2 class="h2">Your groups</h2><button data-nav="create-group">Start group</button></div>
    <div class="list">${groups.map((g) => `<button class="list-card" data-action="select-group" data-group-id="${g.id}" style="text-align:left"><div class="row"><div><div class="h3">${esc(g.name)}</div><div class="caption">${g.members.length} people · ${state.expenses.filter((e) => e.groupId === g.id).length} expenses</div></div><span class="chev">›</span></div></button>`).join('')}</div>`;
}

function renderCreateGroup() {
  return `${heading('Start together', 'Create a group.')}
    ${card(`<div class="pad stack"><div class="field"><label for="group-name">Group name</label><input id="group-name" value="Mountain Weekend" /></div><div class="field"><label>Base currency</label><select id="group-currency"><option>CHF</option><option>EUR</option><option>USD</option></select></div>${button('Create group', 'create-group')}</div>`)}`;
}

function renderInvite() {
  const group = selectedGroup(state);
  return `${heading(group ? group.name : 'Group', 'Bring people in clearly.')}
    ${card(`<div class="pad stack"><div class="notice"><div class="h3">Guest participation is a real participant state</div><div class="caption">Joining does not require account creation. Account linking can happen later without rewriting ownership history.</div></div><div class="field"><label for="invite-name">Person</label><input id="invite-name" value="Alice" /></div>${button('Add guest participant', 'add-guest-member')}<div class="btn-row">${navButton('Show QR', 'qr')}${navButton('Back to group', 'group')}</div></div>`)}`;
}

function renderAddExpense() {
  const group = selectedGroup(state);
  return `${heading(group?.name || 'Group', 'Add an expense.')}
    ${card(`<div class="pad stack"><div class="field"><label for="expense-title">What was it?</label><input id="expense-title" value="Fondue" /></div><div class="field"><label for="expense-amount">Amount</label><input id="expense-amount" inputmode="decimal" value="120" /></div><div class="caption">Paid by you · split equally with everyone in ${esc(group?.name || 'this group')}.</div>${button('Add expense', 'add-expense')}</div>`)}`;
}

function renderExpense() {
  const expense = selectedGroupExpenses(state)[0];
  if (!expense) return `${heading('Expense', 'Nothing here yet.')}${navButton('Add expense','add-expense','primary')}`;
  return `${heading('Expense detail', esc(expense.title))}
    ${card(`<div class="pad stack"><div class="row"><span class="caption">Amount</span><b>${money(expense.amount, expense.currency)}</b></div><div class="row"><span class="caption">Status</span><span class="pill ${expense.status === 'agreed' ? 'good' : 'warn'}">${esc(expense.status)}</span></div><div class="row"><span class="caption">Split</span><b>${expense.splitWith.length} people</b></div><div class="btn-row">${navButton('Review','review','primary')}${navButton('Group','group')}</div></div>`)}`;
}

function renderReview() {
  const expense = selectedGroupExpenses(state).find((e) => e.status !== 'agreed') || selectedGroupExpenses(state)[0];
  if (!expense) return `${heading('Review', 'Nothing needs review.')}${navButton('Group','group','primary')}`;
  return `${heading('Review together', esc(expense.title))}
    ${card(`<div class="pad stack"><div class="row"><span class="caption">Recorded amount</span><b>${money(expense.amount, expense.currency)}</b></div><div class="caption">Agree if this looks right. Raise an issue if the amount, payer or split needs correction.</div><div class="btn-row">${button('Agree', 'agree-expense')}${button('Raise issue', 'raise-issue', 'secondary')}</div>${navButton('Edit expense','expense','ghost')}</div>`)}`;
}

function renderGroup() {
  const group = selectedGroup(state);
  const expenses = selectedGroupExpenses(state);
  if (!group) return `${heading('Groups', 'No group selected.')}${navButton('Home','home','primary')}`;
  return `${heading('Group', esc(group.name))}
    ${card(`<div class="pad row"><div><div class="h3">${group.members.length} people</div><div class="caption">${expenses.length} expenses · ${group.currency}</div></div><span class="pill ${group.archived ? 'warn' : 'good'}">${group.archived ? 'Archived' : 'Active'}</span></div>`) }
    <div class="section-head"><h2 class="h2">Expenses</h2><button data-nav="add-expense">Add</button></div>
    <div class="list">${expenses.map((e) => `<button class="list-card" data-nav="${e.status === 'needs-review' || e.status === 'issue' ? 'review' : 'expense'}" style="text-align:left"><div class="row"><div><div class="h3">${esc(e.title)}</div><div class="caption">${esc(e.status)}</div></div><b>${money(e.amount,e.currency)}</b></div></button>`).join('')}</div>
    ${card(`<div class="action-list">${actionRow('People', `${group.members.length} participants`, 'people')}${actionRow('Overall position', 'See who owes what', 'position')}${actionRow('Settle up', 'Move from debt to payment', 'settle')}${actionRow('Group settings', 'Archive, leave, export', 'group-settings')}</div>`)}`;
}

function renderPeople() {
  const people = peopleForSelectedGroup(state);
  return `${heading('People', 'Everyone stays understandable.')}
    <div class="list">${people.map((p) => `<div class="list-card"><div class="row"><div><div class="h3">${esc(p.name)}</div><div class="caption">${p.id === state.participant.id ? `${state.participant.mode}${state.participant.accountLinked ? ' · account linked' : ''}` : p.role}</div></div><span class="pill ${p.status === 'active' ? 'good' : ''}">${p.status}</span></div></div>`).join('')}</div>
    <div class="btn-row">${navButton('Request money','request')}${navButton('Payment methods','payment-methods')}</div>`;
}

function renderPosition() {
  const pos = overallPosition(state);
  return `${heading('Your position', 'Know the why behind the balance.')}
    <div class="metric-grid"><div class="metric"><span>Owed to you</span><b class="positive">${money(pos.owedToYou)}</b></div><div class="metric"><span>You owe</span><b>${money(pos.youOwe)}</b></div></div>
    ${card(`<div class="pad stack"><div class="row"><span class="caption">Net</span><span class="amount ${pos.net >= 0 ? 'positive' : 'negative'}">${money(pos.net)}</span></div><div class="caption">This prototype derives the position from the same expenses and settlement records used everywhere else.</div><div class="btn-row">${navButton('Settle up','settle','primary')}${navButton('Request','request')}</div></div>`)}`;
}

function renderSettle() {
  const pos = overallPosition(state);
  const amount = Math.max(0, pos.youOwe || 54.30);
  return `${heading('Settle up', amount > 0 ? 'Pay with confidence.' : 'You’re settled.')}
    ${card(`<div class="pad stack"><div class="row"><span class="caption">To Jeanine</span><b>${money(amount)}</b></div><div class="row"><span class="caption">Method</span><b>${esc(state.paymentMethods.find((m) => m.preferred)?.label || 'Choose')}</b></div><div class="notice warn"><div class="h3">Authorization is not proof of payment</div><div class="caption">This preview keeps initiation, unknown outcome, verified completion and retry authority separate.</div></div>${amount > 0 ? `<div class="btn-row one">${button(`Settle ${money(amount)}`, 'start-settlement')}</div>` : navButton('Back to group','group','primary')}<div class="btn-row">${navButton('Payment methods','payment-methods')}${navButton('Wallet','wallet')}</div></div>`)}`;
}

function renderSettlementResult() {
  const latest = state.settlements[0];
  if (!latest) return `${heading('Settlement', 'No settlement yet.')}${navButton('Settle up','settle','primary')}`;
  const cls = latest.status === 'completed' ? 'good' : latest.status === 'unknown' ? 'warn' : '';
  return `${heading('Settlement result', latest.status === 'completed' ? 'Payment verified.' : latest.status === 'unknown' ? 'We’re checking what happened.' : 'Payment in progress.')}
    ${card(`<div class="pad stack"><div class="row"><span class="caption">Amount</span><b>${money(latest.amount)}</b></div><div class="row"><span class="caption">Status</span><span class="pill ${cls}">${latest.status}</span></div><div class="caption">Operation ${esc(latest.operationId)}</div>${latest.status === 'pending' ? `<div class="btn-row">${button('Verify success','complete-settlement')}${button('Simulate unknown','settlement-unknown','secondary')}</div>` : `<div class="btn-row">${navButton('History','settlement-history')}${navButton('Group','group')}</div>`}</div>`)}`;
}

function renderRequest() {
  return `${heading('Request money', 'Ask without awkward coordination.')}
    ${card(`<div class="pad stack"><div class="field"><label for="request-amount">Amount</label><input id="request-amount" value="32" /></div><div class="field"><label for="request-note">For</label><input id="request-note" value="Dinner share" /></div>${button('Send request', 'send-request')}</div>`)}`;
}

function renderReceive() {
  const preferred = state.paymentMethods.find((m) => m.preferred) || state.paymentMethods[0];
  return `${heading('Receive money', 'Share only what is needed.')}
    ${card(`<div class="pad stack"><div class="row"><div><div class="h3">${esc(preferred?.label || 'No method')}</div><div class="caption">${esc(preferred?.detail || '')}</div></div><span class="pill">Preferred</span></div><div class="btn-row">${button('Share details','share-details')}${navButton('Show QR','qr')}</div>${navButton('Manage methods','payment-methods','ghost')}</div>`)}`;
}

function renderHistory() {
  return `${heading('Settlement history', 'Proof without guesswork.')}
    ${state.settlements.length ? `<div class="list">${state.settlements.map((s) => `<div class="list-card"><div class="row"><div><div class="h3">${money(s.amount)}</div><div class="caption">${esc(s.operationId)}</div></div><span class="pill ${s.status === 'completed' ? 'good' : 'warn'}">${s.status}</span></div></div>`).join('')}</div>` : card('<div class="empty"><div class="empty-icon">✓</div><div class="h3">No settlement history yet</div><div class="caption">Verified settlement results will appear here.</div></div>')}`;
}

function renderSavings() {
  const group = selectedGroup(state);
  const pct = Math.min(100, Math.round((group.savingsBalance / group.savingsGoal) * 100));
  return `${heading('Savings group', 'Build something together.')}
    ${card(`<div class="pad stack"><div class="row"><div><div class="caption">Ski fund</div><div class="amount">${money(group.savingsBalance)}</div></div><div style="text-align:right"><div class="caption">Goal</div><b>${money(group.savingsGoal)}</b></div></div><div class="progress"><span style="width:${pct}%"></span></div><div class="caption">${pct}% funded</div>${navButton('Contribute or withdraw','savings-action','primary')}</div>`)}`;
}

function renderSavingsAction() {
  return `${heading('Savings', 'Contribute or withdraw transparently.')}
    ${card(`<div class="pad stack"><div class="field"><label for="savings-amount">Amount</label><input id="savings-amount" value="50" /></div><div class="btn-row">${button('Contribute','savings-contribute')}${button('Withdraw','savings-withdraw','secondary')}</div><div class="caption">The preview updates the same shared savings state used by the group.</div></div>`)}`;
}

function renderActivity() {
  return `${heading('Activity', 'See what changed.')}
    ${card(`<div class="pad timeline">${state.activity.map((a) => `<div class="timeline-item"><span class="dot"></span><div><div class="h3">${esc(a.title)}</div><div class="caption">${esc(a.detail || '')}</div></div><span class="micro">${esc(a.createdAt || '')}</span></div>`).join('')}</div>`)}`;
}

function renderInsights() {
  const expenses = selectedGroupExpenses(state);
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  return `${heading('Insights', 'Patterns, not noise.')}
    <div class="metric-grid"><div class="metric"><span>Group spend</span><b>${money(total)}</b></div><div class="metric"><span>Expenses</span><b>${expenses.length}</b></div></div>
    ${card(`<div class="pad stack"><div class="h3">Your biggest category is social</div><div class="caption">This deterministic preview derives simple insights from the same seeded expenses; it does not claim production analytics.</div>${navButton('Open group','group','primary')}</div>`)}`;
}

function renderPaymentMethods() {
  return `${heading('Payment methods', 'Choose how people can pay you.')}
    <div class="list">${state.paymentMethods.map((m) => `<div class="list-card"><div class="row"><div><div class="h3">${esc(m.label)}</div><div class="caption">${esc(m.detail)}</div></div><button class="btn ${m.preferred ? 'primary' : 'secondary'}" data-action="prefer-method" data-method-id="${m.id}">${m.preferred ? 'Preferred' : 'Use'}</button></div></div>`).join('')}</div>
    <div class="btn-row">${navButton('Receive','receive')}${navButton('Wallet','wallet')}</div>`;
}

function renderWallet() {
  return `${heading('Wallet & crypto', state.wallet.connected ? 'Wallet connected.' : 'Connect without anxiety.')}
    ${card(`<div class="pad stack"><div class="row"><div><div class="h3">Polkadot</div><div class="caption">${state.wallet.connected ? esc(state.wallet.address) : 'No wallet connected'}</div></div><span class="pill ${state.wallet.connected ? 'good' : ''}">${state.wallet.connected ? 'Connected' : 'Offline'}</span></div><div class="caption">Host mode: ${esc(hostLabel())}. Signing remains simulated unless a real Polkadot host adapter is later validated.</div>${state.wallet.connected ? navButton('Back to settlement','settle','primary') : button('Connect simulated wallet','connect-wallet')}</div>`)}`;
}

function renderQr() {
  return `${heading('QR', 'Scan, identify, join or receive.')}
    ${card(`<div class="pad stack"><div class="empty"><div class="empty-icon">▦</div><div class="h3">Typed QR transport</div><div class="caption">The QR itself does not grant payment, membership or wallet authority.</div></div><div class="btn-row">${button('Scan demo QR','scan-qr')}${navButton('Receive','receive')}</div></div>`)}`;
}

function renderImport() {
  return `${heading('Import', 'Bring history in safely.')}
    ${card(`<div class="pad stack"><div class="notice warn"><div class="h3">Review before accepting</div><div class="caption">Imported data can create records, never executable payment or wallet authority.</div></div>${button('Import demo group','import-demo')}${state.imports.length ? `<div class="caption">Imported: ${state.imports.map((x) => esc(x.name)).join(', ')}</div>` : ''}<div class="btn-row">${navButton('Export','export')}${navButton('Recovery','recovery')}</div></div>`)}`;
}

function renderExport() {
  return `${heading('Export', 'Your records should leave with you.')}
    ${card(`<div class="pad stack"><div class="row"><span class="caption">Groups</span><b>${state.groups.length}</b></div><div class="row"><span class="caption">Expenses</span><b>${state.expenses.length}</b></div><div class="row"><span class="caption">Participant ID</span><b style="font-size:10px">${esc(state.participant.id)}</b></div>${button('Download preview JSON','export-data')}${state.lastExportAt ? `<div class="caption">Last exported ${esc(state.lastExportAt)}</div>` : ''}<div class="micro">Export contains product records only. It does not export signing keys or create executable authority.</div></div>`)}`;
}

function renderStorage() {
  return `${heading('Storage & recovery', 'Know what can be restored.')}
    ${card(`<div class="pad stack"><div class="row"><span class="caption">Local preview state</span><span class="pill good">Available</span></div><div class="row"><span class="caption">Backups</span><b>${state.backups.length}</b></div>${button('Create local backup checkpoint','backup-now')}${state.backups.length ? `<div class="caption">Latest: ${esc(state.backups[0].createdAt)}</div>` : ''}<div class="btn-row">${navButton('Account','account')}${navButton('Recovery','recovery')}</div></div>`)}`;
}

function renderGroupSettings() {
  const group = selectedGroup(state);
  return `${heading('Group settings', 'Change the group without ambiguity.')}
    ${card(`<div class="action-list">${actionRow('Export group','Take records with you','export')}${actionRow('People & roles','Who belongs here','people')}</div>`) }
    ${card(`<div class="pad stack"><div class="row"><div><div class="h3">${esc(group.name)}</div><div class="caption">${group.archived ? 'Archived groups stay readable.' : 'Active group'}</div></div><span class="pill ${group.archived ? 'warn' : 'good'}">${group.archived ? 'Archived' : 'Active'}</span></div>${button(group.archived ? 'Restore group' : 'Archive group','toggle-archive',group.archived ? 'secondary' : 'danger')}</div>`)}`;
}

function renderAccount() {
  return `${heading('You', state.participant.accountLinked ? 'Same person. More capability.' : 'Participate first, link later.')}
    ${card(`<div class="pad stack"><div class="row"><div><div class="h3">${esc(state.participant.displayName)}</div><div class="caption">Participant ${esc(state.participant.id)}</div></div><span class="pill ${state.participant.accountLinked ? 'good' : ''}">${state.participant.accountLinked ? 'Account linked' : 'Guest'}</span></div><div class="notice"><div class="h3">Identity continuity</div><div class="caption">Linking an account must preserve this Participant ID and all historical ownership references.</div></div>${state.participant.accountLinked ? `<div class="caption">Linked as ${esc(state.participant.accountLabel || 'account')}</div>` : button('Link demo account','link-account')}<div class="action-list">${actionRow('Insights','Patterns across your activity','insights')}${actionRow('Payment methods','Bank and crypto destinations','payment-methods')}${actionRow('Wallet & crypto','Connection and signing boundary','wallet')}${actionRow('Import','Bring data in','import')}${actionRow('Storage & recovery','Backup and restore','storage')}</div></div>`)}`;
}

function renderRecovery() {
  const failure = state.failure;
  if (!failure) return `${heading('Recovery', 'Nothing is broken right now.')}
    ${card(`<div class="empty"><div class="empty-icon">✓</div><div class="h3">Safe state</div><div class="caption">J28 is cross-cutting. It becomes visible when a journey cannot safely claim success or failure.</div></div>`)}
    ${navButton('Back home','home','primary')}`;
  const copy = {
    'payment-unknown': ['Payment outcome unknown', 'The payment may have happened. ChopDot will not create fresh payment authority until the original operation is reconciled.'],
    'offline': ['You’re offline', 'Your local intent is preserved. No external success is invented while connectivity is missing.'],
    'stale-restore': ['Newer truth exists', 'This backup is internally valid but older than the accepted financial frontier, so it cannot overwrite current state.'],
    'identity-link': ['Account link needs reconciliation', 'The Participant remains stable while the link operation is resolved or safely stopped.'],
  }[failure.kind] || ['Something needs attention', 'ChopDot has stopped before creating a conflicting result.'];
  return `${heading('Recovery', copy[0])}
    ${card(`<div class="pad stack"><div class="notice bad"><div class="h3">No guessing</div><div class="caption">${copy[1]}</div></div><div class="row"><span class="caption">Attempt</span><b>${failure.attempt}</b></div><div class="row"><span class="caption">Return to</span><b>${esc(failure.returnRoute)}</b></div><div class="btn-row">${button('Reconcile & return','resolve-failure')}${button('Stop safely','stop-failure','secondary')}</div></div>`)}`;
}

const views = {
  enter: renderEnter, home: renderHome, 'create-group': renderCreateGroup, invite: renderInvite,
  'add-expense': renderAddExpense, expense: renderExpense, review: renderReview, group: renderGroup,
  people: renderPeople, position: renderPosition, settle: renderSettle, 'settlement-result': renderSettlementResult,
  request: renderRequest, receive: renderReceive, 'settlement-history': renderHistory, savings: renderSavings,
  'savings-action': renderSavingsAction, activity: renderActivity, insights: renderInsights,
  'payment-methods': renderPaymentMethods, wallet: renderWallet, qr: renderQr, import: renderImport,
  export: renderExport, storage: renderStorage, 'group-settings': renderGroupSettings, account: renderAccount,
  recovery: renderRecovery,
};

function renderReviewer() {
  const journey = currentJourney();
  reviewer.innerHTML = `<h2>Integrated preview</h2><p>Normal mode is one product. This panel exposes journey authority and failure injection for review only.</p>
    <div class="reviewer-section"><div class="reviewer-label">Current</div><p><b>J${journey.id}</b> · ${esc(journey.name)}</p><p>${esc(hostLabel())}</p></div>
    <div class="reviewer-section"><div class="reviewer-label">Journey jump</div><div class="journey-grid">${JOURNEYS.map((j) => `<button class="journey-jump ${j.id === journey.id ? 'active' : ''}" data-nav="${j.slug}" title="${esc(j.name)}">${j.id}</button>`).join('')}</div></div>
    <div class="reviewer-section"><div class="reviewer-label">Failure injection</div><button class="reviewer-button warn" data-action="inject-payment-unknown">Payment unknown</button><button class="reviewer-button warn" data-action="inject-offline">Offline</button><button class="reviewer-button warn" data-action="inject-stale-restore">Stale restore</button><button class="reviewer-button warn" data-action="inject-identity-link">Identity link uncertain</button></div>
    <div class="reviewer-section"><div class="reviewer-label">State</div><pre class="state-pre">${esc(JSON.stringify({ participant: state.participant, group: selectedGroup(state)?.name, expenses: state.expenses.map((e) => ({title:e.title,status:e.status})), settlements: state.settlements, failure: state.failure }, null, 2))}</pre><button class="reviewer-button" data-action="reset-demo">Reset demo</button></div>`;
}

function render() {
  const journey = currentJourney();
  if (state.lastJourneyId !== journey.id) {
    state.lastJourneyId = journey.id;
    saveState(state);
  }
  const view = views[journey.slug] || renderHome;
  app.innerHTML = `${header()}<main class="app-content" data-journey="${journey.id}">${view()}</main>${footer()}<button class="reviewer-toggle" data-action="toggle-reviewer" aria-label="Reviewer tools">⌘</button>`;
  renderReviewer();
}

async function handleAction(action, el) {
  switch (action) {
    case 'continue-guest':
      persist((s) => { s.participant.mode = 'guest'; addActivity(s, { kind:'identity', title:'Continued as guest', detail:'Participant identity created without account link' }); });
      navigate('home'); break;
    case 'link-account':
      persist((s) => { const stableId = s.participant.id; s.participant.mode = 'linked'; s.participant.accountLinked = true; s.participant.accountLabel = 'devinson@example.test'; s.participant.id = stableId; addActivity(s, { kind:'identity', title:'Account linked', detail:`Participant ${stableId} preserved` }); });
      navigate('account'); break;
    case 'create-group': {
      const name = document.querySelector('#group-name')?.value?.trim() || 'New group';
      const currency = document.querySelector('#group-currency')?.value || 'CHF';
      const id = `group-${Date.now()}`;
      persist((s) => { s.groups.push({ id, name, currency, archived:false, savingsBalance:0, savingsGoal:500, members:[{ id:s.participant.id, name:s.participant.displayName, role:'Owner', status:'active' }] }); s.selectedGroupId = id; addActivity(s,{kind:'group',title:`Created ${name}`,detail:`${currency} group`}); });
      navigate('group'); break;
    }
    case 'select-group':
      persist((s) => { s.selectedGroupId = el.dataset.groupId; }); navigate('group'); break;
    case 'add-guest-member': {
      const name = document.querySelector('#invite-name')?.value?.trim() || 'Guest';
      persist((s) => { const group = s.groups.find((g) => g.id === s.selectedGroupId); if (!group) return; const id = `participant-guest-${Date.now()}`; group.members.push({ id, name, role:'Member', status:'active' }); addActivity(s,{kind:'member',title:`${name} joined`,detail:'Guest participant'}); });
      navigate('group'); break;
    }
    case 'add-expense': {
      const title = document.querySelector('#expense-title')?.value?.trim() || 'Expense';
      const amount = Number(document.querySelector('#expense-amount')?.value || 0);
      persist((s) => { const group = s.groups.find((g) => g.id === s.selectedGroupId); if (!group || !Number.isFinite(amount) || amount <= 0) return; s.expenses.unshift({ id:`exp-${Date.now()}`, groupId:group.id, title, amount, currency:group.currency, paidBy:s.participant.id, splitWith:group.members.map((m) => m.id), status:'needs-review', createdAt:new Date().toISOString() }); addActivity(s,{kind:'expense',title:`Added ${title}`,detail:`${group.currency} ${amount.toFixed(2)} · needs review`}); });
      navigate('review'); break;
    }
    case 'agree-expense':
      persist((s) => { const e = s.expenses.find((x) => x.status === 'needs-review' || x.status === 'issue'); if (e) { e.status='agreed'; addActivity(s,{kind:'review',title:`${e.title} agreed`,detail:`${e.currency} ${e.amount.toFixed(2)}`}); } }); navigate('position'); break;
    case 'raise-issue':
      persist((s) => { const e = s.expenses.find((x) => x.status === 'needs-review') || s.expenses[0]; if (e) { e.status='issue'; addActivity(s,{kind:'review',title:`Issue raised on ${e.title}`,detail:'Waiting for group resolution'}); } }); navigate('activity'); break;
    case 'start-settlement': {
      const pos = overallPosition(state); const amount = Math.max(0, pos.youOwe || 54.30); const operationId = `settle-${Date.now()}`;
      persist((s) => { s.settlements.unshift({ id:operationId, operationId, groupId:s.selectedGroupId, direction:'out', counterparty:'Jeanine', amount, currency:'CHF', status:'pending', createdAt:new Date().toISOString() }); addActivity(s,{kind:'settlement',title:'Settlement started',detail:`${money(amount)} · verifying`}); });
      navigate('settlement-result'); break;
    }
    case 'complete-settlement':
      persist((s) => { const latest=s.settlements[0]; if (latest) { latest.status='completed'; latest.completedAt=new Date().toISOString(); addActivity(s,{kind:'settlement',title:'Settlement verified',detail:`${money(latest.amount)} · ${latest.operationId}`}); } }); navigate('settlement-result'); break;
    case 'settlement-unknown':
      persist((s) => { const latest=s.settlements[0]; if (latest) latest.status='unknown'; injectFailure(s,'payment-unknown','settlement-result'); }); navigate('recovery'); break;
    case 'send-request': {
      const amount = Number(document.querySelector('#request-amount')?.value || 0); const note = document.querySelector('#request-note')?.value?.trim() || 'Payment request';
      persist((s) => { s.requests.unshift({ id:`req-${Date.now()}`, amount, currency:'CHF', note, to:'Jeanine', status:'sent' }); addActivity(s,{kind:'request',title:`Requested ${money(amount)}`,detail:`Jeanine · ${note}`}); }); navigate('activity'); break;
    }
    case 'share-details': {
      const method = state.paymentMethods.find((m) => m.preferred) || state.paymentMethods[0]; await share({ title:'ChopDot payment details', text:`${method?.label}: ${method?.detail}` }); persist((s)=>addActivity(s,{kind:'share',title:'Payment details shared',detail:method?.label || 'Payment method'})); break;
    }
    case 'savings-contribute':
    case 'savings-withdraw': {
      const amount = Number(document.querySelector('#savings-amount')?.value || 0);
      persist((s) => { const g=s.groups.find((x)=>x.id===s.selectedGroupId); if (!g || !Number.isFinite(amount) || amount<=0) return; if(action==='savings-contribute') g.savingsBalance += amount; else g.savingsBalance=Math.max(0,g.savingsBalance-amount); addActivity(s,{kind:'savings',title:action==='savings-contribute'?'Savings contributed':'Savings withdrawn',detail:money(amount)}); }); navigate('savings'); break;
    }
    case 'prefer-method':
      persist((s) => { s.paymentMethods.forEach((m)=>m.preferred=m.id===el.dataset.methodId); }); break;
    case 'connect-wallet': {
      const signature = await requestSignature({ purpose:'connect-wallet-preview', participantId:state.participant.id });
      persist((s) => { s.wallet.connected=true; s.wallet.address='1xF4…9Kq'; s.platformEvents.unshift(signature); addActivity(s,{kind:'wallet',title:'Wallet connected',detail:`${signature.mode} capability`}); }); break;
    }
    case 'scan-qr': {
      const result = await scanQr(); persist((s)=>{s.platformEvents.unshift(result);addActivity(s,{kind:'qr',title:'QR resolved',detail:'Group invite · no authority granted yet'});}); navigate('invite'); break;
    }
    case 'import-demo':
      persist((s)=>{ if(s.imports.some((x)=>x.id==='import-flatmates')) return; s.imports.unshift({id:'import-flatmates',name:'Imported Flatmates',at:new Date().toISOString()}); s.groups.push({id:'imported-flatmates',name:'Imported Flatmates',currency:'CHF',archived:false,savingsBalance:0,savingsGoal:300,members:[{id:s.participant.id,name:s.participant.displayName,role:'Member',status:'active'}]}); addActivity(s,{kind:'import',title:'Imported Flatmates',detail:'Records imported · authority not imported'}); }); break;
    case 'export-data': {
      const payload={schemaVersion:1,exportedAt:new Date().toISOString(),participant:state.participant,groups:state.groups,expenses:state.expenses,settlements:state.settlements,requests:state.requests};
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='chopdot-preview-export.json'; a.click(); URL.revokeObjectURL(url);
      persist((s)=>{s.lastExportAt=now();addActivity(s,{kind:'export',title:'Export created',detail:'Portable preview JSON'});}); break;
    }
    case 'backup-now':
      persist((s)=>{s.backups.unshift({id:`backup-${Date.now()}`,createdAt:new Date().toLocaleString(),acceptedHead:`preview-${Date.now()}`});addActivity(s,{kind:'backup',title:'Backup checkpoint created',detail:'Local preview only'});}); break;
    case 'toggle-archive':
      persist((s)=>{const g=s.groups.find((x)=>x.id===s.selectedGroupId);if(g){g.archived=!g.archived;addActivity(s,{kind:'group',title:g.archived?`Archived ${g.name}`:`Restored ${g.name}`,detail:'Group lifecycle updated'});}}); break;
    case 'resolve-failure': {
      const returnRoute=state.failure?.returnRoute || 'home';
      persist((s)=>{if(s.settlements[0]?.status==='unknown') s.settlements[0].status='completed'; addActivity(s,{kind:'recovery',title:'Reconciliation complete',detail:'Returned to a safe current state'});s.failure=null;}); navigate(returnRoute); break;
    }
    case 'stop-failure':
      persist((s)=>{addActivity(s,{kind:'recovery',title:'Operation stopped safely',detail:'No fresh authority created'});s.failure=null;}); navigate('home'); break;
    case 'inject-payment-unknown': persist((s)=>injectFailure(s,'payment-unknown','settlement-result')); navigate('recovery'); break;
    case 'inject-offline': persist((s)=>injectFailure(s,'offline',currentSlug())); navigate('recovery'); break;
    case 'inject-stale-restore': persist((s)=>injectFailure(s,'stale-restore','storage')); navigate('recovery'); break;
    case 'inject-identity-link': persist((s)=>injectFailure(s,'identity-link','account')); navigate('recovery'); break;
    case 'toggle-reviewer': reviewer.classList.toggle('open'); break;
    case 'reset-demo': state=resetState(); navigate('enter'); render(); break;
    default: break;
  }
}

document.addEventListener('click', (event) => {
  const nav = event.target.closest('[data-nav]');
  if (nav) { event.preventDefault(); navigate(nav.dataset.nav); if (window.innerWidth <= 860) reviewer.classList.remove('open'); return; }
  const action = event.target.closest('[data-action]');
  if (action) { event.preventDefault(); handleAction(action.dataset.action, action); }
});

window.addEventListener('hashchange', render);
window.addEventListener('storage', () => { state = loadState(); render(); });
if (!window.location.hash) window.location.hash = routeForJourney(state.lastJourneyId || '01');
render();

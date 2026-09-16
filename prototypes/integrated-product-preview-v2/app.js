const frame = document.getElementById('product-frame');

const SOURCES = Object.freeze({
  j01: '../experience-workbench/journeys/01-enter-chopdot/v1-candidate.html',
  j01GuestInvite: '../experience-workbench/journeys/01-enter-chopdot/phase-c1-guest-v1-candidate.html',
  j02: '../experience-workbench/journeys/02-home-orientation/v1.4-inherited-icons.html',
});

const params = new URLSearchParams(window.location.search);
const requestedEntryMode = params.get('entry') || 'account';
const reviewerMode = params.get('review') === '1';
let activeEntryMode = requestedEntryMode;
let currentJourney = 'J01';
let monitorTimer = null;
let lastEntryState = null;
let sessionAuthority = null;
let pendingInvite = null;
let entryTrace = [];
let lastTraceFingerprint = '';

document.documentElement.dataset.reviewMode = reviewerMode ? 'true' : 'false';

const RESIDUE_KEYS = [
  'chopdot.preview-v2.last-entry',
  'chopdot.preview-v2.pending-invite',
  'chopdot.preview-v2.session',
  'chopdot.preview-v2.connected-account',
];
for (const key of RESIDUE_KEYS) {
  window.sessionStorage.removeItem(key);
  window.localStorage.removeItem(key);
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function productModeCss() {
  return `
    html,body{width:100%!important;height:100%!important;background:#f7f7f8!important}
    .lab{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;height:100dvh!important;display:block!important;padding:0!important;overflow:hidden!important}
    .labpanel{display:none!important}
    .stage{position:absolute!important;inset:0!important;display:block!important;overflow:hidden!important}
    .device{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-height:none!important;border:0!important;border-radius:0!important;box-shadow:none!important}
    ${reviewerMode ? '' : '.entry-demobadge,.entry-demohelp{display:none!important}'}
    [data-preview-staged="true"]{cursor:default!important}
  `;
}

function guestModeCss() {
  return `
    :root{color:#111113!important;background:#f7f7f8!important}
    html,body{background:#f7f7f8!important;color:#111113!important}
    body{min-height:100vh!important;background:#f7f7f8!important}
    main{max-width:none!important;min-height:100vh!important;margin:0!important;padding:calc(18px + env(safe-area-inset-top)) 16px calc(26px + env(safe-area-inset-bottom))!important;background:#f7f7f8!important}
    .brand{font-size:17px!important;letter-spacing:-.02em!important;color:#111113!important}
    .dot{display:none!important}
    .eyebrow{margin-top:58px!important;font-size:11px!important;color:#66666d!important;letter-spacing:.08em!important}
    h1{font-size:30px!important;line-height:1.05!important;color:#111113!important;margin:10px 0 10px!important}
    .lede{font-size:14px!important;line-height:1.5!important;color:#66666d!important;margin-bottom:22px!important}
    .card{border:1px solid #e6e6e9!important;background:#fff!important;border-radius:18px!important;padding:18px!important;box-shadow:0 1px 2px rgba(0,0,0,.025),0 10px 28px rgba(0,0,0,.05)!important}
    .avatar{background:#fde9f3!important;color:#e6007a!important;border-radius:14px!important}
    .meta,.small{color:#66666d!important}
    .privacy{background:#fde9f3!important;color:#7f174d!important;border:1px solid #f2cde0!important;border-radius:14px!important}
    button,a.btn{min-height:48px!important;border:1px solid #d8d8dd!important;background:#fff!important;color:#111113!important;border-radius:14px!important}
    .primary{background:#e6007a!important;color:#fff!important;border-color:#e6007a!important}
    .link{background:transparent!important;border:0!important;color:#66666d!important}
    .badge{background:#fde9f3!important;color:#7f174d!important}
    .footer{display:none!important}
  `;
}

function injectStyle(doc, id, css) {
  if (!doc?.head || doc.getElementById(id)) return;
  const style = doc.createElement('style');
  style.id = id;
  style.textContent = css;
  doc.head.appendChild(style);
}

function applyProductMode(doc) {
  if (!doc?.head) return;
  injectStyle(doc, 'chopdot-integrated-v2-mode', productModeCss());
  doc.documentElement.dataset.integratedPreview = 'golden-faithful-v2';
  doc.documentElement.dataset.reviewMode = reviewerMode ? 'true' : 'false';
}

function applyGuestProductMode(doc) {
  applyProductMode(doc);
  injectStyle(doc, 'chopdot-integrated-v2-guest-mode', guestModeCss());
  const brand = doc.querySelector('.brand');
  if (brand) brand.textContent = 'ChopDot';
  const avatar = doc.querySelector('#invite .avatar');
  if (avatar) avatar.textContent = 'GW';
  const title = doc.querySelector('#invite .title');
  if (title) title.textContent = 'Geneva Weekend';
  const meta = doc.querySelector('#invite .meta');
  if (meta) meta.textContent = 'Invited by Devinson · 3 people';
  const inviteSmall = doc.querySelector('#invite .small');
  if (inviteSmall) inviteSmall.textContent = 'Reviewing as a guest does not connect a wallet or create an account. Joining still requires an explicit choice.';
  const badge = doc.querySelector('#handoff .badge');
  if (badge) badge.textContent = 'Private invite';
  const handoffProof = doc.getElementById('handoff-proof');
  if (handoffProof) handoffProof.textContent = 'Nothing is joined yet. Your place is created only after you explicitly choose to join.';
}

function stopMonitor() {
  if (monitorTimer) window.clearInterval(monitorTimer);
  monitorTimer = null;
}

function resetEntryTrace() {
  entryTrace = [];
  lastTraceFingerprint = '';
  lastEntryState = null;
  sessionAuthority = null;
}

function observeEntryState(state) {
  if (!state?.route) return;
  const fingerprint = [state.route, state.challenge, state.request, state.verified, state.email, state.name, state.method, state.approval, state.destination, state.events?.length || 0].join('|');
  if (fingerprint === lastTraceFingerprint) return;
  lastTraceFingerprint = fingerprint;
  entryTrace.push({
    route: state.route,
    verified: Boolean(state.verified),
    method: state.method || null,
    destination: state.destination || null,
    challenge: Number(state.challenge || 0),
    request: Number(state.request || 0),
    eventCount: Array.isArray(state.events) ? state.events.length : 0,
  });
  if (entryTrace.length > 48) entryTrace.shift();
}

function routesSeenInOrder(required) {
  let cursor = 0;
  for (const item of entryTrace) {
    if (item.route === required[cursor]) cursor += 1;
    if (cursor === required.length) return true;
  }
  return false;
}

function eventTypes(state) {
  return new Set(Array.isArray(state.events) ? state.events.map((event) => event?.type).filter(Boolean) : []);
}

function createSessionAuthority(state) {
  if (!state || state.verified !== true) return null;
  if (!['home-reference', 'invite-reference'].includes(state.route)) return null;
  if (!['home', 'invite'].includes(state.destination)) return null;

  const events = eventTypes(state);
  if (!events.has('SessionVerified') || !events.has('EntryDestinationOpened')) return null;

  let participant;
  if (state.method === 'email') {
    const email = String(state.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    const requiredRoutes = state.isNew
      ? ['email', 'code', 'profile', 'ready', state.route]
      : ['email', 'code', 'ready', state.route];
    if (!routesSeenInOrder(requiredRoutes)) return null;
    if (!events.has('SignInCodeRequested') || !events.has('SignInCodeVerificationRequested')) return null;
    if (state.isNew && !events.has('DisplayNameSaved')) return null;
    const displayName = String(state.name || '').trim();
    if (!displayName) return null;
    participant = Object.freeze({
      displayName,
      email,
      authMethod: 'email',
      isNew: Boolean(state.isNew),
    });
  } else if (state.method === 'wallet') {
    const account = String(state.account || '').trim();
    if (!account) return null;
    const requiredRoutes = state.isNew
      ? ['wallet', 'approval-waiting', 'profile', 'ready', state.route]
      : ['wallet', 'approval-waiting', 'ready', state.route];
    if (!routesSeenInOrder(requiredRoutes)) return null;
    if (!events.has('SignInApprovalRequested')) return null;
    const displayName = String(state.name || '').trim();
    if (!displayName) return null;
    participant = Object.freeze({
      displayName,
      account,
      authMethod: 'wallet-sign-in',
      isNew: Boolean(state.isNew),
    });
  } else {
    return null;
  }

  return Object.freeze({
    version: 2,
    sessionId: crypto.randomUUID(),
    participant,
    destination: state.destination,
    invite: state.destination === 'invite' ? Object.freeze({ title: 'Geneva Weekend', inviter: 'Devinson', people: 3, currency: 'CHF' }) : null,
    connectedAccount: null,
    establishedBy: 'live-j01-verified-transition',
  });
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}

function stageOutboundControls(doc) {
  for (const anchor of doc.querySelectorAll('a')) {
    anchor.dataset.previewStaged = 'true';
    anchor.setAttribute('aria-disabled', 'true');
    anchor.addEventListener('click', (event) => event.preventDefault());
  }
}

function projectHome(doc, authority) {
  if (!doc || !authority?.participant) return false;
  applyProductMode(doc);
  doc.documentElement.dataset.previewParticipant = authority.participant.email || authority.participant.account || 'participant';
  doc.documentElement.dataset.connectedAccount = 'absent';

  const avatar = doc.querySelector('.avatar');
  if (avatar) avatar.textContent = initials(authority.participant.displayName);

  // Authentication never implies account/wallet connection. Gate A has no canonical connect transition.
  const wallet = doc.querySelector('.wallet');
  if (wallet) wallet.style.display = 'none';

  if (authority.participant.isNew) {
    const hero = doc.querySelector('.hero');
    if (hero) hero.textContent = `Welcome, ${authority.participant.displayName}.`;
    const attention = doc.querySelector('.attention');
    const balance = doc.querySelector('.balance');
    const sectionHead = doc.querySelector('.section-head');
    const groups = doc.querySelector('.groups');
    for (const node of [attention, balance, sectionHead, groups]) if (node) node.style.display = 'none';

    const content = doc.querySelector('.app-content');
    if (content && !doc.getElementById('preview-empty-home')) {
      const empty = doc.createElement('section');
      empty.id = 'preview-empty-home';
      empty.className = 'card';
      empty.style.padding = '18px';
      empty.innerHTML = `<div class="h2">No groups yet</div><div class="caption" style="margin-top:6px;line-height:1.5">Create or join a group and it will show up here.</div>`;
      const start = content.querySelector('.start');
      content.insertBefore(empty, start || null);
    }
  }

  stageOutboundControls(doc);
  return true;
}

function failClosedToEntry() {
  sessionAuthority = null;
  pendingInvite = null;
  activeEntryMode = requestedEntryMode === 'guest-invite' ? 'guest-invite' : (requestedEntryMode === 'invite' ? 'invite' : 'account');
  openEntry(activeEntryMode);
}

function openHome(authority = sessionAuthority) {
  if (!authority || authority !== sessionAuthority || authority.establishedBy !== 'live-j01-verified-transition') {
    failClosedToEntry();
    return false;
  }
  stopMonitor();
  currentJourney = 'J02';
  frame.src = SOURCES.j02;
  return true;
}

function watchGoldenEntry() {
  stopMonitor();
  monitorTimer = window.setInterval(() => {
    const win = frame.contentWindow;
    const demo = win?.EntryDemo;
    if (!demo?.get) return;
    const state = demo.get();
    if (!state?.route) return;
    observeEntryState(state);
    lastEntryState = clone(state);

    if (state.verified && ['home-reference', 'invite-reference'].includes(state.route)) {
      const authority = createSessionAuthority(state);
      if (!authority) {
        failClosedToEntry();
        return;
      }
      sessionAuthority = authority;
      if (state.route === 'home-reference') openHome(authority);
    }
  }, 50);
}

function openCanonicalInviteFromGuest() {
  stopMonitor();
  pendingInvite = Object.freeze({ title: 'Geneva Weekend', inviter: 'Devinson', people: 3, currency: 'CHF', provenance: 'invite' });
  activeEntryMode = 'invite';
  resetEntryTrace();
  currentJourney = 'J01';
  frame.src = `${SOURCES.j01}#invite`;
}

function watchGuestInviteSuccessor() {
  stopMonitor();
  monitorTimer = window.setInterval(() => {
    const body = frame.contentDocument?.body;
    if (!body) return;
    const state = body.dataset.state;
    if (state === 'account') {
      // The C1 successor's account stub is review-only. Continue through canonical J01 auth instead.
      openCanonicalInviteFromGuest();
      return;
    }
    if (body.dataset.outcome === 'j04-private-invite') {
      pendingInvite = Object.freeze({
        title: 'Geneva Weekend',
        inviter: 'Devinson',
        people: 3,
        currency: 'CHF',
        provenance: 'invite',
        mode: 'guest',
        participantCreated: false,
        connectedAccount: null,
        nextOwner: 'J04',
      });
      stopMonitor();
    }
  }, 50);
}

frame.addEventListener('load', () => {
  const doc = frame.contentDocument;
  const path = frame.contentWindow?.location?.pathname || '';

  if (currentJourney === 'J02' && !path.includes('/02-home-orientation/')) {
    // Browser history or direct frame navigation cannot resurrect J01 state as Home authority.
    failClosedToEntry();
    return;
  }

  if (currentJourney === 'J02') {
    if (!sessionAuthority || !projectHome(doc, sessionAuthority)) failClosedToEntry();
    return;
  }

  if (activeEntryMode === 'guest-invite') {
    applyGuestProductMode(doc);
    watchGuestInviteSuccessor();
    return;
  }

  applyProductMode(doc);
  watchGoldenEntry();
});

function openEntry(mode = activeEntryMode) {
  stopMonitor();
  currentJourney = 'J01';
  sessionAuthority = null;
  resetEntryTrace();
  activeEntryMode = mode;
  if (mode === 'guest-invite') {
    frame.src = `${SOURCES.j01GuestInvite}#invite`;
  } else if (mode === 'invite') {
    frame.src = `${SOURCES.j01}#invite`;
  } else {
    frame.src = `${SOURCES.j01}#welcome`;
  }
}

window.ChopDotPreviewV2 = Object.freeze({
  sources: SOURCES,
  getCurrentJourney: () => currentJourney,
  getLastEntryState: () => clone(lastEntryState),
  getSessionAuthority: () => clone(sessionAuthority),
  getConnectedAccount: () => clone(sessionAuthority?.connectedAccount || null),
  getPendingInvite: () => clone(pendingInvite),
  isReviewerMode: () => reviewerMode,
  openEntry: () => openEntry(activeEntryMode),
  openHome: () => openHome(sessionAuthority),
});

// Direct-J02 query/state injection is intentionally ignored: a live J01 verification must establish authority first.
openEntry(activeEntryMode);

const frame = document.getElementById('product-frame');
const frontDoor = document.getElementById('front-door');
const guestEntry = document.getElementById('guest-entry');
const createAccount = document.getElementById('create-account');
const signIn = document.getElementById('sign-in');

const SOURCES = Object.freeze({
  j01: '../experience-workbench/journeys/01-enter-chopdot/v1-candidate.html',
  j01GuestInvite: '../experience-workbench/journeys/01-enter-chopdot/phase-c1-guest-v1-candidate.html',
  j02: '../experience-workbench/journeys/02-home-orientation/v1.4-inherited-icons.html',
});

const params = new URLSearchParams(window.location.search);
const entryMode = params.get('entry');
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

function stopMonitor() {
  if (monitorTimer) window.clearInterval(monitorTimer);
  monitorTimer = null;
}

function showFrame() {
  frontDoor.hidden = true;
  frame.hidden = false;
}

function showFrontDoor() {
  stopMonitor();
  currentJourney = 'J01';
  currentFlow = 'front-door';
  homeMode = 'account';
  frame.hidden = true;
  frontDoor.hidden = false;
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
  currentFlow = mode === 'guest' ? 'guest' : 'account';
  showFrame();
  frame.src = SOURCES.j02;
}

function openGuestHome() {
  window.sessionStorage.setItem('chopdot.preview-v2.guest', JSON.stringify({
    mode: 'guest-preview',
    accountCreated: false,
    participantCreated: false,
    enteredAt: new Date().toISOString(),
  }));
  openHome(null, 'guest');
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
      openHome(state, 'account');
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

function applyGuestHomeState(doc) {
  if (!doc?.body) return;
  doc.documentElement.dataset.previewMode = 'guest';
  doc.body.dataset.previewMode = 'guest';
  const avatar = doc.querySelector('.avatar');
  if (avatar) {
    avatar.textContent = 'G';
    avatar.setAttribute('aria-label', 'Guest');
    avatar.title = 'Guest';
  }
  const notification = doc.querySelector('.notif');
  if (notification) notification.style.display = 'none';
  const wallet = doc.querySelector('.wallet');
  if (wallet) wallet.style.display = 'none';

  doc.addEventListener('click', (event) => {
    const startOwnSplit = event.target.closest('.start,.add-tab');
    if (!startOwnSplit) return;
    event.preventDefault();
    openAuth('create');
  });
}

function enterAuthFormIfNeeded(doc) {
  if (!['create', 'signin'].includes(currentFlow)) return;
  const screen = doc.querySelector('#entry-screen');
  if (screen?.dataset.state !== 'welcome') return;
  const emailAction = doc.querySelector('[data-action="EMAIL"]');
  if (emailAction) emailAction.click();
}

frame.addEventListener('load', () => {
  const doc = frame.contentDocument;
  applyProductMode(doc);

  if (currentJourney === 'J02') {
    if (homeMode === 'guest') applyGuestHomeState(doc);
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

window.ChopDotPreviewV2 = Object.freeze({
  sources: SOURCES,
  getCurrentJourney: () => currentJourney,
  getCurrentFlow: () => currentFlow,
  getHomeMode: () => homeMode,
  getLastEntryState: () => lastEntryState && JSON.parse(JSON.stringify(lastEntryState)),
  showFrontDoor,
  openGuestHome,
  openAuth,
  openInvite,
  openHome: () => openHome(lastEntryState, 'account'),
});

if (entryMode === 'invite') openInvite('account');
else if (entryMode === 'guest-invite') openInvite('guest');
else showFrontDoor();

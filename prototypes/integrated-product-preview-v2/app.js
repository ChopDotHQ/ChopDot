const frame = document.getElementById('product-frame');

const SOURCES = Object.freeze({
  j01: '../experience-workbench/journeys/01-enter-chopdot/v1-candidate.html',
  j01GuestInvite: '../experience-workbench/journeys/01-enter-chopdot/phase-c1-guest-v1-candidate.html',
  j02: '../experience-workbench/journeys/02-home-orientation/v1.4-inherited-icons.html',
});

const params = new URLSearchParams(window.location.search);
const entryMode = params.get('entry') || 'account';
let currentJourney = 'J01';
let monitorTimer = null;
let lastEntryState = null;

function productModeCss() {
  return `
    html,body{width:100%!important;height:100%!important;background:#f7f7f8!important}
    .lab{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;height:100dvh!important;display:block!important;padding:0!important;overflow:hidden!important}
    .labpanel{display:none!important}
    .stage{position:absolute!important;inset:0!important;display:block!important;overflow:hidden!important}
    .device{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-height:none!important;border:0!important;border-radius:0!important;box-shadow:none!important}
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

function recordEntryState(entryState) {
  lastEntryState = entryState ? JSON.parse(JSON.stringify(entryState)) : null;
  window.sessionStorage.setItem('chopdot.preview-v2.last-entry', JSON.stringify({
    recordedAt: new Date().toISOString(),
    state: lastEntryState,
  }));
}

function openHome(entryState = lastEntryState) {
  stopMonitor();
  if (entryState) recordEntryState(entryState);
  currentJourney = 'J02';
  frame.src = SOURCES.j02;
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
    // The approved J01 uses home-reference as its verified handoff to J02.
    // In the integrated preview that reference becomes the real approved J02 surface.
    if (state.route === 'home-reference' && state.verified) {
      openHome(state);
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
      // Gate A deliberately stops here. J04 is integrated only after its own Golden-fidelity extraction.
      stopMonitor();
    }
  }, 80);
}

frame.addEventListener('load', () => {
  const doc = frame.contentDocument;
  applyProductMode(doc);

  if (currentJourney === 'J01' && entryMode === 'guest-invite') {
    watchGuestInviteSuccessor();
    return;
  }
  if (currentJourney === 'J01') watchGoldenEntry();
});

function openEntry() {
  stopMonitor();
  currentJourney = 'J01';
  if (entryMode === 'guest-invite') {
    frame.src = `${SOURCES.j01GuestInvite}#invite`;
  } else if (entryMode === 'invite') {
    frame.src = `${SOURCES.j01}#invite`;
  } else {
    frame.src = `${SOURCES.j01}#welcome`;
  }
}

window.ChopDotPreviewV2 = Object.freeze({
  sources: SOURCES,
  getCurrentJourney: () => currentJourney,
  getLastEntryState: () => lastEntryState && JSON.parse(JSON.stringify(lastEntryState)),
  openEntry,
  openHome: () => openHome(lastEntryState),
});

openEntry();

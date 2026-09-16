const frame = document.getElementById('product-frame');

const SOURCES = Object.freeze({
  j01: '../experience-workbench/journeys/01-enter-chopdot/v1-candidate.html',
  guestInvite: './guest-invite.html',
  j02: '../experience-workbench/journeys/02-home-orientation/v1.4-inherited-icons.html',
});

const params = new URLSearchParams(window.location.search);
const entryMode = params.get('entry') || 'account';
let currentJourney = 'J01';
let currentSurface = 'j01';
let monitorTimer = null;
let lastEntryState = null;

function productModeCss() {
  return `
    html,body{width:100%!important;height:100%!important;background:#f7f7f8!important}
    .lab{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;height:100dvh!important;display:block!important;padding:0!important;overflow:hidden!important}
    .labpanel{display:none!important}
    .entry-demobadge{display:none!important}
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

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function recordEntryState(entryState) {
  lastEntryState = clone(entryState);
  window.sessionStorage.setItem('chopdot.preview-v2.last-entry', JSON.stringify({
    recordedAt: new Date().toISOString(),
    state: lastEntryState,
  }));
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'CD');
}

function setText(el, value) {
  if (el) el.textContent = value;
}

function applyHomeFixture(doc, entryState) {
  if (!doc || !entryState) return;

  const isNew = Boolean(entryState.isNew);
  const name = String(entryState.name || (isNew ? 'New member' : 'Dev'));
  const avatar = doc.querySelector('.avatar');
  setText(avatar, initials(name));

  if (!isNew) {
    doc.body.dataset.homeFixture = 'returning';
    return;
  }

  doc.body.dataset.homeFixture = 'first-use';
  const notif = doc.querySelector('.notif');
  if (notif) notif.style.display = 'none';

  setText(doc.querySelector('.hero'), 'You’re ready to start.');

  const attention = doc.querySelector('.attention');
  if (attention) {
    attention.innerHTML = `
      <div class="attention-head">
        <span class="attention-dot" style="background:#17a66b;box-shadow:0 0 0 5px rgba(23,166,107,.12)"></span>
        <div>
          <div class="attention-title">Nothing needs you yet</div>
          <div class="attention-sub">Start a group when you’re ready.</div>
        </div>
      </div>`;
  }

  const balance = doc.querySelector('.balance');
  if (balance) {
    const net = balance.querySelector('.netvalue');
    setText(net, 'CHF 0.00');
    if (net) net.style.color = 'var(--ink)';
    const side = balance.querySelector('.balance-side');
    if (side) side.innerHTML = 'You owe <b>CHF 0.00</b><br>Owed to you <b>CHF 0.00</b>';
  }

  const wallet = doc.querySelector('.wallet');
  if (wallet && entryState.method !== 'wallet') wallet.style.display = 'none';

  const seeAll = doc.querySelector('.section-head span');
  if (seeAll) seeAll.style.display = 'none';

  const groups = doc.querySelector('.groups');
  if (groups) groups.replaceChildren();

  const start = doc.querySelector('.start');
  if (start) {
    start.removeAttribute('href');
    start.setAttribute('aria-label', 'Start a group');
  }
}

function openHome(entryState = lastEntryState) {
  stopMonitor();
  if (entryState) recordEntryState(entryState);
  currentJourney = 'J02';
  currentSurface = 'j02';
  frame.src = SOURCES.j02;
}

function loadGoldenEntry(hash = 'welcome') {
  stopMonitor();
  currentJourney = 'J01';
  currentSurface = 'j01';
  frame.src = `${SOURCES.j01}#${hash}`;
}

function loadGuestInvite() {
  stopMonitor();
  currentJourney = 'J01';
  currentSurface = 'guest';
  frame.src = SOURCES.guestInvite;
}

function watchGoldenEntry() {
  stopMonitor();
  monitorTimer = window.setInterval(() => {
    const win = frame.contentWindow;
    const demo = win?.EntryDemo;
    if (!demo?.get) return;
    const state = demo.get();
    if (!state?.route) return;
    lastEntryState = clone(state);
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
    const outcome = body.dataset.outcome;
    if (!outcome) return;

    if (outcome === 'account-entry') {
      body.dataset.outcome = '';
      loadGoldenEntry('invite');
      return;
    }

    if (outcome === 'cancel') {
      body.dataset.outcome = '';
      loadGoldenEntry('welcome');
      return;
    }

    if (outcome === 'j04-private-invite') {
      window.sessionStorage.setItem('chopdot.preview-v2.pending-invite', JSON.stringify({
        provenance: 'invite',
        group: 'Geneva Weekend',
        inviter: 'Devinson',
        people: 3,
        currency: 'CHF',
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

  if (currentSurface === 'j02') {
    applyHomeFixture(doc, lastEntryState);
    return;
  }
  if (currentSurface === 'guest') {
    watchGuestInviteSuccessor();
    return;
  }
  if (currentSurface === 'j01') watchGoldenEntry();
});

function openEntry() {
  if (entryMode === 'guest-invite') {
    loadGuestInvite();
  } else if (entryMode === 'invite') {
    loadGoldenEntry('invite');
  } else {
    loadGoldenEntry('welcome');
  }
}

window.ChopDotPreviewV2 = Object.freeze({
  sources: SOURCES,
  getCurrentJourney: () => currentJourney,
  getCurrentSurface: () => currentSurface,
  getLastEntryState: () => clone(lastEntryState),
  openEntry,
  openHome: () => openHome(lastEntryState),
});

openEntry();

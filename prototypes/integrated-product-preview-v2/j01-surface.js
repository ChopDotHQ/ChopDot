// Integration-only presentation. The sealed J01 model owns verification evidence.
export function installEntrySurface(doc, { resumed = false, onExit, onMethod }) {
  const screen = doc.getElementById('entry-screen');
  if (!screen) return;
  const text = (selector, value) => {
    const node = screen.querySelector(selector);
    if (node && node.textContent !== value) node.textContent = value;
  };
  function decorate() {
    const route = screen.dataset.state;
    if (route === 'welcome' && screen.dataset.destination !== 'invite') { onExit(); return; }
    if (['email', 'wallet'].includes(route)) onMethod(route);
    if (route === 'email') text('#email-help', 'Prototype only. No email is sent. Use an example email.');
    if (route === 'code') {
      text('.header-title b', 'Email sign-in');
      const email = doc.defaultView.EntryDemo?.get()?.email || '';
      text('.entry-lead', `Prototype code for ${email}.`);
      if (screen.querySelector('.entry-notice')?.textContent === 'New code sent. Use the latest one.') text('.entry-notice', 'New prototype code ready. Use 123456.');
    }
    if (route === 'wallet') {
      text('.entry-heading', 'Choose a demo account.');
      text('.entry-lead', 'Prototype sign-in only. No wallet connects or signs.');
      text('.entry-quiet', 'Choose an account to try a simulated approval.');
    }
    if (['approval-waiting', 'approval-unknown'].includes(route)) {
      text('.entry-heading', route === 'approval-waiting' ? 'Try a wallet result.' : 'Result still unknown.');
      text('.entry-lead', 'No wallet approval is requested. Choose a simulated result below.');
    }
    if (route === 'ready') text('.header-title b', 'Prototype sign-in');
    const main = screen.querySelector('.app-content');
    if (!main || main.querySelector('.entry-prototype-note')) return;
    const message = route === 'code' ? 'Prototype only. Enter 123456 to continue. No email was sent.'
      : route === 'ready' ? 'Simulated sign-in. No real account was created.'
      : resumed && ['email', 'wallet', 'invite'].includes(route) ? 'Sign-in restarted. Request a fresh code or approval. Your saved work and incoming destination stay.' : '';
    if (message) {
      const note = doc.createElement('p');
      note.className = 'entry-quiet entry-prototype-note';
      note.setAttribute('role', 'status'); note.textContent = message;
      const form = main.querySelector('form');
      if (form) form.before(note); else main.append(note);
    }
    if (['approval-waiting', 'approval-unknown'].includes(route) && !main.querySelector('.entry-prototype-results')) {
      const results = doc.createElement('div'); results.className = 'entry-prototype-results';
      results.setAttribute('role', 'group'); results.setAttribute('aria-label', 'Simulated wallet results');
      for (const [value, label] of [['approved', 'Simulate verified approval'], ['declined', 'Simulate declined approval'], ['unknown', 'Simulate unknown result']]) {
        const button = doc.createElement('button'); button.type = 'button';
        button.className = 'entry-testbtn'; button.dataset.demoResult = value; button.textContent = label;
        results.append(button);
      }
      main.append(results);
    }
  }
  doc.addEventListener('click', event => {
    const button = event.target.closest('[data-action="GO"][data-route="welcome"], [data-action="START_OVER"]');
    if (!button || screen.dataset.destination === 'invite') return;
    event.preventDefault(); event.stopImmediatePropagation(); onExit();
  }, true);
  const observer = new doc.defaultView.MutationObserver(decorate);
  observer.observe(screen, { childList: true, subtree: true });
  decorate();
  doc.defaultView.addEventListener('pagehide', () => observer.disconnect(), { once: true });
}

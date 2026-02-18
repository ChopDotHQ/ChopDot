/// <reference types="cypress" />

const AUTH_USER_KEY = 'chopdot_user';
const AUTH_TOKEN_KEY = 'chopdot_auth_token';

function seedGuestSession(win: Window) {
  const guestUser = {
    id: `guest_e2e_${Date.now()}`,
    authMethod: 'guest',
    name: 'Guest User',
    createdAt: new Date().toISOString(),
    isGuest: true,
  };

  const payload = JSON.stringify(guestUser);
  win.localStorage.setItem(AUTH_USER_KEY, payload);
  win.localStorage.setItem(AUTH_TOKEN_KEY, 'guest_session');
  win.sessionStorage.setItem(AUTH_USER_KEY, payload);
  win.sessionStorage.setItem(AUTH_TOKEN_KEY, 'guest_session');
}

function inAppShell($body: JQuery<HTMLElement>) {
  return /\b(Pots|People|Activity|You)\b/i.test($body.text());
}

function clickGuestIfPresent($body: JQuery<HTMLElement>) {
  const guestButton = $body
    .find('button:visible')
    .toArray()
    .find((el) => /continue as guest/i.test((el.textContent || '').trim()));

  if (!guestButton) return false;

  cy.wrap(guestButton)
    .should('be.visible')
    .and('not.be.disabled')
    .click({ force: true });
  return true;
}

function completeGuestLoginFlow() {
  cy.get('body', { timeout: 30000 }).then(($body) => {
    if (inAppShell($body)) return;
    clickGuestIfPresent($body);
  });

  // Re-check once after initial render settles.
  cy.get('body', { timeout: 30000 }).then(($body) => {
    if (inAppShell($body)) return;
    clickGuestIfPresent($body);
  });

  // Retry from clean state if still not authenticated/app shell.
  cy.get('body', { timeout: 30000 }).then(($body) => {
    if (inAppShell($body)) return;
    cy.clearCookies();
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.sessionStorage.clear();
        seedGuestSession(win);
      },
    });
    cy.get('body', { timeout: 30000 }).then(($retryBody) => {
      if (inAppShell($retryBody)) return;
      clickGuestIfPresent($retryBody);
    });
  });

  cy.get('body', { timeout: 30000 }).should(($body) => {
    expect(inAppShell($body)).to.eq(true);
  });
}

Cypress.Commands.add('resetAppState', () => {
  cy.clearCookies();
  cy.clearAllLocalStorage();
  cy.clearAllSessionStorage();
});

Cypress.Commands.add('ensureGuestSession', () => {
  cy.visit('/', {
    onBeforeLoad(win) {
      win.localStorage.clear();
      win.sessionStorage.clear();
      seedGuestSession(win);
    },
  });

  completeGuestLoginFlow();
});

Cypress.Commands.add('loginAsGuest', () => {
  cy.resetAppState();
  cy.ensureGuestSession();
});

declare global {
  namespace Cypress {
    interface Chainable {
      resetAppState(): Chainable<void>;
      ensureGuestSession(): Chainable<void>;
      loginAsGuest(): Chainable<void>;
    }
  }
}

export {};

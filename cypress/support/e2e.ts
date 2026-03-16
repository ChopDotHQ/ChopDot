/// <reference types="cypress" />

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
    },
  });

  cy.get('body', { timeout: 30000 }).then(($body) => {
    const bodyText = $body.text();
    const isAuthenticatedShell =
      /totals across all pots/i.test(bodyText) ||
      /your pots/i.test(bodyText) ||
      /connect wallet/i.test(bodyText) ||
      /create/i.test(bodyText) ||
      /^Pots$|^People$|^Activity$|^You$/m.test(bodyText);

    if (isAuthenticatedShell) {
      return;
    }

    if (bodyText.match(/continue as guest/i)) {
      cy.contains(/continue as guest/i, { timeout: 30000 }).click({ force: true });
      return;
    }
  });

  cy.get('body', { timeout: 30000 }).should(($body) => {
    const text = $body.text();
    expect(
      /totals across all pots/i.test(text) ||
      /your pots/i.test(text) ||
      /connect wallet/i.test(text) ||
      /^Pots$|^People$|^Activity$|^You$/m.test(text),
    ).to.equal(true);
  });
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

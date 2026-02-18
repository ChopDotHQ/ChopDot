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
    if (bodyText.match(/^Pots$|^People$|^Activity$|^You$/m)) {
      return;
    }

    if (bodyText.match(/continue as guest/i)) {
      cy.contains(/continue as guest/i, { timeout: 30000 }).click({ force: true });
      return;
    }

    // Retry once from a clean state if the initial render is transient.
    cy.clearCookies();
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.sessionStorage.clear();
      },
    });
    cy.contains(/continue as guest/i, { timeout: 30000 }).click({ force: true });
  });

  cy.contains(/^Pots$|^People$|^Activity$|^You$/i, { timeout: 30000 }).should('be.visible');
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

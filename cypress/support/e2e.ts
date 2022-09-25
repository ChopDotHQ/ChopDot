/// <reference types="cypress" />

Cypress.Commands.add('loginAsGuest', () => {
  cy.visit('/');
  cy.contains(/continue as guest/i, { timeout: 20000 }).click({ force: true });
  cy.contains(/^Pots$/i, { timeout: 30000 }).should('be.visible');
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginAsGuest(): Chainable<void>;
    }
  }
}

export {};

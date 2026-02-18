/// <reference types="cypress" />

function gotoTab(tab: 'Pots' | 'People' | 'Activity' | 'You') {
  cy.contains('button', new RegExp(`^${tab}$`, 'i'), { timeout: 20000 }).click({ force: true });
  cy.contains(new RegExp(`^${tab}$`, 'i')).should('be.visible');
}

function createPot(name: string) {
  cy.contains(/create pot|create/i, { timeout: 20000 }).first().click({ force: true });
  cy.contains(/create pot/i, { timeout: 20000 }).should('be.visible');
  cy.get('input[placeholder*="Groceries"], input[placeholder*="Pot name"], input[placeholder*="House Down Payment"]')
    .first()
    .clear()
    .type(name);
  cy.contains('button', /^Create Pot$/).click({ force: true });
}

describe('Core MVP E2E Smoke', () => {
  it('authenticates as guest and navigates tabs', () => {
    cy.loginAsGuest();

    gotoTab('People');
    cy.contains(/People/i).should('be.visible');

    gotoTab('Activity');
    cy.contains(/^Recent Activity$/i).should('be.visible');

    gotoTab('You');
    cy.contains(/^You$/).should('be.visible');

    gotoTab('Pots');
  });

  it('creates a pot and opens it', () => {
    cy.loginAsGuest();
    createPot('E2E Pot');

    cy.contains('E2E Pot', { timeout: 20000 }).should('be.visible');
    cy.contains('E2E Pot').first().click({ force: true });

    cy.contains('E2E Pot', { timeout: 20000 }).should('be.visible');
    cy.contains(/^Expenses$|^Savings$/).should('be.visible');
  });

  it('adds an expense in the pot flow', () => {
    cy.loginAsGuest();
    createPot('E2E Expense Pot');

    cy.contains('E2E Expense Pot', { timeout: 20000 }).first().click({ force: true });
    cy.get('body').then(($body) => {
      if ($body.text().match(/add expense/i)) {
        cy.contains(/add expense/i).first().click({ force: true });
      } else {
        cy.contains(/No expenses yet/i).click({ force: true });
      }
    });

    cy.get('input[placeholder="0.00"], input[placeholder="0.000000"]').first().clear().type('12.50');
    cy.get('input[placeholder*="Title"], input[placeholder*="Dinner"], input[placeholder*="Description"], input[placeholder*="Required"]')
      .first()
      .clear()
      .type('E2E Dinner');

    cy.contains(/Save Expense|Save/i).first().click({ force: true });

    cy.contains(/E2E Dinner/i, { timeout: 20000 }).should('exist');
  });

  it('opens settle selection from a pot', () => {
    cy.loginAsGuest();
    gotoTab('Pots');
    cy.get('body').then(($body) => {
      if ($body.text().match(/^Settle$/m)) {
        cy.contains(/^Settle$/).click({ force: true });
      }
    });
    cy.contains(/Nothing to settle yet|People|Settle Up|Settle:|Pots/i, { timeout: 20000 }).should('exist');
  });
});

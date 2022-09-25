/// <reference types="cypress" />

describe('Core MVP E2E Smoke', () => {
  it('authenticates as guest and navigates tabs', () => {
    cy.loginAsGuest();

    cy.contains(/^People$/).click();
    cy.contains(/^People$/).should('be.visible');

    cy.contains(/^Activity$/).click();
    cy.contains(/^Recent Activity$/i).should('be.visible');

    cy.contains(/^You$/).click();
    cy.contains(/^You$/).should('be.visible');

    cy.contains(/^Pots$/).click();
    cy.contains(/^Pots$/).should('be.visible');
  });

  it('creates a pot and opens it', () => {
    cy.loginAsGuest();

    cy.contains(/create pot/i).first().click({ force: true });
    cy.contains(/create pot/i).should('be.visible');

    cy.get('input[placeholder*="Groceries"], input[placeholder*="Pot name"], input[placeholder*="House Down Payment"]')
      .first()
      .clear()
      .type('E2E Pot');

    cy.contains(/^Create Pot$/).last().click({ force: true });

    cy.contains('E2E Pot', { timeout: 20000 }).should('be.visible');
    cy.contains('E2E Pot').first().click({ force: true });

    cy.contains('E2E Pot', { timeout: 20000 }).should('be.visible');
    cy.contains(/^Expenses$|^Savings$/).should('be.visible');
  });

  it('adds an expense in the pot flow', () => {
    cy.loginAsGuest();

    cy.contains(/create pot/i).first().click({ force: true });
    cy.get('input[placeholder*="Groceries"], input[placeholder*="Pot name"], input[placeholder*="House Down Payment"]')
      .first()
      .clear()
      .type('E2E Expense Pot');
    cy.contains(/^Create Pot$/).last().click({ force: true });

    cy.contains('E2E Expense Pot', { timeout: 20000 }).first().click({ force: true });
    cy.contains(/^Add Expense$/).click({ force: true });

    cy.get('input[placeholder="0.00"], input[placeholder="0.000000"]').first().clear().type('12.50');
    cy.get('input[placeholder*="Dinner"], input[placeholder*="Description"]').first().clear().type('E2E Dinner');

    cy.contains(/^Save Expense$/).click({ force: true });

    cy.contains(/E2E Dinner/i, { timeout: 20000 }).should('be.visible');
  });

  it('opens settle selection from a pot', () => {
    cy.loginAsGuest();

    cy.contains(/create pot/i).first().click({ force: true });
    cy.get('input[placeholder*="Groceries"], input[placeholder*="Pot name"], input[placeholder*="House Down Payment"]')
      .first()
      .clear()
      .type('E2E Settle Pot');
    cy.contains(/^Create Pot$/).last().click({ force: true });

    cy.contains('E2E Settle Pot', { timeout: 20000 }).first().click({ force: true });

    cy.contains(/^Settle Up$/).click({ force: true });
    cy.contains(/Settle Up|Settle:/i, { timeout: 20000 }).should('be.visible');
  });
});

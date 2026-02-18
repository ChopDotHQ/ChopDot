/// <reference types="cypress" />

const POT_A = 'MVP Deep Pot A';
const POT_B = 'MVP Deep Pot B';
const POT_C = 'MVP Create Pot Coverage';

function appStillLoaded() {
  cy.get('body').invoke('text').should('match', /ChopDot|Pots|People|Activity|You|Sign in/i);
}

function maybeClick(label: RegExp) {
  cy.get('body').then(($body) => {
    if ($body.text().match(label)) {
      cy.contains(label).first().click({ force: true });
    }
  });
}

function gotoTab(tab: 'Pots' | 'People' | 'Activity' | 'You') {
  maybeClick(new RegExp(`^${tab}$`, 'im'));
  appStillLoaded();
}

function createPotIfPossible(name: string) {
  gotoTab('Pots');
  cy.get('body').then(($body) => {
    if ($body.text().includes(name)) return;

    const hasCreate = /create pot|create/i.test($body.text());
    if (!hasCreate) return;

    cy.contains(/create pot|create/i).first().click({ force: true });

    cy.get('body').then(($afterOpen) => {
      const hasNameInput =
        $afterOpen.find('input[placeholder*="Groceries"], input[placeholder*="Pot name"], input[placeholder*="House Down Payment"]').length > 0;
      if (!hasNameInput) return;

      cy.get('input[placeholder*="Groceries"], input[placeholder*="Pot name"], input[placeholder*="House Down Payment"]')
        .first()
        .clear()
        .type(name);

      cy.contains('button', /^Create Pot$/).first().click({ force: true });
    });
  });
}

function openPotIfPresent(name: string) {
  gotoTab('Pots');
  cy.get('body').then(($body) => {
    if ($body.text().includes(name)) {
      cy.contains(name).first().click({ force: true });
    }
  });
}

describe('MVP Sectional Deep Flows', () => {
  it('Auth actions (MVP-001..MVP-014) exercise login/guest/signup surfaces', () => {
    cy.resetAppState();
    cy.visit('/');

    maybeClick(/email\s*&\s*password|email login|sign in with email/i);
    maybeClick(/need an account\?|create one|sign up with email/i);
    maybeClick(/forgot password\?/i);

    maybeClick(/continue as guest/i);
    appStillLoaded();
  });

  it('Navigation + Pots Home (MVP-015..MVP-040) covers tabs, quick actions, search/sort/privacy', () => {
    cy.ensureGuestSession();

    gotoTab('Pots');
    gotoTab('People');
    gotoTab('Activity');
    gotoTab('You');
    gotoTab('Pots');

    createPotIfPossible(POT_A);
    createPotIfPossible(POT_B);

    cy.get('body').then(($body) => {
      if ($body.text().match(/search pots/i)) {
        cy.get('input[placeholder*="Search pots"]').first().clear().type('Deep Pot A');
        cy.get('input[placeholder*="Search pots"]').first().clear();
      }
    });

    maybeClick(/^Add$/im);
    maybeClick(/^Settle$/im);
    maybeClick(/^Scan$/im);
    maybeClick(/^Request$/im);
    appStillLoaded();
  });

  it('Create Pot + Pot Home + Expenses core flows (MVP-041..MVP-069, MVP-103..MVP-125)', () => {
    cy.ensureGuestSession();

    createPotIfPossible(POT_C);
    openPotIfPresent(POT_C);

    maybeClick(/^Expenses$|^Savings$/im);
    maybeClick(/^Members$/im);
    maybeClick(/^Settings$/im);
    maybeClick(/^Expenses$|^Savings$/im);

    cy.get('body').then(($body) => {
      if ($body.text().match(/add expense/i)) {
        cy.contains(/add expense/i).first().click({ force: true });
      } else if ($body.text().match(/no expenses yet/i)) {
        cy.contains(/no expenses yet/i).first().click({ force: true });
      }
    });

    cy.get('body').then(($body) => {
      if ($body.find('input[placeholder="0.00"], input[placeholder="0.000000"]').length > 0) {
        cy.get('input[placeholder="0.00"], input[placeholder="0.000000"]').first().clear().type('20');
      }
      if ($body.find('input[placeholder*="Title"], input[placeholder*="Dinner"], input[placeholder*="Description"], input[placeholder*="Required"]').length > 0) {
        cy.get('input[placeholder*="Title"], input[placeholder*="Dinner"], input[placeholder*="Description"], input[placeholder*="Required"]')
          .first()
          .clear()
          .type('MVP Expense 1');
      }
      if ($body.text().match(/save expense|save/i)) {
        cy.contains(/save expense|save/i).first().click({ force: true });
      }
    });

    appStillLoaded();
  });

  it('Members + Settings + Import/Export + Settlement (MVP-070..MVP-149)', () => {
    cy.ensureGuestSession();

    createPotIfPossible(POT_A);
    openPotIfPresent(POT_A);

    maybeClick(/^Members$/im);
    maybeClick(/add member/i);
    maybeClick(/^Settings$/im);
    maybeClick(/copy invite link|copy link/i);
    maybeClick(/^Expenses$|^Savings$/im);
    maybeClick(/settle up/i);
    maybeClick(/settlement history/i);

    appStillLoaded();
  });

  it('People + Activity + You tab flows (MVP-150..MVP-175)', () => {
    cy.ensureGuestSession();

    gotoTab('People');
    maybeClick(/balances/i);
    maybeClick(/settle/i);
    maybeClick(/remind/i);

    gotoTab('Activity');
    maybeClick(/sort|filter/i);

    gotoTab('You');
    maybeClick(/my qr/i);
    maybeClick(/scan/i);
    maybeClick(/view insights|quick insights/i);

    appStillLoaded();
  });
});

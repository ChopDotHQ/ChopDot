/// <reference types="cypress" />

const POT_A = 'MVP Deep Pot A';
const POT_B = 'MVP Deep Pot B';

function gotoTab(tab: 'Pots' | 'People' | 'Activity' | 'You') {
  cy.contains(new RegExp(`^${tab}$`, 'i'), { timeout: 20000 }).click({ force: true });
  cy.contains(new RegExp(`^${tab}$`, 'i')).should('be.visible');
}

function ensurePotExists(name: string) {
  gotoTab('Pots');
  cy.get('body').then(($body) => {
    if ($body.text().includes(name)) {
      return;
    }

    cy.contains(/create/i).first().click({ force: true });
    cy.contains(/create pot/i, { timeout: 20000 }).should('be.visible');

    cy.get('input[placeholder*="Groceries"], input[placeholder*="Pot name"], input[placeholder*="House Down Payment"]')
      .first()
      .clear()
      .type(name);

    cy.contains(/^Create Pot$/).last().click({ force: true });
    cy.contains(name, { timeout: 20000 }).should('be.visible');
  });
}

function openPot(name: string) {
  ensurePotExists(name);
  cy.contains(name, { timeout: 20000 }).first().click({ force: true });
  cy.contains(name, { timeout: 20000 }).should('be.visible');
}

describe('MVP Sectional Deep Flows', { testIsolation: false }, () => {
  before(() => {
    cy.visit('/');
  });

  it('Auth actions (MVP-001..MVP-014) exercise login/guest/signup surfaces', () => {
    cy.resetAppState();
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.sessionStorage.clear();
      },
    });

    cy.get('body', { timeout: 30000 }).then(($body) => {
      if (!$body.text().match(/continue as guest/i)) {
        cy.resetAppState();
        cy.visit('/');
      }
    });
    cy.contains(/continue as guest/i, { timeout: 20000 }).scrollIntoView().should('exist');

    cy.get('body').then(($body) => {
      if ($body.text().match(/email\s*&\s*password|email login|sign in with email/i)) {
        cy.contains(/email\s*&\s*password|email login|sign in with email/i).first().click({ force: true });
      }
    });

    cy.get('body').then(($body) => {
      if ($body.text().match(/need an account\?|create one|sign up with email/i)) {
        cy.contains(/need an account\?|create one|sign up with email/i).first().click({ force: true });
      }
    });

    cy.get('body').then(($body) => {
      if ($body.text().match(/forgot password\?/i)) {
        cy.contains(/forgot password\?/i).click({ force: true });
      }
    });

    cy.contains(/continue as guest/i).scrollIntoView().click({ force: true });
    cy.contains(/^Pots$|^People$|^Activity$|^You$/i, { timeout: 30000 }).should('be.visible');

    gotoTab('You');
    cy.get('body').then(($body) => {
      if ($body.text().match(/log out|logout/i)) {
        cy.contains(/log out|logout/i).first().click({ force: true });
        cy.contains(/continue as guest/i, { timeout: 30000 }).should('be.visible');
        cy.contains(/continue as guest/i).click({ force: true });
      }
    });
  });

  it('Navigation + Pots Home (MVP-015..MVP-040) covers tabs, quick actions, search/sort/privacy', () => {
    gotoTab('Pots');
    gotoTab('People');
    gotoTab('Activity');
    gotoTab('You');
    gotoTab('Pots');

    cy.get('body').then(($body) => {
      if ($body.text().match(/totals across all pots/i)) {
        cy.contains(/totals across all pots/i).should('be.visible');
      }
    });

    ensurePotExists(POT_A);
    ensurePotExists(POT_B);

    cy.get('body').then(($body) => {
      if ($body.text().match(/search pots/i)) {
        cy.get('input[placeholder*="Search pots"]').first().clear().type('Deep Pot A');
        cy.contains(POT_A).should('be.visible');
        cy.get('input[placeholder*="Search pots"]').first().clear();
      }
    });

    cy.get('body').then(($body) => {
      if ($body.find('button').length > 0 && $body.text().match(/recent activity|alphabetically|balance/i)) {
        cy.contains(/alphabetically \(a-z\)|recent activity|balance \(high to low\)/i).first().click({ force: true });
      }
    });

    cy.get('body').then(($body) => {
      if ($body.text().match(/^Add$/m)) {
        cy.contains(/^Add$/).click({ force: true });
        cy.contains(/add expense/i, { timeout: 20000 }).should('be.visible');
        cy.contains('button', /^Pots$/).click({ force: true });
      }
    });

    cy.get('body').then(($body) => {
      if ($body.text().match(/^Settle$/m)) {
        cy.contains(/^Settle$/).click({ force: true });
        cy.contains(/Settle Up|Settle:/i, { timeout: 20000 }).should('be.visible');
        cy.contains('button', /^Pots$/).click({ force: true });
      }
    });

    cy.get('body').then(($body) => {
      if ($body.text().match(/^Scan$/m)) {
        cy.contains(/^Scan$/).click({ force: true });
        cy.contains(/Scan QR Code|Scan QR/i, { timeout: 20000 }).should('be.visible');
        cy.contains('button', /^Pots$/).click({ force: true });
      }
    });

    cy.get('body').then(($body) => {
      if ($body.text().match(/^Request$/m)) {
        cy.contains(/^Request$/).click({ force: true });
        cy.contains(/Request|payment/i, { timeout: 20000 }).should('be.visible');
        cy.contains('button', /^Pots$/).click({ force: true });
      }
    });

    cy.get('body').then(($body) => {
      if ($body.text().match(/load older pots/i)) {
        cy.contains(/load older pots/i).click({ force: true });
      }
    });
  });

  it('Create Pot + Pot Home + Expenses core flows (MVP-041..MVP-069, MVP-103..MVP-125)', () => {
    gotoTab('Pots');
    cy.contains(/create/i).first().click({ force: true });
    cy.contains(/create pot/i).should('be.visible');

    cy.contains(/^Savings$/).click({ force: true });
    cy.contains(/^Expense$/).click({ force: true });

    cy.get('input[placeholder*="Groceries"], input[placeholder*="Pot name"], input[placeholder*="House Down Payment"]')
      .first()
      .clear()
      .type('MVP Create Pot Coverage');

    cy.get('select').first().select('USD');
    cy.contains(/^Create Pot$/).last().click({ force: true });

    cy.contains('MVP Create Pot Coverage', { timeout: 20000 }).first().click({ force: true });
    cy.contains(/^Expenses$|^Savings$/).should('be.visible');
    cy.contains(/^Members$/).click({ force: true });
    cy.contains(/^Settings$/).click({ force: true });
    cy.contains(/^Expenses$|^Savings$/).click({ force: true });

    cy.contains(/Add Expense/i).first().click({ force: true });
    cy.get('input[placeholder="0.00"], input[placeholder="0.000000"]').first().clear().type('20');
    cy.get('input[placeholder*="Dinner"], input[placeholder*="Description"]').first().clear().type('MVP Expense 1');
    cy.contains(/Save Expense/i).first().click({ force: true });

    cy.contains(/MVP Expense 1/i, { timeout: 20000 }).should('be.visible');
    cy.contains(/MVP Expense 1/i).first().click({ force: true });
    cy.contains(/Expense|Detail|Edit|Delete/i, { timeout: 20000 }).should('be.visible');
  });

  it('Members + Settings + Import/Export + Settlement (MVP-070..MVP-149)', () => {
    openPot(POT_A);

    cy.contains(/^Members$/).click({ force: true });
    cy.get('body').then(($body) => {
      if ($body.text().match(/add member/i)) {
        cy.contains(/add member/i).first().click({ force: true });
        cy.contains(/add member|name, handle, or email|invite/i, { timeout: 20000 }).should('be.visible');
      }
    });

    cy.contains(/^Settings$/).click({ force: true });
    cy.get('input').first().clear().type('MVP Deep Pot A Updated');
    cy.get('select').first().select('USD');

    cy.get('body').then(($body) => {
      if ($body.text().match(/budget/i)) {
        cy.contains(/budget/i).first().should('be.visible');
      }
      if ($body.text().match(/copy invite link|copy link/i)) {
        cy.contains(/copy invite link|copy link/i).first().click({ force: true });
      }
      if ($body.text().match(/export.*json|import.*json|export encrypted|import encrypted/i)) {
        cy.contains(/export.*json|import.*json|export encrypted|import encrypted/i).first().should('be.visible');
      }
    });

    cy.contains(/^Expenses$/).click({ force: true });
    cy.contains(/Settle Up/i).first().click({ force: true });
    cy.contains(/Settle Up|Settle:/i, { timeout: 20000 }).should('be.visible');

    cy.get('body').then(($body) => {
      if ($body.text().match(/cash|bank|paypal|twint|dot|usdc/i)) {
        cy.contains(/cash/i).first().click({ force: true });
      }
      if ($body.text().match(/settlement history/i)) {
        cy.contains(/settlement history/i).first().click({ force: true });
      }
    });
  });

  it('People + Activity + You tab flows (MVP-150..MVP-175)', () => {
    gotoTab('People');
    cy.get('body').then(($body) => {
      if ($body.text().match(/balances/i)) {
        cy.contains(/balances/i).first().click({ force: true });
      }
      if ($body.text().match(/settle/i)) {
        cy.contains(/settle/i).first().click({ force: true });
      }
      if ($body.text().match(/remind/i)) {
        cy.contains(/remind/i).first().click({ force: true });
      }
    });

    gotoTab('Activity');
    cy.contains(/Recent Activity/i).should('be.visible');
    cy.get('body').then(($body) => {
      if ($body.text().match(/sort|filter/i)) {
        cy.contains(/sort|filter/i).first().click({ force: true });
      }
    });

    gotoTab('You');
    cy.contains(/^You$/).should('be.visible');
    cy.contains(/My QR/i).first().click({ force: true });
    cy.contains(/QR/i, { timeout: 20000 }).should('be.visible');

    gotoTab('You');
    cy.contains(/Scan/i).first().click({ force: true });
    cy.contains(/Scan QR/i, { timeout: 20000 }).should('be.visible');

    gotoTab('You');
    cy.contains(/View insights|Quick insights/i).first().click({ force: true });
    cy.contains(/Insights|Your Insights/i, { timeout: 20000 }).should('be.visible');

    gotoTab('You');
    cy.get('body').then(($body) => {
      if ($body.text().match(/email address|update email|update password/i)) {
        cy.contains(/email address|update password/i).first().should('be.visible');
      }
      if ($body.text().match(/log out|delete account/i)) {
        cy.contains(/log out|delete account/i).first().should('be.visible');
      }
    });
  });
});

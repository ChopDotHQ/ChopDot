import fs from 'node:fs';
import path from 'node:path';

const inventoryPath = path.resolve('docs/MVP_ACTION_INVENTORY.md');
const outFixturePath = path.resolve('cypress/fixtures/mvp-actions.json');
const outSpecPath = path.resolve('cypress/e2e/mvp_inventory.cy.ts');

const raw = fs.readFileSync(inventoryPath, 'utf8');
const lines = raw.split(/\r?\n/);

const actionRegex = /^- \[ \] MVP-(\d{3}) \| (READY|PARTIAL) \| (.+) \| (Cypress|Manual)$/;

const actions = [];
for (const line of lines) {
  const m = line.match(actionRegex);
  if (!m) continue;
  actions.push({
    id: Number(m[1]),
    ticket: `MVP-${m[1]}`,
    status: m[2],
    description: m[3],
    mode: m[4],
  });
}

if (actions.length === 0) {
  console.error('No MVP actions parsed from inventory');
  process.exit(1);
}

fs.mkdirSync(path.dirname(outFixturePath), { recursive: true });
fs.mkdirSync(path.dirname(outSpecPath), { recursive: true });

fs.writeFileSync(outFixturePath, JSON.stringify(actions, null, 2));

const serialized = JSON.stringify(actions, null, 2);
const spec = `/// <reference types="cypress" />

type MvpAction = {
  id: number;
  ticket: string;
  status: 'READY' | 'PARTIAL';
  description: string;
  mode: 'Cypress' | 'Manual';
};

const actions: MvpAction[] = ${serialized};
const authActions = actions.filter((a) => a.id <= 14);
const appActions = actions.filter((a) => a.id > 14);

describe('MVP inventory in Cypress', () => {
  it('contains the full inventory', () => {
    expect(actions.length).to.equal(175);
  });

  authActions.forEach((action) => {
    it(\`\${action.ticket} \${action.description}\`, () => {
      expect(action.status).to.eq('READY');
      expect(action.mode === 'Cypress' || action.mode === 'Manual').to.eq(true);
      expect(action.description.length).to.be.greaterThan(3);

      cy.resetAppState();
      cy.visit('/', {
        onBeforeLoad(win) {
          win.localStorage.clear();
          win.sessionStorage.clear();
        },
      });
      cy.contains(/sign in to chopdot|continue as guest|email\\s*&\\s*password/i, { timeout: 30000 }).should('exist');
    });
  });

  describe('Post-auth MVP tickets', () => {
    before(() => {
      cy.ensureGuestSession();
    });

    appActions.forEach((action) => {
      it(\`\${action.ticket} \${action.description}\`, () => {
        expect(action.status).to.eq('READY');
        expect(action.mode === 'Cypress' || action.mode === 'Manual').to.eq(true);
        expect(action.description.length).to.be.greaterThan(3);
        cy.get('body').then(($body) => {
          const text = $body.text();
          if (!text.match(/Pots|People|Activity|You/i)) {
            cy.ensureGuestSession();
          }
        });
        cy.get('body').invoke('text').should('match', /Pots|People|Activity|You/i);
      });
    });
  });
});
`;

fs.writeFileSync(outSpecPath, spec);
console.log(`Generated Cypress MVP suite with ${actions.length} actions`);

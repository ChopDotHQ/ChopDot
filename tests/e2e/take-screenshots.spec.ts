import { test, expect } from '@playwright/test';

test.describe('Take screenshots for walkthrough', () => {
  test('Create Pot and Savings Circle screenshots', async ({ page }) => {
    // Navigate to base URL to initialize origin
    await page.goto('/');
    
    // Set localStorage to bypass login
    await page.evaluate(() => {
      window.localStorage.setItem('chopdot_user', JSON.stringify({ id: 'owner', name: 'Mina' }));
      window.localStorage.setItem('has_seen_onboarding', 'true');
    });

    // 1. Create Pot screen
    await page.goto('/pots/new');
    await page.waitForTimeout(3000); // Wait for rendering
    await page.screenshot({ path: '/Users/devinsonpena/.gemini/antigravity/brain/68f328ff-daa5-4ceb-bccf-28a05f7863c5/create_pot_screen_new.png' });

    // 2. Savings Circle Pot
    await page.evaluate(() => {
      const savingsPot = {
        id: 'savings-test',
        name: 'My Savings Circle',
        type: 'savings',
        baseCurrency: 'CHF',
        members: [
          { id: 'owner', name: 'Mina', role: 'Owner', status: 'active' },
          { id: 'leo', name: 'Leo', role: 'Member', status: 'active' }
        ],
        expenses: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      const pots = [savingsPot];
      window.localStorage.setItem('chopdot_pots', JSON.stringify(pots));
    });

    await page.goto('/pots?potId=savings-test');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/Users/devinsonpena/.gemini/antigravity/brain/68f328ff-daa5-4ceb-bccf-28a05f7863c5/savings_circle_home.png' });

    // 3. Spend Card Screen with Spend Group
    await page.evaluate(() => {
      const potWithGroup = {
        id: 'expense-test',
        name: 'Group with spendGroup',
        type: 'expense',
        baseCurrency: 'CHF',
        members: [
          { id: 'owner', name: 'Mina', role: 'Owner', status: 'active' },
          { id: 'leo', name: 'Leo', role: 'Member', status: 'active' },
          { id: 'nina', name: 'Nina', role: 'Member', status: 'active' }
        ],
        spendGroup: {
          id: 'sg_1',
          label: 'My Group',
          memberIds: ['owner', 'nina'],
          defaultSplitRule: 'equal',
          preferredPaymentApp: 'wise'
        },
        expenses: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      const pots = [potWithGroup];
      window.localStorage.setItem('chopdot_pots', JSON.stringify(pots));
    });

    await page.goto('/pots?potId=expense-test&action=new-spend');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/Users/devinsonpena/.gemini/antigravity/brain/68f328ff-daa5-4ceb-bccf-28a05f7863c5/spend_card_prepopulated.png' });
  });
});

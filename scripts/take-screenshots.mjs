import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Setup local storage with a dummy pot
  await page.goto('http://localhost:4173/pots');
  await page.evaluate(() => {
    const pot = {
      id: 'screenshot-pot',
      name: 'Friday Crew',
      type: 'expense',
      baseCurrency: 'CHF',
      members: [
        { id: 'owner', name: 'Mina', role: 'Owner', status: 'active' },
        { id: 'leo', name: 'Leo', role: 'Member', status: 'active' },
      ],
      spendGroup: {
        id: 'sg_friday_crew',
        label: 'Friday Crew',
        memberIds: ['owner', 'leo'],
        defaultSplitRule: 'equal',
        preferredPaymentApp: 'twint',
        activePotId: 'screenshot-pot',
        closedPotIds: [],
      },
      expenses: [],
      history: [],
      archived: false,
      budgetEnabled: false,
      checkpointEnabled: false,
      mode: 'casual',
      confirmationsEnabled: false,
      lastEditAt: new Date().toISOString(),
    };
    window.localStorage.setItem('chopdot_pots', JSON.stringify([pot]));
  });
  
  await page.reload();
  await page.waitForSelector('text=Sign in to ChopDot', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Continue as guest' }).click();
  await page.waitForURL('**/pots');

  await page.getByRole('button', { name: 'Friday Crew' }).click();
  
  // Spend Card Screen
  await page.getByTestId('pot-open-spend-card').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '.gemini/antigravity/brain/68f328ff-daa5-4ceb-bccf-28a05f7863c5/01-spend-card-before.png' });
  
  await browser.close();
  console.log('Screenshot taken!');
})();

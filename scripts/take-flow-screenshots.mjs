import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const artifactDir = '.gemini/antigravity/brain/68f328ff-daa5-4ceb-bccf-28a05f7863c5';

  // Seed the localStorage for a realistic "Friday Crew" pot
  await page.goto('http://localhost:4173/pots');
  await page.evaluate(() => {
    const pot = {
      id: 'flow-pot',
      name: 'Friday Crew',
      type: 'expense',
      baseCurrency: 'CHF',
      members: [
        { id: 'owner', name: 'Mina', role: 'Owner', status: 'active' },
        { id: 'leo', name: 'Leo', role: 'Member', status: 'active' },
        { id: 'nina', name: 'Nina', role: 'Member', status: 'active' },
      ],
      spendGroup: {
        id: 'sg_friday_crew',
        label: 'Friday Crew',
        memberIds: ['owner', 'leo', 'nina'],
        defaultSplitRule: 'equal',
        preferredPaymentApp: 'twint',
        activePotId: 'flow-pot',
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

  // 1. Pots Home
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${artifactDir}/01-pots-home.png` });

  // 2. Pot View (Chapter Home equivalent)
  await page.getByRole('button', { name: 'Friday Crew' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${artifactDir}/02-pot-home.png` });

  // 3. Spend Card Screen (Before input)
  await page.getByTestId('pot-open-spend-card').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${artifactDir}/03-spend-card.png` });

  // 4. Fill and Submit Spend
  // Fallback to manual entry since receipt scanning needs a file that might be complex to mock in this script
  await page.getByTestId('spend-card-paste-link').click();
  await page.getByTestId('spend-card-checkout-evidence').fill('w3spay://request?amount=120&currency=CHF&merchant=Cafe%20Zola');
  await page.getByTestId('spend-card-use-checkout-evidence').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${artifactDir}/04-spend-card-filled.png` });
  
  await page.getByTestId('spend-card-pay-now').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${artifactDir}/05-spend-card-submitted.png` });

  // 5. Change member to Leo and View Capture Handoff
  await page.evaluate(() => { window.sessionStorage.setItem('chopdot_capture_acting_member', 'leo'); });
  await page.goto('http://localhost:4173/pots');
  await page.getByRole('button', { name: 'Friday Crew' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${artifactDir}/06-pot-home-as-leo.png` });
  
  await page.getByTestId('pot-open-spend-card').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${artifactDir}/07-capture-handoff.png` });

  // 6. Mark Paid
  await page.locator('[data-testid$="-mark-paid"]').first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${artifactDir}/08-capture-handoff-paid.png` });

  // 7. Change member to Mina (owner) and view Confirmation
  await page.evaluate(() => { window.sessionStorage.setItem('chopdot_capture_acting_member', 'owner'); });
  await page.goto('http://localhost:4173/pots');
  await page.getByRole('button', { name: 'Friday Crew' }).click();
  await page.waitForTimeout(1000);
  
  await page.locator('button[data-testid$="-confirm"]').first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${artifactDir}/09-capture-confirm.png` });

  await browser.close();
  console.log('Screenshots generated successfully!');
})();

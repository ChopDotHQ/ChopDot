import { test } from '@playwright/test';

test('capture ui', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://localhost:5173');
  
  // Wait for the main app to load
  await page.waitForTimeout(2000);
  
  // Take screenshot of home page
  await page.screenshot({ path: '/Users/devinsonpena/.gemini/antigravity/brain/68f328ff-daa5-4ceb-bccf-28a05f7863c5/10-flat-pots-home.png' });

  // Click on the first pot (if any)
  const firstPot = page.locator('button').filter({ hasText: 'Use at checkout' }).first();
  if (await firstPot.isVisible()) {
      // Just showing flat screen
  } else {
      const potButton = page.locator('text="Dinner with Leo"').first();
      if (await potButton.isVisible()) {
          await potButton.click();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: '/Users/devinsonpena/.gemini/antigravity/brain/68f328ff-daa5-4ceb-bccf-28a05f7863c5/11-flat-pot-home.png' });
          
          // Click expenses tab
          await page.getByText('Expenses').click();
          await page.waitForTimeout(500);
          await page.screenshot({ path: '/Users/devinsonpena/.gemini/antigravity/brain/68f328ff-daa5-4ceb-bccf-28a05f7863c5/12-flat-expenses.png' });
      }
  }
});

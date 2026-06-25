import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const url = 'http://localhost:5173/';
const artifactsDir = '/Users/devinsonpena/.gemini/antigravity/brain/68f328ff-daa5-4ceb-bccf-28a05f7863c5';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
  });
  
  const page = await context.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log(`Navigating to ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: path.join(artifactsDir, 'local_home.png') });

  // Try to find a pot to click into
  const pots = await page.$$('text=Trips'); // MVP default pot
  if (pots.length > 0) {
      await pots[0].click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(artifactsDir, 'local_pot.png') });
  } else {
      console.log('No pot found with text "Trips"');
  }

  await browser.close();
})();

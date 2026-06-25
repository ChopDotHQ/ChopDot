import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const url = 'https://chop-dot-git-release-mvp-capture-v2-devinsons-projects-b5ab981e.vercel.app';
const artifactsDir = '/Users/devinsonpena/.gemini/antigravity/brain/68f328ff-daa5-4ceb-bccf-28a05f7863c5';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone viewport
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
  });
  
  const page = await context.newPage();
  console.log(`Navigating to ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });
  
  // Wait a bit for any auth/redirects
  await page.waitForTimeout(3000);
  
  const content = await page.evaluate(() => document.body.innerText);
  console.log('--- PAGE CONTENT ---');
  console.log(content.substring(0, 1000));
  
  const screenshotPath = path.join(artifactsDir, 'preview_home.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`Screenshot saved to ${screenshotPath}`);

  // Let's try to click on the first pot if it exists
  const pots = await page.$$('text=Trips'); // or something similar. We'll just look for pot cards
  if (pots.length > 0) {
      await pots[0].click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(artifactsDir, 'preview_pot.png') });
  }

  await browser.close();
})();

import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  // Wait for the auth screen to settle
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/Users/devinsonpena/.gemini/antigravity/brain/68f328ff-daa5-4ceb-bccf-28a05f7863c5/auth_clean.png', fullPage: true });
  await browser.close();
  console.log("Screenshot saved.");
})();

import { test, expect, chromium } from '@playwright/test';

async function runTest() {
  console.log("Starting Smart Scan UI test...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('response', response => {
     if (response.url().includes('/api/pots/')) {
         console.log(`API Response: ${response.url()} - ${response.status()}`);
     }
  });

  try {
    console.log("Navigating to http://localhost:5173...");
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Sign in as guest if on auth page
    const content = await page.locator('body').innerText();
    if (content.includes("Continue as guest")) {
        console.log("On Auth page. Clicking 'Continue as guest'...");
        await page.locator('button', { hasText: 'Continue as guest' }).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
    }

    console.log("Looking for an existing pot to click...");
    // Let's click the first pot card that looks like an expense pot (e.g. "Team Offsite")
    const potCard = page.locator('text=Team Offsite').first();
    const potCardCount = await potCard.count();

    if (potCardCount > 0) {
      console.log(`Found 'Team Offsite' pot. Clicking it.`);
      await potCard.click();
      await page.waitForTimeout(1000); // give it a sec to navigate
    } else {
        console.log("Couldn't find 'Team Offsite'. Let's just click the first element that looks like a pot card.");
        const firstPot = page.locator('.card').first();
        if (await firstPot.count() > 0) {
           await firstPot.click();
           await page.waitForTimeout(1000);
        } else {
           console.log("No pot cards found on the home screen.");
        }
    }

    // Now we should be in the pot view. Let's wait a moment for rendering.
    await page.waitForTimeout(2000);

    console.log("Checking if we're in the Pot view by looking for Smart Scan button...");
    const smartScanBtn = page.locator('button[title="Smart Scan AI"]');
    
    // We can also try waiting for it just in case
    try {
        await smartScanBtn.waitFor({ state: 'visible', timeout: 5000 });
        console.log("Found Smart Scan button! Clicking...");
        await smartScanBtn.click();

        // Look for the textarea
        const textarea = page.locator('textarea');
        await textarea.waitFor({ state: 'visible' });
        console.log("Modal opened. Filling text...");
        await textarea.fill("I paid 150 for the taxi, split equally among everyone.");

        // Click Parse
        const parseBtn = page.locator('button', { hasText: 'Parse' });
        await parseBtn.click();
        console.log("Clicked Parse. Waiting for response...");

        // Wait for the mocked 2-second timeout
        await page.waitForTimeout(3000);

        const isModalVisible = await textarea.isVisible();
        if (!isModalVisible) {
           console.log("✅ Modal successfully closed after parsing.");
        } else {
           console.log("❌ Modal is still visible.");
        }

        const expenses = await page.locator('text=Parsed Expense').count();
        console.log(`Found ${expenses} "Parsed Expense" entries on the page.`);
        if (expenses > 0) {
           console.log("✅ Success! The parsed expense was added to the pot.");
        } else {
           console.log("❌ Expense not found on page.");
        }
    } catch (e) {
        console.log("Could not find the Smart Scan button. We might not be in a Pot view. Current body text:");
        const currentBody = await page.locator('body').innerText();
        console.log(currentBody);
    }

  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await browser.close();
  }
}

runTest();

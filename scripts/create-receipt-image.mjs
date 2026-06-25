import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateReceiptImage() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 400, height: 800 }
  });
  
  const htmlPath = path.resolve(__dirname, 'receipt-template.html');
  await page.goto(`file://${htmlPath}`);
  
  // Wait a moment for rendering
  await page.waitForTimeout(500);
  
  // Take screenshot of the body to fit the receipt exactly
  const element = await page.$('body');
  await element.screenshot({ path: path.resolve(__dirname, '../tests/e2e/fixtures/test-receipt.png') });
  
  console.log('Receipt image generated at tests/e2e/fixtures/test-receipt.png');
  await browser.close();
}

generateReceiptImage().catch(console.error);

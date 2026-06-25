import { expect, test } from '@playwright/test';

test.describe('ChopDot.dot A5 demo (dot-lab entry)', () => {
  test('summit banner + contribute then confirm on savings circle', async ({ page }) => {
    await page.goto('/?chopdot-dot-lab=1&mode=savings_circle');
    await expect(page.getByTestId('summit-banner')).toContainText('Spend Cards next');
    await expect(page.getByTestId('dot-lab')).toBeVisible();

    await page.getByRole('button', { name: /Mark .* paid/i }).click();

    await page.getByTestId('active-agent').getByRole('button', { name: /^Mina\b/ }).click();
    await page.getByRole('button', { name: /Confirm Leo paid/i }).click();

    await expect(page.getByTestId('obligation-obligation_1')).toContainText('Confirmed');
  });
});

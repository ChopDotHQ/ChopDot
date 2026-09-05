import {expect, test} from '@playwright/test';

test('immutable dot-host bundle loads the production entrypoint', async ({page}) => {
  await page.goto('/');
  await expect(page).toHaveTitle('ChopDot');
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.getByText(/adapter|protocol console|statement store|product sdk/i)).toHaveCount(0);
});

test('release manifest belongs to the rendered bundle', async ({request}) => {
  const response = await request.get('/release.json');
  expect(response.ok()).toBeTruthy();
  const release = await response.json();
  expect(release.schema).toBe('chopdot.release.v3');
  expect(release.product).toBe('ChopDot');
  expect(release.files.length).toBeGreaterThan(1);
  expect(release.contentSha256).toMatch(/^[0-9a-f]{64}$/);
});

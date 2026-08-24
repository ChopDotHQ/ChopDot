import {expect, test, type Page} from '@playwright/test';

const appUrl = 'http://127.0.0.1:4177/';

for (const viewport of [
  {width: 320, height: 700, name: 'small mobile'},
  {width: 390, height: 844, name: 'mobile'},
  {width: 1440, height: 1000, name: 'desktop'},
]) {
  test(`${viewport.name} receipt-first entrance reflows with one clear action`, async ({page}) => {
    await page.setViewportSize(viewport);
    await openClean(page);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', {level: 1, name: 'Start with the receipt.'})).toBeVisible();
    await expect(page.locator('[data-primary-action="true"]:visible')).toHaveCount(1);
    expect(await semanticViolations(page)).toEqual([]);
    expect(await targetSizeViolations(page)).toEqual([]);
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });
}

test('receipt capture is keyboard reachable, labelled, and keeps focus visible', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openClean(page);
  const action = page.getByRole('button', {name: 'Scan a receipt'});
  await expect(action).toBeVisible();
  await page.locator('body').press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toHaveAccessibleName('Scan a receipt');
  expect(await hasVisibleFocus(focused)).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', {name: 'Start with the receipt.'})).toBeVisible();
  expect(await semanticViolations(page)).toEqual([]);
  expect(await targetSizeViolations(page)).toEqual([]);
  expect(await hasHorizontalOverflow(page)).toBe(false);
});

test('reduced motion and 200 percent equivalent reflow preserve the primary job', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 640, height: 720});
  await openClean(page);
  const action = page.getByRole('button', {name: 'Scan a receipt'});
  await action.scrollIntoViewIfNeeded();
  await expect(action).toBeVisible();
  expect(await hasHorizontalOverflow(page)).toBe(false);
});

async function openClean(page: Page) {
  await page.goto(appUrl, {waitUntil: 'domcontentloaded'});
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({waitUntil: 'domcontentloaded'});
}

async function semanticViolations(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && box.width > 0 && box.height > 0;
    };
    const violations: string[] = [];
    const headings = [...document.querySelectorAll('h1')].filter(visible);
    if (headings.length !== 1) violations.push(`expected one visible h1, found ${headings.length}`);
    const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
    if (new Set(ids).size !== ids.length) violations.push('duplicate ids');
    for (const button of document.querySelectorAll('button')) {
      if (visible(button) && !(button.textContent?.trim() || button.getAttribute('aria-label'))) violations.push('unnamed button');
    }
    for (const input of document.querySelectorAll('input')) {
      if (visible(input) && !input.getAttribute('aria-label') && !document.querySelector(`label[for="${input.id}"]`) && !input.closest('label')) violations.push('unlabelled input');
    }
    return violations;
  });
}

async function targetSizeViolations(page: Page): Promise<string[]> {
  return page.evaluate(() => [...document.querySelectorAll('button,a[href],input')].filter(element => {
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    if (style.visibility === 'hidden' || style.display === 'none' || style.clip !== 'auto' || style.clipPath !== 'none' || box.width === 0 || box.height === 0) return false;
    return box.width < 44 || box.height < 44;
  }).map(element => `${element.tagName.toLowerCase()}:${element.textContent?.trim() || element.getAttribute('aria-label') || 'unnamed'}`));
}

async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.locator('body').evaluate(element => element.scrollWidth > element.clientWidth + 1);
}

async function hasVisibleFocus(locator: import('@playwright/test').Locator): Promise<boolean> {
  return locator.evaluate(element => {
    const style = getComputedStyle(element);
    return style.outlineStyle === 'solid' || style.boxShadow !== 'none';
  });
}

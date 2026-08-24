import {expect, type Frame, test} from '@playwright/test';
import {closeHostedProduct, openHostedProduct} from './support/hostedProductAccount.ts';

const storageKey = 'chopdot-portable-shell-state-v1';

test('receipt-first capture stays draft-only until Save spend', async ({browser}) => {
  const product = await openHostedProduct(browser, {viewport: {width: 390, height: 844}});
  const page = product.frame;
  try {
    await createOrganizerGroup(page);

    await page.getByRole('button', {name: 'Add spend'}).click();

  await expect(page.getByRole('heading', {name: 'Start with the receipt'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Add receipt'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Enter amount instead'})).toBeVisible();
  await page.locator('#root').screenshot({
    path: 'proof/chopdot-candidate-2026-08-12/screenshots/05-capture-receipt-first-mobile.png',
  });
  expect(await expenseCount(page)).toBe(0);

  await page.getByLabel('Choose receipt').setInputFiles({
    name: 'gusto-receipt.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Gusto Zurich\nGrand total CHF 120.00'),
  });
  await expect(page.getByText('Receipt added — review the details')).toBeVisible();
  await expect(page.getByLabel('Total')).toHaveValue('120');
  await expect(page.getByLabel('Merchant or reason')).toHaveValue('Gusto Zurich');
  await expect(page.getByRole('button', {name: 'Review split'})).toBeEnabled();
  await page.locator('#root').screenshot({
    path: 'proof/chopdot-candidate-2026-08-12/screenshots/06-capture-receipt-review-mobile.png',
  });
  await page.locator('header').click();

  await page.getByRole('button', {name: 'Review split'}).click();
    await expect(page.getByText('$120.00', {exact: true}).first()).toBeVisible();
    expect(await expenseCount(page)).toBe(0);

  await page.getByRole('button', {name: 'Back'}).click();
  await expect(page.getByLabel('Total')).toHaveValue('120');
  await expect(page.getByLabel('Merchant or reason')).toHaveValue('Gusto Zurich');

    await page.getByRole('button', {name: 'Review split'}).click();
    await page.getByRole('button', {name: 'Save spend'}).click();
    await expect(page.getByTestId('group-add-expense')).toBeVisible();
    expect(await expenseCount(page)).toBe(0);
    expect(await authorityExpenseCount(page)).toBe(1);
  } finally {
    await closeHostedProduct(product);
  }
});

test('unreadable photo falls back to correction without creating money state', async ({browser}) => {
  const product = await openHostedProduct(browser, {viewport: {width: 390, height: 844}});
  const page = product.frame;
  try {
    await createOrganizerGroup(page);
    await page.getByRole('button', {name: 'Add spend'}).click();

  await page.getByLabel('Choose receipt').setInputFiles({
    name: 'dinner.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  });
  await expect(page.getByRole('alert')).toContainText('Couldn’t read the total');
  await expect(page.getByRole('button', {name: 'Review split'})).toBeDisabled();
    expect(await expenseCount(page)).toBe(0);
    expect(await authorityExpenseCount(page)).toBe(0);
  } finally {
    await closeHostedProduct(product);
  }
});

async function createOrganizerGroup(page: Frame) {
  await page.getByRole('button', {name: 'New group'}).click();
  await page.getByPlaceholder('e.g. Weekend Trip').fill('Weekend Trip');
  await expect(page.getByLabel('Friend name')).toHaveCount(0);
  await page.getByRole('button', {name: 'Create group'}).click();
}

async function expenseCount(page: Frame) {
  return page.evaluate((key) => {
    const stored = window.localStorage.getItem(key);
    if (!stored) return 0;
    const parsed = JSON.parse(stored) as {expenses?: Record<string, unknown>};
    return Object.keys(parsed.expenses ?? {}).length;
  }, storageKey);
}

async function authorityExpenseCount(page: Frame) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('chopdot-authority-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = database.transaction('journals', 'readonly').objectStore('journals').getAllKeys();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const read = (store: string, key: IDBValidKey) => new Promise<any>((resolve, reject) => {
      const request = database.transaction(store, 'readonly').objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const [row, encryptionKey] = await Promise.all([
      read('journals', keys[0]),
      read('keys', 'journal-encryption-key'),
    ]);
    const bytes = (hex: string) => Uint8Array.from(hex.slice(2).match(/.{2}/gu) ?? [], value => Number.parseInt(value, 16));
    const plaintext = await crypto.subtle.decrypt({name: 'AES-GCM', iv: bytes(row.ivHex)}, encryptionKey, bytes(row.ciphertextHex));
    const journal = JSON.parse(new TextDecoder().decode(plaintext)) as {expenses?: Record<string, unknown>};
    database.close();
    return Object.keys(journal.expenses ?? {}).length;
  });
}

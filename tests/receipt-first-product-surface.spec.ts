import {expect, type Frame, type Page, test} from '@playwright/test';
import {closeHostedProduct, openHostedProduct} from './support/hostedProductAccount.ts';

const appUrl = 'http://127.0.0.1:4177/';
const storageKey = 'chopdot-portable-shell-state-v1';

test('explicit Catch action captures a local receipt draft before account or money state', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openClean(page);

  await expect(page.getByRole('heading', {name: 'Start a group.'})).toBeVisible();
  await expect(page.locator('[data-primary-action="true"]')).toHaveCount(1);
  await expect(page.locator('[data-primary-action="true"]')).toHaveText(/Start a group/u);

  await page.getByRole('button', {name: 'Scan a receipt'}).click();
  await expect(page.getByRole('heading', {name: 'Start with the receipt.'})).toBeVisible();
  await page.getByLabel('Import a receipt').setInputFiles({
    name: 'gusto-receipt.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Gusto Zurich\nGrand total CHF 120.00'),
  });

  await expect(page.getByText('Receipt added — check the details')).toBeVisible();
  await expect(page.getByLabel('Total')).toHaveValue('120');
  await expect(page.getByLabel('Merchant or reason')).toHaveValue('Gusto Zurich');
  await expect(page.getByText('Nothing is shared or counted until you choose a group and save.')).toBeVisible();
  expect(await page.evaluate(key => {
    const stored = window.localStorage.getItem(key);
    if (!stored) return {users: 0, groups: 0, expenses: 0};
    const state = JSON.parse(stored) as {users?: object; groups?: object; expenses?: object};
    return {
      users: Object.keys(state.users ?? {}).length,
      groups: Object.keys(state.groups ?? {}).length,
      expenses: Object.keys(state.expenses ?? {}).length,
    };
  }, storageKey)).toEqual({users: 0, groups: 0, expenses: 0});
});

test('a Product Account reviews and signs the captured receipt into one organizer-owned group', async ({browser}) => {
  const product = await openHostedProduct(browser, {viewport: {width: 390, height: 844}});
  const {frame} = product;
  try {
    await frame.getByRole('button', {name: 'Scan a receipt'}).click();
    await frame.getByLabel('Import a receipt').setInputFiles({
      name: 'gusto-receipt.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Gusto Zurich\nGrand total CHF 120.00'),
    });
    await frame.getByRole('button', {name: 'Continue with this draft'}).click();
    await frame.getByRole('button', {name: 'Add the people'}).click();
    await frame.getByPlaceholder('e.g. Weekend Trip').fill('Zurich Dinner');
    await expect(frame.getByLabel('Friend name')).toHaveCount(0);
    await frame.getByRole('button', {name: 'Create my group'}).click();

    await expect(frame.getByRole('heading', {name: 'Review split'})).toBeVisible();
    await expect(frame.getByText(/120\.00/u).first()).toBeVisible();
    expect(await expenseCount(frame)).toBe(0);
    await frame.getByRole('button', {name: 'Save spend'}).click();
    await expect(frame.getByTestId('group-add-expense')).toBeVisible();
    expect(await expenseCount(frame)).toBe(0);
    expect(await firstAuthorityJournalExpenseCount(frame)).toBe(1);
  } finally {
    await closeHostedProduct(product);
  }
});

const modeCases = [
  {open: 'Trip', start: 'Start a trip', group: 'Weekend trip', intro: 'Scan a trip receipt', next: 'Scan a receipt', mode: 'trip'},
  {open: 'Couple', start: 'Start together', group: 'Our shared costs', intro: 'Scan a shared receipt', next: 'Scan a receipt', mode: 'couple'},
  {open: 'Spend Card', start: 'Start Spend Card', group: 'Spend Card', intro: 'Match a receipt', next: 'Add the card purchase.', mode: 'spend_card'},
  {open: 'Savings circle', start: 'Start a savings circle', group: 'Savings circle', intro: 'Record a contribution', next: 'Set the circle rules.', mode: 'savings_circle'},
  {open: 'Emergency pot', start: 'Start an emergency pot', group: 'Private support', intro: 'Contribute privately', next: 'Set who must approve.', mode: 'emergency_pot'},
  {open: 'Community fund', start: 'Start a community fund', group: 'Community fund', intro: 'Review a proposal', next: 'Set the fund roles.', mode: 'community_fund'},
] as const;

for (const modeCase of modeCases) {
  test(`${modeCase.open} uses the shared group lifecycle and persists its mode`, async ({browser}) => {
    const product = await openHostedProduct(browser, {viewport: {width: 390, height: 844}});
    const {frame} = product;
    try {
      await frame.getByRole('button', {name: 'New group'}).click();
      await frame.getByLabel('What is it for?').selectOption(modeCase.mode);
      await expect(frame.getByPlaceholder('e.g. Weekend Trip')).toHaveValue(modeCase.group);
      await expect(frame.getByLabel('Friend name')).toHaveCount(0);
      await frame.getByRole('button', {name: 'Create my group'}).click();

      await expect(frame.getByText(new RegExp(modeCase.next, 'i')).first()).toBeVisible();
      const storedMode = await firstAuthorityJournalMode(frame);
      expect(storedMode).toBe(modeCase.mode);
    } finally {
      await closeHostedProduct(product);
    }
  });
}

test('group creation exposes no typed-name path into shared authority', async ({browser}) => {
  const product = await openHostedProduct(browser);
  const {frame} = product;
  try {
    await frame.getByRole('button', {name: 'New group'}).click();
    await frame.getByPlaceholder('e.g. Weekend Trip').fill('Friday dinner');
    await expect(frame.getByLabel('Friend name')).toHaveCount(0);
    await expect(frame.getByRole('button', {name: 'Add friend'})).toHaveCount(0);
    await frame.getByRole('button', {name: 'Create my group'}).click();
    await expect(frame.getByRole('button', {name: 'Invite a member'})).toBeVisible();
    await expect(frame.getByRole('button', {name: 'Remove a member'})).toBeVisible();
  } finally {
    await closeHostedProduct(product);
  }
});

async function openClean(page: Page) {
  await page.goto(appUrl, {waitUntil: 'domcontentloaded'});
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({waitUntil: 'domcontentloaded'});
  await expect(page.locator('#root')).not.toBeEmpty();
}

async function firstAuthorityJournalMode(page: Frame) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('chopdot-authority-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const read = (store: string, key: IDBValidKey) => new Promise<any>((resolve, reject) => {
      const request = database.transaction(store, 'readonly').objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const groupId = await new Promise<IDBValidKey>((resolve, reject) => {
      const request = database.transaction('journals', 'readonly').objectStore('journals').getAllKeys();
      request.onsuccess = () => resolve(request.result[0]);
      request.onerror = () => reject(request.error);
    });
    const [row, key] = await Promise.all([read('journals', groupId), read('keys', 'journal-encryption-key')]);
    const bytes = (hex: string) => Uint8Array.from(hex.slice(2).match(/.{2}/gu) ?? [], value => Number.parseInt(value, 16));
    const plaintext = await crypto.subtle.decrypt({name: 'AES-GCM', iv: bytes(row.ivHex)}, key, bytes(row.ciphertextHex));
    const journal = JSON.parse(new TextDecoder().decode(plaintext)) as {mode?: string};
    database.close();
    return journal.mode ?? null;
  });
}

async function firstAuthorityJournalExpenseCount(page: Frame) {
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
    if (!keys[0]) throw new Error('Authority journal is missing.');
    const read = (store: string, key: IDBValidKey) => new Promise<any>((resolve, reject) => {
      const request = database.transaction(store, 'readonly').objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const [row, key] = await Promise.all([read('journals', keys[0]), read('keys', 'journal-encryption-key')]);
    const bytes = (hex: string) => Uint8Array.from(hex.slice(2).match(/.{2}/gu) ?? [], value => Number.parseInt(value, 16));
    const plaintext = await crypto.subtle.decrypt({name: 'AES-GCM', iv: bytes(row.ivHex)}, key, bytes(row.ciphertextHex));
    const journal = JSON.parse(new TextDecoder().decode(plaintext)) as {expenses?: Record<string, unknown>};
    database.close();
    return Object.keys(journal.expenses ?? {}).length;
  });
}

async function expenseCount(page: Frame) {
  return page.evaluate(key => {
    const stored = window.localStorage.getItem(key);
    if (!stored) return 0;
    const parsed = JSON.parse(stored) as {expenses?: Record<string, unknown>};
    return Object.keys(parsed.expenses ?? {}).length;
  }, storageKey);
}

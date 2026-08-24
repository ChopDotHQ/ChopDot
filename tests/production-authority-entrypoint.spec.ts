import {expect, test} from '@playwright/test';
import {
  closeHostedProduct,
  openHostedProduct,
  refreshHostedProduct,
} from './support/hostedProductAccount.ts';

const storageKey = 'chopdot-portable-shell-state-v1';

test('src/main.tsx creates and spends from the durable signed authority journal', async ({browser}) => {
  const product = await openHostedProduct(browser);
  let {frame} = product;
  try {
    await expect(frame.getByRole('heading', {name: 'Start with the receipt.'})).toBeVisible();

    await frame.getByRole('button', {name: 'New group'}).click();
    await frame.getByPlaceholder('e.g. Weekend Trip').fill('Zurich dinner');
    await expect(frame.getByLabel('Friend name')).toHaveCount(0);
    await frame.getByRole('button', {name: 'Create group'}).click();
    await expect(frame.getByRole('heading', {name: 'Zurich dinner'})).toBeVisible();

    await frame.getByRole('button', {name: /Add spend/u}).click();
    await frame.getByRole('button', {name: 'Enter amount instead'}).click();
    await frame.getByLabel('Total').fill('12.34');
    await frame.getByLabel('Merchant or reason').fill('Dinner');
    await frame.getByRole('button', {name: 'Review split'}).click();
    await expect(frame.getByRole('heading', {name: 'Review split'})).toBeVisible();
    await frame.getByRole('button', {name: 'Save spend'}).click();
    await expect(frame.getByTestId('group-add-expense')).toBeVisible();
    expect(await frame.evaluate(key => {
      const cache = JSON.parse(window.localStorage.getItem(key) ?? '{}') as {groups?: object; expenses?: object; splits?: object};
      return [Object.keys(cache.groups ?? {}).length, Object.keys(cache.expenses ?? {}).length, Object.keys(cache.splits ?? {}).length];
    }, storageKey)).toEqual([0, 0, 0]);

    const proof = await frame.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('chopdot-authority-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const read = (store: string, key: string) => new Promise<any>((resolve, reject) => {
      const request = database.transaction(store, 'readonly').objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    // Group identifiers are random in the UI, so resolve the one journal key.
    const groupId = await new Promise<string>((resolve, reject) => {
      const request = database.transaction('journals', 'readonly').objectStore('journals').getAllKeys();
      request.onsuccess = () => resolve(String(request.result[0]));
      request.onerror = () => reject(request.error);
    });
    const [row, encryptionKey] = await Promise.all([
      read('journals', groupId),
      read('keys', 'journal-encryption-key'),
    ]);
    const bytes = (hex: string) => Uint8Array.from(hex.slice(2).match(/.{2}/g) ?? [], value => Number.parseInt(value, 16));
    const plaintext = await crypto.subtle.decrypt({name: 'AES-GCM', iv: bytes(row.ivHex)}, encryptionKey, bytes(row.ciphertextHex));
    const journal = JSON.parse(new TextDecoder().decode(plaintext)) as {events: Array<{eventType: string; payload: any; signatureHex: string}>; stateHash: string; frontierHash: string};
    database.close();
    return {
      eventTypes: journal.events.map(event => event.eventType),
      signatures: journal.events.every(event => /^0x[0-9a-f]+$/u.test(event.signatureHex)),
      expenseMinorUnits: journal.events.find(event => event.eventType === 'EXPENSE_ADDED')?.payload.total.minorUnits,
      stateHash: journal.stateHash,
      frontierHash: journal.frontierHash,
    };
  });
    expect(proof.eventTypes).toEqual(['GROUP_CREATED', 'EXPENSE_ADDED']);
    expect(proof.signatures).toBe(true);
    expect(proof.expenseMinorUnits).toBe('1234');
    expect(proof.stateHash).toMatch(/^0x[0-9a-f]{64}$/u);
    expect(proof.frontierHash).toMatch(/^0x[0-9a-f]{64}$/u);

    frame = await refreshHostedProduct(product);
    await expect(frame.getByRole('button', {name: 'Open Zurich dinner'})).toBeVisible();
    await frame.getByRole('button', {name: 'Open Zurich dinner'}).click();
    await expect(frame.getByTestId('group-add-expense')).toBeVisible();
  } finally {
    await closeHostedProduct(product);
  }
});

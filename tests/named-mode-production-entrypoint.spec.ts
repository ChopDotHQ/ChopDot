import {expect, test, type Browser, type Frame} from '@playwright/test';
import {
  closeHostedProduct,
  openHostedProduct,
  type HostedProductAccount,
} from './support/hostedProductAccount.ts';
import {releaseEvidencePath} from './support/releaseEvidencePath.ts';

const appUrl = 'http://127.0.0.1:4177/';
const evidenceRoot = releaseEvidencePath('named-mode-production-entrypoint');

const cases = [
  {
    label: 'Spend Card',
    create: 'Start Spend Card',
    firstHeading: 'Add the card purchase.',
    action: 'Add this card purchase',
    nextHeading: 'Scan a receipt',
    eventType: 'SPEND_TRANSACTION_IMPORTED',
    fill: async (page: Frame) => {
      await page.getByLabel('Merchant').fill('Gusto Zurich');
      await page.getByLabel('Amount').fill('12.00');
      await page.getByLabel('Payment reference').fill('card-reference-1');
    },
  },
  {
    label: 'Savings circle',
    create: 'Start a savings circle',
    firstHeading: 'Set the circle rules.',
    action: 'Set the circle rules',
    nextHeading: 'Open the first round.',
    eventType: 'CIRCLE_RULES_SET',
    fill: async (page: Frame) => {
      await page.getByLabel('Amount').fill('100.00');
      await page.getByLabel('Days between rounds').fill('30');
    },
  },
  {
    label: 'Emergency pot',
    create: 'Start an emergency pot',
    firstHeading: 'Set who must approve.',
    action: 'Set who must approve',
    nextHeading: 'Open a private request.',
    eventType: 'EMERGENCY_POLICY_SET',
    fill: async (page: Frame) => {
      await page.getByLabel('Approvals needed').fill('1');
    },
  },
  {
    label: 'Community fund',
    create: 'Start a community fund',
    firstHeading: 'Set the fund roles.',
    action: 'Set the fund roles',
    nextHeading: 'Record a fund contribution.',
    eventType: 'COMMUNITY_POLICY_SET',
    fill: async (page: Frame) => {
      await page.getByLabel('Approvals needed').fill('1');
    },
  },
] as const;

for (const mode of cases) {
  test(`${mode.label} signs its first real transition through src/main.tsx`, async ({browser}) => {
    const product = await openHostedProduct(browser);
    const {frame} = product;
    try {
      await frame.getByRole('button', {name: 'New group'}).click();
      await frame.getByLabel('What is it for?').selectOption({label: mode.label});
      await frame.getByRole('button', {name: 'Create my group'}).click();

      await expect(frame.getByRole('heading', {name: mode.firstHeading})).toBeVisible();
      await mode.fill(frame);
      await frame.getByRole('button', {name: mode.action, exact: true}).click();
      await expect(frame.getByRole('heading', {name: mode.nextHeading})).toBeVisible();
      await frame.locator('#root').screenshot({path: `${evidenceRoot}/${slug(mode.label)}-first-signed-action.png`});

      const journal = await readOnlyJournal(frame);
      expect(journal.eventTypes).toEqual(['GROUP_CREATED', mode.eventType]);
      expect(journal.allSigned).toBe(true);
      expect(journal.stateHash).toMatch(/^0x[0-9a-f]{64}$/u);
      expect(journal.frontierHash).toMatch(/^0x[0-9a-f]{64}$/u);

      if (mode.label === 'Spend Card') {
        await frame.getByRole('button', {name: 'Enter an amount instead'}).click();
        await frame.getByLabel('Total').fill('12.00');
        await frame.getByLabel('Merchant or reason').fill('Gusto Zurich');
        await frame.getByRole('button', {name: 'Continue with this draft'}).click();
        await expect(frame.getByRole('heading', {name: 'Receipt matched.'})).toBeVisible();
        await frame.getByRole('button', {name: 'Split this purchase'}).click();
        await frame.getByRole('button', {name: 'Review card spend'}).click();
        await frame.getByRole('button', {name: 'Save matched spend'}).click();
        await expect(frame.getByRole('button', {name: 'Open group payments'})).toBeVisible();
        await frame.locator('#root').screenshot({path: `${evidenceRoot}/spend-card-linked-expense.png`});
        const linkedJournal = await readOnlyJournal(frame);
        expect(linkedJournal.eventTypes).toEqual([
          'GROUP_CREATED',
          'SPEND_TRANSACTION_IMPORTED',
          'SPEND_RECEIPT_REVIEWED',
          'EXPENSE_ADDED',
          'SPEND_TRANSACTION_LINKED',
        ]);
        expect(linkedJournal.allSigned).toBe(true);
      }
    } finally {
      await closeHostedProduct(product);
    }
  });
}

test('a fresh contact link reaches explicit account choice before the welcome gate', async ({page}) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto(`${appUrl}#chopdot-contact=malformed`, {waitUntil: 'domcontentloaded'});
  await expect(page.getByRole('heading', {name: 'People'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Verify who sent this'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Use my account'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Use ChopDot right away'})).toHaveCount(0);
});

test('emergency dispute requires threshold approval, corrected successor, recipient confirmation, and close through src/main.tsx', async ({browser}) => {
  const product = await openNamedMode(browser, 'Emergency pot', 'Start an emergency pot');
  const {frame} = product;
  try {
    await frame.getByLabel('Approvals needed').fill('1');
    await frame.getByRole('button', {name: 'Set who must approve', exact: true}).click();
    await frame.getByLabel('Support target').fill('10.00');
    await frame.getByRole('button', {name: 'Open a private request', exact: true}).click();

    await frame.getByRole('button', {name: 'Change or add something'}).click();
    await frame.getByRole('button', {name: 'Record my contribution', exact: true}).click();
    await frame.getByLabel('Amount').fill('10.00');
    await frame.getByLabel('Payment reference').fill('support-contribution-1');
    await frame.getByRole('button', {name: 'Record my contribution', exact: true}).click();
    await frame.getByRole('button', {name: 'Confirm this contribution', exact: true}).click();
    await frame.getByRole('button', {name: 'Approve this support', exact: true}).click();
    await frame.getByLabel('Payment reference').fill('support-release-1');
    await frame.getByRole('button', {name: 'Record the support sent', exact: true}).click();

    await expect(frame.getByRole('heading', {name: 'Did the support arrive?'})).toBeVisible();
    await frame.getByRole('button', {name: 'Change or add something'}).click();
    await frame.getByRole('button', {name: 'Report a problem', exact: true}).click();
    await frame.getByLabel('Short note').fill('The amount did not arrive');
    await frame.getByRole('button', {name: 'Report a problem', exact: true}).click();
    await frame.getByRole('button', {name: 'Approve the correction', exact: true}).click();
    await frame.getByLabel('Corrected amount').fill('10.00');
    await frame.getByLabel('Payment reference').fill('support-release-corrected-1');
    await frame.getByLabel('Short note').fill('Corrected external payment');
    await frame.getByRole('button', {name: 'Record the corrected support', exact: true}).click();
    await frame.getByRole('button', {name: 'Confirm the support arrived', exact: true}).click();
    await frame.getByRole('button', {name: 'Save the support record', exact: true}).click();
    await expect(frame.getByRole('heading', {name: 'Support record saved.'})).toBeVisible();
    await frame.locator('#root').screenshot({path: `${evidenceRoot}/emergency-dispute-corrected-and-closed.png`});
    expect((await readOnlyJournal(frame)).eventTypes).toEqual([
      'GROUP_CREATED', 'EMERGENCY_POLICY_SET', 'EMERGENCY_REQUEST_OPENED', 'EMERGENCY_CONTRIBUTION_RECORDED',
      'EMERGENCY_CONTRIBUTION_RECEIVED', 'EMERGENCY_REQUEST_APPROVED', 'EMERGENCY_RELEASE_RECORDED',
      'EMERGENCY_RELEASE_DISPUTED', 'EMERGENCY_CORRECTION_APPROVED', 'EMERGENCY_RELEASE_CORRECTED',
      'EMERGENCY_RELEASE_CONFIRMED', 'EMERGENCY_REQUEST_CLOSED',
    ]);
  } finally {
    await closeHostedProduct(product);
  }
});

test('community fund reaches explicit immutable close through src/main.tsx', async ({browser}) => {
  const product = await openNamedMode(browser, 'Community fund', 'Start a community fund');
  const {frame} = product;
  try {
    await frame.getByLabel('Approvals needed').fill('1');
    await frame.getByRole('button', {name: 'Set the fund roles', exact: true}).click();
    await frame.getByLabel('Amount').fill('30.00');
    await frame.getByLabel('Payment reference').fill('community-contribution-1');
    await frame.getByRole('button', {name: 'Record my contribution', exact: true}).click();
    await frame.getByRole('button', {name: 'Confirm this contribution', exact: true}).click();
    await frame.getByRole('textbox', {name: 'Proposal', exact: true}).fill('Repair the shared garden');
    await frame.getByLabel('Proposed amount').fill('10.00');
    await frame.getByRole('button', {name: 'Add a proposal', exact: true}).click();
    await frame.getByRole('button', {name: 'Approve this proposal', exact: true}).click();
    await frame.getByLabel('Payment reference').fill('community-release-1');
    await frame.getByRole('button', {name: 'Record the payment sent', exact: true}).click();
    await frame.getByRole('button', {name: 'Confirm the payment arrived', exact: true}).click();
    await frame.getByRole('button', {name: 'Finish this fund', exact: true}).click();
    await expect(frame.getByRole('heading', {name: 'This fund is finished.'})).toBeVisible();
    await frame.locator('#root').screenshot({path: `${evidenceRoot}/community-fund-explicit-close.png`});
    expect((await readOnlyJournal(frame)).eventTypes.at(-1)).toBe('COMMUNITY_FUND_CLOSED');
  } finally {
    await closeHostedProduct(product);
  }
});

async function openNamedMode(browser: Browser, label: string, createLabel: string): Promise<HostedProductAccount> {
  const product = await openHostedProduct(browser);
  await product.frame.getByRole('button', {name: 'New group'}).click();
  await product.frame.getByLabel('What is it for?').selectOption({label});
  await product.frame.getByRole('button', {name: 'Create my group'}).click();
  return product;
}

async function readOnlyJournal(page: Frame): Promise<{eventTypes: string[]; allSigned: boolean; stateHash: string; frontierHash: string}> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('chopdot-authority-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const groupId = await new Promise<string>((resolve, reject) => {
      const request = database.transaction('journals', 'readonly').objectStore('journals').getAllKeys();
      request.onsuccess = () => resolve(String(request.result[0]));
      request.onerror = () => reject(request.error);
    });
    const read = (store: string, key: string) => new Promise<any>((resolve, reject) => {
      const request = database.transaction(store, 'readonly').objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const [row, encryptionKey] = await Promise.all([read('journals', groupId), read('keys', 'journal-encryption-key')]);
    const bytes = (hex: string) => Uint8Array.from(hex.slice(2).match(/.{2}/gu) ?? [], value => Number.parseInt(value, 16));
    const plaintext = await crypto.subtle.decrypt({name: 'AES-GCM', iv: bytes(row.ivHex)}, encryptionKey, bytes(row.ciphertextHex));
    const journal = JSON.parse(new TextDecoder().decode(plaintext)) as {events: Array<{eventType: string; signatureHex: string}>; stateHash: string; frontierHash: string};
    database.close();
    return {
      eventTypes: journal.events.map(event => event.eventType),
      allSigned: journal.events.every(event => /^0x[0-9a-f]+$/u.test(event.signatureHex)),
      stateHash: journal.stateHash,
      frontierHash: journal.frontierHash,
    };
  });
}

function slug(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/gu, '-');
}

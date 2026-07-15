import {expect, test} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';

const proofDirectory = path.resolve('proof/guest-payment-return');

test('Leo opens a fresh-device link and returns a scoped paid update to Mina', async ({browser}) => {
  await mkdir(proofDirectory, {recursive: true});
  const minaContext = await browser.newContext({viewport: {width: 430, height: 932}});
  const leoContext = await browser.newContext({viewport: {width: 430, height: 932}});
  const mina = await minaContext.newPage();
  const leo = await leoContext.newPage();

  try {
    await installShareCapture(mina);
    await mina.goto('http://127.0.0.1:4177/');
    await mina.evaluate(() => window.localStorage.clear());
    await mina.reload();

    await mina.getByRole('button', {name: 'Continue as guest'}).click();
    await mina.getByPlaceholder('Display name').fill('Mina');
    await mina.getByRole('button', {name: 'Continue as Mina'}).click();
    await mina.getByRole('button', {name: 'Start with a group'}).click();
    await mina.getByPlaceholder('e.g. Weekend Trip').fill('Friday Crew');
    await mina.getByLabel('Friend name').fill('Leo');
    await mina.getByRole('button', {name: 'Add friend'}).click();
    await mina.getByRole('button', {name: 'Create group'}).click();
    await mina.getByRole('button', {name: 'Add spend'}).click();
    await mina.getByPlaceholder('0.00').fill('30');
    await mina.getByPlaceholder('e.g. Dinner at Gusto').fill('Dinner');
    await mina.getByRole('button', {name: 'Review split'}).click();
    await mina.getByRole('button', {name: 'Save spend'}).click();
    await mina.getByRole('button', {name: 'Settle up'}).click();
    await mina.getByRole('button', {name: 'Send link to Leo'}).click();

    const payerUrl = await capturedShareUrl(mina);
    expect(new URL(payerUrl).searchParams.get('payRequest')).toBeTruthy();

    await installShareCapture(leo);
    await leo.goto(payerUrl);
    await expect(leo.getByRole('heading', {name: 'Pay Mina', level: 2})).toBeVisible();
    await expect(leo.getByText('$15.00', {exact: true})).toBeVisible();
    await expect(leo.getByText('Your share', {exact: true})).toBeVisible();
    await expect(leo.getByRole('button', {name: 'I paid Mina'})).toBeVisible();
    await expect(leo.getByRole('button', {name: 'Start with a group'})).toHaveCount(0);
    await leo.locator('#root').screenshot({path: path.join(proofDirectory, '01-leo-fresh-device-request.png')});

    await leo.getByRole('button', {name: 'I paid Mina'}).click();
    await expect(leo.getByRole('heading', {name: 'Marked as paid', level: 2})).toBeVisible();
    await expect(leo.getByText('Update sent to Mina', {exact: true})).toBeVisible();
    const paidUpdateUrl = await capturedShareUrl(leo);
    expect(new URL(paidUpdateUrl).searchParams.get('payUpdate')).toBeTruthy();
    await leo.locator('#root').screenshot({path: path.join(proofDirectory, '02-leo-update-sent.png')});

    await expect(mina.getByText('Link shared', {exact: true})).toBeVisible();
    await expect(mina.getByRole('button', {name: 'Confirm received from Leo'})).toHaveCount(0);
    await mina.goto(paidUpdateUrl);
    await expect(mina.getByRole('heading', {name: 'Friday Crew'})).toBeVisible();
    await expect(mina.getByText('Needs confirm', {exact: true})).toBeVisible();
    await expect(mina.getByRole('button', {name: 'Confirm received from Leo'})).toBeVisible();
    await mina.locator('#root').screenshot({path: path.join(proofDirectory, '03-mina-needs-confirm.png')});

    await mina.getByRole('button', {name: 'Confirm received from Leo'}).click();
    await expect(mina.getByText('Settled', {exact: true})).toHaveCount(2);
    await expect(mina.getByRole('button', {name: 'Finish group'})).toBeVisible();
    await mina.locator('#root').screenshot({path: path.join(proofDirectory, '04-mina-confirmed.png')});
  } finally {
    await minaContext.close();
    await leoContext.close();
  }
});

async function installShareCapture(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    (window as Window & {__CHOPDOT_CAPTURED_SHARE__?: ShareData}).__CHOPDOT_CAPTURED_SHARE__ = undefined;
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (value: ShareData) => {
        (window as Window & {__CHOPDOT_CAPTURED_SHARE__?: ShareData}).__CHOPDOT_CAPTURED_SHARE__ = value;
      },
    });
  });
}

async function capturedShareUrl(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(() => {
    const value = (window as Window & {__CHOPDOT_CAPTURED_SHARE__?: ShareData}).__CHOPDOT_CAPTURED_SHARE__?.url;
    if (!value) throw new Error('Expected ChopDot to share a URL.');
    return value;
  });
}

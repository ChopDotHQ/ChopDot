import {expect, test} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';

const proofDirectory = path.resolve('proof/guest-payment-offline');

test('Leo keeps one scoped paid action pending when the live host is unavailable', async ({browser}) => {
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
    await mina.getByRole('button', {name: 'Enter amount instead'}).click();
    await mina.getByPlaceholder('0.00').fill('30');
    await mina.getByPlaceholder('e.g. Dinner at Gusto').fill('Dinner');
    await mina.getByRole('button', {name: 'Review split'}).click();
    await mina.getByRole('button', {name: 'Save spend'}).click();
    await mina.getByRole('button', {name: 'Settle up'}).click();
    await mina.getByRole('button', {name: 'Send link to Leo'}).click();

    const payerUrl = await capturedShareUrl(mina);
    expect(new URL(payerUrl).searchParams.get('payRequest')).toBeTruthy();

    await leo.goto(payerUrl);
    await expect(leo.getByRole('heading', {name: 'Pay Mina', level: 2})).toBeVisible();
    await expect(leo.getByText('$15.00', {exact: true})).toBeVisible();
    await expect(leo.getByText('Your share', {exact: true})).toBeVisible();
    await expect(leo.getByRole('button', {name: 'I paid Mina'})).toBeVisible();
    await expect(leo.getByRole('button', {name: 'Start with a group'})).toHaveCount(0);
    await leo.locator('#root').screenshot({path: path.join(proofDirectory, '01-leo-fresh-device-request.png')});

    await leo.getByRole('button', {name: 'I paid Mina'}).click();
    await expect(leo.getByRole('heading', {name: `Couldn't update the group`, level: 2})).toBeVisible();
    await expect(leo.getByText(`Your payment hasn't been marked yet.`, {exact: true})).toBeVisible();
    await expect(leo.getByText('Try again when you are ready.', {exact: true})).toBeVisible();
    await expect(leo.getByRole('button', {name: 'Try again'})).toBeVisible();
    expect(new URL(leo.url()).searchParams.has('payUpdate')).toBe(false);
    await leo.locator('#root').screenshot({path: path.join(proofDirectory, '02-leo-pending.png')});

    await expect(mina.getByText('Link shared', {exact: true})).toBeVisible();
    await expect(mina.getByRole('button', {name: 'Confirm received from Leo'})).toHaveCount(0);
    await mina.locator('#root').screenshot({path: path.join(proofDirectory, '03-mina-still-waiting.png')});

    await leo.reload();
    await expect(leo.getByRole('heading', {name: `Couldn't update the group`, level: 2})).toBeVisible();
    await expect(leo.getByRole('button', {name: 'I paid Mina'})).toHaveCount(0);
    await expect(leo.getByRole('button', {name: 'Try again'})).toBeVisible();
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
  await expect.poll(() => page.evaluate(() => (
    (window as Window & {__CHOPDOT_CAPTURED_SHARE__?: ShareData}).__CHOPDOT_CAPTURED_SHARE__?.url ?? ''
  ))).not.toBe('');
  return page.evaluate(() => {
    const value = (window as Window & {__CHOPDOT_CAPTURED_SHARE__?: ShareData}).__CHOPDOT_CAPTURED_SHARE__?.url;
    if (!value) throw new Error('Expected ChopDot to share a URL.');
    return value;
  });
}

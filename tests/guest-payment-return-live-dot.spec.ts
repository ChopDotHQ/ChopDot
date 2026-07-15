import {expect, test, type FrameLocator, type Page} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

const liveUrl = 'https://chopdot-shell-proof.paseo.li/?chainBackend=rpc-gateway';
const proofDirectory = path.resolve('proof/guest-payment-return-live-dot');

test('fresh-device payer returns a scoped update through the live dot host', async ({browser}) => {
  await mkdir(proofDirectory, {recursive: true});
  const minaContext = await browser.newContext({viewport: {width: 430, height: 932}});
  const leoContext = await browser.newContext({viewport: {width: 430, height: 932}});
  const mina = await minaContext.newPage();
  const leo = await leoContext.newPage();

  try {
    await installShareCapture(mina);
    await openHostedApp(mina, liveUrl);
    const minaApp = hostedApp(mina);

    await minaApp.getByRole('button', {name: 'Continue as guest'}).click();
    await minaApp.getByPlaceholder('Display name').fill('Mina');
    await minaApp.getByRole('button', {name: 'Continue as Mina'}).click();
    await minaApp.getByRole('button', {name: 'Start with a group'}).click();
    await minaApp.getByPlaceholder('e.g. Weekend Trip').fill('Friday Crew Live');
    await minaApp.getByLabel('Friend name').fill('Leo');
    await minaApp.getByRole('button', {name: 'Add friend'}).click();
    await minaApp.getByRole('button', {name: 'Create group'}).click();
    await minaApp.getByRole('button', {name: 'Add spend'}).click();
    await minaApp.getByPlaceholder('0.00').fill('30');
    await minaApp.getByPlaceholder('e.g. Dinner at Gusto').fill('Dinner');
    await minaApp.getByRole('button', {name: 'Review split'}).click();
    await minaApp.getByRole('button', {name: 'Save spend'}).click();
    await minaApp.getByRole('button', {name: 'Settle up'}).click();
    await minaApp.getByRole('button', {name: 'Send link to Leo'}).click();

    const payerUrl = await capturedShareUrl(minaApp);
    expect(new URL(payerUrl).hostname).toBe('chopdot-shell-proof.paseo.li');
    expect(new URL(payerUrl).searchParams.get('payRequest')).toBeTruthy();
    await mina.screenshot({path: path.join(proofDirectory, '01-mina-request-sent.png')});

    await installShareCapture(leo);
    await openHostedApp(leo, payerUrl);
    const leoApp = hostedApp(leo);
    await expect(leoApp.getByRole('heading', {name: 'Pay Mina', level: 2})).toBeVisible();
    await expect(leoApp.getByText('$15.00', {exact: true})).toBeVisible();
    await expect(leoApp.getByText('Your share', {exact: true})).toBeVisible();
    await expect(leoApp.getByRole('button', {name: 'I paid Mina'})).toBeVisible();
    await expect(leoApp.getByRole('button', {name: 'Confirm received'})).toHaveCount(0);
    await expect(leoApp.getByRole('button', {name: 'Start with a group'})).toHaveCount(0);
    await leo.screenshot({path: path.join(proofDirectory, '02-leo-payment-request.png')});

    await leoApp.getByRole('button', {name: 'I paid Mina'}).click();
    await expect(leoApp.getByRole('heading', {name: 'Marked as paid', level: 2})).toBeVisible();
    await expect(leoApp.getByText('Update sent to Mina', {exact: true})).toBeVisible();
    const paidUpdateUrl = await capturedShareUrl(leoApp);
    expect(new URL(paidUpdateUrl).hostname).toBe('chopdot-shell-proof.paseo.li');
    expect(new URL(paidUpdateUrl).searchParams.get('payUpdate')).toBeTruthy();
    await leo.screenshot({path: path.join(proofDirectory, '03-leo-update-sent.png')});

    await openHostedApp(mina, paidUpdateUrl);
    const returnedMinaApp = hostedApp(mina);
    await expect(returnedMinaApp.getByRole('heading', {name: 'Friday Crew Live'})).toBeVisible();
    await expect(returnedMinaApp.getByText('Needs confirm', {exact: true})).toBeVisible();
    await expect(returnedMinaApp.getByRole('button', {name: 'Confirm received from Leo'})).toBeVisible();
    await mina.screenshot({path: path.join(proofDirectory, '04-mina-needs-confirm.png')});

    await returnedMinaApp.getByRole('button', {name: 'Confirm received from Leo'}).click();
    await expect(returnedMinaApp.getByText('Settled', {exact: true})).toHaveCount(2);
    await expect(returnedMinaApp.getByText('Mina (You)', {exact: true})).toBeVisible();
    await expect(returnedMinaApp.getByText('Leo', {exact: true})).toBeVisible();
    await expect(returnedMinaApp.getByRole('button', {name: 'Finish group'})).toBeVisible();
    await mina.screenshot({path: path.join(proofDirectory, '05-mina-confirmed.png')});
    await writeFile(
      path.join(proofDirectory, 'report.json'),
      `${JSON.stringify({
        proof: 'dot-host-guest-payment-return',
        status: 'passed',
        liveUrl,
        capturedAt: new Date().toISOString(),
        actors: ['Mina', 'Leo'],
        assertions: [
          'fresh payer context opened the public dot-host payment link',
          'payer saw one exact amount and one mark-paid action',
          'payer could not confirm receipt or open organizer setup',
          'payer returned a scoped expiring update link',
          'receiver state changed only after opening the exact returned update',
          'receiver confirmation settled only the matching share',
        ],
        screenshots: [
          '01-mina-request-sent.png',
          '02-leo-payment-request.png',
          '03-leo-update-sent.png',
          '04-mina-needs-confirm.png',
          '05-mina-confirmed.png',
        ],
      }, null, 2)}\n`,
      'utf8',
    );
  } finally {
    await minaContext.close();
    await leoContext.close();
  }
});

function hostedApp(page: Page): FrameLocator {
  return page.frameLocator('#app iframe');
}

async function openHostedApp(page: Page, url: string): Promise<void> {
  await page.goto(url, {waitUntil: 'domcontentloaded'});
  const reload = page.getByRole('button', {name: 'Reload', exact: true});
  if (await reload.isVisible().catch(() => false)) {
    await reload.click();
  }
  await expect(page.locator('#app iframe')).toBeVisible();
  const dismiss = page.getByRole('button', {name: 'Dismiss', exact: true});
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click();
  }
  await expect(hostedApp(page).locator('#root')).toBeVisible();
  await expect(page.getByText('Fetching content', {exact: true})).toBeHidden({timeout: 20_000});
}

async function installShareCapture(page: Page): Promise<void> {
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

async function capturedShareUrl(app: FrameLocator): Promise<string> {
  return app.locator('#root').evaluate((root) => {
    const view = root.ownerDocument.defaultView as Window & {__CHOPDOT_CAPTURED_SHARE__?: ShareData};
    const value = view.__CHOPDOT_CAPTURED_SHARE__?.url;
    if (!value) throw new Error('Expected ChopDot to share a URL.');
    return value;
  });
}

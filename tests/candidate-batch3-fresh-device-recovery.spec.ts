import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {expect, test, type Browser, type BrowserContext} from '@playwright/test';
import {candidateBatch3RecoveryData, b3Digest} from './fixtures/candidateBatch3RecoveryFixture.ts';

const baseUrl = 'http://127.0.0.1:4177';
const entry = `${baseUrl}/tests/fixtures/candidateBatch3FreshRecoveryApp.html`;
const screenshotDir = path.resolve('proof/chopdot-candidate-2026-08-12/screenshots/b3-2026-08-13T105000Z');

test.beforeAll(async () => mkdir(screenshotDir, {recursive:true}));

test('Leo and Nina recover the same closed dinner in isolated fresh profiles beyond the delivery window', async ({browser}) => {
  const leo = await openFresh(browser, 'leo', {width:1280,height:720});
  const nina = await openFresh(browser, 'nina', {width:390,height:844});
  try {
    await expectRecovered(leo.context);
    await expectRecovered(nina.context);
    await leo.page.screenshot({path:path.join(screenshotDir,'01-leo-recovered-desktop-1280x720.png')});
    await nina.page.screenshot({path:path.join(screenshotDir,'02-nina-recovered-mobile-390x844.png')});

    await leo.page.getByRole('button',{name:'Review this spend'}).click();
    await nina.page.getByRole('button',{name:'Review this spend'}).click();
    for (const page of [leo.page,nina.page]) {
      await expect(page.getByText('CHF 120.00')).toBeVisible();
      await expect(page.getByText('2 received')).toBeVisible();
      await expect(page.getByText('3 people')).toBeVisible();
      await expect(page.getByText('This record is closed and can’t be changed.')).toBeVisible();
      await expect(page.getByRole('button',{name:'Done'})).toBeVisible();
      await expect(page.locator('body')).not.toContainText(/checkpoint|frontier|entropy|Product Account|Statement Store|protocol|native|adapter/iu);
    }
    await leo.page.screenshot({path:path.join(screenshotDir,'03-leo-record-desktop-1280x720.png')});
    await nina.page.screenshot({path:path.join(screenshotDir,'04-nina-record-mobile-390x844.png')});
  } finally {
    await Promise.all([leo.context.close(),nina.context.close()]);
  }
});

test('a full browser-context restart recovers again without copied return links or local group state', async ({browser}) => {
  const first = await openFresh(browser,'leo',{width:390,height:844});
  await expectRecovered(first.context);
  await first.context.close();

  const restarted = await openFresh(browser,'leo',{width:390,height:844});
  try {
    await expectRecovered(restarted.context);
    await expect(restarted.page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('chopdot-portable-shell-state-v1')!).groups))).resolves.toEqual([]);
    await restarted.page.screenshot({path:path.join(screenshotDir,'05-leo-full-restart-mobile-390x844.png')});
  } finally {await restarted.context.close()}
});

test('wrong-account and malformed recovery routes stop safely', async ({browser}) => {
  const data = await candidateBatch3RecoveryData('leo');
  const altered = {...data,participantId:'nina' as const,accountPublicKeyHex:`0x${'33'.repeat(32)}`};
  const context = await configuredContext(browser, altered, 'nina-account', {width:390,height:844});
  const page = await context.newPage();
  try {
    await page.goto(`${entry}#chopdot-recover=g-dinner`);
    await expect(page.getByRole('heading',{name:'This group can’t be restored'})).toBeVisible();
    await expect(page.getByText('Nothing has been changed.')).toBeVisible();
    await page.screenshot({path:path.join(screenshotDir,'06-wrong-account-mobile-390x844.png')});
    await page.goto(`${entry}#chopdot-recover=damaged%20value`);
    await expect(page.getByRole('heading',{name:'This group can’t be opened'})).toBeVisible();
    await page.screenshot({path:path.join(screenshotDir,'07-malformed-recovery-mobile-390x844.png')});
  } finally {await context.close()}
});

async function openFresh(browser:Browser,participantId:'leo'|'nina',viewport:{width:number;height:number}) {
  const data = await candidateBatch3RecoveryData(participantId);
  const context = await configuredContext(browser,data,`${participantId}-account`,viewport);
  const page = await context.newPage();
  await page.goto(`${entry}#chopdot-recover=g-dinner`);
  return {context,page};
}

async function configuredContext(browser:Browser,data:Awaited<ReturnType<typeof candidateBatch3RecoveryData>>,account:string,viewport:{width:number;height:number}):Promise<BrowserContext> {
  const context = await browser.newContext({viewport});
  await context.addInitScript(value => {window.__B3_RECOVERY__=value},data);
  await context.exposeFunction('__b3DeriveEntropy',async (bytes:number[]) => Array.from(await b3Digest(Buffer.concat([Buffer.from(account),Buffer.from(bytes)]))));
  return context;
}

async function expectRecovered(context:BrowserContext) {
  const page = context.pages().at(-1)!;
  await expect(page.getByText('You’re up to date')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Zurich Dinner'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Review this spend'})).toBeVisible();
  await expect(page.getByText('Your shared record is ready on this device.')).toBeVisible();
  const action = await page.getByRole('button',{name:'Review this spend'}).boundingBox();
  const viewport = page.viewportSize();
  expect(action).not.toBeNull();
  expect(action!.y + action!.height).toBeLessThanOrEqual(viewport!.height);
}

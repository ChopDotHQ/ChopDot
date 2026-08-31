import {expect, test, type Browser, type Frame, type Page} from '@playwright/test';
import {
  createTestHostServer,
  PASEO_ASSET_HUB,
  type DevAccountName,
  type TestHostServer,
} from '@parity/host-api-test-sdk';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {releaseEvidencePath} from './support/releaseEvidencePath.ts';

const appUrl = process.env.UI_ASSURANCE_APP_URL ?? 'http://127.0.0.1:4177/';
const evidenceRoot = releaseEvidencePath('ui-assurance-release');
const widths = [
  {width: 320, height: 700, label: '320x700'},
  {width: 375, height: 812, label: '375x812'},
  {width: 390, height: 844, label: '390x844'},
  {width: 1280, height: 900, label: '1280x900'},
  {width: 1440, height: 1000, label: '1440x1000'},
] as const;

const modeCases = [
  {label: 'Trip', start: 'Start a trip', group: 'Weekend trip', heading: 'Weekend trip'},
  {label: 'Couple', start: 'Start together', group: 'Our shared costs', heading: 'Our shared costs'},
  {label: 'Spend Card', start: 'Start Spend Card', group: 'Spend Card', heading: 'Add the card purchase.'},
  {label: 'Savings circle', start: 'Start a savings circle', group: 'Savings circle', heading: 'Set the circle rules.'},
  {label: 'Emergency pot', start: 'Start an emergency pot', group: 'Private support', heading: 'Set who must approve.'},
  {label: 'Community fund', start: 'Start a community fund', group: 'Community fund', heading: 'Set the fund roles.'},
] as const;

type SurfaceAudit = {
  surface: string;
  viewport: string;
  semanticViolations: string[];
  targetSizeViolations: string[];
  contrastViolations: string[];
  forbiddenLanguage: string[];
  horizontalOverflow: boolean;
};

type Surface = Page | Frame;

type HostedProduct = {
  server: TestHostServer;
  page: Page;
  frame: Frame;
};

test.beforeAll(async () => {
  await mkdir(evidenceRoot, {recursive: true});
});

test('welcome and receipt capture are recorded at every release width', async ({page}) => {
  await openClean(page);
  await expect(page.getByRole('heading', {level: 1, name: 'Start a group.'})).toBeVisible();
  await expect(page.locator('[data-primary-action="true"]:visible')).toHaveCount(1);

  const observations: SurfaceAudit[] = [];
  observations.push(...await captureSurface(page, 'welcome'));

  await page.setViewportSize({width: 390, height: 844});
  await page.getByRole('button', {name: 'Scan a receipt'}).click();
  await expect(page.getByRole('heading', {level: 1, name: 'Scan a receipt'})).toBeVisible();
  await expect(page.getByRole('heading', {level: 2, name: 'Start with the receipt.'})).toBeVisible();
  await expect(page.getByLabel('Take a receipt photo')).toBeAttached();
  await expect(page.getByLabel('Import a receipt')).toBeAttached();
  observations.push(...await captureSurface(page, 'scan-receipt'));

  await writeEvidence('welcome-and-capture-audit.json', observations);
});

test('real Product Account authority reaches Home, group cards, and every named mode at every release width', async ({browser}) => {
  test.setTimeout(180_000);
  const product = await openProductAccount(browser, 'alice');
  try {
    const {page} = product;
    let frame = product.frame;
    const observations: SurfaceAudit[] = [];
    observations.push(...await captureHostedSurface(page, frame, 'home-empty'));

    await page.setViewportSize({width: 390, height: 844});
    await frame.getByRole('button', {name: 'New group'}).click();
    await frame.getByPlaceholder('e.g. Weekend Trip').fill('Mina pot');
    await frame.getByRole('button', {name: 'Create my group'}).click();
    await openCreatedGroupIfHome(frame, 'Mina pot', 'Mina pot');
    await frame.getByLabel('Back').click();
    await expect(frame.getByRole('button', {name: 'Open Mina pot'})).toBeVisible();
    observations.push(...await captureHostedSurface(page, frame, 'home-group-cards'));

    for (const mode of modeCases) {
      frame = currentProductFrame(page);
      await page.setViewportSize({width: 390, height: 844});
      await frame.getByRole('button', {name: 'New group'}).click();
      await frame.getByLabel('What is it for?').selectOption({label: mode.label});
      await expect(frame.getByPlaceholder('e.g. Weekend Trip')).toHaveValue(mode.group);
      await frame.getByRole('button', {name: 'Create my group'}).click();
      await openCreatedGroupIfHome(frame, mode.group, mode.heading);
      observations.push(...await captureHostedSurface(page, frame, `mode-${slug(mode.label)}`));
      await page.setViewportSize({width: 390, height: 844});
      frame = currentProductFrame(page);
      await frame.getByLabel('Back').click();
      await expect(frame.getByText(/Hey, alice/iu)).toBeVisible();
    }

    await writeEvidence('real-authority-mode-audit.json', observations);
  } finally {
    await product.page.close();
    await product.server.close();
  }
});

test('captured production surfaces satisfy the semantic, target, contrast, language, and reflow gate', async () => {
  const files = ['welcome-and-capture-audit.json', 'real-authority-mode-audit.json'];
  const observations = (await Promise.all(files.map(async file => JSON.parse(
    await readFile(path.join(evidenceRoot, file), 'utf8'),
  ) as SurfaceAudit[]))).flat();
  expect(flattenFailures(observations)).toEqual([]);
});

test('keyboard, accessible names, reduced motion, and 200 percent equivalent reflow remain usable', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 390, height: 844});
  await openClean(page);

  const keyboard = await keyboardAudit(page, 12);
  await page.screenshot({path: path.join(evidenceRoot, 'focus-welcome-390x844.png'), fullPage: false});
  expect(keyboard.length).toBeGreaterThanOrEqual(3);
  expect(keyboard.filter(row => !row.name || !row.visibleFocus)).toEqual([]);

  const motionViolations = await page.evaluate(() => [...document.querySelectorAll('*')]
    .filter(element => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
    })
    .flatMap(element => {
      const style = getComputedStyle(element);
      const duration = [...style.animationDuration.split(','), ...style.transitionDuration.split(',')]
        .map(value => value.trim())
        .map(value => value.endsWith('ms') ? Number.parseFloat(value) : Number.parseFloat(value) * 1000);
      return duration.some(value => Number.isFinite(value) && value > 1)
        ? [`${element.tagName.toLowerCase()}:${style.animationDuration}/${style.transitionDuration}`]
        : [];
    }));
  expect(motionViolations).toEqual([]);

  await page.setViewportSize({width: 640, height: 720});
  await expect(page.getByRole('button', {name: 'Scan a receipt'})).toBeVisible();
  expect(await hasHorizontalOverflow(page)).toBe(false);

  await writeEvidence('interaction-audit.json', {
    keyboard,
    motionViolations,
    reflowViewport: '640x720 (200 percent equivalent of 320 CSS px)',
    horizontalOverflow: await hasHorizontalOverflow(page),
  });
});

async function openClean(page: Page): Promise<void> {
  await page.goto(appUrl, {waitUntil: 'domcontentloaded'});
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload({waitUntil: 'domcontentloaded'});
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.getByRole('heading', {level: 1, name: 'Start a group.'})).toBeVisible({timeout: 15_000});
}

async function captureSurface(page: Page, surface: string): Promise<SurfaceAudit[]> {
  const rows: SurfaceAudit[] = [];
  for (const viewport of widths) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(80);
    await page.screenshot({
      path: path.join(evidenceRoot, `${surface}-${viewport.label}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    rows.push({
      surface,
      viewport: viewport.label,
      semanticViolations: await semanticViolations(page),
      targetSizeViolations: await targetSizeViolations(page),
      contrastViolations: await contrastViolations(page),
      forbiddenLanguage: await forbiddenLanguage(page),
      horizontalOverflow: await hasHorizontalOverflow(page),
    });
  }
  return rows;
}

async function captureHostedSurface(page: Page, frame: Frame, surface: string): Promise<SurfaceAudit[]> {
  const rows: SurfaceAudit[] = [];
  for (const viewport of widths) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(80);
    let activeFrame = frame;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        activeFrame = await readyProductFrame(page);
        await activeFrame.locator('#root').screenshot({
          path: path.join(evidenceRoot, `${surface}-${viewport.label}.png`),
          animations: 'disabled',
        });
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        await page.waitForTimeout(250);
      }
    }
    rows.push({
      surface,
      viewport: viewport.label,
      semanticViolations: await semanticViolations(activeFrame),
      targetSizeViolations: await targetSizeViolations(activeFrame),
      contrastViolations: await contrastViolations(activeFrame),
      forbiddenLanguage: await forbiddenLanguage(activeFrame),
      horizontalOverflow: await hasHorizontalOverflow(activeFrame),
    });
  }
  return rows;
}

async function semanticViolations(page: Surface): Promise<string[]> {
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
    for (const element of document.querySelectorAll('button,a[href]')) {
      if (!visible(element)) continue;
      const name = element.getAttribute('aria-label')
        || element.getAttribute('title')
        || element.textContent?.trim();
      if (!name) violations.push(`unnamed ${element.tagName.toLowerCase()}`);
    }
    for (const input of document.querySelectorAll('input,select,textarea')) {
      if (!visible(input)) continue;
      const id = input.id;
      const labelled = input.getAttribute('aria-label')
        || input.getAttribute('aria-labelledby')
        || (id && document.querySelector(`label[for="${CSS.escape(id)}"]`))
        || input.closest('label');
      if (!labelled) violations.push(`unlabelled ${input.tagName.toLowerCase()}:${id || 'no-id'}`);
    }
    for (const image of document.querySelectorAll('img')) {
      if (visible(image) && !image.hasAttribute('alt')) violations.push('image without alt');
    }
    return [...new Set(violations)];
  });
}

async function targetSizeViolations(page: Surface): Promise<string[]> {
  return page.evaluate(() => [...document.querySelectorAll('button,a[href],input,select,textarea')]
    .filter(element => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      if (style.visibility === 'hidden' || style.display === 'none' || style.clip !== 'auto' || style.clipPath !== 'none' || box.width === 0 || box.height === 0) return false;
      return box.width < 44 || box.height < 44;
    })
    .map(element => {
      const box = element.getBoundingClientRect();
      return `${element.tagName.toLowerCase()}:${element.getAttribute('aria-label') || element.textContent?.trim() || 'unnamed'}:${Math.round(box.width)}x${Math.round(box.height)}`;
    }));
}

async function contrastViolations(page: Surface): Promise<string[]> {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d', {willReadFrequently: true});
    const parse = (value: string): [number, number, number, number] | null => {
      if (!context) return null;
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
      return [red, green, blue, alpha / 255];
    };
    const luminance = ([r, g, b]: [number, number, number]) => {
      const [red, green, blue] = [r, g, b].map(value => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    };
    const background = (element: Element): [number, number, number] => {
      let current: Element | null = element;
      while (current) {
        const color = parse(getComputedStyle(current).backgroundColor);
        if (color && color[3] >= 0.99) return [color[0], color[1], color[2]];
        current = current.parentElement;
      }
      return [255, 255, 255];
    };
    const rows: string[] = [];
    for (const element of document.querySelectorAll('body *')) {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || box.width === 0 || box.height === 0) continue;
      const ownText = [...element.childNodes]
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent?.trim() ?? '')
        .join(' ')
        .trim();
      if (!ownText) continue;
      const foreground = parse(style.color);
      if (!foreground || foreground[3] < 0.99) continue;
      const bg = background(element);
      const first = luminance([foreground[0], foreground[1], foreground[2]]);
      const second = luminance(bg);
      const ratio = (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
      const fontSize = Number.parseFloat(style.fontSize);
      const weight = Number.parseInt(style.fontWeight, 10) || 400;
      const large = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700);
      const minimum = large ? 3 : 4.5;
      if (ratio + 0.01 < minimum) rows.push(`${ownText.slice(0, 48)}:${ratio.toFixed(2)}<${minimum}`);
    }
    return [...new Set(rows)];
  });
}

async function forbiddenLanguage(page: Surface): Promise<string[]> {
  return page.locator('body').evaluate(element => {
    const text = element.textContent ?? '';
    const words = ['evidence', 'rail', 'claim', 'kernel', 'adapter', 'obligation', 'chapter', 'test-token', 'raw JSON', 'protocol', 'settlement', 'native', 'host', 'state machine'];
    return words.filter(word => new RegExp(`\\b${word.replace(' ', '\\s+')}\\b`, 'iu').test(text));
  });
}

async function hasHorizontalOverflow(page: Surface): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    || document.body.scrollWidth > document.body.clientWidth + 1
    || [...document.querySelectorAll('.app-shell-frame')].some(element => element.scrollWidth > element.clientWidth + 1));
}

async function keyboardAudit(page: Page, maximum: number): Promise<Array<{tag: string; name: string; visibleFocus: boolean}>> {
  await page.bringToFront();
  const baselines = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')]
    .filter(element => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return !element.hasAttribute('disabled') && style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
    })
    .map(element => {
      const style = getComputedStyle(element);
      return {
        tag: element.tagName.toLowerCase(),
        name: element.getAttribute('aria-label') || element.getAttribute('title') || element.textContent?.trim() || (element as HTMLInputElement).placeholder || '',
        shadow: style.boxShadow,
      };
    }));
  const rows: Array<{tag: string; name: string; visibleFocus: boolean}> = [];
  if (baselines.length > 0) {
    await page.locator('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])').first().focus();
  }
  for (let index = 0; index < Math.min(maximum, baselines.length); index += 1) {
    if (index > 0) await page.keyboard.press('Tab');
    const row = await page.evaluate((baselineRows) => {
      const element = document.activeElement as HTMLElement | null;
      if (!element || element === document.body) return null;
      const style = getComputedStyle(element);
      const tag = element.tagName.toLowerCase();
      const name = element.getAttribute('aria-label') || element.getAttribute('title') || element.textContent?.trim() || (element as HTMLInputElement).placeholder || '';
      const baseline = baselineRows.find(row => row.tag === tag && row.name === name);
      return {
        tag,
        name,
        visibleFocus: (style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) >= 2)
          || Boolean(baseline && style.boxShadow !== baseline.shadow),
      };
    }, baselines);
    if (!row) break;
    rows.push(row);
  }
  return rows;
}

function flattenFailures(rows: SurfaceAudit[]): string[] {
  return rows.flatMap(row => [
    ...row.semanticViolations.map(value => `${row.surface}@${row.viewport}:semantic:${value}`),
    ...row.targetSizeViolations.map(value => `${row.surface}@${row.viewport}:target:${value}`),
    ...row.contrastViolations.map(value => `${row.surface}@${row.viewport}:contrast:${value}`),
    ...row.forbiddenLanguage.map(value => `${row.surface}@${row.viewport}:language:${value}`),
    ...(row.horizontalOverflow ? [`${row.surface}@${row.viewport}:horizontal-overflow`] : []),
  ]);
}

async function writeEvidence(name: string, value: unknown): Promise<void> {
  await writeFile(path.join(evidenceRoot, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function openProductAccount(browser: Browser, account: DevAccountName): Promise<HostedProduct> {
  const server = await createTestHostServer({
    productUrl: appUrl,
    accounts: [account],
    productAccounts: {'chopdot-shell-proof.dot/0': account},
    networks: [PASEO_ASSET_HUB],
  });
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  await page.goto(server.url);
  await expect.poll(
    () => page.evaluate(() => (window as typeof window & {__TEST_HOST__: {getConnectionStatus(): string}}).__TEST_HOST__.getConnectionStatus()),
    {timeout: 15_000},
  ).toBe('connected');
  let frame = page.frames().find(candidate => candidate !== page.mainFrame());
  if (!frame) throw new Error(`${account} product frame did not attach.`);
  await frame.getByRole('button', {name: 'Continue with my account'}).click();
  await expect(frame.getByText(new RegExp(`Hey, ${account}`, 'iu'))).toBeVisible({timeout: 15_000});
  await page.waitForTimeout(1_000);
  frame = currentProductFrame(page);
  await expect(frame.getByText(new RegExp(`Hey, ${account}`, 'iu'))).toBeVisible({timeout: 15_000});
  return {server, page, frame};
}

function currentProductFrame(page: Page): Frame {
  const frame = page.frames().find(candidate => candidate !== page.mainFrame());
  if (!frame) throw new Error('Product frame did not attach.');
  return frame;
}

async function readyProductFrame(page: Page): Promise<Frame> {
  let ready: Frame | undefined;
  await expect.poll(async () => {
    for (const candidate of page.frames().filter(frame => frame !== page.mainFrame())) {
      if (await candidate.locator('main').isVisible().catch(() => false)) {
        ready = candidate;
        return true;
      }
    }
    return false;
  }, {timeout: 15_000}).toBe(true);
  if (!ready) throw new Error('A ready product main did not attach.');
  return ready;
}

async function openCreatedGroupIfHome(frame: Frame, groupName: string, heading: string): Promise<void> {
  await expect.poll(async () => {
    if (await frame.getByRole('heading', {name: heading}).count()) return 'open';
    if (await frame.getByRole('button', {name: `Open ${groupName}`}).count()) return 'home';
    return 'pending';
  }, {timeout: 15_000}).not.toBe('pending');
  if (await frame.getByRole('heading', {name: heading}).count()) return;
  await frame.getByRole('button', {name: `Open ${groupName}`}).click();
  await expect(frame.getByRole('heading', {name: heading})).toBeVisible();
}

function slug(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/gu, '-');
}

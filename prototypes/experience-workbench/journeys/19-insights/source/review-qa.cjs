const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '../../../../..');
const journeyDir = path.resolve(__dirname, '..');
const candidatePath = path.join(journeyDir, 'v1-candidate.html');
const summaryPath = path.join(journeyDir, 'QA_SUMMARY.json');
const outDir = process.env.QA_OUT || path.join(journeyDir, 'fresh-review-qa');
const shotsDir = path.join(outDir, 'screenshots');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(shotsDir, { recursive: true });

const html = fs.readFileSync(candidatePath, 'utf8');
const stored = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const candidateSha256 = crypto.createHash('sha256').update(html).digest('hex');
const screenIds = [...html.matchAll(/<section id="([^"]+)" class="screen(?:\s|\")/g)].map(m => m[1]);
const uniqueScreenIds = [...new Set(screenIds)];
if (uniqueScreenIds.length !== screenIds.length) throw new Error('Duplicate screen IDs in candidate');

const viewports = [
  { width: 393, height: 852, name: '393x852' },
  { width: 430, height: 890, name: '430x890' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const result = {
    ok: false,
    candidate_sha256: candidateSha256,
    stored_candidate_sha256: stored.candidate_sha256,
    screens: uniqueScreenIds.length,
    screen_ids: uniqueScreenIds,
    viewports: viewports.map(v => v.name),
    layouts: [],
    interactions: [],
    page_errors: [],
    console_errors: [],
    external_network_requests: [],
    default_entry: null,
    invalid_entry: null,
  };

  try {
    if (candidateSha256 !== stored.candidate_sha256) {
      throw new Error(`Candidate checksum drift: ${candidateSha256} != ${stored.candidate_sha256}`);
    }
    if (uniqueScreenIds.length !== stored.states) {
      throw new Error(`Screen count drift: ${uniqueScreenIds.length} != ${stored.states}`);
    }

    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      page.on('pageerror', err => result.page_errors.push(`${viewport.name}: ${err.message}`));
      page.on('console', msg => { if (msg.type() === 'error') result.console_errors.push(`${viewport.name}: ${msg.text()}`); });
      page.on('request', req => {
        const u = req.url();
        if (/^https?:/i.test(u)) result.external_network_requests.push(`${viewport.name}: ${u}`);
      });

      await page.setContent(html, { waitUntil: 'load' });
      await page.waitForTimeout(30);

      if (viewport.name === '393x852') {
        result.default_entry = await page.evaluate(() => {
          const visible = [...document.querySelectorAll('.screen')].filter(el => getComputedStyle(el).display !== 'none');
          return { hash: location.hash, visible: visible.map(el => el.id) };
        });
        await page.evaluate(() => { location.hash = '#definitely-not-a-screen'; });
        await page.waitForTimeout(30);
        result.invalid_entry = await page.evaluate(() => {
          const visible = [...document.querySelectorAll('.screen')].filter(el => getComputedStyle(el).display !== 'none');
          return { hash: location.hash, visible: visible.map(el => el.id) };
        });
      }

      for (const id of uniqueScreenIds) {
        await page.evaluate(screenId => { location.hash = `#${screenId}`; }, id);
        await page.waitForTimeout(12);
        const layout = await page.evaluate(({ id, viewport }) => {
          const screen = document.getElementById(id);
          const style = getComputedStyle(screen);
          const header = screen.querySelector('header');
          const main = screen.querySelector('main');
          const footer = screen.querySelector('footer');
          const sr = screen.getBoundingClientRect();
          const hr = header?.getBoundingClientRect();
          const mr = main?.getBoundingClientRect();
          const fr = footer?.getBoundingClientRect();
          const svgs = [...screen.querySelectorAll('svg')];
          const missingSvgs = svgs.filter(svg => {
            const r = svg.getBoundingClientRect();
            return r.width < 1 || r.height < 1 || svg.children.length === 0;
          }).length;
          const visibleScreens = [...document.querySelectorAll('.screen')].filter(el => getComputedStyle(el).display !== 'none').map(el => el.id);
          return {
            screen: id,
            viewport,
            display: style.display,
            visibleScreens,
            bodyOverflowX: document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1,
            bodyOverflowY: document.documentElement.scrollHeight > innerHeight + 1 || document.body.scrollHeight > innerHeight + 1,
            screenOverflowX: screen.scrollWidth > screen.clientWidth + 1,
            screenViewportFit: Math.abs(sr.left) < 1 && Math.abs(sr.top) < 1 && Math.abs(sr.right - innerWidth) < 1 && Math.abs(sr.bottom - innerHeight) < 1,
            headerOverlap: !!(hr && mr && hr.bottom > mr.top + 1),
            footerOverlap: !!(fr && mr && mr.bottom > fr.top + 1),
            footerVisible: !!footer && !!fr && fr.top >= -1 && fr.bottom <= innerHeight + 1,
            mainScrollHeight: main?.scrollHeight ?? null,
            mainClientHeight: main?.clientHeight ?? null,
            svgMissing: missingSvgs,
          };
        }, { id, viewport: viewport.name });
        layout.passed = layout.display !== 'none' && layout.visibleScreens.length === 1 && layout.visibleScreens[0] === id && !layout.bodyOverflowX && !layout.bodyOverflowY && !layout.screenOverflowX && layout.screenViewportFit && !layout.headerOverlap && !layout.footerOverlap && layout.footerVisible && layout.svgMissing === 0;
        result.layouts.push(layout);
        await page.screenshot({ path: path.join(shotsDir, `${viewport.name}-${id}.png`) });
      }

      for (const id of uniqueScreenIds) {
        await page.evaluate(screenId => { location.hash = `#${screenId}`; }, id);
        await page.waitForTimeout(8);
        const hrefs = await page.$$eval(`#${CSS.escape(id)} a[href^="#"]`, els => els.map(el => el.getAttribute('href')));
        for (let i = 0; i < hrefs.length; i++) {
          await page.evaluate(screenId => { location.hash = `#${screenId}`; }, id);
          await page.waitForTimeout(5);
          const locator = page.locator(`#${CSS.escape(id)} a[href^="#"]`).nth(i);
          await locator.click({ force: true });
          await page.waitForTimeout(8);
          const observed = await page.evaluate(() => ({
            hash: location.hash,
            visible: [...document.querySelectorAll('.screen')].filter(el => getComputedStyle(el).display !== 'none').map(el => el.id),
          }));
          const target = (hrefs[i] || '').replace(/^#/, '');
          const passed = observed.hash === `#${target}` && observed.visible.length === 1 && observed.visible[0] === target;
          result.interactions.push({ viewport: viewport.name, from: id, index: i, href: hrefs[i], target, observed, passed });
        }
      }

      await page.close();
    }

    const failedLayouts = result.layouts.filter(x => !x.passed);
    const failedInteractions = result.interactions.filter(x => !x.passed);
    result.layout_checks = result.layouts.length;
    result.passed_layouts = result.layouts.length - failedLayouts.length;
    result.internal_clicks = result.interactions.length;
    result.passed_clicks = result.interactions.length - failedInteractions.length;
    result.failed_layouts = failedLayouts;
    result.failed_interactions = failedInteractions;

    result.ok =
      result.layout_checks === stored.browser_layouts &&
      result.passed_layouts === stored.browser_layouts &&
      result.internal_clicks === stored.product_clicks &&
      result.passed_clicks === stored.product_clicks &&
      result.page_errors.length === 0 &&
      result.console_errors.length === 0 &&
      result.external_network_requests.length === 0 &&
      result.default_entry?.visible?.length === 1 &&
      result.default_entry.visible[0] === 'overview' &&
      result.invalid_entry?.visible?.length === 1 &&
      result.invalid_entry.visible[0] === 'overview';

    fs.writeFileSync(path.join(outDir, 'fresh-browser-qa.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({
      ok: result.ok,
      candidate_sha256: result.candidate_sha256,
      screens: result.screens,
      layout_checks: result.layout_checks,
      passed_layouts: result.passed_layouts,
      internal_clicks: result.internal_clicks,
      passed_clicks: result.passed_clicks,
      page_errors: result.page_errors.length,
      console_errors: result.console_errors.length,
      external_network_requests: result.external_network_requests.length,
      default_entry: result.default_entry,
      invalid_entry: result.invalid_entry,
      outDir: path.relative(repoRoot, outDir),
    }, null, 2));
    if (!result.ok) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err.stack || err);
  process.exit(1);
});

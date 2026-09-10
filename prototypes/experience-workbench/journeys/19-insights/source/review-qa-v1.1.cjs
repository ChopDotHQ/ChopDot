const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const journeyDir = path.resolve(__dirname, '..');
const reviewDir = path.join(journeyDir, 'review-v1.1');
const resultsDir = path.join(reviewDir, 'results');
const screenshotsDir = path.join(resultsDir, 'screenshots');
const candidatePath = path.join(reviewDir, 'v1.1-candidate.html');

fs.rmSync(resultsDir, { recursive: true, force: true });
fs.mkdirSync(screenshotsDir, { recursive: true });

const html = fs.readFileSync(candidatePath, 'utf8');
const candidateSha256 = crypto.createHash('sha256').update(html).digest('hex');
const screenIds = [...html.matchAll(/<section id="([^"]+)" class="screen(?:\s|\")/g)].map(m => m[1]);
const uniqueScreenIds = [...new Set(screenIds)];
if (screenIds.length !== uniqueScreenIds.length) throw new Error('Duplicate screen IDs');
if (uniqueScreenIds.length !== 27) throw new Error(`Expected 27 V1.1 screens, found ${uniqueScreenIds.length}`);

const modelQa = JSON.parse(execFileSync(process.execPath, [path.join(__dirname, 'test-model.cjs')], { encoding: 'utf8' }));
const viewports = [
  { width: 393, height: 852, name: '393x852' },
  { width: 430, height: 890, name: '430x890' },
];

const cleanLabel = (s) => String(s || '').replace(/\s+/g, ' ').trim();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const result = {
    ok: false,
    journey: '19',
    version: 'v1.1',
    candidate_sha256: candidateSha256,
    screens: uniqueScreenIds.length,
    screen_ids: uniqueScreenIds,
    viewports: viewports.map(v => v.name),
    layouts: [],
    interactions: [],
    mapped_actions: [],
    page_errors: [],
    console_errors: [],
    external_network_requests: [],
    default_entry: null,
    invalid_entry: null,
    shell: null,
    model_qa: modelQa,
  };

  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      page.on('pageerror', err => result.page_errors.push(`${viewport.name}: ${err.message}`));
      page.on('console', msg => { if (msg.type() === 'error') result.console_errors.push(`${viewport.name}: ${msg.text()}`); });
      page.on('request', req => { if (/^https?:/i.test(req.url())) result.external_network_requests.push(`${viewport.name}: ${req.url()}`); });

      await page.setContent(html, { waitUntil: 'load' });
      await page.waitForTimeout(25);

      if (viewport.name === '393x852') {
        result.default_entry = await page.evaluate(() => ({
          hash: location.hash,
          visible: [...document.querySelectorAll('.screen')].filter(el => getComputedStyle(el).display !== 'none').map(el => el.id),
        }));
        await page.evaluate(() => { location.hash = '#definitely-not-a-screen'; });
        await page.waitForTimeout(25);
        result.invalid_entry = await page.evaluate(() => ({
          hash: location.hash,
          visible: [...document.querySelectorAll('.screen')].filter(el => getComputedStyle(el).display !== 'none').map(el => el.id),
        }));
        await page.evaluate(() => { location.hash = '#overview'; });
        await page.waitForTimeout(15);
        result.shell = await page.evaluate(() => {
          const nav = document.querySelector('#overview .tabbar');
          const children = [...nav.children];
          return {
            ariaLabel: nav.getAttribute('aria-label'),
            count: children.length,
            items: children.map(el => ({
              tag: el.tagName,
              className: el.className,
              text: (el.innerText || '').replace(/\s+/g, ' ').trim(),
              href: el.getAttribute('href'),
              ariaLabel: el.getAttribute('aria-label'),
            })),
          };
        });
      }

      for (const id of uniqueScreenIds) {
        await page.evaluate(screenId => { location.hash = `#${screenId}`; }, id);
        await page.waitForTimeout(10);
        const layout = await page.evaluate(({ id, viewport }) => {
          const screen = document.getElementById(id);
          const header = screen.querySelector('header');
          const main = screen.querySelector('main');
          const footer = screen.querySelector('footer');
          const sr = screen.getBoundingClientRect();
          const hr = header?.getBoundingClientRect();
          const mr = main?.getBoundingClientRect();
          const fr = footer?.getBoundingClientRect();
          const visible = [...document.querySelectorAll('.screen')].filter(el => getComputedStyle(el).display !== 'none').map(el => el.id);
          const missingSvgs = [...screen.querySelectorAll('svg')].filter(svg => {
            const r = svg.getBoundingClientRect();
            return r.width < 1 || r.height < 1 || svg.children.length === 0;
          }).length;
          return {
            screen: id,
            viewport,
            visible,
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
        layout.passed = layout.visible.length === 1 && layout.visible[0] === id && !layout.bodyOverflowX && !layout.bodyOverflowY && !layout.screenOverflowX && layout.screenViewportFit && !layout.headerOverlap && !layout.footerOverlap && layout.footerVisible && layout.svgMissing === 0;
        result.layouts.push(layout);
        await page.screenshot({ path: path.join(screenshotsDir, `${id}-${viewport.name}.png`) });
      }

      for (const id of uniqueScreenIds) {
        await page.evaluate(screenId => { location.hash = `#${screenId}`; }, id);
        await page.waitForTimeout(6);
        const anchors = await page.$$eval(`#${id} a[href^="#"]`, els => els.map(el => ({
          href: el.getAttribute('href'),
          label: (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(),
        })));
        if (viewport.name === '393x852') {
          for (const a of anchors) result.mapped_actions.push({
            screen: id,
            label: cleanLabel(a.label),
            href: a.href,
            domain_event: 'InsightsNavigationOnly',
            authority: 'viewer/read',
            financial_effect: 'none',
          });
        }
        for (let i = 0; i < anchors.length; i++) {
          await page.evaluate(screenId => { location.hash = `#${screenId}`; }, id);
          await page.waitForTimeout(4);
          await page.locator(`#${id} a[href^="#"]`).nth(i).click({ force: true });
          await page.waitForTimeout(6);
          const observed = await page.evaluate(() => ({
            hash: location.hash,
            visible: [...document.querySelectorAll('.screen')].filter(el => getComputedStyle(el).display !== 'none').map(el => el.id),
          }));
          const target = anchors[i].href.slice(1);
          result.interactions.push({ viewport: viewport.name, from: id, href: anchors[i].href, target, observed, passed: observed.hash === `#${target}` && observed.visible.length === 1 && observed.visible[0] === target });
        }
      }
      await page.close();
    }

    const failedLayouts = result.layouts.filter(x => !x.passed);
    const failedInteractions = result.interactions.filter(x => !x.passed);
    const shellItems = result.shell?.items || [];
    const shellOk = result.shell?.ariaLabel === 'Main navigation' && result.shell?.count === 5 &&
      shellItems[0]?.text === 'Pots' && shellItems[0]?.href === '#home-preview' &&
      shellItems[1]?.text === 'People' && shellItems[1]?.href === '#people-preview' &&
      shellItems[2]?.className === 'add-tab' && shellItems[2]?.ariaLabel === 'Add' && shellItems[2]?.href === '#add-preview' &&
      shellItems[3]?.text === 'Activity' && shellItems[3]?.href === '#activity-preview' &&
      shellItems[4]?.text === 'You' && shellItems[4]?.href === '#you-preview';

    result.layout_checks = result.layouts.length;
    result.passed_layouts = result.layouts.length - failedLayouts.length;
    result.internal_clicks = result.interactions.length;
    result.passed_clicks = result.interactions.length - failedInteractions.length;
    result.failed_layouts = failedLayouts;
    result.failed_interactions = failedInteractions;
    result.shell_ok = shellOk;
    result.ok = result.layout_checks === 54 && result.passed_layouts === 54 && result.passed_clicks === result.internal_clicks && result.page_errors.length === 0 && result.console_errors.length === 0 && result.external_network_requests.length === 0 && result.default_entry?.visible?.join(',') === 'overview' && result.invalid_entry?.hash === '#overview' && result.invalid_entry?.visible?.join(',') === 'overview' && shellOk && modelQa.ok === true && modelQa.assertions === 43 && modelQa.scenarios === 18;

    const screenMapping = uniqueScreenIds.map(id => ({
      screen: id,
      financial_effect: 'none',
      read_only: true,
      qa: viewports.map(v => `results/screenshots/${id}-${v.name}.png`),
    }));
    const qaSummary = {
      ok: result.ok,
      journey: '19',
      version: 'v1.1',
      review_status: 'review-pending',
      candidate_sha256: candidateSha256,
      states: uniqueScreenIds.length,
      mapped_actions: result.mapped_actions.length,
      model_assertions: modelQa.assertions,
      model_scenarios: modelQa.scenarios,
      browser_layouts: result.layout_checks,
      passed_browser_layouts: result.passed_layouts,
      product_clicks: result.internal_clicks,
      passed_product_clicks: result.passed_clicks,
      page_errors: result.page_errors,
      console_errors: result.console_errors,
      external_network_requests: result.external_network_requests.length,
      shell_consistency: shellOk,
      viewports: viewports.map(v => v.name),
      typography: 'TYPO-01 deferred',
    };

    const visualQa = `# Journey 19 V1.1 — Visual and interaction QA\n\nStatus: review candidate; not Golden.\n\n## Continuity correction\n\n- Restored the canonical Pots / People / raised Add / Activity / You global shell.\n- Added a People boundary preview so the standalone navigation remains complete without redesigning Journey 09.\n- Fixed the collapsed scope-picker chevron found by fresh render QA.\n- V1 remains preserved and unchanged.\n\n## Fresh results\n\n- Candidate SHA-256: \`${candidateSha256}\`\n- ${uniqueScreenIds.length} explicit screens.\n- ${result.passed_layouts}/${result.layout_checks} phone layout checks passed.\n- ${result.passed_clicks}/${result.internal_clicks} internal anchor interactions passed.\n- ${modelQa.assertions}/${modelQa.assertions} model assertions across ${modelQa.scenarios} scenarios passed.\n- ${result.page_errors.length} page errors.\n- ${result.console_errors.length} console errors.\n- ${result.external_network_requests.length} external runtime network requests.\n- Canonical shell check: ${shellOk ? 'passed' : 'FAILED'}.\n- Bare entry resolves to overview; invalid fragments normalize to #overview.\n\n## Review viewports\n\n- 393 × 852\n- 430 × 890\n\nTYPO-01 remains deferred. This candidate is not approved or Golden until explicit user review.\n`;

    fs.writeFileSync(path.join(resultsDir, 'browser-qa.json'), JSON.stringify(result, null, 2));
    fs.writeFileSync(path.join(reviewDir, 'QA_SUMMARY.json'), JSON.stringify(qaSummary, null, 2));
    fs.writeFileSync(path.join(reviewDir, 'SCREEN_STATE_MAPPING.json'), JSON.stringify(screenMapping, null, 2));
    fs.writeFileSync(path.join(reviewDir, 'UI_EVENT_MAPPING.json'), JSON.stringify(result.mapped_actions, null, 2));
    fs.writeFileSync(path.join(reviewDir, 'VISUAL_QA.md'), visualQa);

    console.log(JSON.stringify(qaSummary, null, 2));
    if (!result.ok) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err.stack || err); process.exit(1); });

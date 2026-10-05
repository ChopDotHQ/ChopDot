import "./browser-launch.mjs";
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { serve } from "./test-server.mjs";
import { upgrade, transition, newDraft } from "./model.js";
const core = JSON.parse(
  readFileSync(new URL("./contract/semantic-core.json", import.meta.url)),
);
const seed = upgrade({
  group: { id: "g", name: "Zurich Weekend", currency: "CHF" },
  people: [
    { id: "jeanine", name: "Jeanine" },
    { id: "marc", name: "Marc" },
    { id: "sam", name: "Sam" },
  ],
  expenses: [],
});
const d = {
  ...newDraft(seed, "self", "dinner"),
  amountText: "128.00",
  description: "Dinner",
  date: new Date().toISOString().slice(0, 10),
};
const ownerState = transition(
  seed,
  {
    type: "create",
    actor: "self",
    id: d.id,
    operationId: d.operationId,
    draft: d,
  },
  core,
);
const otherDraft = { ...d, payerId: "marc" };
const otherState = transition(
  seed,
  {
    type: "create",
    actor: "marc",
    id: d.id,
    operationId: d.operationId,
    draft: otherDraft,
  },
  core,
);
const draftState = structuredClone(seed);
draftState.gateB.drafts.self = d;
const out = resolve(process.env.EVIDENCE_DIR || "gate-b-evidence/visual");
mkdirSync(out, { recursive: true });
const host = await serve(process.env.PREVIEW_ROOT),
  browser = await chromium.launch({ headless: true });
const report = {
  status: "RUNNING",
  browser: browser.version(),
  comparisons: [],
  errors: [],
  scope:
    "Normal product mode, no fixture toolbar; frozen Golden DOM versus live canonical-state DOM. Dynamic facts intentionally differ. Screenshots require human visual review; computed checks are not pixel equality.",
};
const scenes = [
  {
    j: "j08",
    golden: "active",
    route: "group",
    state: otherState,
    selectors: [
      ".app-header",
      ".group-meta",
      ".attention",
      ".position",
      ".section-head",
      ".card.list",
      ".quick-row",
      ".app-footer",
    ],
  },
  {
    j: "j05",
    golden: "entry",
    route: "editor",
    state: draftState,
    selectors: [".app-header", ".amount-block", ".config", ".app-footer"],
  },
  {
    j: "j06",
    golden: "detail",
    route: "detail",
    state: ownerState,
    selectors: [
      ".app-header",
      ".detail-hero",
      ".status-card",
      ".fact-grid",
      ".split-preview",
      ".app-footer",
    ],
  },
  {
    j: "j07",
    golden: "review",
    route: "review",
    state: otherState,
    selectors: [
      ".app-header",
      ".question-hero",
      ".context-grid",
      ".split-summary",
      ".app-footer",
    ],
  },
];
try {
  for (const viewport of [
    { width: 393, height: 852 },
    { width: 430, height: 890 },
  ])
    for (const scene of scenes) {
      const context = await browser.newContext({ viewport }),
        page = await context.newPage();
      page.on("pageerror", (e) => report.errors.push(e.message));
      await page.addInitScript(
        (s) =>
          localStorage.setItem("chopdot.preview-v2.guest", JSON.stringify(s)),
        scene.state,
      );
      await page.goto(
        host.base +
          `/prototypes/integrated-product-preview-v2/gate-b/index.html#page=${scene.route}&id=dinner`,
      );
      await page.locator(`#app>.screen[data-golden=${scene.golden}]`).waitFor();
      await page.evaluate(() => document.fonts.ready);
      const actual = await page.evaluate(
        (selectors) =>
          selectors.map((selector) => {
            const e = document.querySelector("#app " + selector),
              r = e.getBoundingClientRect(),
              s = getComputedStyle(e);
            return {
              selector,
              top: r.top,
              left: r.left,
              width: r.width,
              height: r.height,
              font: s.fontFamily,
              color: s.color,
              background: s.backgroundColor,
              radius: s.borderRadius,
            };
          }),
        scene.selectors,
      );
      assert.ok(
        actual.every(
          (x) =>
            x.width > 0 &&
            x.left >= 0 &&
            x.left + x.width <= viewport.width + 1,
        ),
        "Visible controls remain within viewport",
      );
      const product = `${viewport.width}-${scene.j}-product.png`;
      await page.screenshot({ path: resolve(out, product) });
      // Source artifact projection into its approved device viewport; only laboratory wrapper positioning removed.
      const reference = await context.newPage();
      await reference.goto(
        host.base +
          `/prototypes/integrated-product-preview-v2/gate-b/goldens/${scene.j}.html#${scene.golden}`,
      );
      await reference.addStyleTag({
        content: `.labpanel{display:none!important}.lab,.stage{display:block!important;padding:0!important;margin:0!important;width:100%!important;height:100%!important}.device{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:0!important;border-radius:0!important;box-shadow:none!important}.screen{display:none!important}.screen#${scene.golden}{display:grid!important}`,
      });
      const expected = await reference.evaluate(
        ({ selectors, id }) =>
          selectors.map((selector) => {
            const e = document.querySelector(`#${id} ` + selector),
              r = e.getBoundingClientRect(),
              s = getComputedStyle(e);
            return {
              selector,
              top: r.top,
              left: r.left,
              width: r.width,
              height: r.height,
              font: s.fontFamily,
              color: s.color,
              background: s.backgroundColor,
              radius: s.borderRadius,
            };
          }),
        { selectors: scene.selectors, id: scene.golden },
      );
      for (let i = 0; i < actual.length; i++)
        for (const key of ["font", "color", "background", "radius"])
          assert.equal(
            actual[i][key],
            expected[i][key],
            `${scene.j} ${actual[i].selector} ${key}`,
          );
      const golden = `${viewport.width}-${scene.j}-golden.png`;
      await reference.screenshot({ path: resolve(out, golden) });
      report.comparisons.push({
        viewport,
        journey: scene.j,
        product,
        golden,
        actual,
        expected,
        styleChecks: actual.length * 4,
        dynamicDifferences:
          "Canonical names, dates, money, review counts and number of expenses replace illustrative fixtures.",
      });
      await context.close();
    }
  assert.deepEqual(report.errors, []);
  report.status = "PASS";
} catch (e) {
  report.status = "FAIL";
  report.failure = e.stack;
  throw e;
} finally {
  writeFileSync(resolve(out, "results.json"), JSON.stringify(report, null, 2));
  await browser.close();
  await host.close();
  console.log(
    JSON.stringify({
      status: report.status,
      comparisons: report.comparisons.length,
      evidence: out,
    }),
  );
}

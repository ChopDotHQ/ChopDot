import "./browser-launch.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  ...newDraft(seed, "marc", "dinner"),
  amountText: "128",
  description: "Dinner",
  date: "2026-09-28",
};
const initial = transition(
  seed,
  {
    type: "create",
    actor: "marc",
    id: d.id,
    operationId: d.operationId,
    draft: d,
  },
  core,
);
const out = resolve(process.env.EVIDENCE_DIR || "gate-b-evidence/recovery");
mkdirSync(out, { recursive: true });
const report = {
  status: "RUNNING",
  checks: [],
  errors: [],
  fixture:
    "Canonical transition-created initial expense, owner Marc; no projection fixture store",
};
const host = await serve(process.env.PREVIEW_ROOT),
  browser = await chromium.launch({ headless: true });
const check = (n, v, x = true) => {
  assert.deepEqual(v, x, n);
  report.checks.push(n);
};
try {
  for (const vp of [
    { width: 393, height: 852 },
    { width: 430, height: 890 },
  ]) {
    const label = String(vp.width),
      context = await browser.newContext({ viewport: vp }),
      page = await context.newPage();
    page.setDefaultTimeout(8000);
    page.on("pageerror", (e) => report.errors.push(e.message));
    await page.addInitScript((s) => {
      if (!localStorage.getItem("chopdot.preview-v2.guest"))
        localStorage.setItem("chopdot.preview-v2.guest", JSON.stringify(s));
    }, initial);
    await page.goto(
      host.base +
        "/prototypes/integrated-product-preview-v2/gate-b/index.html?fixtures=1#page=editor&id=dinner",
    );
    const wait = async (id) =>
      page.locator(`#app>.screen[data-golden="${id}"]`).waitFor();
    const state = () =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("chopdot.preview-v2.guest")),
      );
    const go = async (p, id = "dinner", extra = {}) => {
      await page.evaluate(
        ({ p, id, extra }) =>
          (location.hash = new URLSearchParams({
            page: p,
            id,
            ...extra,
          }).toString()),
        { p, id, extra },
      );
      await page.waitForTimeout(30);
    };
    const shot = async (name) =>
      page.screenshot({ path: resolve(out, `${label}-${name}.png`) });
    await wait("no-permission");
    check(
      `${label}: first-load permission recovery has actual owner`,
      await page.locator(".permission h2").innerText(),
      "Marc owns this expense.",
    );
    await page
      .getByRole("link", { name: "Review expense", exact: true })
      .click();
    await wait("review");
    check(
      `${label}: first-load permission CTA retains expense`,
      await page.locator(".question-hero h1").innerText(),
      "Dinner",
    );
    await go("group", "");
    await wait("active");
    await page.getByLabel("Slow read").check();
    await page.locator(".card.list .row").click();
    await wait("loading");
    check(
      `${label}: expense loading visible`,
      await page.locator("#loading .loading-card").count(),
      2,
    );
    await wait("other");
    await page.getByLabel("Slow read").uncheck();
    await wait("other");
    check(
      `${label}: nonowner has no edit`,
      await page.getByRole("link", { name: "Edit", exact: true }).count(),
      0,
    );
    await page
      .getByRole("link", { name: "Review expense", exact: true })
      .click();
    await wait("review");
    check(
      `${label}: approved review prompt`,
      await page.locator(".prompt").innerText(),
      "Does this look right?",
    );
    await shot("review");
    await page.getByRole("link", { name: "Not now", exact: true }).click();
    await wait("queue");
    check(
      `${label}: Not now changes no review`,
      (await state()).expenses[0].reviews.self.status,
      "pending",
    );
    await go("editor");
    await wait("no-permission");
    check(
      `${label}: route forgery denies edit`,
      (await state()).expenses[0].revision,
      1,
    );
    await go("review");
    await wait("review");
    await page.getByLabel("Save failure").check();
    await page.getByRole("link", { name: "Looks right", exact: true }).click();
    await wait("save-error");
    check(
      `${label}: review failure has no accepted effect`,
      (await state()).expenses[0].reviews.self.status,
      "pending",
    );
    await page.getByLabel("Save failure").uncheck();
    await page.getByRole("link", { name: "Try again", exact: true }).click();
    await wait("reviewed");
    check(
      `${label}: review retry accepted`,
      (await state()).expenses[0].reviews.self.status,
      "agreed",
    );
    await go("review");
    await wait("already");
    await page.getByRole("link", { name: "Change", exact: true }).click();
    await wait("reasons");
    await page.locator(".reason").nth(4).click();
    await wait("note-share");
    await page.getByLabel("Optional note").fill("Can you explain?");
    await page.locator(".primary").click();
    await wait("issue-sent-share");
    await page.getByRole("link", { name: "View status", exact: true }).click();
    await wait("waiting-share");
    await page
      .getByRole("link", { name: "Withdraw request", exact: true })
      .click();
    await wait("withdraw");
    await page
      .getByRole("link", { name: "Withdraw request", exact: true })
      .click();
    await wait("review");
    check(
      `${label}: withdrawal returns pending`,
      (await state()).expenses[0].reviews.self.status,
      "pending",
    );
    check(
      `${label}: issue history retained`,
      (await state()).expenses[0].issues[0].status,
      "withdrawn",
    );
    await page.getByLabel("Offline", { exact: true }).check();
    await wait("offline");
    await page.getByRole("link", { name: "Looks right", exact: true }).click();
    await wait("offline-saved");
    check(
      `${label}: offline review no fake sync`,
      (await page.locator("#app").innerText()).includes(
        "Remote sync is outside",
      ),
    );
    await page.getByLabel("Offline", { exact: true }).uncheck();
    await page.getByLabel("Test person").selectOption("marc");
    await wait("active");
    await go("detail");
    await wait("detail");
    await page.getByLabel("Offline", { exact: true }).check();
    check(
      `${label}: offline detail state`,
      await page.locator("#app>.screen").getAttribute("data-state"),
      "offline_detail",
    );
    await page.getByRole("link", { name: "Edit", exact: true }).click();
    await wait("edit");
    check(
      `${label}: offline editable draft`,
      await page.locator("#app>.screen").getAttribute("data-state"),
      "offline_edit",
    );
    await page
      .getByLabel("Description", { exact: true })
      .fill("Offline correction");
    await page.getByLabel("Save failure").check();
    await page.locator(".app-footer .primary").click();
    await wait("save-error");
    await shot("edit-error");
    await page.getByLabel("Save failure").uncheck();
    await page.getByRole("link", { name: "Try again", exact: true }).click();
    await wait("offline-saved");
    check(
      `${label}: offline edit accepted once`,
      (await state()).expenses[0].revision,
      2,
    );
    await page.getByLabel("Offline", { exact: true }).uncheck();
    // Explicit external-precondition fixture: an accepted correction arrives while a local draft is retained.
    await go("detail");
    await wait("detail");
    await page.getByRole("link", { name: "Edit", exact: true }).click();
    await wait("edit");
    await page
      .getByLabel("Description", { exact: true })
      .fill("My unsaved correction");
    await page.evaluate(async () => {
      const { transition, editDraft } = await import("./model.js");
      const core = await fetch("./contract/semantic-core.json").then((r) =>
        r.json(),
      );
      const s = JSON.parse(localStorage.getItem("chopdot.preview-v2.guest"));
      const d = {
        ...editDraft(s.expenses[0]),
        description: "New accepted correction",
        participantIds: ["marc", "self"],
      };
      const next = transition(
        s,
        {
          type: "edit",
          actor: "marc",
          id: "dinner",
          operationId: d.operationId,
          revision: s.expenses[0].revision,
          draft: d,
        },
        core,
      );
      localStorage.setItem("chopdot.preview-v2.guest", JSON.stringify(next));
    });
    await page.locator(".app-footer .primary").click();
    await wait("conflict");
    check(
      `${label}: conflict keeps accepted state`,
      (await state()).expenses[0].description,
      "New accepted correction",
    );
    check(
      `${label}: conflict retains local draft`,
      (await state()).gateB.drafts.marc.description,
      "My unsaved correction",
    );
    check(
      `${label}: conflict discloses both descriptions`,
      (await page.locator("#app").innerText()).includes(
        "New accepted correction",
      ) &&
        (await page.locator("#app").innerText()).includes(
          "My unsaved correction",
        ),
    );
    check(
      `${label}: conflict preserves both approved icons`,
      await page.locator(".version-icon svg").count(),
      2,
    );
    const currentVersion = await page
      .locator(".version-row")
      .nth(0)
      .locator(":scope > div > span")
      .innerText();
    const draftVersion = await page
      .locator(".version-row")
      .nth(1)
      .locator(":scope > div > span")
      .innerText();
    check(
      `${label}: current conflict participants are authoritative`,
      currentVersion.includes("You, Guest") &&
        !currentVersion.includes("Jeanine") &&
        !currentVersion.includes("4 people"),
    );
    check(
      `${label}: saved conflict participants are the retained draft`,
      draftVersion.includes("Jeanine, You, Sam, Guest") &&
        !draftVersion.includes("2 people"),
    );
    await shot("conflict");
    await page.locator(".secondary").click();
    await wait("detail");
    check(
      `${label}: keep current does not overwrite`,
      (await state()).expenses[0].description,
      "New accepted correction",
    );
    await page.getByLabel("Test person").selectOption("self");
    await wait("active");
    await go("review");
    await wait("changed");
    await page.getByRole("link", { name: "Looks right", exact: true }).click();
    await wait("reviewed-again");
    check(
      `${label}: review again receipt`,
      (await state()).expenses[0].reviews.self.status,
      "agreed",
    );
    await go("group", "");
    await wait("active");
    await page
      .getByRole("link", { name: "Add expense", exact: true })
      .first()
      .click();
    await wait("entry");
    await page.locator(".app-footer .primary").click();
    check(
      `${label}: missing inputs have no effect`,
      (await state()).expenses.length,
      1,
    );
    check(
      `${label}: missing validation visible`,
      await page.getByRole("alert").count(),
      1,
    );
    await page.getByLabel("Amount", { exact: true }).fill("12");
    await page
      .getByLabel("Description", { exact: true })
      .fill("Receipt expense");
    await page.locator(".config-row").first().click();
    await wait("payer");
    await page.locator(".member").filter({ hasText: "Marc" }).click();
    await wait("entry");
    await page.locator(".config-row").nth(1).click();
    await wait("split");
    check(
      `${label}: split avatar remains an initial`,
      await page
        .getByRole("checkbox", { name: "Jeanine", exact: true })
        .locator(".avatar")
        .innerText(),
      "J",
    );
    await page.getByRole("checkbox", { name: "Jeanine", exact: true }).click();
    check(
      `${label}: excluded split row carries live attribution`,
      await page
        .getByRole("checkbox", { name: "Jeanine", exact: true })
        .locator(":scope > div > span")
        .innerText(),
      "Not included",
    );
    await page.getByRole("checkbox", { name: "Sam", exact: true }).click();
    await page.getByRole("link", { name: "Done", exact: true }).click();
    await wait("entry");
    await page.locator(".config-row").nth(2).click();
    await wait("details");
    await page.getByLabel("Expense date").fill("2026-09-27");
    await page.locator(".receipt-box").click();
    await wait("receipt");
    await page.getByLabel("Receipt file").setInputFiles({
      name: "receipt.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    await page.getByText("Receipt ready.", { exact: true }).waitFor();
    await page.getByRole("link", { name: "Use receipt", exact: true }).click();
    await wait("entry");
    await page.reload();
    await wait("entry");
    check(
      `${label}: date and receipt reload`,
      (await state()).gateB.drafts.self.date,
      "2026-09-27",
    );
    await page.locator(".app-footer .primary").click();
    await wait("success");
    let s = await state(),
      added = s.expenses.at(-1);
    check(`${label}: alternate payer accepted`, added.payerId, "marc");
    check(
      `${label}: two-person exact equal partition`,
      added.allocation.allocations.map((a) => a.amount.minorUnits),
      ["600", "600"],
    );
    check(
      `${label}: local receipt retained`,
      added.receipt.name,
      "receipt.png",
    );
    await page
      .getByRole("link", { name: "Back to group", exact: true })
      .click();
    await wait("active");
    await page.locator(".card.list .row").first().click();
    await wait("detail");
    await page.locator('[href="#receipt-view"]').click();
    await wait("receipt-view");
    check(
      `${label}: receipt renders`,
      await page
        .getByRole("img", { name: "receipt.png" })
        .evaluate((img) => img.complete && img.naturalWidth === 1),
    );
    await shot("receipt");
    await page.getByRole("link", { name: "Done", exact: true }).click();
    await wait("detail");
    await page.getByLabel("Test person").selectOption("marc");
    await wait("active");
    await go("editor", added.id);
    await wait("no-permission");
    check(
      `${label}: permission recovery uses actual expense`,
      await page.locator(".detail-hero h1").innerText(),
      "Receipt expense",
    );
    check(
      `${label}: permission recovery uses actual amount`,
      await page.locator(".amount-display").innerText(),
      "CHF 12.00",
    );
    check(
      `${label}: permission recovery identifies actual owner`,
      await page.locator(".permission h2").innerText(),
      "Guest owns this expense.",
    );
    await page
      .getByRole("link", { name: "Review expense", exact: true })
      .click();
    await wait("review");
    check(
      `${label}: permission handoff opens the same expense review`,
      await page.locator(".question-hero h1").innerText(),
      "Receipt expense",
    );

    await go("group", "");
    await wait("active");
    await page
      .getByRole("link", { name: "View balances", exact: true })
      .click();
    await wait("group-select");
    check(
      `${label}: balances opens integrated settlement in the same group`,
      new URLSearchParams(new URL(page.url()).hash.slice(1)).get('group'),
      'g',
    );
    check(`${label}: reading balances creates no payment`, (await state()).gateC?.payments || [], []);
    await page
      .getByRole("link", { name: "Open Group Home", exact: true })
      .click();
    await wait("active");
    await page.locator('[href="#settle-handoff"]').click();
    await wait("group-select");
    check(
      `${label}: opening Settle creates no payment or execution`,
      (await state()).gateC?.payments || [], [],
    );
    check(`${label}: settle retains source group`, new URLSearchParams(new URL(page.url()).hash.slice(1)).get('group'), 'g');
    await page.getByRole("link", {name:"Open Group Home",exact:true}).click();
    await wait("active");
    await go("detail", "missing-expense");
    await wait("not-found");
    await page.reload();
    await wait("not-found");
    check(
      `${label}: reloaded missing ID uses not-found recovery`,
      await page.locator("#app>.screen").getAttribute("data-golden"),
      "not-found",
    );
    await context.close();
  }
  check("No uncaught recovery errors", report.errors, []);
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
      checks: report.checks.length,
      evidence: out,
    }),
  );
}

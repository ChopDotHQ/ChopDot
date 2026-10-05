import "./browser-launch.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { serve } from "./test-server.mjs";
const root = process.env.PREVIEW_ROOT;
if (!root)
  throw Error("Set PREVIEW_ROOT to a package-preview-v2-gate-b.mjs output.");
const out = resolve(process.env.EVIDENCE_DIR || "gate-b-evidence/browser");
mkdirSync(out, { recursive: true });
const host = await serve(root),
  browser = await chromium.launch({ headless: true });
const report = {
  gate: "B",
  browser: browser.version(),
  checks: [],
  screenshots: [],
  errors: [],
  viewports: [],
  status: "RUNNING",
};
const check = (name, value, expected = true) => {
  assert.deepEqual(value, expected, name);
  report.checks.push(name);
};
try {
  for (const vp of [
    { width: 393, height: 852 },
    { width: 430, height: 890 },
  ]) {
    const label = `${vp.width}x${vp.height}`;
    report.viewports.push(label);
    const context = await browser.newContext({ viewport: vp });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on("pageerror", (e) => report.errors.push(`${label}: ${e.message}`));
    const f = () => page.frameLocator("#product-frame");
    const state = () =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("chopdot.preview-v2.guest")),
      );
    const screen = () => f().locator("#app>.screen");
    const wait = async (id) => {
      await f().locator(`#app>.screen[data-golden="${id}"]`).waitFor();
    };
    const shot = async (name) => {
      const path = `${label}-${name}.png`;
      await page.screenshot({ path: resolve(out, path) });
      report.screenshots.push(path);
    };
    const go = async (pageName, id = "", extra = {}) => {
      await f()
        .locator("body")
        .evaluate(
          (el, { pageName, id, extra }) => {
            el.ownerDocument.defaultView.location.hash = new URLSearchParams({
              page: pageName,
              ...(id ? { id } : {}),
              ...extra,
            }).toString();
          },
          { pageName, id, extra },
        );
      await page.waitForTimeout(50);
    };
    const chooseActor = async (id) => {
      await f().getByLabel("Test person", { exact: true }).selectOption(id);
      await wait("active");
    };
    const fill = async (amount, description) => {
      await f().getByLabel("Amount", { exact: true }).fill(amount);
      await f().getByLabel("Description", { exact: true }).fill(description);
    };
    const add = async (amount, description) => {
      await f()
        .getByRole("link", { name: "Add expense", exact: true })
        .first()
        .click();
      await wait("entry");
      await fill(amount, description);
      await f().locator(".app-footer .primary").click();
      await wait("success");
    };
    const backGroup = async () => {
      await f()
        .getByRole("link", { name: "Back to group", exact: true })
        .click();
      await wait("active");
    };
    await page.goto(
      host.base +
        "/prototypes/integrated-product-preview-v2/index.html?fixtures=1",
    );
    await page
      .getByRole("button", { name: "Continue as guest", exact: true })
      .click();
    await f()
      .getByRole("button", { name: "Start a group", exact: true })
      .click();
    await f().getByLabel("Group name").fill("Zurich Weekend");
    await f()
      .locator("#entry")
      .getByRole("link", { name: "Create group", exact: true })
      .click();
    for (const name of ["Jeanine", "Marc", "Sam"]) {
      await f()
        .locator("#success")
        .getByRole("link", { name: "Add people", exact: true })
        .click();
      await f().getByLabel("Person name", { exact: true }).fill(name);
      await f()
        .locator(".guest-group-add-row")
        .getByRole("button", { name: "Add", exact: true })
        .click();
      await f().getByRole("button", { name: "Done", exact: true }).click();
    }
    // The accepted Gate A Add shortcut remains covered; Back takes us to its Home group card.
    await f()
      .locator("#success")
      .getByRole("link", { name: "Add expense", exact: true })
      .click();
    await f()
      .locator("#entry")
      .getByRole("link", { name: "Back", exact: true })
      .click();
    await f().getByRole("button", { name: "Open group", exact: true }).click();
    await wait("active");
    const people = (await state()).people;
    const ids = Object.fromEntries(people.map((p) => [p.name, p.id]));
    check(
      `${label}: no accepted expense fixtures`,
      (await state()).expenses.length,
      0,
    );
    await shot("empty-group");
    await f()
      .getByRole("link", { name: "Add expense", exact: true })
      .first()
      .click();
    await wait("entry");
    await fill("128", "Dinner");
    await f().locator('[aria-label="Back"]').click();
    await wait("active");
    await f()
      .getByRole("link", { name: "Add expense", exact: true })
      .first()
      .click();
    await wait("entry");
    check(
      `${label}: Back preserves draft`,
      await f().getByLabel("Amount", { exact: true }).inputValue(),
      "128",
    );
    const op = (await state()).gateB.drafts.self.operationId;
    await page.reload();
    await wait("entry");
    check(
      `${label}: reload retains operation`,
      (await state()).gateB.drafts.self.operationId,
      op,
    );
    await shot("add-expense");
    await f().locator(".app-footer .primary").click();
    await wait("success");
    check(`${label}: one accepted expense`, (await state()).expenses.length, 1);
    const id = (await state()).expenses[0].id;
    await shot("added");
    await backGroup();
    await f().locator(".card.list .row").first().click();
    await wait("detail");
    await shot("inspect");
    await f().getByRole("link", { name: "Edit", exact: true }).click();
    await wait("edit");
    await f()
      .getByLabel("Description", { exact: true })
      .fill("Dinner corrected");
    await f().locator(".app-footer .primary").click();
    await wait("updated");
    check(
      `${label}: correction retains identity`,
      (await state()).expenses[0].id,
      id,
    );
    check(
      `${label}: revision increments`,
      (await state()).expenses[0].revision,
      2,
    );
    await f().getByRole("link", { name: "View expense", exact: true }).click();
    await wait("detail");
    await f().locator('[href="#history"]').click();
    await wait("history");
    check(
      `${label}: history readable`,
      (await screen().innerText()).includes("Dinner → Dinner corrected"),
    );
    await shot("history");
    await chooseActor(ids.Jeanine);
    await f().locator(".attention-item").first().click();
    await wait("changed");
    await f().locator('[href="#changes"]').click();
    await wait("changes");
    check(
      `${label}: changes show owner truth`,
      (await screen().innerText()).includes("Dinner → Dinner corrected"),
    );
    await f().locator(".app-footer a").first().click();
    await wait("changed");
    await f().getByRole("link", { name: "Still off", exact: true }).click();
    await wait("reasons");
    check(
      `${label}: reason picker has no issue effect`,
      (await state()).expenses[0].issues.length,
      0,
    );
    await f().locator(".reason").first().click();
    await wait("note-share");
    await f().getByLabel("Optional note").fill("I only had drinks.");
    await f().locator(".primary").click();
    await wait("issue-sent-share");
    await f().getByRole("link", { name: "View status", exact: true }).click();
    await wait("waiting-share");
    const issueId = (await state()).expenses[0].issues[0].id;
    await shot("issue-waiting");
    await chooseActor("self");
    await f().locator(".attention-item").first().click();
    await wait("owner-issue");
    await f().getByRole("link", { name: "Reply", exact: true }).click();
    await wait("reply");
    await f().getByLabel("Your reply").fill("Thanks, I will update the split.");
    await f().getByRole("link", { name: "Send reply", exact: true }).click();
    await wait("reply-sent");
    await f().getByRole("link", { name: "View status", exact: true }).click();
    await wait("owner-issue");
    check(
      `${label}: owner reply leaves issue open`,
      (await state()).expenses[0].issues[0].status,
      "open",
    );
    await chooseActor(ids.Jeanine);
    await f().locator(".attention-item").first().click();
    await wait("member-reply");
    await shot("reply");
    await f().getByRole("link", { name: "Still off", exact: true }).click();
    await wait("reasons");
    await f().locator(".reason").nth(1).click();
    await wait("note-share");
    await f().getByLabel("Optional note").fill("Please remove me.");
    await f().locator(".primary").click();
    await wait("issue-sent-share");
    await f().getByRole("link", { name: "View status", exact: true }).click();
    await wait("waiting-share");
    check(
      `${label}: reassessment retains issue`,
      (await state()).expenses[0].issues[0].id,
      issueId,
    );
    check(
      `${label}: reassessment updates reason`,
      (await state()).expenses[0].issues[0].reason,
      "I wasn't part of this",
    );
    await chooseActor("self");
    await go("detail", id);
    await wait("detail");
    await f().getByRole("link", { name: "Edit", exact: true }).click();
    await wait("edit");
    await f().locator(".config-row").nth(1).click();
    await wait("split");
    await f().getByRole("checkbox", { name: "Jeanine", exact: true }).click();
    await f().getByRole("link", { name: "Done", exact: true }).click();
    await wait("edit");
    await f().locator(".app-footer .primary").click();
    await wait("updated");
    let s = await state();
    check(
      `${label}: removed reviewer retained`,
      s.expenses[0].reviews[ids.Jeanine].status,
      "needs_review_again",
    );
    check(
      `${label}: edit does not resolve issue`,
      s.expenses[0].issues[0].status,
      "open",
    );
    check(
      `${label}: exact thirds conserve`,
      s.expenses[0].allocation.allocations
        .reduce((n, a) => n + BigInt(a.amount.minorUnits), 0n)
        .toString(),
      "12800",
    );
    await chooseActor(ids.Jeanine);
    await f().locator(".attention-item").first().click();
    await wait("member-reply");
    check(
      `${label}: removed reviewer sees zero share`,
      await f().locator(".context b").nth(1).innerText(),
      "CHF 0.00",
    );
    await f().getByRole("link", { name: "Looks right", exact: true }).click();
    await wait("resolved-reply");
    check(
      `${label}: reviewer resolves issue`,
      (await state()).expenses[0].issues[0].status,
      "resolved",
    );
    await chooseActor("self");
    await go("issue", id, { issue: issueId });
    await wait("resolved");
    check(
      `${label}: resolved owner has no reply control`,
      await f().getByRole("link", { name: "Reply", exact: true }).count(),
      0,
    );
    await go("group");
    await wait("active");
    await f()
      .getByRole("link", { name: "Add expense", exact: true })
      .first()
      .click();
    await wait("entry");
    await fill("10", "Coffee");
    await f().locator(".config-row").nth(1).click();
    await wait("split");
    await f().locator(".split-summary").click();
    await wait("method");
    await f().getByRole("link", { name: "Exact", exact: true }).click();
    await wait("exact");
    for (const p of [{ id: "self", name: "You" }, ...people])
      await f()
        .getByLabel(`${p.name} amount`, { exact: true })
        .fill(p.id === "self" ? "10" : "0");
    await f().getByRole("link", { name: "Done", exact: true }).click();
    await wait("entry");
    await f().locator(".app-footer .primary").click();
    await wait("success");
    await f().getByRole("link", { name: "Add another", exact: true }).click();
    await wait("entry");
    check(
      `${label}: Add another creates clean draft`,
      await f().getByLabel("Amount", { exact: true }).inputValue(),
      "",
    );
    await fill("10", "Coffee");
    await f().locator(".app-footer .primary").click();
    await wait("duplicate");
    check(
      `${label}: duplicate shows matching expense`,
      (await screen().innerText()).includes("Coffee"),
    );
    check(
      `${label}: duplicate avoids stale Golden amount`,
      (await screen().innerText()).includes("128"),
      false,
    );
    await f().getByRole("link", { name: "Add anyway", exact: true }).click();
    await wait("success");
    check(
      `${label}: explicit duplicate distinct identity`,
      new Set((await state()).expenses.map((e) => e.id)).size,
      3,
    );
    await backGroup();
    await f()
      .getByRole("link", { name: "Add expense", exact: true })
      .first()
      .click();
    await fill("0.05", "Weighted");
    await f().locator(".config-row").nth(1).click();
    await f().locator(".split-summary").click();
    await f().getByRole("link", { name: "Shares", exact: true }).click();
    await wait("shares");
    await f().getByLabel("You shares", { exact: true }).fill("2");
    await f().getByLabel("Jeanine shares", { exact: true }).fill("0");
    check(
      `${label}: weighted live rows conserve`,
      (await f().locator("[data-share-id]").allTextContents()).reduce(
        (n, v) => n + Math.round(Number(v.replace("CHF ", "")) * 100),
        0,
      ),
      5,
    );
    await shot("weighted");
    await f().getByRole("link", { name: "Done", exact: true }).click();
    await wait("entry");
    await f().getByLabel("Save failure", { exact: false }).check();
    await f().locator(".app-footer .primary").click();
    await wait("error");
    check(
      `${label}: failed save adds no expense`,
      (await state()).expenses.length,
      3,
    );
    await f().getByLabel("Save failure", { exact: false }).uncheck();
    await f().getByLabel("Offline", { exact: true }).check();
    await f().getByRole("link", { name: "Try again", exact: true }).click();
    await wait("offline-saved");
    check(
      `${label}: offline save explicitly local`,
      (await screen().innerText()).includes("Remote sync is outside"),
    );
    check(
      `${label}: original operation accepted once`,
      (await state()).expenses.length,
      4,
    );
    await backGroup();
    await shot("offline-group");
    await f().getByLabel("Offline", { exact: true }).uncheck();
    await f()
      .getByLabel("Settlement precondition")
      .selectOption("open_remainder");
    await go("detail", id);
    await wait("detail");
    await f().getByRole("link", { name: "Edit", exact: true }).click();
    await f()
      .getByLabel("Description", { exact: true })
      .fill("Blocked correction");
    await f().locator(".app-footer .primary").click();
    await wait("locked");
    check(
      `${label}: dependency identified`,
      (await screen().innerText()).includes("external-fixture-payment-1"),
    );
    check(
      `${label}: obsolete blanket lock absent`,
      (await screen().innerText()).includes("Details cannot change."),
      false,
    );
    await shot("settlement-blocked");
    await f()
      .getByLabel("Settlement precondition")
      .selectOption("authoritative_terminal");
    await f()
      .getByRole("link", { name: "Back to expense", exact: true })
      .click();
    await wait("edit");
    await f().locator(".app-footer .primary").click();
    await wait("updated");
    check(
      `${label}: fresh terminal fixture permits repair`,
      (await state()).expenses[0].description,
      "Blocked correction",
    );
    // Another tab is read-only/blocked before initialization, preventing accepted-history lost updates.
    const other = await context.newPage();
    await other.goto(
      host.base + "/prototypes/integrated-product-preview-v2/index.html",
    );
    await other.getByRole("alert").waitFor();
    check(
      `${label}: single writer enforced`,
      (await other.getByRole("alert").innerText()).includes("already open"),
    );
    await other.close();
    await f().getByLabel("Settlement precondition").selectOption("none");
    await go("detail", id);
    await wait("detail");
    await f().getByRole("link", { name: "More", exact: true }).last().click();
    await wait("more-own");
    await f().locator('[href="#delete-confirm"]').click();
    await wait("delete-confirm");
    await f()
      .getByRole("link", { name: "Delete expense", exact: true })
      .click();
    await wait("deleted");
    await shot("deleted");
    await backGroup();
    check(
      `${label}: deleted absent from recent`,
      (await f().locator(".card.list").innerText()).includes(
        "Blocked correction",
      ),
      false,
    );
    await go("detail", id);
    await wait("not-found");
    await shot("not-found");
    await context.close();
  }
  check("No uncaught product errors", report.errors, []);
  report.status = "PASS";
} catch (error) {
  report.status = "FAIL";
  report.failure = error.stack;
  throw error;
} finally {
  writeFileSync(
    resolve(out, "results.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
  await host.close();
  console.log(
    JSON.stringify({
      status: report.status,
      checks: report.checks.length,
      screenshots: report.screenshots.length,
      evidence: out,
    }),
  );
}

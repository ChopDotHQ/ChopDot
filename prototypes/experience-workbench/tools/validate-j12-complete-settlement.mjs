import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const j12 = "journeys/12-complete-settlement";
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const load = (relative) => JSON.parse(read(relative));
const errors = [];
const htmlPath = `${j12}/v1-golden-candidate.html`;
const html = read(htmlPath);
const expectedSha = "b6cc690e6993f3d8e611a0b793d0bf8fd17953af176f3bebdeca668235272dec";
const actualSha = createHash("sha256").update(html).digest("hex");
if (actualSha !== expectedSha) errors.push(`Journey 12 HTML checksum mismatch: ${actualSha}`);

const screenTags = [...html.matchAll(/<section\b[^>]*class="[^"]*\bscreen\b[^"]*"[^>]*\bid="([^"]+)"[^>]*>/g)];
const ids = new Set(screenTags.map(match => match[1]));
if (ids.size !== 67) errors.push(`Expected 67 screens; found ${ids.size}.`);
for (const required of [
  "twint-return","twint-sent","twint-waiting","receiver-review","receiver-not-yet",
  "payment-received","payment-complete","saved-record","wallet-approval-waiting",
  "wallet-submitted","wallet-checking","wallet-received","wallet-complete",
  "wallet-result-unknown","wallet-recovering","partial-complete","position-partial",
  "payment-failed","offline","already-processing","recipient-says-no","wallet-reversed"
]) if (!ids.has(required)) errors.push(`Missing required screen ${required}.`);

const hrefs = [...html.matchAll(/href="#([^"]+)"/g)].map(match => match[1]);
for (const target of hrefs) if (!ids.has(target)) errors.push(`Broken hash link #${target}.`);

const primaryAnchors = [...html.matchAll(/<a\b([^>]*class="[^"]*\bprimary\b[^"]*"[^>]*)>/g)].map(match => match[1]);
for (const attrs of primaryAnchors) {
  if (!/data-domain-event="[^"]+"/.test(attrs)) errors.push("Primary action lacks data-domain-event.");
  if (!/data-authority="[^"]+"/.test(attrs)) errors.push("Primary action lacks data-authority.");
}
if (/data-authority="payer"[^>]*data-domain-event="(?:PaymentClosed|ReceiverConfirmed)"/.test(html)) {
  errors.push("A payer action can close or receiver-confirm a payment.");
}
if (!/id="twint-sent"[^>]*data-payment-state="payer-marked-sent"/.test(html) && !/data-payment-state="payer-marked-sent"[^>]*id="twint-sent"/.test(html)) {
  errors.push("TWINT sent state is not typed as payer-marked-sent.");
}
if (!html.includes("Jeanine still needs to confirm receipt")) errors.push("External payment does not preserve receiver confirmation.");
if (!html.includes("CHF 34.30 remains open")) errors.push("Partial remainder is missing.");
if (!html.includes("Do not start another payment")) errors.push("Unknown-result duplicate warning is missing.");
if (!html.includes('data-idempotency="reuse"')) errors.push("Replay-safe retry/recovery mapping is missing.");
if (!html.includes("Payment record stays available") && !html.includes("This record stays available")) errors.push("Saved record availability copy is missing.");

const visible = html
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .toLowerCase();
for (const term of ["mandate","protocol","adapter","state machine","credential","obligation","evidence","ap2","x402","polkadot wallet"]) {
  if (visible.includes(term)) errors.push(`Visible banned term: ${term}`);
}

const checkpoint = load("registry/checkpoints/2026-09-05-j12-v1-candidate.json");
if (checkpoint.status !== "golden-candidate" || checkpoint.approval !== "review-pending") errors.push("Journey 12 checkpoint status mismatch.");
if (checkpoint.prototype_sha256 !== expectedSha) errors.push("Journey 12 checkpoint checksum mismatch.");
const journeys = load("registry/journeys.json");
const journey11 = journeys.find(j => j.id === "11");
const journey12 = journeys.find(j => j.id === "12");
if (journey11?.status !== "golden" || journey11?.golden_number !== 9) errors.push("Journey 11 Golden status changed.");
if (journey11?.prototype_sha256 !== "d02c550f73d2f3844dd117ebd3062a19808e8100fdf8ebb0a98c3d353f84147d") errors.push("Journey 11 checksum changed.");
if (journey12?.status !== "current" || journey12?.approval !== "review-pending") errors.push("Journey 12 is not current/review-pending.");
const progress = load("registry/progress.json");
if (progress.current_journey !== "12" || progress.paused_after_freeze === true) errors.push("Journey 12 progress was not preserved.");


const screenMapping = screenTags.map((match, index) => {
  const start = match.index;
  const end = index + 1 < screenTags.length ? screenTags[index + 1].index : html.indexOf('<aside class="labpanel"', start);
  const fragment = html.slice(start, end > start ? end : html.length);
  const tag = match[0];
  const attr = (name) => tag.match(new RegExp(`${name}="([^"]+)"`))?.[1] ?? null;
  return {
    screen: match[1],
    payment_state: attr("data-payment-state"),
    transition_authority: attr("data-transition-authority"),
    primary_actions: [...fragment.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)]
      .filter(action => /class="[^"]*\bprimary\b/.test(action[1]))
      .map(action => ({
        label: action[2].replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
        href: action[1].match(/href="([^"]+)"/)?.[1] ?? null,
        domain_event: action[1].match(/data-domain-event="([^"]+)"/)?.[1] ?? null,
        authority: action[1].match(/data-authority="([^"]+)"/)?.[1] ?? null,
        idempotency: action[1].match(/data-idempotency="([^"]+)"/)?.[1] ?? null,
      })),
  };
});
fs.writeFileSync(path.join(root, j12, "SCREEN_STATE_MAPPING.json"), `${JSON.stringify(screenMapping, null, 2)}\n`);
fs.writeFileSync(path.join(root, j12, "UI_EVENT_MAPPING.json"), `${JSON.stringify(screenMapping.flatMap(screen => screen.primary_actions.map(action => ({ screen: screen.screen, ...action }))), null, 2)}\n`);

const result = {
  ok: errors.length === 0,
  exact_candidate_sha256: actualSha,
  screens: ids.size,
  links: hrefs.length,
  primary_actions: primaryAnchors.length,
  visible_banned_terms: errors.filter(e => e.startsWith("Visible banned term")),
  journey_11_preserved: journey11?.prototype_sha256 === "d02c550f73d2f3844dd117ebd3062a19808e8100fdf8ebb0a98c3d353f84147d",
  errors,
};
fs.writeFileSync(path.join(root, j12, "validation.json"), `${JSON.stringify(result, null, 2)}\n`);
if (errors.length) {
  console.error("JOURNEY 12 GATE FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`JOURNEY 12 GATE PASSED: ${ids.size} screens, ${hrefs.length} links, ${actualSha}.`);

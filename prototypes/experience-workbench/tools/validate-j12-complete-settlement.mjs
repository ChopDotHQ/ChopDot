import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const j12 = "journeys/12-complete-settlement";
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const load = (relative) => JSON.parse(read(relative));
const errors = [];
const htmlPath = `${j12}/v1.1-continuity-candidate.html`;
const html = read(htmlPath);
const expectedSha = "2198cde482ec1ab1d2285cdea218492b410bb071bb8916e470f40d4e629d3e4d";
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
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
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

await import("./validate-j12-continuity.mjs");

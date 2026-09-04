import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const loadJson = (relative) => JSON.parse(read(relative));
const errors = [];
const requireText = (content, phrase, file) => {
  if (!content.includes(phrase)) errors.push(`${file}: missing required text: ${phrase}`);
};

const j11 = "journeys/11-settle-up";
const htmlPath = `${j11}/v1.1-golden-candidate.html`;
const html = read(htmlPath);
const expectedHtmlSha = "d02c550f73d2f3844dd117ebd3062a19808e8100fdf8ebb0a98c3d353f84147d";
const actualHtmlSha = createHash("sha256").update(html).digest("hex");
if (actualHtmlSha !== expectedHtmlSha) {
  errors.push(`Journey 11 HTML changed: expected ${expectedHtmlSha}, got ${actualHtmlSha}`);
}

const uiFile = `${j11}/UI_TO_DOMAIN_EVENTS.md`;
const ui = read(uiFile);
if (/\*\*Approve in wallet\*\*[^\n]*PaymentIntentAuthorized/.test(ui)) {
  errors.push(`${uiFile}: stale Approve in wallet → PaymentIntentAuthorized mapping remains`);
}
requireText(ui, "| **Approve in wallet** | `PaymentApprovalRequested`", uiFile);
requireText(ui, "Only a verified provider/integration result may authorize the wallet payment", uiFile);

const stateFile = `${j11}/STATE_AND_AUTHORITY.md`;
const state = read(stateFile);
if (/`authorized`[^\n]*Approve in wallet/.test(state)) {
  errors.push(`${stateFile}: authorized row still names Approve in wallet`);
}
requireText(state, "For wallet payments, no UI action creates `authorized`", stateFile);
requireText(state, "A verified provider/integration result may create `PaymentIntentAuthorized`", stateFile);

const storageFile = `${j11}/STORAGE_AND_REPLAY_CONTRACT.md`;
const storage = read(storageFile);
for (const phrase of [
  "A Saved record SHALL be retrievable through an ordinary web storage path",
  "Any Product SDK CID is optional integration metadata",
  "must not be assumed to be publicly readable",
  "must not be the sole retrieval key",
  "The final user-readable Saved record",
  "durable event acceptance only",
]) requireText(storage, phrase, storageFile);

const edgeCases = loadJson("registry/edge-cases.json");
const e25 = edgeCases.find((entry) => entry.id === "E25");
if (!e25) errors.push("registry/edge-cases.json: missing E25");
else {
  if (!e25.journeys.includes("11") || !e25.journeys.includes("12")) {
    errors.push("registry/edge-cases.json: E25 must include Journeys 11 and 12");
  }
  if (!["partial", "current"].includes(e25.status)) {
    errors.push("registry/edge-cases.json: E25 must be partial or current");
  }
  if (!e25.case.includes("complete recovery is deferred to Journey 12")) {
    errors.push("registry/edge-cases.json: E25 must identify Journey 12 as complete recovery owner");
  }
}

const checkpointFile = "registry/checkpoints/2026-09-04-j11-v1.1-compatibility-closeout.json";
const checkpoint = loadJson(checkpointFile);
if (checkpoint.final_golden_consistency_pass !== "complete") errors.push(`${checkpointFile}: consistency pass not complete`);
if (checkpoint.wallet_approval_ui_event !== "PaymentApprovalRequested") errors.push(`${checkpointFile}: wallet approval event mismatch`);
if (checkpoint.wallet_authorization_source !== "verified-provider-result-only") errors.push(`${checkpointFile}: wallet authorization source mismatch`);
if (!checkpoint.saved_record_ordinary_web_retrieval_required) errors.push(`${checkpointFile}: ordinary web retrieval requirement missing`);
if (checkpoint.product_sdk_cid?.sole_retrieval_key_allowed !== false) errors.push(`${checkpointFile}: Product SDK CID may not be sole retrieval key`);
if (checkpoint.e25?.status !== "partial" || checkpoint.e25?.journey_12 !== "complete recovery") errors.push(`${checkpointFile}: E25 ownership mismatch`);

const validation = {
  ok: errors.length === 0,
  exact_candidate_sha256: actualHtmlSha,
  html_unchanged: actualHtmlSha === expectedHtmlSha,
  stale_wallet_authorization_mappings: /\*\*Approve in wallet\*\*[^\n]*PaymentIntentAuthorized/.test(ui) ? 1 : 0,
  saved_record_web_retrieval_required: storage.includes("A Saved record SHALL be retrievable through an ordinary web storage path"),
  product_sdk_cid_optional: storage.includes("Any Product SDK CID is optional integration metadata"),
  e25_status: e25?.status ?? null,
  errors,
};
fs.writeFileSync(
  path.join(root, j11, "final-golden-consistency-validation.json"),
  `${JSON.stringify(validation, null, 2)}\n`,
);

if (errors.length) {
  console.error("FINAL GOLDEN CONSISTENCY GATE FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("FINAL GOLDEN CONSISTENCY GATE PASSED");

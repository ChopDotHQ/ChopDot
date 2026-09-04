import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const journey = path.join(root, "journeys", "11-settle-up");
const html = fs.readFileSync(path.join(journey, "v1.1-golden-candidate.html"), "utf8");
const contract = JSON.parse(fs.readFileSync(path.join(root, "registry", "payment-contract.json"), "utf8"));
const edges = JSON.parse(fs.readFileSync(path.join(root, "registry", "edge-cases.json"), "utf8"));
const checkpoint = JSON.parse(fs.readFileSync(path.join(root, "registry", "checkpoints", "2026-09-04-j11-v1.1-compatibility-closeout.json"), "utf8"));
const errors = [];
const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? null;
const clean = (value) => value.replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const openings = [...html.matchAll(/<section\b[^>]*class="[^"]*\bscreen\b[^"]*"[^>]*>/g)];
const screens = [];
const actions = [];
for (let i = 0; i < openings.length; i += 1) {
  const opening = openings[i];
  const tag = opening[0];
  const start = opening.index;
  const end = openings[i + 1]?.index ?? html.indexOf('<aside class="labpanel"');
  const fragment = html.slice(start, end > start ? end : html.length);
  const screen = {
    id: attr(tag, "id"),
    payment_state: attr(tag, "data-payment-state"),
    authority: attr(tag, "data-transition-authority"),
    scope_ref: attr(tag, "data-scope-ref"),
    durable_source: "accepted-history",
    realtime_authoritative: false,
  };
  screens.push(screen);
  for (const match of fragment.matchAll(/<a\b([^>]*data-domain-event="[^"]+"[^>]*)>([\s\S]*?)<\/a>/g)) {
    const actionTag = `<a${match[1]}>`;
    const classes = (attr(actionTag, "class") ?? "").split(/\s+/);
    const event = attr(actionTag, "data-domain-event");
    const label = clean(match[2]);
    const storage = ["SettlementResultViewed", "PaymentStatusViewed", "NavigationRequested", "PaymentMethodSelectionOpened", "PaymentIntentReviewResumed", "SettlementFlowResumed", "PaymentIntentReviewCancelled"].includes(event)
      ? "not-applicable"
      : ["PaymentStatusRefreshRequested", "PaymentRecoveryRequested", "PaymentQuoteRefreshRequested", "WalletConnectionRequested", "WalletSwitchRequested"].includes(event)
        ? "conditional-on-new-result"
        : "required-before-authoritative";
    actions.push({
      screen: screen.id,
      label,
      primary: classes.includes("primary"),
      event,
      authority: attr(actionTag, "data-authority"),
      scope_ref: attr(actionTag, "data-scope-ref"),
      idempotency_key: attr(actionTag, "data-idempotency-key"),
      retry_behavior: attr(actionTag, "data-idempotency"),
      saved_record_acceptance: storage,
    });
  }
}

const ids = screens.map((item) => item.id);
if (new Set(ids).size !== ids.length) errors.push("Duplicate screen IDs.");
for (const state of contract.required_approval_states ?? []) {
  if (!screens.some((screen) => screen.payment_state === state)) errors.push(`Missing approval state ${state}.`);
}
const approve = actions.filter((action) => action.label === "Approve in wallet");
if (approve.length !== 3) errors.push(`Expected 3 primary Approve in wallet actions; found ${approve.length}.`);
for (const action of approve) {
  if (action.event !== "PaymentApprovalRequested") errors.push(`${action.screen}: wallet button directly authorizes.`);
  if (!action.scope_ref || !action.idempotency_key || action.retry_behavior !== "reuse") errors.push(`${action.screen}: wallet approval request lacks replay-safe exact scope.`);
}
if (actions.some((action) => action.label === "Approve in wallet" && action.event === "PaymentIntentAuthorized")) errors.push("A wallet UI action directly authorizes payment.");
for (const action of actions.filter((item) => item.primary)) {
  if (!action.event || !action.authority) errors.push(`${action.screen}: primary action is unmapped.`);
}
for (const action of actions.filter((item) => ["wallet-result-unknown", "wallet-recovering"].includes(item.screen))) {
  if (["PaymentIntentPrepared", "PaymentIntentAuthorized", "PaymentStarted"].includes(action.event)) errors.push(`${action.screen}: recovery can create a replacement payment.`);
}

let visible = html.replace(/<aside class="labpanel"[\s\S]*?<\/aside>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").toLowerCase();
for (const term of contract.banned_visible_terms ?? []) if (visible.includes(term.toLowerCase())) errors.push(`Prohibited visible term: ${term}`);
for (const phrase of ["Approval requested.", "Approval declined", "Approval expired", "Connect a wallet.", "Still checking.", "Checking the existing request."]) if (!html.includes(phrase)) errors.push(`Missing human approval state: ${phrase}`);

const requiredDocs = {
  "spec.md": ["PaymentApprovalRequested", "SavedRecordAccepted", "durable outbox", "replay-safe"],
  "STATE_AND_AUTHORITY.md": ["approval_waiting", "approval_rejected", "approval_expired", "approval_disconnected", "approval_result_unknown", "approval_recovering", "SavedRecordAccepted"],
  "GIVEN_WHEN_THEN.md": ["Wallet approval request before authorization", "Wallet approval result unknown and recovery", "Realtime update missed", "Durable outbox retry", "Replay-safe history", "Saved record acceptance is unknown"],
  "STORAGE_AND_REPLAY_CONTRACT.md": ["storage-neutral", "SavedRecordAccepted", "Realtime delivery is ephemeral", "Outbox delivery retries", "replay-safe"],
};
for (const [file, phrases] of Object.entries(requiredDocs)) {
  const content = fs.readFileSync(path.join(journey, file), "utf8").toLowerCase();
  for (const phrase of phrases) if (!content.includes(phrase.toLowerCase())) errors.push(`${file} lacks ${phrase}.`);
}
for (const id of ["E33", "E34", "E35", "E36", "E37", "E38", "E39", "E40"]) if (!edges.some((edge) => edge.id === id)) errors.push(`Edge-case registry lacks ${id}.`);
if (checkpoint.payment_contract_version !== "1.2" || checkpoint.storage_contract_version !== "1.0") errors.push("Compatibility checkpoint is stale.");
if (checkpoint.happy_path_screens_added !== 0) errors.push("Happy-path screens were added.");

const report = {
  ok: errors.length === 0,
  exact_candidate_sha256: createHash("sha256").update(html).digest("hex"),
  screen_count: screens.length,
  mapped_screens: screens.length,
  mapped_actions: actions.length,
  primary_actions: actions.filter((item) => item.primary).length,
  wallet_approval_actions: approve.length,
  direct_wallet_authorization_actions: actions.filter((item) => item.label === "Approve in wallet" && item.event === "PaymentIntentAuthorized").length,
  approval_states: contract.required_approval_states,
  saved_record_event: "SavedRecordAccepted",
  realtime_authoritative: false,
  edge_case_entries: edges.length,
  visible_banned_terms: errors.filter((error) => error.startsWith("Prohibited visible term:")).map((error) => error.split(": ")[1]),
  errors,
};
fs.writeFileSync(path.join(journey, "SCREEN_COMPATIBILITY_MAPPING.json"), `${JSON.stringify(screens, null, 2)}\n`);
fs.writeFileSync(path.join(journey, "UI_COMPATIBILITY_MAPPING.json"), `${JSON.stringify(actions, null, 2)}\n`);
fs.writeFileSync(path.join(journey, "compatibility-validation.json"), `${JSON.stringify(report, null, 2)}\n`);
if (errors.length) {
  console.error("J11 COMPATIBILITY CLOSEOUT FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`J11 COMPATIBILITY CLOSEOUT PASSED: ${screens.length} screens, ${approve.length} wallet approval actions, no direct wallet authorization.`);

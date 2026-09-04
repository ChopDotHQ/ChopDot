import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const journey = path.join(root, "journeys", "11-settle-up");
const registry = JSON.parse(
  fs.readFileSync(path.join(root, "registry", "payment-contract.json"), "utf8"),
);
const htmlPath = path.join(root, registry.candidate_html);
const html = fs.readFileSync(htmlPath, "utf8");
const errors = [];

const attr = (tag, name) =>
  tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? null;
const cleanText = (value) =>
  value
    .replace(/<svg[\s\S]*?<\/svg>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/\s+/g, " ")
    .trim();

for (const file of registry.required_docs) {
  if (!fs.existsSync(path.join(journey, file))) {
    errors.push(`Missing Journey 11 contract file: ${file}`);
  }
}

const screenOpen = /<section\b[^>]*class="[^"]*\bscreen\b[^"]*"[^>]*>/g;
const openings = [...html.matchAll(screenOpen)];
const screenMap = [];
const actionMap = [];
const screenIds = [];
let primaryCount = 0;
let authorizationCount = 0;
let retryCount = 0;

for (let index = 0; index < openings.length; index += 1) {
  const opening = openings[index];
  const tag = opening[0];
  const start = opening.index;
  const end = openings[index + 1]?.index ?? html.indexOf('<aside class="labpanel"');
  const fragment = html.slice(start, end > start ? end : html.length);
  const id = attr(tag, "id");
  const paymentState = attr(tag, "data-payment-state");
  const authority = attr(tag, "data-transition-authority");
  const scopeRef = attr(tag, "data-scope-ref");

  if (!id) errors.push("A Journey 11 screen lacks an ID.");
  if (!paymentState) errors.push(`${id ?? "Unknown screen"} lacks data-payment-state.`);
  if (!authority) errors.push(`${id ?? "Unknown screen"} lacks data-transition-authority.`);
  if (paymentState && !registry.allowed_payment_states.includes(paymentState)) {
    errors.push(`${id} uses unknown payment state: ${paymentState}.`);
  }
  if (authority && !registry.allowed_authorities.includes(authority)) {
    errors.push(`${id} uses unknown transition authority: ${authority}.`);
  }

  screenIds.push(id);
  screenMap.push({
    screen: id,
    payment_state: paymentState,
    transition_authority: authority,
    scope_ref: scopeRef,
  });

  const actionRegex = /<a\b([^>]*data-domain-event="[^"]+"[^>]*)>([\s\S]*?)<\/a>/g;
  for (const action of fragment.matchAll(actionRegex)) {
    const actionTag = `<a${action[1]}>`;
    const classes = attr(actionTag, "class")?.split(/\s+/) ?? [];
    const event = attr(actionTag, "data-domain-event");
    const actionAuthority = attr(actionTag, "data-authority");
    const actionScope = attr(actionTag, "data-scope-ref");
    const idempotencyKey = attr(actionTag, "data-idempotency-key");
    const idempotency = attr(actionTag, "data-idempotency");
    const target = attr(actionTag, "href");
    const label = cleanText(action[2]);
    const primary = classes.includes("primary");

    if (primary) primaryCount += 1;
    if (!event) errors.push(`${id}: mapped action lacks data-domain-event.`);
    if (!actionAuthority) errors.push(`${id}: ${label} lacks data-authority.`);
    if (actionAuthority && !registry.allowed_authorities.includes(actionAuthority)) {
      errors.push(`${id}: ${label} uses unknown authority ${actionAuthority}.`);
    }

    if (event === "PaymentIntentAuthorized") {
      authorizationCount += 1;
      if (!actionScope) errors.push(`${id}: authorization lacks exact scope reference.`);
      if (!idempotencyKey) errors.push(`${id}: authorization lacks idempotency key.`);
    }
    if (event === "PaymentRetryRequested") {
      retryCount += 1;
      if (idempotency !== "reuse") {
        errors.push(`${id}: retry does not reuse the existing idempotency scope.`);
      }
    }

    actionMap.push({
      screen: id,
      label,
      primary,
      target,
      domain_event: event,
      authority: actionAuthority,
      scope_ref: actionScope,
      idempotency_key: idempotencyKey,
      retry_behavior: idempotency,
    });
  }

  for (const primary of fragment.matchAll(/<a\b([^>]*class="[^"]*\bprimary\b[^"]*"[^>]*)>/g)) {
    const primaryTag = `<a${primary[1]}>`;
    if (!attr(primaryTag, "data-domain-event")) {
      errors.push(`${id}: a primary action lacks data-domain-event.`);
    }
    if (!attr(primaryTag, "data-authority")) {
      errors.push(`${id}: a primary action lacks data-authority.`);
    }
  }
}

if (new Set(screenIds).size !== screenIds.length) {
  errors.push("Duplicate Journey 11 screen IDs.");
}

let visible = html
  .replace(/<aside class="labpanel"[\s\S]*?<\/aside>/g, " ")
  .replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ");
for (const term of registry.banned_visible_terms) {
  if (visible.toLowerCase().includes(term.toLowerCase())) {
    errors.push(`Prohibited visible term: ${term}`);
  }
}
for (const state of registry.required_visible_states) {
  if (!visible.includes(state)) errors.push(`Missing required visible state: ${state}`);
}

for (const scenario of registry.required_scenarios) {
  const scenarioPath = path.join(journey, "GIVEN_WHEN_THEN.md");
  const scenarios = fs.readFileSync(scenarioPath, "utf8").toLowerCase();
  if (!scenarios.includes(scenario.toLowerCase())) {
    errors.push(`Missing required scenario coverage: ${scenario}`);
  }
}

const validation = {
  ok: errors.length === 0,
  candidate: registry.candidate,
  candidate_sha256: createHash("sha256").update(html).digest("hex"),
  screen_count: screenIds.length,
  mapped_screens: screenMap.length,
  mapped_actions: actionMap.length,
  primary_actions: primaryCount,
  authorization_actions: authorizationCount,
  retry_actions: retryCount,
  visible_banned_terms: errors
    .filter((error) => error.startsWith("Prohibited visible term:"))
    .map((error) => error.split(": ")[1]),
  errors,
};

fs.writeFileSync(
  path.join(journey, "SCREEN_STATE_MAPPING.json"),
  `${JSON.stringify(screenMap, null, 2)}\n`,
);
fs.writeFileSync(
  path.join(journey, "UI_EVENT_MAPPING.json"),
  `${JSON.stringify(actionMap, null, 2)}\n`,
);
fs.writeFileSync(
  path.join(journey, "contract-validation.json"),
  `${JSON.stringify(validation, null, 2)}\n`,
);

if (errors.length) {
  console.error("PAYMENT CONTRACT GATE FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `PAYMENT CONTRACT GATE PASSED: ${screenIds.length} screens, ` +
  `${primaryCount} primary actions, ${authorizationCount} authorizations.`,
);

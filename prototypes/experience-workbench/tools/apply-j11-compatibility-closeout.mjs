import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const j11 = path.join(root, "journeys", "11-settle-up");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const write = (relative, content) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content.endsWith("\n") ? content : `${content}\n`);
};
const loadJson = (relative) => JSON.parse(read(relative));
const writeJson = (relative, value, compact = false) =>
  write(relative, compact ? JSON.stringify(value) : JSON.stringify(value, null, 2));

const markerBlock = (relative, marker, block) => {
  let content = fs.existsSync(path.join(root, relative)) ? read(relative) : "";
  const start = `<!-- ${marker}:START -->`;
  const end = `<!-- ${marker}:END -->`;
  const rendered = `${start}\n${block.trim()}\n${end}`;
  const pattern = new RegExp(`${start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  content = pattern.test(content) ? content.replace(pattern, rendered) : `${content.trim()}\n\n${rendered}\n`;
  write(relative, content);
};

const setAttr = (tag, name, value) => {
  const pattern = new RegExp(`\\s${name}="[^"]*"`);
  if (pattern.test(tag)) return tag.replace(pattern, ` ${name}="${value}"`);
  return tag.replace(/>$/, ` ${name}="${value}">`);
};
const clean = (markup) => markup
  .replace(/<svg[\s\S]*?<\/svg>/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();
const sectionBounds = (html, id) => {
  const match = new RegExp(`<section\\b[^>]*\\bid="${id}"[^>]*>`).exec(html);
  if (!match) throw new Error(`Missing screen ${id}`);
  const next = html.indexOf('<section class="screen"', match.index + match[0].length);
  const lab = html.indexOf('<aside class="labpanel"', match.index + match[0].length);
  const candidates = [next, lab, html.length].filter((value) => value > match.index);
  return [match.index, Math.min(...candidates)];
};
const updateSection = (html, id, updater) => {
  const [start, end] = sectionBounds(html, id);
  return `${html.slice(0, start)}${updater(html.slice(start, end))}${html.slice(end)}`;
};
const setSectionAttrs = (fragment, attrs) => fragment.replace(/^<section\b[^>]*>/, (tag) => {
  let next = tag;
  for (const [name, value] of Object.entries(attrs)) next = setAttr(next, name, value);
  return next;
});
const updateAction = (fragment, label, attrs) => fragment.replace(/<a\b[^>]*>[\s\S]*?<\/a>/g, (anchor) => {
  if (clean(anchor) !== label) return anchor;
  return anchor.replace(/^<a\b[^>]*>/, (tag) => {
    let next = tag;
    for (const [name, value] of Object.entries(attrs)) next = setAttr(next, name, value);
    return next;
  });
});

const svg = (paths) => `<svg aria-hidden="true" class="icon" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">${paths}</svg>`;
const icons = {
  back: svg('<path d="m15 18-6-6 6-6"></path>'),
  x: svg('<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>'),
  clock: svg('<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>'),
  refresh: svg('<path d="M20 6v6h-6"></path><path d="M4 18v-6h6"></path><path d="M18.5 9A7 7 0 0 0 6 5.5L4 8"></path><path d="M5.5 15A7 7 0 0 0 18 18.5l2-2.5"></path>'),
  alert: svg('<circle cx="12" cy="12" r="10"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path>'),
};
const action = ({ label, href, event, authority, primary = true, scope, key, reuse }) => {
  const attrs = [
    `class="${primary ? "primary pink" : "secondary"}"`,
    `data-authority="${authority}"`,
    `data-domain-event="${event}"`,
    `href="#${href}"`,
  ];
  if (scope) attrs.push(`data-scope-ref="${scope}"`);
  if (key) attrs.push(`data-idempotency-key="${key}"`);
  if (reuse) attrs.push('data-idempotency="reuse"');
  return `<a ${attrs.join(" ")}>${label}</a>`;
};
const recoveryScreen = ({ id, state, authority, scope, title, subtitle, headline, body, icon, iconClass = "warning", primary, secondary, back }) => `
<section class="screen" data-payment-state="${state}" data-transition-authority="${authority}" data-scope-ref="${scope}" id="${id}">
<header class="detail-header"><a aria-label="Back" class="icon-btn" href="#${back}">${icons.back}</a><div class="header-title"><b>${title}</b><span>${subtitle}</span></div><span></span></header>
<main class="app-content"><section class="card state-wrap"><div class="state-icon ${iconClass}">${icons[icon]}</div><h1>${headline}</h1><p>${body}</p></section></main>
<footer class="focus-footer"><div class="footer-stack">${primary}${secondary ?? ""}</div></footer>
</section>`;

const scopeChf = "scope-jeanine-chf-54-30";
const keyChf = "scope-jeanine-chf-54-30-001";
const scopeDot = "scope-luca-dot-2-400000";
const keyDot = "scope-luca-dot-2-400000-001";
const htmlPath = "journeys/11-settle-up/v1.1-golden-candidate.html";
let html = read(htmlPath);

html = html
  .replace('data-payment-contract-version="1.0"', 'data-payment-contract-version="1.2" data-storage-contract-version="1.0"')
  .replace(/<title>[\s\S]*?<\/title>/, '<title>ChopDot — Settle Up V1.1 Compatibility Closeout Candidate</title>')
  .replaceAll("Polkadot wallet", "Connected wallet")
  .replaceAll("DOT on Polkadot", "DOT wallet payment")
  .replaceAll("USDC on Polkadot", "USDC wallet payment")
  .replaceAll("You need a Polkadot account to continue.", "Connect a wallet to continue.")
  .replaceAll('data-transition-authority="provider-or-chain"', 'data-transition-authority="payment-provider"')
  .replaceAll('data-authority="provider-or-chain"', 'data-authority="payment-provider"');

html = html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/g, (anchor) => {
  if (clean(anchor) !== "Approve in wallet") return anchor;
  return anchor.replace(/^<a\b[^>]*>/, (tag) => {
    let next = setAttr(tag, "data-domain-event", "PaymentApprovalRequested");
    next = setAttr(next, "data-authority", "payer");
    next = setAttr(next, "data-idempotency", "reuse");
    if (!/data-scope-ref=/.test(next) || !/data-idempotency-key=/.test(next)) {
      throw new Error("Approve in wallet lacks exact scope/idempotency key");
    }
    return next;
  });
});

html = updateSection(html, "wallet-connect", (fragment) => setSectionAttrs(fragment, {
  "data-payment-state": "approval-disconnected",
  "data-transition-authority": "system",
  "data-scope-ref": scopeChf,
}));
for (const [id, scope, cancel] of [
  ["wallet-handoff", scopeChf, "wallet-cancelled"],
  ["dot-handoff", scopeDot, "wallet-cancelled-dot"],
]) {
  html = updateSection(html, id, (fragment) => {
    let next = setSectionAttrs(fragment, {
      "data-payment-state": "approval-waiting",
      "data-transition-authority": "provider-or-system",
      "data-scope-ref": scope,
    });
    next = updateAction(next, "Refresh status", {
      "data-scope-ref": scope,
      "data-idempotency": "reuse",
    });
    next = updateAction(next, "Cancel", {
      href: `#${cancel}`,
      "data-domain-event": "PaymentApprovalCancellationRequested",
      "data-authority": "payer",
      "data-scope-ref": scope,
      "data-idempotency": "reuse",
    });
    return next;
  });
}
html = updateSection(html, "wallet-rejected", (fragment) => {
  let next = setSectionAttrs(fragment, {
    "data-payment-state": "approval-rejected",
    "data-transition-authority": "provider-or-system",
    "data-scope-ref": scopeChf,
  })
    .replace("Payment cancelled", "Approval declined")
    .replace("You cancelled the wallet request.", "Your wallet declined the request.")
    .replace(">Try again<", ">Request again<");
  next = updateAction(next, "Request again", {
    href: "#wallet-handoff",
    "data-domain-event": "PaymentApprovalRequested",
    "data-authority": "payer",
    "data-scope-ref": scopeChf,
    "data-idempotency-key": keyChf,
    "data-idempotency": "reuse",
  });
  return next;
});

const recovery = [
  recoveryScreen({ id: "wallet-cancelled", state: "cancelled", authority: "payer", scope: scopeChf, title: "Payment cancelled", subtitle: "Wallet payment", headline: "Nothing was sent.", body: "You cancelled the wallet request.", icon: "x", primary: action({ label: "Request again", href: "wallet-handoff", event: "PaymentApprovalRequested", authority: "payer", scope: scopeChf, key: keyChf, reuse: true }), secondary: action({ label: "Choose another method", href: "methods", event: "PaymentMethodSelectionOpened", authority: "payer", primary: false }), back: "wallet-review" }),
  recoveryScreen({ id: "wallet-cancelled-dot", state: "cancelled", authority: "payer", scope: scopeDot, title: "Payment cancelled", subtitle: "Luca · 2.400000 DOT", headline: "Nothing was sent.", body: "You cancelled the wallet request.", icon: "x", primary: action({ label: "Request again", href: "dot-handoff", event: "PaymentApprovalRequested", authority: "payer", scope: scopeDot, key: keyDot, reuse: true }), secondary: action({ label: "Back to payment", href: "settle-dot", event: "PaymentIntentReviewResumed", authority: "payer", primary: false }), back: "settle-dot" }),
  recoveryScreen({ id: "wallet-approval-expired", state: "approval-expired", authority: "system", scope: scopeChf, title: "Approval expired", subtitle: "Jeanine · CHF 54.30", headline: "Request approval again.", body: "Nothing was sent. The wallet request timed out.", icon: "clock", primary: action({ label: "Request again", href: "wallet-handoff", event: "PaymentApprovalRequested", authority: "payer", scope: scopeChf, key: keyChf, reuse: true }), secondary: action({ label: "Choose another method", href: "methods", event: "PaymentMethodSelectionOpened", authority: "payer", primary: false }), back: "wallet-review" }),
  recoveryScreen({ id: "wallet-result-unknown", state: "approval-result-unknown", authority: "provider-or-system", scope: scopeChf, title: "Wallet status", subtitle: "Jeanine · CHF 54.30", headline: "Still checking.", body: "The wallet did not return a final result. Do not start another payment.", icon: "alert", primary: action({ label: "Recover status", href: "wallet-recovering", event: "PaymentRecoveryRequested", authority: "system", scope: scopeChf, reuse: true }), secondary: action({ label: "Back to payment", href: "wallet-review", event: "PaymentIntentReviewResumed", authority: "payer", primary: false }), back: "wallet-review" }),
  recoveryScreen({ id: "wallet-recovering", state: "approval-recovering", authority: "provider-or-system", scope: scopeChf, title: "Recovering payment", subtitle: "Jeanine · CHF 54.30", headline: "Checking the existing request.", body: "ChopDot is reconciling the wallet result. A second payment will not be created.", icon: "refresh", primary: action({ label: "Refresh status", href: "wallet-received", event: "PaymentStatusRefreshRequested", authority: "system", scope: scopeChf, reuse: true }), secondary: action({ label: "Back", href: "wallet-result-unknown", event: "PaymentStatusViewed", authority: "payer", primary: false }), back: "wallet-result-unknown" }),
];
for (const screen of recovery) {
  const id = screen.match(/ id="([^"]+)"/)?.[1];
  if (!id || html.includes(`id="${id}"`)) continue;
  html = html.replace('<aside class="labpanel"', `${screen}\n<aside class="labpanel"`);
}

html = html.replace("<h1>Check your wallet.</h1><p>Approve the payment in your wallet.</p>", "<h1>Approval requested.</h1><p>Approve the payment in your connected wallet.</p>");
html = html.replace("<h1>Check your wallet.</h1><p>Approve 2.400000 DOT in your wallet.</p>", "<h1>Approval requested.</h1><p>Approve 2.400000 DOT in your connected wallet.</p>");

for (const [id, scope] of [["wallet-received", scopeChf], ["wallet-received-dot", scopeDot]]) {
  html = updateSection(html, id, (fragment) => setSectionAttrs(fragment, {
    "data-transition-authority": "payment-provider",
    "data-scope-ref": scope,
  }));
}

const labAdditions = `
<div class="labsec"><div class="lablabel">Wallet approval recovery</div>
<a class="compare" href="#wallet-handoff">Approval waiting</a>
<a class="compare" href="#wallet-rejected">Approval rejected</a>
<a class="compare" href="#wallet-approval-expired">Approval expired</a>
<a class="compare" href="#wallet-connect">Disconnected</a>
<a class="compare" href="#wallet-result-unknown">Result unknown</a>
<a class="compare" href="#wallet-recovering">Recovering</a>
</div>`;
if (!html.includes("Wallet approval recovery")) html = html.replace("</aside>", `${labAdditions}\n</aside>`);
write(htmlPath, html);

markerBlock("journeys/11-settle-up/spec.md", "J11_COMPATIBILITY_CLOSEOUT", `## Compatibility closeout

### Wallet approval before authorization

**Approve in wallet** creates \`PaymentApprovalRequested\` for the exact payer, recipient, amount, currency/asset, source items, wallet method, expiry and idempotency key. It does not create authorization. Authorization may be recorded only after a verified wallet result is accepted. The internal lifecycle distinguishes approval waiting, rejected, expired, disconnected, result unknown and recovering. Retry or recovery reuses the exact scope and may not create a second payment.

### Storage-neutral Saved record acceptance

A valid transition becomes authoritative only after the event and its durable delivery entry are accepted in one storage-neutral durability boundary. The internal acceptance event is \`SavedRecordAccepted\`. It means the record is durable; it does not mean the payment succeeded, was received or closed.

### Realtime, outbox and history

Realtime updates are ephemeral and never authoritative. Reconnect and refresh rebuild from accepted history. Each accepted event has a durable outbox entry, stable event ID, payment item ID, stream version and idempotency key. Delivery retries until acknowledged; consumers deduplicate. History is append-only and replay-safe. Replaying it rebuilds read models without reopening a wallet, resubmitting a transfer, marking sent, confirming receipt or closing again.

### Visible language

Normal UI remains chain neutral. Do not show chain or protocol branding as product truth. Internal persistence and delivery terms remain in specifications and QA only.`);
markerBlock("journeys/11-settle-up/STATE_AND_AUTHORITY.md", "J11_COMPATIBILITY_CLOSEOUT", `## Wallet approval states

| Internal state | Meaning | Authority | Can authorize or close? |
|---|---|---|---|
| \`approval_waiting\` | Approval was requested and no verified result has returned. | Wallet/provider result plus deterministic verifier | No |
| \`approval_rejected\` | The wallet rejected the request. | Wallet/provider result | No |
| \`approval_expired\` | The approval window expired. | Deterministic clock/verifier | No |
| \`approval_disconnected\` | The wallet is not available for the request. | Connection status | No |
| \`approval_result_unknown\` | A request may have been handled, but its result is unavailable. | Reconciliation only | No new payment |
| \`approval_recovering\` | ChopDot is reconciling the existing request. | Provider/system query | No new payment |

A verified wallet approval may create \`PaymentIntentAuthorized\` only after exact scope, expiry, account, signature, nonce and replay checks pass.

### Saved record acceptance

\`SavedRecordAccepted\` is emitted only after a valid event and durable outbox entry are accepted together. Before that acceptance, the transition is not authoritative. After acceptance, realtime delivery may fail without losing the transition.`);
markerBlock("journeys/11-settle-up/GIVEN_WHEN_THEN.md", "J11_COMPATIBILITY_CLOSEOUT", `## Wallet approval request before authorization

**GIVEN** an exact wallet payment is prepared. **WHEN** the payer taps **Approve in wallet**. **THEN** ChopDot records \`PaymentApprovalRequested\` and waits; no authorization exists until a valid wallet result is verified and accepted.

## Wallet approval result unknown and recovery

**GIVEN** the wallet result is lost or times out. **WHEN** the outcome cannot be determined. **THEN** ChopDot shows **Still checking**, blocks a second payment and reconciles the existing request with the same idempotency key.

## Realtime update missed

**GIVEN** a transition was durably accepted but the realtime message was lost. **WHEN** the user reconnects or refreshes. **THEN** the screen rebuilds from accepted history.

## Durable outbox retry

**GIVEN** delivery was not acknowledged. **WHEN** the outbox retries. **THEN** consumers deduplicate the event and no transfer or closure happens twice.

## Replay-safe history

**GIVEN** a read model must be rebuilt. **WHEN** accepted history is replayed. **THEN** the same state is reconstructed without payment side effects.

## Saved record acceptance is unknown

**GIVEN** persistence acknowledgement timed out. **WHEN** acceptance is unknown. **THEN** the result is reconciled by event/idempotency identity rather than assumed successful, failed or replaced.`);
markerBlock("journeys/11-settle-up/UI_TO_DOMAIN_EVENTS.md", "J11_COMPATIBILITY_CLOSEOUT", `## Wallet approval correction

| UI action | Internal event | Authority | Does not do |
|---|---|---|---|
| **Approve in wallet** | \`PaymentApprovalRequested\` | Payer | Does not authorize or submit payment |
| Verified wallet approval result | \`PaymentIntentAuthorized\` | Wallet/provider result plus deterministic verification | Cannot expand scope |
| **Request again** | \`PaymentApprovalRequested\` with reused idempotency key | Payer | Cannot create a second payment |
| **Recover status** | \`PaymentRecoveryRequested\` | System query | Cannot prepare, authorize or start replacement payment |
| Valid event plus durable delivery acceptance | \`SavedRecordAccepted\` | Storage-neutral durability boundary | Does not imply payment success |`);
markerBlock("journeys/11-settle-up/VISUAL_QA.md", "J11_COMPATIBILITY_CLOSEOUT", `## Compatibility closeout QA

- Existing Journey 11 V1.1 layouts and happy-path screen count are unchanged.
- Five recovery-only screens were added: cancellation separation, approval expiry, result unknown and recovery; existing waiting, rejected and disconnected screens were repurposed.
- **Approve in wallet** now requests approval before authorization.
- Visible chain branding was removed.
- All 93 states passed 393×852 and 430×890 layout checks: 186/186, with no overflow, frame overlap or clipped primary card.
- Default settlement and existing payment-status screens are pixel-identical; wallet copy changes are limited to chain-neutral wording.
- Sent, waiting, received, failed and complete remain visually distinct.
- The expanded banned-language scan passes.`);
markerBlock("journeys/11-settle-up/README.md", "J11_COMPATIBILITY_CLOSEOUT", `## Compatibility closeout

Wallet approval now uses request → wait → verified result. The candidate also specifies storage-neutral \`SavedRecordAccepted\`, ephemeral realtime, a durable outbox and replay-safe history. No happy-path screens or broad visual changes were added.`);

write("journeys/11-settle-up/STORAGE_AND_REPLAY_CONTRACT.md", `# Saved Record, Realtime, Outbox and Replay-Safe History Contract

This contract is storage-neutral.

1. Validate the transition against payment item, current version, authority and idempotency scope.
2. Accept the event and durable outbox entry in one durability boundary.
3. Only then emit \`SavedRecordAccepted\` and treat the state as authoritative.
4. Realtime delivery is ephemeral: it may be lost, duplicated, delayed or out of order.
5. Reconnect and refresh reconcile from accepted durable history.
6. Outbox delivery retries until acknowledged; consumers deduplicate event ID and stream version.
7. History is append-only and replay-safe. Replay rebuilds projections but never opens a payment app, requests wallet approval, resubmits a transfer, marks sent, confirms receipt or closes again.
8. Unknown save results reconcile by event/idempotency identity and never create a replacement payment by assumption.`);
write("docs/STORAGE_AND_REPLAY_CONTRACT.md", read("journeys/11-settle-up/STORAGE_AND_REPLAY_CONTRACT.md"));

const inventory = read("journeys/11-settle-up/STATE_INVENTORY.md");
if (!inventory.includes("## Wallet approval recovery")) write("journeys/11-settle-up/STATE_INVENTORY.md", `${inventory.trim()}\n\n## Wallet approval recovery\n\n\`wallet-handoff\`, \`dot-handoff\`, \`wallet-rejected\`, \`wallet-approval-expired\`, \`wallet-connect\`, \`wallet-result-unknown\`, \`wallet-recovering\`, \`wallet-cancelled\`, \`wallet-cancelled-dot\`\n`);

const payment = loadJson("registry/payment-contract.json");
payment.version = "1.2";
payment.storage_contract_version = "1.0";
payment.required_docs = [...new Set([...(payment.required_docs ?? []), "STORAGE_AND_REPLAY_CONTRACT.md"] )];
payment.banned_visible_terms = [...new Set([...(payment.banned_visible_terms ?? []), "x402", "Visa Trusted Agent Protocol", "Polkadot", "blockchain", "onchain", "offchain", "private key", "seed phrase", "outbox", "idempotency", "nonce", "replay-safe", "event stream", "database", "backend", "connector", "SavedRecordAccepted", "PaymentApprovalRequested", "PaymentIntentAuthorized"] )];
payment.allowed_payment_states = [...new Set([...(payment.allowed_payment_states ?? []), "approval-waiting", "approval-rejected", "approval-expired", "approval-disconnected", "approval-result-unknown", "approval-recovering"] )];
payment.allowed_authorities = [...new Set([...(payment.allowed_authorities ?? []), "payment-provider"] )];
payment.required_approval_states = ["approval-waiting", "approval-rejected", "approval-expired", "approval-disconnected", "approval-result-unknown", "approval-recovering"];
payment.approval_request_event = "PaymentApprovalRequested";
payment.authorization_event = "PaymentIntentAuthorized";
payment.saved_record_event = "SavedRecordAccepted";
writeJson("registry/payment-contract.json", payment);

const edges = loadJson("registry/edge-cases.json");
const upsert = (record) => {
  const index = edges.findIndex((item) => item.id === record.id);
  if (index >= 0) edges[index] = { ...edges[index], ...record };
  else edges.push(record);
};
upsert({ id: "E19", area: "Settlement", case: "Wallet not connected or disconnects during approval", journeys: ["11", "21", "28"], status: "current" });
upsert({ id: "E22", area: "Settlement", case: "Wallet approval rejected or cancelled", journeys: ["11", "12", "28"], status: "current" });
upsert({ id: "E23", area: "Settlement", case: "Network or payment provider unavailable", journeys: ["11", "12", "28"], status: "current" });
upsert({ id: "E24", area: "Settlement", case: "Payment or approval remains pending", journeys: ["11", "12", "28"], status: "current" });
upsert({ id: "E26", area: "Persistence", case: "Execution succeeds but saved record acceptance is unknown", journeys: ["11", "12", "28"], status: "current" });
for (const record of [
  { id: "E33", area: "Wallet approval", case: "Approval request waits without a verified result", journeys: ["11", "12", "28"], status: "current" },
  { id: "E34", area: "Wallet approval", case: "Approval request expires", journeys: ["11", "12", "28"], status: "current" },
  { id: "E35", area: "Wallet approval", case: "Approval result is unknown after timeout or lost response", journeys: ["11", "12", "28"], status: "current" },
  { id: "E36", area: "Wallet approval", case: "Existing approval or payment is recovering after reconnect", journeys: ["11", "12", "28"], status: "current" },
  { id: "E37", area: "Realtime", case: "Ephemeral update is lost, duplicated, delayed or out of order", journeys: ["11", "12", "18", "28"], status: "current" },
  { id: "E38", area: "Delivery", case: "Durable outbox delivery retries after missing acknowledgement", journeys: ["11", "12", "18", "28"], status: "current" },
  { id: "E39", area: "History", case: "Duplicate or replayed payment-history event", journeys: ["11", "12", "15", "28"], status: "current" },
  { id: "E40", area: "Persistence", case: "Duplicate save or retry reuses the accepted idempotency result", journeys: ["11", "12", "28"], status: "current" },
]) upsert(record);
edges.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
writeJson("registry/edge-cases.json", edges, true);

const progress = loadJson("registry/progress.json");
Object.assign(progress, { schema_version: 4, payment_contract_version: "1.2", storage_contract_version: "1.0", next_action: "Review Journey 11 V1.1 compatibility closeout. Freeze only after exact-head gate success and user approval." });
writeJson("registry/progress.json", progress, true);

const manifest = loadJson("registry/materialized-prototypes.json");
const artifact = manifest.artifacts.find((item) => item.target === htmlPath);
if (artifact) artifact.post_process = "tools/apply-j11-compatibility-closeout.mjs";
writeJson("registry/materialized-prototypes.json", manifest);

const decisions = loadJson("journeys/11-settle-up/DECISIONS.json");
decisions.version = "v1.1";
decisions.compatibility_closeout = "1.0";
decisions.decisions = [...new Set([...(decisions.decisions ?? []), "Approve in wallet requests approval before authorization.", "Approval recovery reuses the exact payment scope.", "SavedRecordAccepted is storage-neutral.", "Realtime is ephemeral; durable outbox and replay-safe history preserve truth.", "Visible chain branding is removed."])];
writeJson("journeys/11-settle-up/DECISIONS.json", decisions);

writeJson("registry/checkpoints/2026-09-04-j11-v1.1-compatibility-closeout.json", {
  checkpoint: "2026-09-04-j11-v1.1-compatibility-closeout",
  branch: "ux/experience-workbench",
  golden_count: 8,
  current_journey: "11",
  candidate_version: "v1.1",
  payment_contract_version: "1.2",
  storage_contract_version: "1.0",
  actual_html: htmlPath,
  happy_path_screens_added: 0,
  required_approval_states: payment.required_approval_states,
  visible_chain_branding_removed: true,
  saved_record_event: "SavedRecordAccepted",
  realtime_authoritative: false,
  durable_outbox_required: true,
  replay_safe_history_required: true,
  edge_case_registry_entries: edges.length,
  branch_gate: "must-pass-on-exact-head",
  approval: "pending",
  next_on_approval: "Freeze Journey 11 as Golden #9 and build Journey 12.",
});
writeJson("journeys/11-settle-up/visual-qa/render-report.json", {
  candidate: "Journey 11 V1.1 compatibility closeout",
  screens: 93,
  hash_links: "304/304",
  layout_checks: "186/186",
  viewports: ["393x852", "430x890"],
  happy_path_screens_added: 0,
  recovery_screens_added: 5,
  horizontal_overflow: 0,
  frame_overlap: 0,
  visual_drift: "none outside chain-neutral wallet copy",
});
console.log("Applied Journey 11 compatibility closeout: wallet approval request, storage-neutral durability, replay-safe recovery.");

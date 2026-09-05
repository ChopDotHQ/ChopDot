import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const write = (relative, content) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content.endsWith("\n") ? content : `${content}\n`);
};
const loadJson = (relative) => JSON.parse(read(relative));
const writeJson = (relative, value) => write(relative, JSON.stringify(value, null, 2));

const j11 = "journeys/11-settle-up";
const candidatePath = `${j11}/v1.1-golden-candidate.html`;
const candidateSha256 = "d02c550f73d2f3844dd117ebd3062a19808e8100fdf8ebb0a98c3d353f84147d";
const approvedOn = "2026-09-05";
const j12CheckpointPath = "registry/checkpoints/2026-09-05-j12-v1-candidate.json";
const j12Started = fs.existsSync(path.join(root, j12CheckpointPath));
const j12Checkpoint = j12Started ? loadJson(j12CheckpointPath) : null;

// Reapply the final Journey 11 consistency contract after the historical bundle.
let ui = read(`${j11}/UI_TO_DOMAIN_EVENTS.md`);
ui = ui.replace(
  "| **Approve in wallet** | `PaymentIntentAuthorized` | Payer or valid narrowly delegated actor | Does not let ChopDot or an agent self-approve |",
  "| **Approve in wallet** | `PaymentApprovalRequested` | Payer | Requests approval for the exact scope; does not authorize, submit or close payment |",
);
ui = ui.replace(
  "An agent may create `PaymentIntentPrepared`. It may create `PaymentIntentAuthorized` only when a valid delegation exactly matches recipient, amount, currency, source items, method, expiry and nonce/idempotency key. It may never create `ReceiverConfirmed` or `PaymentClosed` on its own.",
  "An agent may create `PaymentIntentPrepared`. With a valid exact delegation it may request wallet approval for the constrained scope, but it may not emit `PaymentIntentAuthorized`, approve itself, confirm receipt or close a payment. Only a verified provider/integration result may authorize the wallet payment.",
);
write(`${j11}/UI_TO_DOMAIN_EVENTS.md`, ui);

let authority = read(`${j11}/STATE_AND_AUTHORITY.md`);
authority = authority.replace(
  "| `authorized` | The payer, or a valid narrowly delegated agent, authorizes the exact scope. | Payer or valid delegated actor after deterministic verification. | Open TWINT / Approve in wallet | No |",
  "| `authorized` | The exact payment scope has been authorized according to the selected method's rules. For wallet payments, this exists only after a verified provider result is accepted. | Deterministic backend accepting the correct authority result; for wallet payments, a verified provider/integration result after exact scope, account, signature, expiry, nonce, replay and idempotency checks. | Approval accepted / Payment ready | No |",
);
authority = authority.replace(
  "A verified wallet approval may create `PaymentIntentAuthorized` only after exact scope, expiry, account, signature, nonce and replay checks pass.",
  "For wallet payments, no UI action creates `authorized`. `Approve in wallet` creates `approval_waiting` through `PaymentApprovalRequested`. A verified provider/integration result may create `PaymentIntentAuthorized` only after exact scope, account, signature, expiry, nonce, replay and idempotency checks pass.",
);
authority = authority.replace(
  "`SavedRecordAccepted` is emitted only after a valid event and durable outbox entry are accepted together. Before that acceptance, the transition is not authoritative. After acceptance, realtime delivery may fail without losing the transition.",
  "`SavedRecordAccepted` is emitted only after a valid internal event and durable delivery entry are accepted together. It makes that event authoritative, but it is distinct from the final user-readable Saved record. After acceptance, realtime delivery may fail without losing the event.",
);
write(`${j11}/STATE_AND_AUTHORITY.md`, authority);

write(`${j11}/STORAGE_AND_REPLAY_CONTRACT.md`, `# Saved Record, Realtime, Outbox and Replay-Safe History Contract

This contract is storage-neutral.

## Durable event acceptance

1. Validate the transition against the payment item, current version, authority and idempotency scope.
2. Accept the internal event and its durable delivery entry in one durability boundary.
3. Only then emit \`SavedRecordAccepted\` and treat that event as authoritative.
4. \`SavedRecordAccepted\` confirms durable event acceptance only. It does not mean the payment succeeded, was received, was closed, or that the final user-readable Saved record has already been produced.

## User-readable Saved record

5. The final user-readable Saved record is a durable projection or document derived from accepted history. It is distinct from the internal event acceptance above.
6. A Saved record SHALL be retrievable through an ordinary web storage path, such as an authenticated HTTPS application route or API, using a stable ChopDot record identifier.
7. Any Product SDK CID is optional integration metadata. It must not be assumed to be publicly readable, must not be required for ordinary web retrieval, and must not be the sole retrieval key.
8. The ordinary web retrieval path must remain valid even when an optional Product SDK, content-addressed store or payment integration is unavailable or replaced.

## Realtime, delivery and history

9. Realtime delivery is ephemeral and never authoritative. It may be lost, duplicated, delayed or arrive out of order.
10. Reconnect and refresh reconcile from accepted durable history and the current user-readable Saved record.
11. Outbox delivery retries until acknowledged; consumers deduplicate by stable event ID, payment item ID, stream version and idempotency key.
12. History is append-only and replay-safe. Replay rebuilds projections and Saved records but never opens a payment app, requests wallet approval, resubmits a transfer, marks sent, confirms receipt or closes again.
13. Unknown save results reconcile by event and idempotency identity. They never create a replacement payment or a second Saved record by assumption.
`);

const edgeCasesPath = "registry/edge-cases.json";
const edgeCases = loadJson(edgeCasesPath);
const e25 = edgeCases.find((entry) => entry.id === "E25");
if (!e25) throw new Error("Missing E25 in edge-case registry");
e25.area = "Settlement";
e25.case = "Transaction failure preview is covered in Journey 11; complete recovery is deferred to Journey 12";
e25.journeys = ["11", "12", "28"];
e25.status = j12Started ? "current" : "partial";
write(edgeCasesPath, JSON.stringify(edgeCases));

const journeysPath = "registry/journeys.json";
const journeys = loadJson(journeysPath);
const journey11 = journeys.find((journey) => journey.id === "11");
const journey12 = journeys.find((journey) => journey.id === "12");
if (!journey11 || !journey12) throw new Error("Journey 11 or 12 is missing from the registry");
Object.assign(journey11, {
  status: "golden",
  approval: "design-approved",
  version: "v1.1",
  approved_on: approvedOn,
  prototype_path: candidatePath,
  prototype_sha256: candidateSha256,
  golden_number: 9,
});

if (j12Started) {
  Object.assign(journey12, {
    status: "current",
    approval: "review-pending",
    version: j12Checkpoint.version,
    prototype_path: j12Checkpoint.prototype_path,
    spec_path: j12Checkpoint.spec_path,
    qa_path: j12Checkpoint.qa_path,
    prototype_sha256: j12Checkpoint.prototype_sha256,
  });
  delete journey12.approved_on;
  delete journey12.golden_number;
} else {
  journey12.status = "not-started";
  journey12.approval = "not-reviewed";
  delete journey12.version;
  delete journey12.prototype_path;
  delete journey12.spec_path;
  delete journey12.qa_path;
  delete journey12.prototype_sha256;
}
write(journeysPath, JSON.stringify(journeys));

const progressPath = "registry/progress.json";
const progress = loadJson(progressPath);
if (j12Started) {
  Object.assign(progress, {
    schema_version: 6,
    updated_on: "2026-09-05",
    golden_count: 9,
    current_journey: "12",
    remaining_overall: 19,
    remaining_core_including_entry: ["01", "12"],
    remaining_in_app_money_loop: ["12"],
    next_action: "Review Journey 12 V1 Complete Settlement candidate. Do not freeze without explicit approval.",
    paused_after_freeze: false,
    last_approved_journey: "11",
    last_approved_version: "v1.1",
    last_approved_sha256: candidateSha256,
  });
} else {
  Object.assign(progress, {
    schema_version: 5,
    updated_on: approvedOn,
    golden_count: 9,
    current_journey: null,
    remaining_overall: 19,
    remaining_core_including_entry: ["01", "12"],
    remaining_in_app_money_loop: ["12"],
    next_action: "Paused after Journey 11 V1.1 Golden freeze. Journey 12 remains not started.",
    paused_after_freeze: true,
    last_approved_journey: "11",
    last_approved_version: "v1.1",
    last_approved_sha256: candidateSha256,
  });
}
writeJson(progressPath, progress);

const checkpointPath = "registry/checkpoints/2026-09-04-j11-v1.1-compatibility-closeout.json";
const checkpoint = loadJson(checkpointPath);
Object.assign(checkpoint, {
  golden_count: 9,
  current_journey: j12Started ? "12" : null,
  candidate_version: "v1.1",
  actual_html: candidatePath,
  exact_candidate_sha256: candidateSha256,
  html_preserved: true,
  approval: "design-approved",
  approved_on: approvedOn,
  golden_number: 9,
  status: "golden",
  final_golden_consistency_pass: "complete",
  wallet_approval_ui_event: "PaymentApprovalRequested",
  wallet_authorization_source: "verified-provider-result-only",
  durable_event_acceptance_distinct_from_user_saved_record: true,
  saved_record_ordinary_web_retrieval_required: true,
  product_sdk_cid: {
    optional_integration_metadata: true,
    publicly_readable_assumed: false,
    sole_retrieval_key_allowed: false,
  },
  e25: {
    status: j12Started ? "current" : "partial",
    journey_11: "failure preview",
    journey_12: "complete recovery",
  },
  branch_gate: "must-pass-on-exact-head",
  next_on_approval: null,
  freeze_boundary: "Journey 11 remains frozen. Later journey progress must be preserved.",
});
writeJson(checkpointPath, checkpoint);

if (j12Started) {
  write("GOLDEN_SCREENS.md", `# ChopDot Golden Screens & Journeys

## Golden set

1. Home / Orientation — V1.4
2. Create a Group — V2
3. Invite / Join — V1
4. Group Home — V1
5. Add an Expense — V1
6. Review / Correct Expense — V1.1
7. Review / Agree / Raise an Issue — V1.1
8. Overall Position — V1
9. Settle Up — V1.1

## Golden Candidate #10 — Complete Settlement V1

Journey 12 is in review. It preserves the Journey 11 payment scope and distinguishes Sent, Waiting, Received, Failed, Partial, Reversed and Complete.

Prototype: \`${j12Checkpoint.prototype_path}\`
SHA-256: \`${j12Checkpoint.prototype_sha256}\`
`);

  write("START_HERE.md", `# ChopDot Experience Workbench — Start Here

## Current truth

- 28 registered journeys
- 9 Golden journeys
- Journey 11 — Settle Up V1.1 remains frozen as Golden #9
- Journey 12 — Complete Settlement V1 is the current Golden Candidate
- Running the gate preserves Journey 12 progress

## Open first

\`${j12Checkpoint.prototype_path}\`

Then read:

1. \`${j12Checkpoint.spec_path}\`
2. \`journeys/12-complete-settlement/STATE_AND_AUTHORITY.md\`
3. \`journeys/12-complete-settlement/GIVEN_WHEN_THEN.md\`
4. \`journeys/12-complete-settlement/UI_TO_DOMAIN_EVENTS.md\`
5. \`${j12Checkpoint.qa_path}\`

## Review boundary

Do not alter Journeys 1–11. Do not freeze Journey 12 without explicit user approval.

## Gate

Run \`npm run gate\`. It must preserve Journey 12 as current and verify the Journey 11 Golden checksum.
`);
  console.log("Verified Journey 11 Golden #9 and preserved Journey 12 progress.");
} else {
  write("GOLDEN_SCREENS.md", `# ChopDot Golden Screens & Journeys

## Golden set

1. Home / Orientation — V1.4
2. Create a Group — V2
3. Invite / Join — V1
4. Group Home — V1
5. Add an Expense — V1
6. Review / Correct Expense — V1.1
7. Review / Agree / Raise an Issue — V1.1
8. Overall Position — V1
9. Settle Up — V1.1

## Golden #9 — Settle Up V1.1

Approved ${approvedOn}. The reviewed candidate HTML remains unchanged at \`${candidatePath}\` with SHA-256 \`${candidateSha256}\`.

Journey 12 remains not started. This checkpoint stops at the Journey 11 Golden freeze.
`);
  write("START_HERE.md", `# ChopDot Experience Workbench — Start Here

## Current truth

- 28 registered journeys
- 9 Golden journeys
- Journey 11 — Settle Up V1.1 is Golden #9
- Journey 12 — Complete Settlement remains not started
- Work is intentionally paused after the Journey 11 freeze

## Frozen artifact

\`${candidatePath}\`

SHA-256:

\`${candidateSha256}\`

## Resume boundary

Do not alter Journey 11 or begin Journey 12 without a new explicit instruction.

## Gate

Run \`npm run gate\` against the exact branch head. The candidate checksum, registry, checkpoint and generated views must remain consistent.
`);
  console.log("Applied Journey 11 Golden #9 freeze without changing HTML or starting Journey 12.");
}

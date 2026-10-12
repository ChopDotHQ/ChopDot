# Cloud capability preflight — blocked before J05

Starting checkout and remote head both verified as `424216ff94c2c7477348bb74a9155094af0512c0` before changes. Clean isolated public checkout; no private machine-local material imported. Branch: `codex/surface-clarity-continuation-2026-10-12`.

| Capability | Actual result |
|---|---|
| Checkout / file writes | PASS; verified SHA and persisted these records |
| Node / existing packager | PASS; Node v24.19.0; package exit 0 |
| Preview HTTP | PASS; existing server helper returns 200 and 2444 characters |
| Playwright package | Available through existing primary runtime; ignored local symlinks, no dependency manifests changed |
| Playwright browser execution | BLOCKED; required Chromium/headless executable absent |
| Official browser installation | FAIL exit 1; invalid archive on five attempts; endpoint returns 195-byte HTML |
| Separate cloud browser / rendered preview | BLOCKED; preview loopback URL gives ERR_CONNECTION_REFUSED |
| Logs / artifact file persistence | PASS for logs and package output; original history retained |
| Actual product screenshots | NOT AVAILABLE; no rendered review obtained |
| Git commit | Verified by the checkpoint containing this record |
| Git push | Recorded in PUSH_STATUS.md after attempt |

Read completely: continuation contract, progress ledger, schema alignment, framework, journey playbook, prototype usage, frozen V1 usage guide. No AGENTS.md or PRODUCT_TRUTH.md was found in this public checkout. Private machine-local AGENTS/AutoBots layers are unavailable and were not invented or restarted. No journey spec assessment is claimed: per-journey source/state reading belongs to the resumed rendered loop.

J05–J28 remain unreviewed and unaccepted. The common capability blocker prevents the required ordered rendered review; it is not a product finding or a conclusion about any journey. No source-only review, parked J05 label repair, or acceptance was substituted. Existing J02/J03 acceptance and J04 bounded evidence/limits remain unchanged. No domain, runtime, frozen schema, Golden/C1, tags, manifests or copied source was modified.

## Reproduction / resumption

From this branch, use Node 24+, Playwright with a real compatible Chromium executable, and the existing packager:

```sh
node scripts/package-preview-v2-gate-b.mjs /tmp/chopdot-cloud-resume-unique
python3 -m http.server 4173 --bind 127.0.0.1 --directory /tmp/chopdot-cloud-resume-unique
```

Open `http://127.0.0.1:4173/prototypes/integrated-product-preview-v2/index.html` in a browser sharing access to that server. Demo guide: replace `index.html` with `demo.html`. Existing QA supports `CHOPDOT_CHROMIUM_EXECUTABLE`, `PREVIEW_ROOT` and `EVIDENCE_DIR`. Resume at J05 only after rendered capability passes. Read its actual approved spec/state/decision sources and record normal interactions/returns and screenshots. No deployment or new tooling is needed.

The user's delegated authority remains valid; missing browser execution/connectivity is the blocker, not missing user reapproval. This checkpoint preserves an incomplete continuation, not completion of the 24 journeys.

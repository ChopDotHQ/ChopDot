# Journey 12 V1.1 — continuity candidate

Open `v1.1-continuity-candidate.html`. The 67 existing screen templates, design tokens and approved Goldens are retained. This pass fixes return-path context, read-only payer refresh, and recovery-before-execution-retry.

The workshop panel can switch to the recipient or supply a clearly labelled demo result. Normal app refresh cannot invent a receipt. JavaScript is required for the connected demo; no real payment integration is present.

Source: `source/continuity-model.cjs`, `source/continuity-ui.js`, `source/build-continuity.py`. The original `v1-golden-candidate.html` is retained as the source/reference version.

Model checks: `node source/test-continuity.cjs`. Browser click evidence and layout checks are recorded in `CONTINUITY_QA.json`.

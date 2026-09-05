# Journey 01 — Enter ChopDot V1

Review candidate; not Golden. Open `v1-candidate.html`.

Use code **123456**. `dev@example.com` is the returning-person fixture; other valid example emails use the new-person fixture. On phone, **Demo** reveals test instructions and wallet results. No real emails, accounts or payments.

Source: `model.cjs` owns the entry context and test state; `ui.js` owns rendering/actions; `entry.css` owns only scoped additions; `build.mjs` produces the self-contained artifact. `inherited.css` is copied from Journey 12's approved CSS. Reference documents are retained as supplied reviewed snapshots; reference activation is isolated in a frame and never writes an existing Golden file.

Build: `node source/build.mjs`
Model checks: `node source/test-model.cjs`
Browser checks: `python source/browser-tests.py` (Playwright + Chromium; exact HTML injection in this restricted environment).

Read `spec.md`, `STATE_AND_AUTHORITY.md`, `GIVEN_WHEN_THEN.md`, `UI_TO_DOMAIN_EVENTS.md`, then `VISUAL_QA.md`.

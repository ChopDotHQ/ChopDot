# Journey 14 — Receive / Share Payment Details V1

Open `v1-candidate.html`. Choose a method, choose Marc, review, then prepare the private demo link. The Demo menu offers wallet, request/settlement entry and recovery cases.

`node source/build.mjs` regenerates the standalone HTML from separate model, UI, QR data and styles. `node source/test-model.cjs` runs deterministic tests. `python source/browser-tests.py` requires Playwright plus an installed Chromium at `/usr/bin/chromium` and writes local screenshot evidence. No runtime packages, fonts, external assets, network calls or real payment data are required by the HTML.

Both inherited stylesheets are exact copies of the approved source. Only receive.css and this journey's code are new. Review the spec, state/action mappings and VISUAL_QA before approval. This candidate is not Golden.

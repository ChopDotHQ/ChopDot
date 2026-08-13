# Batch 2 evidence mapping — promoted local receipt

Date: 2026-08-13  
Status: **B2 LOCAL PASS / LIVE BLOCKED**

The earlier partial template has been superseded by fresh, source-snapshot-bound
evidence. The canonical files are:

- [`receipts/B2.json`](./receipts/B2.json) — schema-v2 machine receipt;
- [`test-results/b2-2026-08-13T074800Z/B2-EVIDENCE.md`](./test-results/b2-2026-08-13T074800Z/B2-EVIDENCE.md)
  — fourteen-control mapping, exact command results, and visual review;
- [`test-results/b2-2026-08-13T074800Z/screenshots/`](./test-results/b2-2026-08-13T074800Z/screenshots/)
  — fourteen durable actual-route screenshots.

The receipt SHA-256 is
`789631c22ce60aff4a9078ae84a19145e56fb524ee551c69082c907de38b8dad`.
The evidence-index SHA-256 is
`e464f55e399fe9c9dab4c431a6b2cf34e9f07907b4607ff1a485e8bc081ccd7b`.

The local pass is intentionally bounded. It proves the actual `App` routes and
production-neutral dependency seams with isolated host-simulator actors. It
does not prove public `.dot` routes, real Desktop contact resolution, real chat
delivery, or live multi-account convergence. `B2-LIVE-PUBLIC-ROUTES` and
`B2-LIVE-MIXED-DELIVERY` remain blocked.

Batch 6 must rerun B1 through B6 on one clean final fingerprint. This evolving
Batch 2 snapshot cannot be reused as release proof.

# P-026 User Path Scanner Proof

Date: 2026-07-15

Branch: `codex/p026-user-path-scanner`

Base: `codex/p025-canonical-baseline` at `8e41beb8a86208fd428042aabf30b2aeaca8853f`

## Change boundary

P-026 adds an internal product-system map and deterministic coverage scanner. It
does not change normal ChopDot UI, payment state, backend authority, adapters,
or deployment behavior.

## Source and generated artifacts

- `product/user-path-map.md`
- `product/user-path-map.mmd`
- `scripts/generate-user-path-coverage.mjs`
- `product/generated/user-path-coverage.json`
- `product/generated/user-path-coverage.md`
- `product/generated/user-path-coverage.mmd`
- `product/generated/user-path-coverage.html`
- `product/evidence/user-path-coverage-latest.json`

Source hash: `1cb5105b8ffc4c6b01c320c50107e3da558de812deb0848718112448455f72e1`

## Coverage result

- Paths: 24
- Dead ends: 12
- Path validation errors: 0
- Path validation warnings: 0
- Proof status: 23 missing, 1 partial
- Surface truth: web and Telegram remain unreviewed; `.dot` has 2 known gaps
  and 1 partial path; Circles/Gnosis is not started.

The highest-risk generated list sorts critical paths before high-risk paths,
then uses implementation failure and proof status. The first group includes
cannot-pay, mismatch, receiver-confirmation ordering, not-received, waive,
delay, and return-after-delay paths. The scanner does not convert missing proof
into success.

## Validation evidence

- `node --check scripts/generate-user-path-coverage.mjs`: pass
- `npm run product:path-map -- refresh`: pass
- `npm run product:path-map -- validate`: pass
- read-only validation hash comparison: pass; validation did not rewrite outputs
- product cockpit source validation: 26 cards, 26 contracts, 0 errors
- `npm run type-check`: pass
- `npm test`: 5 files, 31 tests passed
- `npm run build`: pass with shared root `.env` loaded; WalletConnect runtime ID warning remains
- `git diff --check`: pass for the bounded change

## Visual review

Screenshot:

- `product/evidence/screenshots/user-path-coverage/p026-user-path-coverage.png`

The operator view exposes summary counts, highest-risk paths, complete path
coverage, surface/proof status, and the dead-end register in one scrollable
artifact. Long status labels wrap without overlapping adjacent metrics.

## Inherited baseline limitations

These are not P-026 regressions:

- Full wiki validation reports 27 missing references to root-only or nested
  portable-shell files.
- Journey review validation reports 57 missing historical screenshots.
- Cockpit validation reports the existing building-card WIP warning and missing
  referenced tests/artifacts that are outside this isolated worktree.
- The build reports the existing large-chunk warning.

## Documentation impact

Documentation impact is complete:

- `docs/wiki/06-agentops/user-path-coverage.md` documents source files,
  generated read models, commands, and the review rule.
- Generated wiki indexes were refreshed.

No ADR is required because P-026 adds an internal product-quality read model and
does not change runtime architecture or authority boundaries.

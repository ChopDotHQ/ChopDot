# Release Parity Checklist

Use this checklist to verify a release mirrors production expectations.

## Core Checks
- [ ] Database migrations reviewed and applied in staging.
- [ ] Feature flags validated for the target environment.
- [ ] Smoke tests completed (login, create pot, add expense, settle).
- [ ] Error tracking verified in staging (see `VITE_SENTRY_DSN`).
- [ ] Rollback plan documented for this release.

## Data Integrity
- [ ] Expense totals match across UI and data layer.
- [ ] Receipt upload + retrieval still work for new expenses.
- [ ] Pagination paths tested for pots and expenses.

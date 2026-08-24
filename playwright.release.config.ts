import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testIgnore: [
    // Compatibility alias: this file imports the canonical Batch 2 spec and
    // cannot be collected alongside it by Playwright.
    'membership-bootstrap-ui.spec.ts',

    // Historical shared-session product authority. These scenarios depend on
    // raw chopKey/session values or typed-name membership, both forbidden by
    // the current signed Product Account authority model. Current replacement
    // coverage lives in named-mode-multi-account-production-entrypoint.spec.ts.
    'deferred-shared-action-restart.spec.ts',
    'general-shared-action-delivery.spec.ts',
    'polkadot-host-real-ui.spec.ts',
    'polkadot-host-wallet-settlement.spec.ts',

    // Superseded typed-name payment flows. The current replacement proves
    // signed membership, late-expense request refresh, payer marking, receiver
    // confirmation, and converged canonical journals on two Product Accounts.
    'guest-payment-return.spec.ts',
    'late-expense-after-request.spec.ts',
    'live-payer-sync.spec.ts',

    // This file is an action-time public URL proof and runs only with the live
    // deployment config after promotion; it is not a local candidate test.
    'guest-payment-return-live-dot.spec.ts',

    // Exercises the byte-frozen dist-dot-host bundle through its dedicated
    // preview server/base URL after the candidate build is produced.
    'dot-host-preview.spec.ts',
  ],
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  use: {
    headless: true,
    viewport: {width: 1280, height: 900},
  },
  webServer: {
    command: 'npm run dev -- --port 4177',
    url: 'http://127.0.0.1:4177',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});

import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // This tracked compatibility alias imports the canonical Batch 2 spec for an
  // older focused harness. Collect the canonical file once in umbrella runs;
  // Playwright correctly rejects spec-to-spec imports when both are collected.
  testIgnore: 'membership-bootstrap-ui.spec.ts',
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

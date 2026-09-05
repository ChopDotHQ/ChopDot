import {defineConfig} from '@playwright/test';

const appUrl = 'http://127.0.0.1:4191';
process.env.UI_ASSURANCE_APP_URL = `${appUrl}/`;

export default defineConfig({
  testDir: '.',
  testMatch: 'ui-assurance-release.spec.ts',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  use: {
    headless: true,
    viewport: {width: 1280, height: 900},
  },
  webServer: {
    command: 'npm run dev -- --port 4191 --strictPort',
    url: appUrl,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});

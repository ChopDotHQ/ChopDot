import { defineConfig, devices } from '@playwright/test';

const dotHostPreview = process.env.DOT_HOST_PREVIEW === '1' || process.env.HOST_SIM === '1';
const nativeSessionProof = process.env.NATIVE_SESSION === '1';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: dotHostPreview ? 'http://127.0.0.1:4174' : 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: dotHostPreview ? undefined : ['**/host-sim/**', '**/chopdot-dot-native-session.spec.ts'],
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testIgnore: ['**/host-sim/**', '**/chopdot-dot-native-session.spec.ts'],
    },
    {
      name: 'dot-host-preview',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/chopdot-dot-a5-demo.spec.ts'],
      testIgnore: dotHostPreview ? undefined : ['**/*'],
    },
    {
      name: 'host-sim',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/host-sim/**/*.spec.ts'],
      testIgnore: dotHostPreview ? undefined : ['**/*'],
    },
    {
      name: 'native-session',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/chopdot-dot-native-session.spec.ts'],
      testIgnore: nativeSessionProof ? undefined : ['**/*'],
    },
  ],
  webServer: dotHostPreview
    ? {
        command: 'npm run preview:dot-host',
        url: 'http://127.0.0.1:4174',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});

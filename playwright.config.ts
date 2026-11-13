import { defineConfig } from '@playwright/test';

// Locally you can point at an installed Chrome: PW_CHROME=/usr/bin/google-chrome
const executablePath = process.env.PW_CHROME || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: { executablePath, args: ['--no-sandbox'] },
    trace: 'retain-on-failure',
  },
  webServer: { command: 'npx tsx scripts/serve.ts 4173', url: 'http://localhost:4173/index.html', reuseExistingServer: !process.env.CI },
});

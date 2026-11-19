import { defineConfig } from '@playwright/test';

// Locally you can point at an installed Chrome: PW_CHROME=/usr/bin/google-chrome
const executablePath = process.env.PW_CHROME || undefined;
// PW_PORT lets two checkouts run their e2e side by side (each serves its own dist/).
const port = Number(process.env.PW_PORT || 4173);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    launchOptions: { executablePath, args: ['--no-sandbox'] },
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
  },
  webServer: { command: `npx tsx scripts/serve.ts ${port}`, url: `http://localhost:${port}/index.html`, reuseExistingServer: !process.env.CI },
});

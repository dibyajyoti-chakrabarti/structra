import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'https://structra.cloud';
const API_URL =
  process.env.E2E_API_URL ||
  'https://ox6gigpd59.execute-api.ap-south-1.amazonaws.com/api/';

export default defineConfig({
  testDir: './e2e',
  // The app talks to a Lambda behind API Gateway; cold starts are slow.
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: 1,
  reporter: [['list'], ['html', { outputFolder: 'e2e-report', open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },

  projects: [
    {
      name: 'public-firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /public\/.*\.spec\.js/,
    },
    {
      name: 'api',
      use: { baseURL: API_URL },
      testMatch: /api\/.*\.spec\.js/,
    },
    {
      name: 'app-firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'e2e/.auth/user.json',
      },
      testMatch: /app\/.*\.spec\.js/,
    },
  ],
});

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    env: {
      DATABASE_URL: 'file:./dev.db',
      NEXTAUTH_URL: 'http://localhost:3000',
      AUTH_TRUST_HOST: 'true',
      AUTH_SECRET: 'test-secret-for-playwright-only-min-32-chars',
    },
  },
});

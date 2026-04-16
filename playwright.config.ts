import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web',
  testMatch: /.*\.spec\.ts$/,
  timeout: 60000,
  retries: 0,
  webServer: {
    command: 'npm run dev -w apps/web',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
});

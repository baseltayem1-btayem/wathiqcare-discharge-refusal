import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web',
  testMatch: /.*\.spec\.ts$/,
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
});

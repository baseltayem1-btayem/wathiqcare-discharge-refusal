import { defineConfig } from '@playwright/test';

const previewUrl = process.env.PREVIEW_URL || process.env.TEST_BASE_URL;
if (!previewUrl) {
  throw new Error('PREVIEW_URL or TEST_BASE_URL environment variable is required');
}

export default defineConfig({
  testDir: './apps/web/tests',
  testMatch: /production-informed-consents.*\.spec\.ts$/,
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: previewUrl,
    headless: true,
  },
});

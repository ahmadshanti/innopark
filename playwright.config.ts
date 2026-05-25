import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: process.env.PW_BASE_URL ?? 'http://127.0.0.1:5173',
    headless: process.env.PW_HEADLESS !== 'false',
    viewport: { width: 1280, height: 720 },
    locale: 'ar',
    screenshot: 'only-on-failure',
  },
});

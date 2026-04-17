import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    /* Use system Chrome to avoid download issues behind proxies */
    channel: 'chrome',
  },
  projects: [
    { name: 'chromium', use: { channel: 'chrome' } },
  ],
  webServer: [
    {
      command: 'cd ../server && .venv/Scripts/python.exe -m uvicorn main:app --port 8001',
      port: 8001,
      reuseExistingServer: true,
      timeout: 15_000,
    },
    {
      command: 'npx vite --port 5173',
      port: 5173,
      reuseExistingServer: true,
      timeout: 15_000,
    },
  ],
});

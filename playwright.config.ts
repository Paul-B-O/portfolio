import { defineConfig, devices } from '@playwright/test';

// Sans E2E_BASE_URL, Playwright démarre lui-même le serveur Node.
// En CI, E2E_BASE_URL pointe vers la stack Docker Compose (Nginx → Node), comme en production.
const externalURL = process.env.E2E_BASE_URL;
const LOCAL_URL = 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: externalURL || LOCAL_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: externalURL
    ? undefined
    : {
        // Port 3100 pour ne pas entrer en conflit avec un `npm start` déjà lancé sur 3000
        command: 'node server.js',
        env: { PORT: '3100' },
        url: LOCAL_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});

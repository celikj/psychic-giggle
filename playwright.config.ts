import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    // Mobile viewport on Chromium (not a WebKit device preset) — TaskLock
    // is a phone-shaped layout and this keeps the whole suite on one engine.
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    // Only set for sandboxes with a preinstalled Chromium outside Playwright's
    // own cache; unset everywhere else (CI included), which uses the default.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});

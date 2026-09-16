import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/**
 * End-to-end tests run against the production build served by the real Node server,
 * so security headers, compression, code-splitting and the pdf.js worker are all
 * exercised exactly as users get them. No API key is needed: tests that need AI
 * replies stub the network in the browser.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' },
    },
    {
      name: 'tablet',
      use: { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true },
    },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'npm run build && node dist-server/server/index.js',
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { PORT: String(PORT), GEMINI_API_KEY: '', NODE_ENV: 'production' },
  },
});

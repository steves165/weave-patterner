import { defineConfig, devices } from '@playwright/test'

const PORT = 5173

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  // The bigger drafts render thousands of cells; too many browsers at once makes them time out.
  workers: process.env.CI ? 2 : 4,
  timeout: 60_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /mobile\.spec/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 900 } },
    },
    // Chromium-based touch devices (WebKit isn't installed here).
    { name: 'phone', testMatch: /mobile\.spec/, use: { ...devices['Pixel 7'] } },
    { name: 'tablet', testMatch: /mobile\.spec/, use: { ...devices['Galaxy Tab S4'] } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
  },
})

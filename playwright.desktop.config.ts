import { defineConfig } from '@playwright/test'

/** The desktop app's tests (desktop/test), run against Electron itself: `npx playwright test -c playwright.desktop.config.ts`. */
export default defineConfig({
  testDir: 'desktop/test',
  timeout: 60_000,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
})

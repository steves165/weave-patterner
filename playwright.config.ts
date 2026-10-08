import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { chromium, defineConfig, devices } from '@playwright/test'

// Where the tests run:
// - E2E_BASE_URL: an already-running site, such as the live one after a deploy (no local server started);
// - E2E_DEV: the dev server, so changes show without a build;
// - otherwise the production build in dist/ (fast React, nothing compiled on demand), served by vite preview.
const LIVE = process.env.E2E_BASE_URL
const DEV = Boolean(process.env.E2E_DEV)
const PORT = DEV ? 5173 : 4173
const BASE_URL = LIVE ?? `http://localhost:${PORT}/`

// The 3D preview needs WebGL. With no GPU, Chromium draws it in software with SwiftShader; point Vulkan at the copy
// bundled with Chromium so it doesn't try (and crash on) system drivers, as happens under WSL.
const swiftshader = join(dirname(chromium.executablePath()), 'vk_swiftshader_icd.json')
const launchOptions = {
  args: ['--enable-unsafe-swiftshader'],
  env: existsSync(swiftshader) ? { ...process.env, VK_ICD_FILENAMES: swiftshader } : undefined,
}

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  // The bigger drafts render thousands of cells; more browsers at once than this makes them time out.
  workers: 4,
  timeout: 60_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    launchOptions,
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
  webServer: LIVE
    ? undefined
    : {
        command: DEV ? `npx vite --port ${PORT} --strictPort` : `npx vite preview --port ${PORT} --strictPort`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
      },
})

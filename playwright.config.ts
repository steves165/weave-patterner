import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { chromium, defineConfig, devices } from '@playwright/test'

const PORT = 5173

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
  // The bigger drafts render thousands of cells; too many browsers at once makes them time out.
  workers: process.env.CI ? 2 : 4,
  timeout: 60_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
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
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
  },
})

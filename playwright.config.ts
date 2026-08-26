import { defineConfig, devices } from '@playwright/test'

const PORT = process.env.PORT ?? '3000'
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Reuses a server you already have running in dev (`npm run dev`) so local
  // runs don't pay for a cold Next.js compile every time; CI always starts a
  // fresh one. Pages that hit the database (see e2e/README.md) need that dev
  // server pointed at a real DB — this config doesn't start one.
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})

import { expect, test } from '@playwright/test'
import { ANALYTICS_HOSTS, openApp, openTool, toast } from './helpers'

// The production build (local or live) has the measurement ID; the dev server doesn't.
test.skip(Boolean(process.env.E2E_DEV), 'analytics is only in production builds')

test('asks before using analytics, and loads nothing without consent', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (r) => ANALYTICS_HOSTS.test(r.url()) && requests.push(r.url()))
  await openApp(page, { analytics: 'unset' })
  const banner = page.getByTestId('analytics-consent')
  await expect(banner).toContainText('Help improve Weave Patterner?')
  expect(requests).toEqual([])

  await banner.getByRole('button', { name: 'No thanks' }).click()
  await expect(banner).toBeHidden()
  await expect(toast(page)).toContainText('Analytics is off')
  await page.reload()
  await expect(page.getByRole('group', { name: 'Threading' })).toBeVisible()
  await expect(banner).toBeHidden()
  expect(requests).toEqual([])
  expect(await page.evaluate(() => typeof window.gtag)).toBe('undefined')
})

test('loads Google Analytics after Allow, and records which tools are used', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (r) => ANALYTICS_HOSTS.test(r.url()) && requests.push(r.url()))
  await openApp(page, { analytics: 'unset' })
  await page.getByTestId('analytics-consent').getByRole('button', { name: 'Allow' }).click()
  await expect(toast(page)).toContainText('analytics is on')
  await expect.poll(() => requests.find((u) => u.includes('gtag/js'))).toContain('id=G-BR13D3EWT0')

  await openTool(page, /Colourways/)
  const events = await page.evaluate(() =>
    (window.dataLayer ?? []).map((a) => Array.from(a as ArrayLike<unknown>)).filter((a) => a[0] === 'event'),
  )
  expect(events).toContainEqual(['event', 'open_tool', { tool: 'colorways' }])
})

test('the footer lets visitors change their choice', async ({ page }) => {
  await openApp(page)
  await expect(page.getByTestId('analytics-consent')).toBeHidden()
  await page.getByRole('button', { name: 'Analytics' }).click()
  await expect(page.getByTestId('analytics-consent')).toBeVisible()
})

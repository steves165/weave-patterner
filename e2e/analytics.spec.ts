import { expect, test } from '@playwright/test'
import { ANALYTICS_HOSTS, a11yProblems, openApp, openTool, toast } from './helpers'

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
  await expect(toast(page)).toBeHidden()
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
  await expect.poll(() => requests.find((u) => u.includes('gtag/js'))).toContain('id=G-F54WVZV6CF')

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

test('the guide and pattern pages ask too, share the choice with the apps, and count opening a pattern', async ({
  page,
}) => {
  const requests: string[] = []
  await page.context().route(ANALYTICS_HOSTS, (route) => route.abort())
  page.on('request', (r) => ANALYTICS_HOSTS.test(r.url()) && requests.push(r.url()))
  await page.goto('./patterns/herringbone/')
  const banner = page.getByTestId('analytics-consent')
  await expect(banner).toContainText('Help improve these pages?')
  expect(await a11yProblems(page)).toEqual([])
  expect(requests).toEqual([])

  await banner.getByRole('button', { name: 'Allow' }).click()
  await expect(banner).toBeHidden()
  await expect.poll(() => requests.find((u) => u.includes('gtag/js'))).toContain('id=G-F54WVZV6CF')
  // Stay on the page to see the click counted.
  await page.evaluate(() => window.addEventListener('click', (e) => e.preventDefault(), true))
  await page.getByRole('link', { name: 'Open this draft in Weave Patterner' }).click()
  const events = await page.evaluate(() =>
    (window.dataLayer ?? []).map((a) => Array.from(a as ArrayLike<unknown>)).filter((a) => a[0] === 'event'),
  )
  expect(events).toContainEqual(['event', 'open_pattern', { page: '/patterns/herringbone/', transport_type: 'beacon' }])

  // The app doesn't ask again; and a page doesn't ask once the app has been told no.
  await openApp(page, { analytics: 'unset' })
  await expect(page.getByTestId('analytics-consent')).toBeHidden()
  await page.evaluate(() => localStorage.setItem('weave-analytics-consent', 'denied'))
  requests.length = 0
  await page.goto('./knit/patterns/cable-panel/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(banner).toBeHidden()
  expect(requests).toEqual([])
})

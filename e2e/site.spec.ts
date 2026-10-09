import { expect, test } from '@playwright/test'
import { ANALYTICS_HOSTS, a11yProblems, openApp } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.context().route(ANALYTICS_HOSTS, (route) => route.abort())
  await page.addInitScript(() => {
    localStorage.setItem('wp-tour-seen', '{"weave":true,"knit":true}')
    localStorage.setItem('weave-analytics-consent', 'denied')
  })
})

test('the guides: an index, a page per topic, readable and accessible, linking to the app', async ({ page }) => {
  await page.goto('./guide/')
  await expect(page.getByRole('heading', { level: 1, name: 'Weave Patterner guides' })).toBeVisible()
  await page.getByRole('link', { name: 'Treadling and lift plans' }).click()
  await expect(page).toHaveTitle(/Treadling and lift plans – weaving guide \| Weave Patterner/)
  expect(await a11yProblems(page)).toEqual([])
  // Links between topics work as on the web.
  await page.getByRole('main').getByRole('link', { name: 'The drawdown' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The drawdown')
  await page.getByRole('link', { name: 'Try it in Weave Patterner' }).click()
  await expect(page.getByRole('group', { name: 'Threading' })).toBeVisible()
})

test('a draft page shows the draft written out, and opens it in the app', async ({ page }) => {
  await page.goto('./patterns/')
  await page.getByRole('link', { name: 'Houndstooth', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Houndstooth weaving draft')
  await expect(page.getByRole('img', { name: /Houndstooth draft/ })).toBeVisible()
  await expect(page.getByText('Ends 1–4: 1 2 3 4')).toBeVisible()
  expect(await a11yProblems(page)).toEqual([])
  await page.getByRole('link', { name: 'Open this draft in Weave Patterner' }).click()
  await expect(page.getByRole('group', { name: 'Threading' })).toBeVisible()
  await expect(page.getByRole('banner')).toContainText('Houndstooth')
  await expect(page.getByLabel('Warp 1', { exact: true })).toHaveValue('#1f2a44')
})

test('a knitting chart page writes the pattern out, and opens the chart in Knit Patterner', async ({ page }) => {
  await page.goto('./knit/patterns/cable-panel/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cable panel knitting chart')
  await expect(page.getByText(/^Row 1 \(RS\):/)).toBeVisible()
  expect(await a11yProblems(page)).toEqual([])
  await page.getByRole('link', { name: 'Open this chart in Knit Patterner' }).click()
  await expect(page.getByLabel('Name')).toHaveValue('Cable panel')
  await expect(page.getByText('Opened the Cable panel chart')).toBeVisible()
  expect(new URL(page.url()).hash).toBe('')
})

test('the apps link to the guides, and the sitemap lists them', async ({ page }) => {
  await openApp(page)
  await page.getByRole('contentinfo').getByRole('link', { name: 'Guides' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Weave Patterner guides' })).toBeVisible()
  const sitemap = await (await page.request.get('./sitemap.xml')).text()
  expect(sitemap).toContain('/weave-patterner/guide/treadling/</loc>')
  expect(sitemap).toContain('/weave-patterner/knit/patterns/fair-isle-peerie/</loc>')
  expect(sitemap).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/)
})

test('the pages fit a phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const path of ['./guide/glossary/', './patterns/glen-check/', './knit/patterns/fair-isle-peerie/']) {
    await page.goto(path)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), path).toBe(true)
  }
})

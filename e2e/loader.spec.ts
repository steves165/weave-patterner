import { expect, test } from '@playwright/test'
import { openApp, toolbarButton } from './helpers'

test('the loom loader shows while a big preset is drawn, then goes', async ({ page }) => {
  await openApp(page)
  // The page is busy while the loader is up, so note when it comes and goes rather than looking for it.
  await page.evaluate(() => {
    const w = window as unknown as { loader: string[] }
    w.loader = []
    new MutationObserver(() => {
      const el = document.querySelector('.loom-loader')
      const now = el ? (el.textContent ?? '') : 'gone'
      if (w.loader[w.loader.length - 1] !== now) w.loader.push(now)
    }).observe(document.body, { childList: true, subtree: true })
  })
  await toolbarButton(page, 'Tools').click()
  await page.getByRole('menuitem', { name: /Colours and presets/ }).click()
  await page.getByRole('tab', { name: /presets/i }).click()
  await page.getByRole('button', { name: 'Use Clan Cameron tartan' }).click()
  await expect(page.getByTestId('draft-summary')).toContainText('252 × 252')
  await expect(page.locator('.loom-loader')).toHaveCount(0)
  // (Before it, the Colours dialog's code loading may have had a loader, too quick to show.)
  expect((await page.evaluate(() => (window as unknown as { loader: string[] }).loader)).slice(-2)).toEqual([
    'Weaving your pattern…',
    'gone',
  ])

  // A small one is quick, so it doesn't bring the loader up.
  await page.evaluate(() => {
    ;(window as unknown as { loader: string[] }).loader = []
  })
  await toolbarButton(page, 'Tools').click()
  await page.getByRole('menuitem', { name: /Colours and presets/ }).click()
  await page.getByRole('tab', { name: /presets/i }).click()
  await page.getByRole('button', { name: 'Use Houndstooth' }).click()
  await expect(page.getByTestId('draft-summary')).toContainText('32 × 32')
  expect(await page.evaluate(() => (window as unknown as { loader: string[] }).loader)).not.toContain(
    'Weaving your pattern…',
  )
})

for (const [path, name] of [
  ['./', 'Weave Patterner'],
  ['./knit/', 'Knit Patterner'],
  ['./sew/', 'Sew Patterner'],
] as const)
  test(`${name} shows the loom until it starts, keeping its summary for search engines`, async ({ page }) => {
    // Hold the app's scripts back, so the page stays as it is before the app starts.
    await page.route(/assets\/.*\.js$/, () => {})
    await page.goto(path, { waitUntil: 'commit' })
    await expect(page.getByRole('status')).toHaveText(`Loading ${name}…`)
    await expect(page.locator('.static-summary h1')).toBeAttached()
    await expect(page.locator('.static-summary h1')).not.toBeInViewport()
  })

test('without JavaScript the summary shows and the loom does not', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('.static-loader')).toBeHidden()
  await context.close()
})

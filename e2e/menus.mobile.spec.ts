import { type CDPSession, expect, type Locator, type Page, test } from '@playwright/test'
import { openApp, openKnit, openSew } from './helpers'

/** A real finger swipe down from (x, y) by dy pixels, over about `ms` milliseconds. */
async function swipeDown(cdp: CDPSession, x: number, y: number, dy: number, ms = 300) {
  const steps = 12
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (dy * i) / steps }] })
    await new Promise((r) => setTimeout(r, ms / steps))
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

/** Swipes a menu down from its handle, at the top of the menu. */
async function swipeMenu(page: Page, menu: Locator, dy: number, ms?: number) {
  const box = await menu.locator('xpath=ancestor-or-self::*[contains(@class, "MuiPopover-paper")]').boundingBox()
  if (!box) throw new Error('menu not visible')
  const cdp = await page.context().newCDPSession(page)
  await swipeDown(cdp, box.x + box.width / 2, box.y + 10, dy, ms)
}

const phone = (page: Page) => (page.viewportSize()?.width ?? 0) < 600

test('the Tools menu opens without the keyboard, and swipes down to close', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: 'Tools' }).first().tap()
  const tools = page.getByRole('menu', { name: 'Tools' })
  await expect(tools).toBeVisible()
  // The search box isn't focused, so a phone doesn't bring up its keyboard over the menu.
  await expect(page.getByLabel('Find a tool')).not.toBeFocused()

  // A short, slow swipe springs back.
  await swipeMenu(page, tools, 40, 400)
  await page.waitForTimeout(300)
  await expect(tools).toBeVisible()
  // A long one closes it.
  await swipeMenu(page, tools, 200)
  await expect(tools).toHaveCount(0)
})

for (const [app, open, label] of [
  ['Weave Patterner', openApp, 'Save'],
  ['Knit Patterner', openKnit, 'Save'],
  ['Sew Patterner', openSew, 'Save'],
] as const)
  test(`${app}: the File menu swipes down to close`, async ({ page }) => {
    test.skip(!phone(page), 'the File menu is on phones')
    await open(page)
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'File' }).tap()
    const item = page.getByRole('menuitem', { name: label, exact: true })
    await expect(item).toBeVisible()
    const menu = page.getByRole('menu')
    await swipeMenu(page, menu, 220)
    await expect(item).toHaveCount(0)
  })

test('a swipe down in a menu scrolled down scrolls it back up instead of closing it', async ({ page }) => {
  test.skip(!phone(page), 'the File menu is long enough to scroll on phones')
  await openApp(page)
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'File' }).tap()
  const menu = page.getByRole('menu')
  const paper = menu.locator('xpath=ancestor::*[contains(@class, "MuiPopover-paper")]')
  await paper.evaluate((p) => {
    p.scrollTop = 200
  })
  const box = await paper.boundingBox()
  if (!box) throw new Error('menu not visible')
  const cdp = await page.context().newCDPSession(page)
  await swipeDown(cdp, box.x + box.width / 2, box.y + box.height / 2, 150)
  await expect.poll(() => paper.evaluate((p) => p.scrollTop)).toBeLessThan(200)
  await expect(menu).toBeVisible()
})

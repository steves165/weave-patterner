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

/** Swipes a menu, dialog or sheet down from `from` px below its top (its handle). */
async function swipeMenu(page: Page, menu: Locator, dy: number, ms?: number, from = 10) {
  const paper = menu.locator(
    'xpath=ancestor-or-self::*[contains(@class, "MuiPopover-paper") or contains(@class, "MuiDialog-paper") or contains(@class, "MuiDrawer-paper")]',
  )
  // Once it has finished growing or sliding in.
  await expect.poll(() => paper.evaluate((p) => getComputedStyle(p).transform)).toBe('none')
  const box = await paper.boundingBox()
  if (!box) throw new Error('menu not visible')
  const cdp = await page.context().newCDPSession(page)
  await swipeDown(cdp, box.x + box.width / 2, box.y + from, dy, ms)
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

test('a dialog swipes down from its title bar to close, but not from what it holds', async ({ page }) => {
  await openApp(page)
  const file = page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'File' })
  if (await file.isVisible()) {
    await file.tap()
    await page.getByRole('menuitem', { name: 'Save', exact: true }).tap()
  } else await page.getByRole('button', { name: 'Save', exact: true }).first().tap()
  const save = page.getByRole('dialog', { name: 'Save pattern' })
  await expect(save).toBeVisible()

  await swipeMenu(page, save, 200, 300, 120)
  await page.waitForTimeout(300)
  await expect(save).toBeVisible()
  await swipeMenu(page, save, 200)
  await expect(save).toHaveCount(0)
})

test('the pattern settings sheet swipes down to close', async ({ page }) => {
  await openApp(page)
  const bar = page.locator('[data-tour="settings"]').last()
  test.skip(!(await bar.getAttribute('aria-haspopup')), 'wide enough for the settings sidebar instead')
  await bar.tap()
  const sheet = page.getByRole('dialog', { name: 'Pattern settings' })
  await expect(sheet).toBeVisible()
  await swipeMenu(page, sheet, 220)
  await expect(sheet).toHaveCount(0)
})

import { type CDPSession, expect, type Page, test } from '@playwright/test'
import { openApp, threading, toolbarButton } from './helpers'

/** A real finger swipe (touch events through the browser's gesture handling), by dx/dy pixels. */
async function swipe(cdp: CDPSession, x: number, y: number, dx: number, dy: number) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + (dx * i) / 12, y: y + (dy * i) / 12 }],
    })
    await new Promise((r) => setTimeout(r, 16))
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

const scroll = (page: Page) =>
  page.locator('.draft-scroll').evaluate((box) => ({ top: box.scrollTop, left: box.scrollLeft }))

test.beforeEach(async ({ page }) => openApp(page))

test('swiping on the pattern scrolls it in both directions', async ({ page }) => {
  // Make the draft bigger than any screen in both directions.
  const ends = page.getByLabel('Ends', { exact: true })
  if (!(await ends.isVisible())) await page.getByText('Pattern settings').click()
  await ends.fill('120')
  await ends.press('Enter')
  const picks = page.getByLabel('Picks', { exact: true })
  await picks.fill('120')
  await picks.press('Enter')
  await page.getByText('Pattern settings').click()

  const cdp = await page.context().newCDPSession(page)
  const box = await page.locator('.draft-scroll').boundingBox()
  if (!box) throw new Error('draft not visible')
  const x = box.x + box.width / 2
  const y = Math.min(box.y + box.height / 2, (page.viewportSize()?.height ?? 800) - 120)
  await swipe(cdp, x, y, 0, -250)
  await expect.poll(async () => (await scroll(page)).top).toBeGreaterThan(100)
  await swipe(cdp, x, y, -200, 0)
  await expect.poll(async () => (await scroll(page)).left).toBeGreaterThan(100)
})

test('a tap toggles a box, and a drag does not paint unless the brush is on', async ({ page }) => {
  const start = await threading(page)
  await page.getByRole('checkbox', { name: 'End 1, shaft 4' }).tap()
  expect(await threading(page)).toMatch(/^4/)
  await toolbarButton(page, 'Undo').tap()
  expect(await threading(page)).toBe(start)

  const cdp = await page.context().newCDPSession(page)
  const first = await page.getByRole('checkbox', { name: 'End 1, shaft 3' }).boundingBox()
  if (!first) throw new Error('cell not visible')
  const dragAcross = () => swipe(cdp, first.x + 4, first.y + 4, first.width * 4, 0)

  await dragAcross()
  expect((await threading(page)).slice(0, 5)).toBe(start.slice(0, 5))

  await page.getByRole('button', { name: 'Drag to paint' }).tap()
  await expect(page.getByRole('button', { name: 'Drag to paint' })).toHaveAttribute('aria-pressed', 'true')
  await dragAcross()
  expect((await threading(page)).slice(0, 5)).toBe('33333')
})

test('weaving mode works with big touch targets', async ({ page }) => {
  await toolbarButton(page, 'Weave').tap()
  await page.getByRole('button', { name: 'Next pick' }).tap()
  await expect(page.getByTestId('pick-number')).toContainText('Pick 2')
})

test('file actions are reachable on small screens', async ({ page }) => {
  const width = page.viewportSize()?.width ?? 0
  if (width < 600) {
    await toolbarButton(page, 'More').tap()
    await expect(page.getByRole('menuitem', { name: 'Save' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /WIF lift plan/ })).toBeVisible()
  } else {
    await expect(toolbarButton(page, 'Save')).toBeVisible()
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('tapping a drawdown square traces it, with the explanation on screen', async ({ page }) => {
  await page.locator('.drawdown [data-end="0"][data-pick="0"]').tap()
  const info = page.getByTestId('trace-info')
  await expect(info).toContainText('End 1, pick 1: warp shows')
  await expect(info).toBeInViewport()
  await expect(page.locator('.draft [role=checkbox].traced')).toHaveCount(3)
  await page.getByRole('button', { name: 'Stop tracing' }).tap()
  await expect(info).toBeHidden()
})

test('the 3D preview fills the screen and can be closed', async ({ page }) => {
  await toolbarButton(page, '3D').tap()
  const canvas = page.getByRole('img', { name: '3D preview of the cloth' })
  await expect(canvas).toBeVisible()
  const box = await canvas.boundingBox()
  expect(box?.width).toBeGreaterThan((page.viewportSize()?.width ?? 0) * 0.9)
  await page.getByRole('button', { name: 'Close 3D preview' }).tap()
  await expect(canvas).toBeHidden()
})

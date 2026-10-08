import { expect, type Page, test } from '@playwright/test'
import { cell, openApp, setField, threading } from './helpers'

const rulerLabels = (page: Page, name: string) => page.getByLabel(name).locator('.ruler-label').allInnerTexts()

test.beforeEach(async ({ page }) => openApp(page))

test('rulers number every 4 threads by default and can be changed or hidden', async ({ page }) => {
  expect(await rulerLabels(page, 'End numbers')).toEqual(['4', '8', '12', '16', '20', '24', '28', '32'])
  expect((await rulerLabels(page, 'Pick numbers')).slice(0, 2)).toEqual(['4', '8'])
  await setField(page.getByLabel('Ruler every'), '10')
  expect(await rulerLabels(page, 'End numbers')).toEqual(['10', '20', '30'])
  await setField(page.getByLabel('Ruler every'), '0')
  await expect(page.getByLabel('End numbers')).toHaveCount(0)
})

test('end 1 on the right mirrors the display but not the data', async ({ page }) => {
  const before = await threading(page) // data order, end 1 first
  const firstDrawn = page.getByRole('group', { name: 'Threading' }).locator('[data-cell="3-0"]')
  await expect(firstDrawn).toHaveAttribute('aria-label', 'End 1, shaft 1')

  await page.getByLabel('End 1 on the right').check()
  await expect(firstDrawn).toHaveAttribute('aria-label', 'End 32, shaft 1')
  // Ruler marks run the other way: 4 now sits to the right of 32.
  const markLeft = (n: string) =>
    page
      .getByLabel('End numbers')
      .locator('.ruler-mark', { hasText: new RegExp(`^${n}$`) })
      .evaluate((m) => (m as HTMLElement).offsetLeft)
  expect(await markLeft('4')).toBeGreaterThan(await markLeft('32'))
  // Clicking a cell still changes the end it's labelled with.
  await cell(page, 'End 1, shaft 4').click()
  // threading() reads boxes as drawn, so with end 1 on the right it comes out reversed.
  expect(await threading(page)).toBe([...`4${before.slice(1)}`].reverse().join(''))

  // The choice is remembered.
  await page.reload()
  await expect(page.getByLabel('End 1 on the right')).toBeChecked()
  await expect(firstDrawn).toHaveAttribute('aria-label', 'End 32, shaft 1')
})

test('numbers in boxes show shaft and treadle numbers', async ({ page }) => {
  await expect(cell(page, 'End 3, shaft 3')).toHaveText('')
  await page.getByLabel('Numbers in boxes').check()
  await expect(cell(page, 'End 3, shaft 3')).toHaveText('3')
  await expect(cell(page, 'Pick 2, treadle 2')).toHaveText('2')
  await expect(cell(page, 'End 3, shaft 2')).toHaveText('') // empty boxes stay empty
})

test('the crosshair follows the mouse and names the end and pick', async ({ page }) => {
  await page.locator('.drawdown').scrollIntoViewIfNeeded()
  const box = await page.locator('.drawdown').boundingBox()
  if (!box) throw new Error('drawdown not visible')
  const pitch = Number((await page.getByLabel('Cell size').getAttribute('aria-valuenow')) ?? 20) + 1
  await page.mouse.move(box.x + 1 + 5 * pitch + 3, box.y + 1 + 3 * pitch + 3)
  await expect(page.getByTestId('crosshair-label')).toHaveText('End 6 · Pick 4')
  await expect(page.getByTestId('crosshair-column')).toBeVisible()
  await expect(page.getByTestId('crosshair-row')).toBeVisible()
  await page.mouse.move(5, 5)
  await expect(page.getByTestId('crosshair-label')).toHaveCount(0)
})

test('fabric view shades the drawdown like threads', async ({ page }) => {
  const drawdown = page.locator('.drawdown')
  await expect(drawdown).not.toHaveClass(/fabric/)
  await page.getByLabel('Fabric view').check()
  await expect(drawdown).toHaveClass(/fabric/)
  await expect(drawdown.locator('.cell.warp').first()).toHaveCSS('background-image', /linear-gradient/)
})

test('sinking shed shows the shafts that go down, and editing it still weaves the same', async ({ page }) => {
  const tied = page.getByRole('checkbox', { name: 'Treadle 1, shaft 1', exact: true })
  await expect(tied).toHaveAttribute('aria-checked', 'true')
  const cloth = () =>
    page
      .locator('.drawdown')
      .evaluate((dd) => [...dd.children].map((c) => (c as HTMLElement).style.backgroundColor).join())
  const before = await cloth()

  await page.getByRole('switch', { name: 'Sinking shed' }).check()
  await expect(page.getByRole('group', { name: 'Tie-up (sinking shed)' })).toBeVisible()
  const sinks = page.getByRole('checkbox', { name: 'Treadle 1, shaft 1 sinks' })
  await expect(sinks).toHaveAttribute('aria-checked', 'false') // shaft 1 rises on treadle 1, so it doesn't sink
  await expect(page.getByRole('checkbox', { name: 'Treadle 1, shaft 3 sinks' })).toHaveAttribute('aria-checked', 'true')
  expect(await cloth()).toBe(before)

  // Marking shaft 1 as sinking on treadle 1 means it no longer rises.
  await sinks.click()
  await page.getByRole('switch', { name: 'Sinking shed' }).uncheck()
  await expect(tied).toHaveAttribute('aria-checked', 'false')
})

test('threading below puts the threading under the drawdown, shaft 1 nearest the cloth', async ({ page }) => {
  await page.getByLabel('Threading below').check()
  await expect(page.locator('.draft')).toHaveAttribute('data-layout', 'threading-below')
  const threadingTop = (await page.getByRole('group', { name: 'Threading' }).boundingBox())?.y ?? 0
  const drawdownTop = (await page.getByRole('img', { name: /Woven pattern/ }).boundingBox())?.y ?? 0
  expect(threadingTop).toBeGreaterThan(drawdownTop)
  const y = async (name: string) => (await cell(page, name).boundingBox())?.y ?? 0
  expect(await y('End 1, shaft 1')).toBeLessThan(await y('End 1, shaft 4'))
  // Editing still targets the named shaft.
  await cell(page, 'End 2, shaft 4').click()
  await expect(cell(page, 'End 2, shaft 4')).toHaveAttribute('aria-checked', 'true')
})

test('on desktop the draft grows to full size and the page scrolls instead', async ({ page }) => {
  await setField(page.getByLabel('Ends', { exact: true }), '120')
  await setField(page.getByLabel('Picks', { exact: true }), '100')
  const box = page.locator('.draft-scroll')
  await expect(box).toHaveAttribute('data-scroll', 'page')
  const sizes = await box.evaluate((el) => ({
    inner: el.scrollWidth - el.clientWidth + el.scrollHeight - el.clientHeight,
    pageWide: document.documentElement.scrollWidth > window.innerWidth,
    pageTall: document.documentElement.scrollHeight > window.innerHeight,
  }))
  expect(sizes).toEqual({ inner: 0, pageWide: true, pageTall: true })
  await page.mouse.wheel(0, 3000)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
})

test('filled boxes show the colour of the thread they stand for', async ({ page }) => {
  const bg = (name: string) => cell(page, name).evaluate((el) => getComputedStyle(el).backgroundColor)
  // Default draft: red warp, white weft; end 1 is on shaft 1 and pick 1 on treadle 1.
  expect(await bg('End 1, shaft 1')).toBe('rgb(139, 10, 10)')
  expect(await bg('Pick 1, treadle 1')).toBe('rgb(255, 255, 255)')
  expect(await bg('End 1, shaft 2')).toBe('rgb(255, 255, 255)') // empty
  await expect(cell(page, 'Pick 1, treadle 1')).toHaveClass(/colored/) // ringed so white still reads as filled
  expect(await bg('Treadle 1, shaft 1')).toBe('rgb(17, 17, 17)') // the tie-up has no thread colour

  await page.getByLabel('Warp 1', { exact: true }).fill('#00ff00')
  expect(await bg('End 1, shaft 1')).toBe('rgb(0, 255, 0)')

  await page.getByLabel('Numbers in boxes').check()
  await expect(cell(page, 'End 1, shaft 1')).toHaveText('1')
  expect(await cell(page, 'End 1, shaft 1').evaluate((el) => getComputedStyle(el).color)).toBe('rgb(0, 0, 0)')

  await page.getByLabel('Thread colours in boxes').uncheck()
  expect(await bg('End 1, shaft 1')).toBe('rgb(17, 17, 17)')
  await expect(cell(page, 'Pick 1, treadle 1')).not.toHaveClass(/colored/)
})

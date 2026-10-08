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

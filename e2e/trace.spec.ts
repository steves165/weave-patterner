import { expect, type Page, test } from '@playwright/test'
import { cell, openApp, toolbarButton } from './helpers'

const square = (page: Page, end: number, pick: number) =>
  page.locator(`.drawdown [data-end="${end - 1}"][data-pick="${pick - 1}"]`)
const info = (page: Page) => page.getByTestId('trace-info')
const tracedCells = (page: Page) =>
  page.locator('.draft [role=checkbox].traced').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))

test.beforeEach(async ({ page }) => openApp(page))

test('clicking a drawdown square outlines the threading, tie-up, treadling and colours behind it', async ({ page }) => {
  await square(page, 1, 1).click()
  await expect(info(page)).toHaveText(/End 1, pick 1: warp shows because end 1 is on shaft 1, and treadle 1 lifts it/)
  await expect(square(page, 1, 1)).toHaveClass(/traced/)
  expect(await tracedCells(page)).toEqual(['End 1, shaft 1', 'Treadle 1, shaft 1', 'Pick 1, treadle 1'])
  await expect(page.getByLabel('Warp 1', { exact: true })).toHaveClass(/traced/)
  await expect(page.getByLabel('Weft 1', { exact: true })).toHaveClass(/traced/)
  await expect(page.locator('.swatch.traced')).toHaveCount(2)

  // A square showing weft: the tie-up cell is the empty one that doesn't lift shaft 3.
  await square(page, 3, 1).click()
  await expect(info(page)).toHaveText(/weft shows because end 3 is on shaft 3, and treadle 1 doesn't lift it/)
  expect(await tracedCells(page)).toEqual(['End 3, shaft 3', 'Treadle 1, shaft 3', 'Pick 1, treadle 1'])
  await expect(square(page, 1, 1)).not.toHaveClass(/traced/)
})

test('the explanation follows edits, and the trace can be cleared', async ({ page }) => {
  await square(page, 5, 4).click()
  await expect(info(page)).toContainText('End 5, pick 4: warp shows')
  // Unthreading end 5 (shaft 1) leaves the whole column to trace.
  await cell(page, 'End 5, shaft 1').click()
  await expect(info(page)).toContainText("weft shows because end 5 isn't threaded on any shaft")
  expect((await tracedCells(page)).filter((l) => l?.startsWith('End 5'))).toHaveLength(4)
  await toolbarButton(page, 'Undo').click()
  await expect(info(page)).toContainText('warp shows')

  await page.keyboard.press('Escape')
  await expect(info(page)).toBeHidden()
  await square(page, 5, 4).click()
  await square(page, 5, 4).click() // the same square again
  await expect(info(page)).toBeHidden()
  await square(page, 5, 4).click()
  await page.getByRole('button', { name: 'Stop tracing' }).click()
  await expect(info(page)).toBeHidden()
  await expect(page.locator('.traced')).toHaveCount(0)
})

test('tracing works with end 1 on the right, threading below and a lift plan', async ({ page }) => {
  await page.getByLabel('End 1 on the right').check()
  await page.getByLabel('Threading below').check()
  await square(page, 2, 3).click()
  await expect(info(page)).toContainText('End 2, pick 3')
  // The treadling comes first in the page when the threading is below.
  expect(await tracedCells(page)).toEqual(['Pick 3, treadle 3', 'End 2, shaft 2', 'Treadle 3, shaft 2'])
  await expect(page.getByLabel('Warp 2', { exact: true })).toHaveClass(/traced/)

  await toolbarButton(page, 'Tools').click()
  await page.getByRole('menuitem', { name: /Convert to lift plan/ }).click()
  await square(page, 3, 3).click()
  await expect(info(page)).toContainText(
    'End 3, pick 3: warp shows because end 3 is on shaft 3, which is lifted on this pick',
  )
  expect(await tracedCells(page)).toEqual([
    'Pick 3, shaft 3',
    'Pick 3, shaft 4',
    'End 3, shaft 3',
    'Treadle 3, shaft 3',
    'Treadle 4, shaft 3',
  ])
})

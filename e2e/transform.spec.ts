import { expect, type Page, test } from '@playwright/test'
import { ends, openApp, openTool, picks, setField, threading, toast, toolbarButton, treadling } from './helpers'

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Transform draft' })
const squareColor = (page: Page, end: number, pick: number) =>
  page
    .locator(`.drawdown [data-end="${end - 1}"][data-pick="${pick - 1}"]`)
    .evaluate((el) => getComputedStyle(el).backgroundColor)
const RED = 'rgb(139, 10, 10)'
const WHITE = 'rgb(255, 255, 255)'

test.beforeEach(async ({ page }) => openApp(page))

test('turns the draft through 90°, swapping warp and weft, and undoes', async ({ page }) => {
  await setField(page.getByLabel('Picks', { exact: true }), '16')
  await openTool(page, /Transform draft/)
  await dialog(page).getByRole('button', { name: 'Turn 90°' }).click()
  await expect(toast(page)).toContainText('Turned the draft 90°')
  expect([await ends(page), await picks(page)]).toEqual(['16', '32'])
  // The red warp is now the weft, and the white weft the warp.
  await expect(page.getByLabel('Weft 1', { exact: true })).toHaveValue('#8b0a0a')
  await expect(page.getByLabel('Warp 1', { exact: true })).toHaveValue('#ffffff')
  await toolbarButton(page, 'Undo').click()
  expect([await ends(page), await picks(page)]).toEqual(['32', '16'])
})

test('swaps face and back, flips and moves the repeat', async ({ page }) => {
  expect(await squareColor(page, 1, 1)).toBe(RED)
  await openTool(page, /Transform draft/)
  await dialog(page).getByRole('button', { name: 'Swap face and back' }).click()
  expect(await squareColor(page, 1, 1)).toBe(WHITE)

  await setField(page.getByLabel('Ends', { exact: true }), '6')
  expect(await threading(page)).toBe('123412')
  await openTool(page, /Transform draft/)
  await dialog(page).getByRole('button', { name: 'Flip left–right' }).click()
  expect(await threading(page)).toBe('214321')

  await setField(page.getByLabel('Picks', { exact: true }), '6')
  await openTool(page, /Transform draft/)
  await dialog(page).getByRole('button', { name: 'Flip top–bottom' }).click()
  expect(await treadling(page)).toBe('214321')

  await openTool(page, /Transform draft/)
  await dialog(page).getByLabel('Right by (ends)').fill('1')
  await dialog(page).getByLabel('Down by (picks)').fill('-1')
  await dialog(page).getByRole('button', { name: 'Move', exact: true }).click()
  await expect(toast(page)).toContainText('Moved the pattern 1 end right and 1 pick up')
  expect(await threading(page)).toBe('121432')
  expect(await treadling(page)).toBe('143212')
})

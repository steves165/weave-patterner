import { expect, type Page, test } from '@playwright/test'
import { cell, openApp, setField, threading, toolbarButton, treadling } from './helpers'

test.beforeEach(async ({ page }) => {
  await openApp(page)
  await setField(page.getByLabel('Ends', { exact: true }), '12')
  await setField(page.getByLabel('Picks', { exact: true }), '12')
  // Start from an empty threading and treadling.
  await page.getByRole('button', { name: 'Clear grids' }).click()
})

/** Presses on one box and drags across to another, passing over the boxes between. */
async function drag(page: Page, from: string, to: string) {
  await cell(page, to).scrollIntoViewIfNeeded()
  await cell(page, from).scrollIntoViewIfNeeded()
  const a = await cell(page, from).boundingBox()
  const b = await cell(page, to).boundingBox()
  if (!a || !b) throw new Error('box not found')
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 20 })
  await page.mouse.up()
}

test('straight draw: drag along the threading to draw 1 2 3 4 1 2 …', async ({ page }) => {
  await page.getByRole('button', { name: 'Straight draw' }).click()
  await expect(page.getByRole('button', { name: 'Straight draw' })).toHaveAttribute('aria-pressed', 'true')
  await drag(page, 'End 1, shaft 1', 'End 10, shaft 1')
  expect(await threading(page)).toBe('123412341200')
  // One undo takes back the whole drag.
  await toolbarButton(page, 'Undo').click()
  expect(await threading(page)).toBe('000000000000')
})

test('point draw turns back at the top shaft, and dragging down the shafts descends', async ({ page }) => {
  await page.getByRole('button', { name: 'Point draw' }).click()
  await drag(page, 'End 1, shaft 1', 'End 12, shaft 1')
  expect(await threading(page)).toBe('123432123432')
  await page.getByRole('button', { name: 'Straight draw' }).click()
  await drag(page, 'End 1, shaft 4', 'End 6, shaft 3')
  expect((await threading(page)).slice(0, 6)).toBe('432143')
})

test('draws on the treadling too, and Click goes back to one box at a time', async ({ page }) => {
  await page.getByRole('button', { name: 'Point draw' }).click()
  await drag(page, 'Pick 1, treadle 1', 'Pick 8, treadle 1')
  expect((await treadling(page)).slice(0, 8)).toBe('12343212')
  await page.getByRole('button', { name: 'Click' }).click()
  await cell(page, 'End 3, shaft 2').click()
  expect(await threading(page)).toBe('002000000000')
  // The choice is remembered.
  await page.getByRole('button', { name: 'Point draw' }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Point draw' })).toHaveAttribute('aria-pressed', 'true')
})

import { expect, test } from '@playwright/test'
import { cell, importFile, openApp, setField, threading, toolbarButton } from './helpers'

test.beforeEach(async ({ page }) => openApp(page))

test('undo and redo a single click from the toolbar', async ({ page }) => {
  const undo = toolbarButton(page, 'Undo')
  const redo = toolbarButton(page, 'Redo')
  await expect(undo).toBeDisabled()
  const start = await threading(page)

  await cell(page, 'End 1, shaft 4').click()
  expect(await threading(page)).toMatch(/^4/)
  await expect(redo).toBeDisabled()

  await undo.click()
  expect(await threading(page)).toBe(start)
  await expect(undo).toBeDisabled()

  await redo.click()
  expect(await threading(page)).toMatch(/^4/)
})

test('a whole drag stroke undoes in one step', async ({ page }) => {
  const start = await threading(page)
  const first = await cell(page, 'End 1, shaft 3').boundingBox()
  const last = await cell(page, 'End 6, shaft 3').boundingBox()
  if (!first || !last) throw new Error('cells not visible')
  await page.mouse.move(first.x + 3, first.y + 3)
  await page.mouse.down()
  await page.mouse.move(last.x + 3, last.y + 3, { steps: 12 })
  await page.mouse.up()
  expect((await threading(page)).slice(0, 6)).toBe('333333')

  await toolbarButton(page, 'Undo').click()
  expect(await threading(page)).toBe(start)
})

test('keyboard shortcuts undo and redo, but not while typing in a field', async ({ page }) => {
  const start = await threading(page)
  await cell(page, 'End 2, shaft 4').click()
  const changed = await threading(page)

  await page.keyboard.press('Control+z')
  expect(await threading(page)).toBe(start)
  await page.keyboard.press('Control+Shift+z')
  expect(await threading(page)).toBe(changed)
  await page.keyboard.press('Control+z')
  await page.keyboard.press('Control+y')
  expect(await threading(page)).toBe(changed)

  // In a text field Ctrl+Z belongs to the field.
  const ends = page.getByLabel('Ends', { exact: true })
  await ends.fill('40')
  await ends.press('Control+z')
  expect(await threading(page)).toBe(changed)
})

test('resizing, Reset and Clear grids are undoable', async ({ page }) => {
  const start = await threading(page)
  await setField(page.getByLabel('Ends', { exact: true }), '8')
  expect(await threading(page)).toHaveLength(8)
  await toolbarButton(page, 'Undo').click() // focus is still in the field, where Ctrl+Z edits the text
  expect(await threading(page)).toBe(start)

  await page.getByRole('button', { name: 'Clear grids' }).click()
  expect(await threading(page)).toMatch(/^0+$/)
  await page.getByRole('button', { name: /Reset/ }).click()
  expect(await threading(page)).toBe(start)
  await page.keyboard.press('Control+z')
  expect(await threading(page)).toMatch(/^0+$/)
})

test('opening another pattern starts a fresh history', async ({ page }) => {
  await cell(page, 'End 1, shaft 4').click()
  await expect(toolbarButton(page, 'Undo')).toBeEnabled()
  await importFile(page)
  await expect(toolbarButton(page, 'Undo')).toBeDisabled()
})

import { expect, type Page, test } from '@playwright/test'
import { cell, ends, openApp, threading, toast, toolbarButton } from './helpers'

test.beforeEach(async ({ page }) => {
  await openApp(page)
})

/** Drags along the block strip, from above one end to above another. */
async function markBlock(page: Page, from: number, to: number) {
  const strip = await page.getByTestId('block-strip').boundingBox()
  const a = await cell(page, `End ${from}, shaft 1`).boundingBox()
  const b = await cell(page, `End ${to}, shaft 1`).boundingBox()
  if (!strip || !a || !b) throw new Error('not found')
  const y = strip.y + strip.height / 2
  await page.mouse.move(a.x + a.width / 2, y)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, y, { steps: 10 })
  await page.mouse.up()
}

const label = (page: Page, letter: string) => page.locator(`.block-label[data-block="${letter}"]`)
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Blocks' })

test('split the threading into named blocks, save them to the block store and use them again', async ({ page }) => {
  // The default pattern: 32 ends, a straight draw on 4 shafts.
  await markBlock(page, 1, 4)
  await markBlock(page, 5, 9)
  await expect(label(page, 'A')).toHaveAttribute('aria-label', 'Block A (1–4)')
  await expect(label(page, 'B')).toHaveAttribute('aria-label', 'Block B (5–9)')
  // The labels sit over their ends.
  const a = await label(page, 'A').boundingBox()
  const end1 = await cell(page, 'End 1, shaft 1').boundingBox()
  const end4 = await cell(page, 'End 4, shaft 1').boundingBox()
  expect(Math.abs((a?.x ?? 0) - (end1?.x ?? 0))).toBeLessThan(2)
  expect(Math.abs((a?.x ?? 0) + (a?.width ?? 0) - (end4?.x ?? 0) - (end4?.width ?? 0))).toBeLessThan(2)
  expect(a?.y ?? 0).toBeLessThan(end1?.y ?? 0)

  // Saving a block without a name calls it "Saved block N" and shows that above its ends.
  await label(page, 'A').click()
  await expect(dialog(page).getByLabel('Name of block A')).toBeFocused()
  const rowA = dialog(page).locator('[data-block="A"]')
  await rowA.getByRole('button', { name: 'Save to store' }).click()
  await expect(toast(page)).toContainText('Saved "Saved block 1" in the block store')
  await expect(dialog(page).getByLabel('Name of block A')).toHaveValue('Saved block 1')
  await dialog(page).locator('[data-block="B"]').getByRole('button', { name: 'Save to store' }).click()
  await expect(dialog(page).getByTestId('block-store')).toContainText('Saved block 2')
  await expect(dialog(page).getByTestId('block-store')).toContainText('5 ends on 4 shafts')
  await dialog(page).getByRole('button', { name: 'Done' }).click()
  await expect(label(page, 'A')).toHaveText('ASaved block 1')
  await expect(label(page, 'B')).toHaveText('BSaved block 2')

  // Put saved block 1 in after block B: 4 more ends, and it's block C, with the rest of the pattern after it.
  await page.getByRole('button', { name: 'Blocks', exact: true }).click()
  await dialog(page).getByLabel('Put saved blocks in').click()
  await page.getByRole('option', { name: 'After block B (5–9)' }).click()
  await dialog(page).getByRole('button', { name: 'Put in Saved block 1' }).click()
  await dialog(page).getByRole('button', { name: 'Done' }).click()
  expect(await ends(page)).toBe('36')
  expect((await threading(page)).slice(0, 14)).toBe('12341234112342')
  await expect(label(page, 'C')).toHaveAttribute('aria-label', 'Block C (10–13), Saved block 1')

  // One undo takes it out again.
  await toolbarButton(page, 'Undo').click()
  expect(await ends(page)).toBe('32')
  await expect(label(page, 'C')).toHaveCount(0)

  // The blocks and the block store are still there after a reload.
  await page.reload()
  await expect(label(page, 'B')).toHaveText('BSaved block 2')
  await label(page, 'B').click()
  await expect(dialog(page).getByTestId('block-store').locator('[data-saved]')).toHaveCount(2)
})

test('swap a saved block in for a block, and rename it', async ({ page }) => {
  await markBlock(page, 1, 4)
  await label(page, 'A').click()
  await dialog(page).getByLabel('Name of block A').fill('Border')
  await dialog(page).getByRole('button', { name: 'Save to store' }).click()
  await dialog(page).getByRole('button', { name: 'Add block' }).click()
  await expect(dialog(page).locator('[data-block="B"]')).toBeVisible()
  await dialog(page).locator('[data-block="B"]').getByLabel('Swap in').click()
  await page.getByRole('option', { name: 'Border' }).click()
  await dialog(page).getByRole('button', { name: 'Done' }).click()
  await expect(label(page, 'B')).toHaveAttribute('aria-label', 'Block B (5–8), Border')
  await expect(label(page, 'A')).toHaveText('ABorder')
})

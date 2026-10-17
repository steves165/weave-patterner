import { expect, type Page, test } from '@playwright/test'
import { cell, ends, openApp, openTool, threading, toast, toolbarButton } from './helpers'

test.beforeEach(async ({ page }) => openApp(page))

/** With the Select tool, drags along the threading from one end to another (1-based). */
async function selectEnds(page: Page, from: number, to: number) {
  const tool = page.getByRole('button', { name: 'Select', exact: true })
  if ((await tool.getAttribute('aria-pressed')) !== 'true') await tool.click()
  const a = await cell(page, `End ${from}, shaft 1`).boundingBox()
  const b = await cell(page, `End ${to}, shaft 1`).boundingBox()
  if (!a || !b) throw new Error('no cells')
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 })
  await page.mouse.up()
}

const bar = (page: Page) => page.getByRole('toolbar', { name: 'Selection' })

test('select ends on the threading, then mirror, reverse, copy and paste them', async ({ page }) => {
  // The default pattern: a straight draw, 1 2 3 4 repeated over 32 ends.
  await selectEnds(page, 1, 4)
  await expect(bar(page)).toContainText('Ends 1–4')
  await expect(cell(page, 'End 1, shaft 1')).toHaveClass(/selected/)
  // Selecting changes nothing.
  expect(await threading(page)).toBe('1234'.repeat(8))

  await bar(page).getByRole('button', { name: 'Reverse' }).click()
  expect((await threading(page)).slice(0, 8)).toBe('43211234')
  await page.keyboard.press('Control+c')
  await expect(toast(page)).toContainText('Copied ends 1–4')

  // Paste over ends 9-12.
  await selectEnds(page, 9, 9)
  await page.keyboard.press('Control+v')
  expect((await threading(page)).slice(8, 12)).toBe('4321')
  await expect(bar(page)).toContainText('Ends 9–12')

  await bar(page).getByRole('button', { name: 'Mirror' }).click()
  expect(await ends(page)).toBe('35')
  expect((await threading(page)).slice(8, 15)).toBe('4321234')

  // Esc clears the selection; another tool leaves select mode.
  await page.keyboard.press('Escape')
  await expect(bar(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Click', exact: true }).click()
  await expect(page.getByTestId('select-hint')).toHaveCount(0)
})

test('Insert and Delete keys act on the selection, or on the end under the mouse', async ({ page }) => {
  await selectEnds(page, 5, 6)
  await page.keyboard.press('Insert')
  expect(await ends(page)).toBe('34')
  expect((await threading(page)).slice(0, 8)).toBe('12340012')
  await page.keyboard.press('Delete')
  expect(await ends(page)).toBe('32')
  await expect(bar(page)).toHaveCount(0)

  // No selection: the end under the mouse.
  await page.getByRole('button', { name: 'Click', exact: true }).click()
  await cell(page, 'End 1, shaft 2').hover()
  await page.keyboard.press('Delete')
  expect(await ends(page)).toBe('31')
  expect((await threading(page)).slice(0, 4)).toBe('2341')
  await expect(toast(page)).toContainText('Deleted end 1')
})

test('More… opens Sequence tools on the selection', async ({ page }) => {
  await selectEnds(page, 3, 10)
  await bar(page).getByRole('button', { name: 'More…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Sequence tools' })
  await expect(dialog.getByLabel('From')).toHaveValue('3')
  await expect(dialog.getByLabel('To')).toHaveValue('10')
})

test('Fill with repeat: draw one repeat, then fill the empty ends with it', async ({ page }) => {
  const settings = page.getByRole('complementary', { name: 'Pattern settings' })
  await settings.getByRole('button', { name: 'Clear…' }).click()
  await page.getByRole('menuitem', { name: 'All three grids' }).click()
  await expect(settings.getByRole('button', { name: 'Fill with repeat' })).toBeDisabled()
  for (const [end, shaft] of [
    [1, 1],
    [2, 3],
    [3, 2],
  ])
    await cell(page, `End ${end}, shaft ${shaft}`).click()
  await settings.getByRole('button', { name: 'Fill with repeat' }).click()
  await expect(toast(page)).toContainText('Filled 29 ends with the repeat')
  expect(await threading(page)).toBe('132'.repeat(11).slice(0, 32))
})

test('a custom sequence can turn and repeat', async ({ page }) => {
  await openTool(page, /Sequence tools/)
  const dialog = page.getByRole('dialog', { name: 'Sequence tools' })
  await dialog.getByLabel('Pattern').click()
  await page.getByRole('option', { name: 'Custom sequence' }).click()
  await dialog.getByLabel(/Shafts \(0 = empty\)/).fill('2(1-3-2) 4')
  await expect(page.getByTestId('sequence-preview')).toHaveText('1 2 3 2 1 2 3 2 4')
})

test('New asks which loom: a lift plan on 8 shafts, starting from a twill', async ({ page }) => {
  await page.getByRole('banner').getByRole('button', { name: 'New' }).click()
  const dialog = page.getByRole('dialog', { name: 'New pattern' })
  await dialog.getByRole('group', { name: 'Loom type' }).getByRole('button', { name: 'Lift plan' }).click()
  await expect(dialog.getByLabel('Treadles', { exact: true })).toHaveCount(0)
  await dialog.getByLabel('Shafts', { exact: true }).fill('8')
  await dialog.getByRole('group', { name: 'Start with' }).getByRole('button', { name: 'A twill' }).click()
  await dialog.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByText('8 shafts · lift plan · 32 × 32')).toBeVisible()
  await expect(page.getByRole('group', { name: 'Lift plan' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Tie-up' })).toHaveCount(0)
  expect(await threading(page)).toBe('12345678'.repeat(4))
})

test('Variations offers plain weave and satin tie-ups', async ({ page }) => {
  await page.getByRole('complementary', { name: 'Pattern settings' }).getByLabel('Shafts', { exact: true }).fill('5')
  await page.keyboard.press('Enter')
  await openTool(page, /Variations/)
  const tieups = page.getByRole('region', { name: 'Other tie-ups' })
  await expect(tieups).toContainText('Plain weave tie-up')
  await expect(tieups).toContainText('5-end satin tie-up (move 2)')
})

test('Add tabby puts a plain weave pick after every pick, alternating sheds', async ({ page }) => {
  const weft1 = await page.getByLabel('Weft 1', { exact: true }).inputValue()
  await page.getByRole('button', { name: 'Add tabby…' }).click()
  await page.getByRole('dialog', { name: 'Add tabby' }).getByRole('button', { name: 'Add tabby' }).click()
  await expect(toast(page)).toContainText('Tabby added')
  // Woven in the colour of the pick before.
  await expect(page.getByLabel('Weft 2', { exact: true })).toHaveValue(weft1)
  await expect(page.getByLabel('Picks', { exact: true })).toHaveValue('64')
  // Tabby treadles 5 (shafts 1, 3) and 6 (shafts 2, 4), on picks 2, 4, 6…
  await expect(cell(page, 'Pick 2, treadle 5')).toHaveAttribute('aria-checked', 'true')
  await expect(cell(page, 'Pick 4, treadle 6')).toHaveAttribute('aria-checked', 'true')
  await expect(cell(page, 'Pick 6, treadle 5')).toHaveAttribute('aria-checked', 'true')
  await expect(cell(page, 'Treadle 5, shaft 1')).toHaveAttribute('aria-checked', 'true')
  await expect(cell(page, 'Treadle 5, shaft 2')).toHaveAttribute('aria-checked', 'false')
  await expect(cell(page, 'Treadle 6, shaft 2')).toHaveAttribute('aria-checked', 'true')
  // The pattern picks moved apart but are as they were: pick 3 is the old pick 2.
  await expect(cell(page, 'Pick 3, treadle 2')).toHaveAttribute('aria-checked', 'true')
  // One undo takes it all back.
  await toolbarButton(page, 'Undo').click()
  await expect(page.getByLabel('Picks', { exact: true })).toHaveValue('32')
})

test('Add tabby can weave the tabby in one colour', async ({ page }) => {
  await page.getByRole('button', { name: 'Add tabby…' }).click()
  const menu = page.getByRole('dialog', { name: 'Add tabby' })
  await menu.getByLabel('Tabby colour').fill('#123456')
  await expect(menu.getByRole('radio', { name: 'One colour' })).toBeChecked()
  await menu.getByRole('button', { name: 'Add tabby' }).click()
  await expect(toast(page)).toContainText('Tabby added')
  await expect(page.getByLabel('Weft 2', { exact: true })).toHaveValue('#123456')
  await expect(page.getByLabel('Weft 4', { exact: true })).toHaveValue('#123456')
})

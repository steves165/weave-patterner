import { expect, type Page, test } from '@playwright/test'
import { openApp, openTool, toast, toolbarButton } from './helpers'

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Colours' })
const warp = (page: Page, end: number) => page.getByLabel(`Warp ${end}`, { exact: true })
const weft = (page: Page, pick: number) => page.getByLabel(`Weft ${pick}`, { exact: true })

test.beforeEach(async ({ page }) => openApp(page))

test('applies a stripe sequence to the warp', async ({ page }) => {
  await openTool(page, /Colours and presets/)
  await dialog(page).getByLabel('Stripe 1 colour').fill('#0000ff')
  await dialog(page).getByLabel('Stripe 1 threads').fill('2')
  await dialog(page).getByLabel('Stripe 2 colour').fill('#ffff00')
  await dialog(page).getByLabel('Stripe 2 threads').fill('1')
  await dialog(page).getByRole('button', { name: 'Apply stripe to warp' }).click()
  await expect(toast(page)).toContainText('Applied a 3-thread stripe to warp ends 1–32')
  for (const [end, color] of [
    [1, '#0000ff'],
    [2, '#0000ff'],
    [3, '#ffff00'],
    [4, '#0000ff'],
  ] as const)
    await expect(warp(page, end)).toHaveValue(color)
})

test('adds and removes stripes and works on a weft range', async ({ page }) => {
  await openTool(page, /Colours and presets/)
  await dialog(page).getByRole('button', { name: 'Weft (picks)' }).click()
  await dialog(page).getByRole('button', { name: 'Add stripe' }).click()
  await dialog(page).getByLabel('Stripe 3 colour').fill('#00ff00')
  // Stripes are now navy ×4, white ×4, green ×1; drop the white one.
  await dialog(page).getByRole('button', { name: 'Remove stripe 2' }).click()
  await expect(dialog(page).getByLabel('Stripe 3 colour')).toHaveCount(0)
  await dialog(page).getByLabel('From', { exact: true }).fill('5')
  await dialog(page).getByLabel('To', { exact: true }).fill('6')
  await dialog(page).getByRole('button', { name: 'Apply stripe to weft' }).click()
  await expect(weft(page, 4)).toHaveValue('#ffffff')
  await expect(weft(page, 5)).toHaveValue('#1a237e')
  await expect(weft(page, 6)).toHaveValue('#1a237e')
  await expect(weft(page, 7)).toHaveValue('#ffffff')
})

test('rejects an impossible range', async ({ page }) => {
  await openTool(page, /Colours and presets/)
  await dialog(page).getByLabel('To', { exact: true }).fill('99')
  await dialog(page).getByRole('button', { name: 'Apply stripe to warp' }).click()
  await expect(dialog(page).getByRole('alert')).toHaveText('Choose a range between 1 and 32')
})

test('a colour-and-weave preset replaces the draft and can be undone', async ({ page }) => {
  await openTool(page, /Colours and presets/)
  await dialog(page)
    .getByRole('tab', { name: /presets/ })
    .click()
  await dialog(page).getByLabel('Dark colour').fill('#000000')
  await dialog(page).getByLabel('Light colour').fill('#ffffff')
  await dialog(page).getByRole('button', { name: 'Use Gingham' }).click()
  await expect(toast(page)).toContainText('Applied the Gingham preset')
  await expect(warp(page, 1)).toHaveValue('#000000')
  await expect(warp(page, 5)).toHaveValue('#ffffff')
  await expect(page.getByLabel('Treadles', { exact: true })).toHaveValue('2')

  await toolbarButton(page, 'Undo').click()
  await expect(warp(page, 1)).toHaveValue('#8b0a0a')
  await expect(page.getByLabel('Treadles', { exact: true })).toHaveValue('4')
})

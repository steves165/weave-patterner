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
  // Stripes start in the theme's warp and weft (magenta ×4, blush ×4); add green ×1 and drop the blush.
  await dialog(page).getByRole('button', { name: 'Remove stripe 2' }).click()
  await expect(dialog(page).getByLabel('Stripe 3 colour')).toHaveCount(0)
  await dialog(page).getByLabel('From', { exact: true }).fill('5')
  await dialog(page).getByLabel('To', { exact: true }).fill('6')
  await dialog(page).getByRole('button', { name: 'Apply stripe to weft' }).click()
  await expect(weft(page, 4)).toHaveValue('#ffd3e4')
  await expect(weft(page, 5)).toHaveValue('#d6246e')
  await expect(weft(page, 6)).toHaveValue('#d6246e')
  await expect(weft(page, 7)).toHaveValue('#ffd3e4')
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
  await expect(warp(page, 1)).toHaveValue('#d6246e')
  await expect(page.getByLabel('Treadles', { exact: true })).toHaveValue('4')
})

test("stripes and presets start in the seasonal theme's colours, with an accent for three-colour checks", async ({
  page,
}) => {
  await page.evaluate(() => localStorage.setItem('wp-season', 'christmas'))
  await page.reload()
  await openTool(page, /Colours and presets/)
  // Christmas: red warp, green weft.
  await expect(dialog(page).getByLabel('Stripe 1 colour')).toHaveValue('#b71c1c')
  await expect(dialog(page).getByLabel('Stripe 2 colour')).toHaveValue('#1b5e20')
  await dialog(page)
    .getByRole('tab', { name: /presets/ })
    .click()
  // The darker of the two is "dark".
  await expect(dialog(page).getByLabel('Dark colour')).toHaveValue('#1b5e20')
  await expect(dialog(page).getByLabel('Light colour')).toHaveValue('#b71c1c')
  await expect(dialog(page).getByLabel('Accent colour')).toHaveValue('#d4a017')
  // Every preset has a preview.
  const presets = dialog(page).getByRole('button', { name: /^Use / })
  expect(await presets.count()).toBeGreaterThanOrEqual(16)
  await expect(dialog(page).locator('canvas')).toHaveCount(await presets.count())

  await dialog(page).getByRole('button', { name: 'Use Tattersall' }).click()
  await expect(toast(page)).toContainText('Applied the Tattersall preset')
  // 2 dark, 6 light, 2 accent, 6 light.
  await expect(warp(page, 1)).toHaveValue('#1b5e20')
  await expect(warp(page, 3)).toHaveValue('#b71c1c')
  await expect(warp(page, 9)).toHaveValue('#d4a017')
})

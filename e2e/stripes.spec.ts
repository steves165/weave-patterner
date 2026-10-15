import { expect, type Page, test } from '@playwright/test'
import { openApp, openTool, toast, toolbarButton } from './helpers'

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Colours' })
const sidebar = (page: Page) => page.getByRole('complementary', { name: 'Pattern settings' })
const warp = (page: Page, end: number) => page.getByLabel(`Warp ${end}`, { exact: true })
const BLUE = '#0000ff'
const YELLOW = '#ffff00'

test.beforeEach(async ({ page }) => openApp(page))

/** Applies blue ×2, yellow ×1 to the warp. */
async function applyStripe(page: Page) {
  await openTool(page, /Colours and presets/)
  await dialog(page).getByLabel('Stripe 1 colour').fill(BLUE)
  await dialog(page).getByLabel('Stripe 1 threads').fill('2')
  await dialog(page).getByLabel('Stripe 2 colour').fill(YELLOW)
  await dialog(page).getByLabel('Stripe 2 threads').fill('1')
  await dialog(page).getByRole('button', { name: 'Apply stripe to warp' }).click()
  await expect(toast(page)).toContainText('change it any time under Colours')
}
const warpColours = async (page: Page, n: number) =>
  Promise.all(Array.from({ length: n }, (_, i) => warp(page, i + 1).inputValue()))

test('the stripe applied is remembered in the sidebar, to change, reorder or forget', async ({ page }) => {
  await applyStripe(page)
  const stripes = sidebar(page).getByTestId('warp-stripes')
  await expect(stripes).toContainText('Warp stripes')
  await expect(stripes).toContainText('ends 1–32')
  await expect(stripes.getByLabel('Warp stripe 1 threads')).toHaveValue('2')

  // Change it: three blue, one yellow, all the way across.
  await stripes.getByLabel('Warp stripe 1 threads').fill('3')
  expect(await warpColours(page, 5)).toEqual([BLUE, BLUE, BLUE, YELLOW, BLUE])
  await toolbarButton(page, 'Undo').click()
  expect(await warpColours(page, 4)).toEqual([BLUE, BLUE, YELLOW, BLUE])

  // Reorder it from the keyboard: yellow first.
  await stripes.getByRole('button', { name: 'Move warp stripe 1', exact: true }).focus()
  await page.keyboard.press('ArrowDown')
  expect(await warpColours(page, 4)).toEqual([YELLOW, BLUE, BLUE, YELLOW])
  await expect(stripes.getByRole('button', { name: 'Move warp stripe 2', exact: true })).toBeFocused()

  // Reopening the dialog starts from it.
  await openTool(page, /Colours and presets/)
  await expect(dialog(page).getByLabel('Stripe 1 colour')).toHaveValue(YELLOW)
  await page.keyboard.press('Escape')

  // Kept after a reload, then forgotten (the colours stay).
  await page.reload()
  await expect(sidebar(page).getByTestId('warp-stripes')).toBeVisible()
  await sidebar(page).getByTestId('warp-stripes').getByRole('button', { name: 'Forget' }).click()
  await expect(sidebar(page).getByTestId('warp-stripes')).toHaveCount(0)
  expect(await warpColours(page, 4)).toEqual([YELLOW, BLUE, BLUE, YELLOW])
})

test('stripes can be dragged into a new order', async ({ page }) => {
  await applyStripe(page)
  const stripes = sidebar(page).getByTestId('warp-stripes')
  // The Loom settings above push the stripes down the sidebar: bring them into view to drag.
  await stripes.scrollIntoViewIfNeeded()
  const handle = await stripes.getByRole('button', { name: 'Move warp stripe 2', exact: true }).boundingBox()
  const first = await stripes.locator('[data-stripe="1"]').boundingBox()
  if (!handle || !first) throw new Error('no stripes')
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down()
  await page.mouse.move(handle.x + handle.width / 2, first.y + first.height / 2, { steps: 8 })
  await page.mouse.up()
  expect(await warpColours(page, 3)).toEqual([YELLOW, BLUE, BLUE])
  // One undo step for the drag.
  await toolbarButton(page, 'Undo').click()
  expect(await warpColours(page, 3)).toEqual([BLUE, BLUE, YELLOW])
})

test('the colour picker: basic colours, favourites and palettes', async ({ page }) => {
  const picker = (label: string) => page.getByRole('dialog', { name: `Colours for ${label}` })
  await warp(page, 1).click()
  await picker('Warp 1').getByRole('button', { name: 'Basic colour #c62828' }).click()
  await expect(warp(page, 1)).toHaveValue('#c62828')
  await expect(picker('Warp 1')).toHaveCount(0)

  // Save it as a favourite, and another, then make them a palette.
  await warp(page, 1).click()
  await picker('Warp 1').getByRole('button', { name: 'Save #c62828 as a favourite' }).click()
  await expect(picker('Warp 1').getByRole('button', { name: 'Favourite #c62828' })).toBeVisible()
  await picker('Warp 1').getByLabel('Hex').fill('#123456')
  await expect(warp(page, 1)).toHaveValue('#123456')
  await warp(page, 1).click()
  await picker('Warp 1').getByRole('button', { name: 'Save #123456 as a favourite' }).click()
  await picker('Warp 1').getByRole('button', { name: 'Save favourites as a palette' }).click()
  await picker('Warp 1').getByLabel('Palette name').fill('Reds and navy')
  await picker('Warp 1').getByRole('button', { name: 'Save', exact: true }).click()
  await expect(picker('Warp 1').locator('[data-palette="Reds and navy"]')).toBeVisible()
  await page.keyboard.press('Escape')

  // Favourites and palettes are there in every picker, and after a reload.
  await page.reload()
  await page.getByRole('complementary', { name: 'Pattern settings' }).getByLabel('Weft colour for all picks').click()
  const weftPicker = picker('Weft colour for all picks')
  await weftPicker.getByRole('button', { name: 'Reds and navy #123456' }).click()
  await expect(page.getByLabel('Weft colour for all picks')).toHaveValue('#123456')

  // Hide and show a palette; delete one, and a favourite.
  await page.getByLabel('Weft colour for all picks').click()
  await weftPicker.getByRole('button', { name: 'Hide Reds and navy' }).click()
  await expect(weftPicker.locator('[data-palette="Reds and navy"]')).toHaveCount(0)
  await weftPicker.getByRole('button', { name: 'Show Reds and navy' }).click()
  await weftPicker.getByRole('button', { name: 'Edit' }).click()
  await weftPicker.getByRole('button', { name: 'Delete Reds and navy' }).click()
  await weftPicker.getByRole('button', { name: 'Remove Favourite #c62828' }).click()
  await expect(weftPicker.locator('[data-palette]')).toHaveCount(0)
  await expect(weftPicker.getByRole('button', { name: 'Remove Favourite #123456' })).toBeVisible()
  await expect(weftPicker.getByRole('button', { name: 'Remove Favourite #c62828' })).toHaveCount(0)
})

test('a thread count can be cleared to type a new one, and becomes 1 if left empty', async ({ page }) => {
  await applyStripe(page)
  const count = sidebar(page).getByTestId('warp-stripes').getByLabel('Warp stripe 1 threads')
  await count.click()
  await count.press('End')
  await count.press('Backspace')
  await expect(count).toHaveValue('')
  await count.pressSequentially('4')
  await expect(count).toHaveValue('4')
  expect(await warpColours(page, 5)).toEqual([BLUE, BLUE, BLUE, BLUE, YELLOW])

  await count.press('Backspace')
  await expect(count).toHaveValue('')
  await count.blur()
  await expect(count).toHaveValue('1')
  expect(await warpColours(page, 3)).toEqual([BLUE, YELLOW, BLUE])
})

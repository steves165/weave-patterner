import { expect, type Page, test } from '@playwright/test'
import { openApp, openTool, toast, toolbarButton } from './helpers'

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Double cloth' })
const result = (page: Page) => dialog(page).getByTestId('doublecloth-result')
const DARK = 'rgb(26, 35, 126)'
const LIGHT = 'rgb(250, 250, 250)'

/** Background colour of a drawdown square (1-based end and pick). */
const squareColor = (page: Page, end: number, pick: number) =>
  page
    .locator(`.drawdown [data-end="${end - 1}"][data-pick="${pick - 1}"]`)
    .evaluate((el) => getComputedStyle(el).backgroundColor)
const allColors = (page: Page) =>
  page
    .locator('.drawdown .cell')
    .evaluateAll((els) => [...new Set(els.map((e) => getComputedStyle(e).backgroundColor))])

async function choose(page: Page, label: string, option: string) {
  await dialog(page).getByRole('combobox', { name: label }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

test.beforeEach(async ({ page }) => openApp(page))

test('block double cloth swaps the layers by block, reversed on the back', async ({ page }) => {
  await openTool(page, /Double cloth/)
  await expect(result(page)).toHaveText('Makes 8 shafts, 8 treadles, 28 ends × 28 picks')
  await dialog(page).getByRole('button', { name: 'Create draft' }).click()
  await expect(toast(page)).toContainText('Double cloth: block double cloth (replaces the draft); showing the face')
  await expect(page.getByLabel('Shafts', { exact: true })).toHaveValue('8')
  await expect(page.getByRole('img', { name: /^Face of the cloth, 28 ends by 28 picks/ })).toBeVisible()

  // Profile 1 1 2 2 2 1 1: block 1 is ends 1–8 and picks 1–8, where layer A (dark) is on top; block 2 is light.
  for (const [end, pick] of [
    [3, 3],
    [4, 6],
    [5, 4],
  ])
    expect(await squareColor(page, end, pick)).toBe(DARK)
  for (const [end, pick] of [
    [12, 3],
    [14, 6],
    [15, 4],
  ])
    expect(await squareColor(page, end, pick)).toBe(LIGHT)

  await page.getByRole('button', { name: 'Back' }).click()
  expect(await squareColor(page, 3, 3)).toBe(LIGHT)
  expect(await squareColor(page, 12, 3)).toBe(DARK)

  // The plain drawdown shows both layers' interlacing mixed together.
  await page.getByRole('button', { name: 'Drawdown' }).click()
  await expect(page.getByRole('img', { name: /^Woven pattern/ })).toBeVisible()
  expect(await squareColor(page, 2, 2)).toBe(LIGHT) // layer B's end shows in the drawdown, though it's hidden
})

test('separate layers show one layer on each side', async ({ page }) => {
  await openTool(page, /Double cloth/)
  await choose(page, 'Structure', 'Two separate layers')
  await dialog(page).getByLabel('Repeats').fill('4')
  await expect(result(page)).toHaveText('Makes 4 shafts, 4 treadles, 16 ends × 16 picks')
  await dialog(page).getByRole('button', { name: 'Create draft' }).click()
  expect(await allColors(page)).toEqual([DARK])
  await page.getByRole('button', { name: 'Back' }).click()
  expect(await allColors(page)).toEqual([LIGHT])
})

test('tubes and double width use one shuttle; twill needs more shafts per block', async ({ page }) => {
  await openTool(page, /Double cloth/)
  await choose(page, 'Structure', 'Tube')
  await expect(dialog(page).getByLabel('Weft (one shuttle)')).toBeVisible()
  await expect(dialog(page).getByLabel('Layer B weft')).toHaveCount(0)
  await choose(page, 'Structure', 'Double width')
  await expect(dialog(page).getByText(/opens out to twice the width/)).toBeVisible()

  await choose(page, 'Structure', 'Block double cloth')
  await choose(page, 'Each layer weaves', '2/2 twill')
  await expect(result(page)).toHaveText('Makes 16 shafts, 16 treadles, 56 ends × 56 picks')
  await dialog(page).getByLabel('Blocks', { exact: true }).fill('3')
  await expect(result(page)).toHaveText(/Makes 24 shafts/)
  await dialog(page).getByLabel('Blocks', { exact: true }).fill('4') // only 3 blocks fit in 24 shafts
  await expect(dialog(page).getByLabel('Blocks', { exact: true })).toHaveValue('3')
})

test('stitched layers, layer labels in weaving mode, and hidden crossings when tracing', async ({ page }) => {
  await openTool(page, /Double cloth/)
  await choose(page, 'Structure', 'Stitched layers')
  await expect(dialog(page).getByLabel('Stitch every (repeats)')).toHaveValue('2')
  await expect(result(page)).toHaveText('Makes 4 shafts, 6 treadles, 32 ends × 32 picks')
  await choose(page, 'Structure', 'Two separate layers')
  await dialog(page).getByRole('button', { name: 'Create draft' }).click()

  // End 2 and pick 2 are both layer B: hidden on the face.
  await page.locator('.drawdown [data-end="1"][data-pick="1"]').click()
  await expect(page.getByTestId('trace-info')).toContainText('so this crossing is hidden on the face')
  await page.keyboard.press('Escape')

  await toolbarButton(page, 'Weave').click()
  await expect(page.getByTestId('pick-layer')).toHaveText('Top layer')
  await page.getByRole('button', { name: 'Next pick' }).click()
  await expect(page.getByTestId('pick-layer')).toHaveText('Bottom layer (top layer lifted out of the way)')
})

test('single-layer drafts show no layer label when weaving', async ({ page }) => {
  await toolbarButton(page, 'Weave').click()
  await expect(page.getByTestId('instruction')).toBeVisible()
  await expect(page.getByTestId('pick-layer')).toHaveCount(0)
})

test('warns about threads that are never woven in', async ({ page }) => {
  await expect(page.getByTestId('unwoven')).toHaveCount(0)
  // Untie shaft 4 from treadles 3 and 4: nothing lifts it any more.
  await page.getByRole('checkbox', { name: 'Treadle 3, shaft 4', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Treadle 4, shaft 4', exact: true }).click()
  await expect(page.getByTestId('unwoven')).toHaveText(
    'Not woven in: ends 4, 8, 12, 16, 20, 24 and 2 more (they never cross over and under)',
  )
})

test('the Back switch turns the whole draft over, mirroring it left to right', async ({ page }) => {
  const firstColumn = () => page.locator('.drawdown .cell').first().getAttribute('data-end')
  const firstThreading = () =>
    page.getByRole('group', { name: 'Threading' }).locator('[role=checkbox]').first().getAttribute('aria-label')
  expect(await firstColumn()).toBe('0')
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('button', { name: 'Back' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('back-note')).toHaveText(/end 1 is on the right/)
  expect(await firstColumn()).toBe('31') // end 32 is now on the left
  expect(await firstThreading()).toMatch(/^End 32,/) // the threading turns over with it
  await expect(page.getByRole('img', { name: /^Back of the cloth/ })).toBeVisible()

  // A draft already drawn with end 1 on the right turns over to end 1 on the left.
  await page.getByLabel('End 1 on the right').check()
  await expect(page.getByTestId('back-note')).toHaveText(/end 1 is on the left/)
  expect(await firstColumn()).toBe('0')

  await page.getByRole('button', { name: 'Face' }).click()
  await expect(page.getByTestId('back-note')).toHaveCount(0)
  expect(await firstColumn()).toBe('31')
})

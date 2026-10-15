import { expect, type Page, test } from '@playwright/test'
import { openApp, openTool, threading, toast, toolbarButton } from './helpers'

const field = (page: Page, name: string) => page.getByLabel(name, { exact: true })

test.beforeEach(async ({ page }) => openApp(page))

test.describe('draw on the drawdown', () => {
  const square = (page: Page, pick: number, end: number) =>
    page.locator(`.drawdown [data-pick="${pick - 1}"][data-end="${end - 1}"]`)
  const isWarp = async (page: Page, pick: number, end: number) =>
    (await square(page, pick, end).getAttribute('class'))?.includes(' warp') ?? false
  /** The whole drawdown, as one string of warp (1) and weft (0) squares. */
  const cloth = (page: Page) =>
    page
      .locator('.drawdown')
      .evaluate((el) =>
        [...el.querySelectorAll<HTMLElement>('.cell')].map((c) => (c.classList.contains('warp') ? 1 : 0)).join(''),
      )

  test('the Draw cloth tool: choosing it changes nothing, then a click swaps just that square', async ({ page }) => {
    const before = await cloth(page)
    await page.getByRole('button', { name: 'Draw cloth', exact: true }).click()
    await expect(page.getByTestId('draw-hint')).toContainText('Drawing on the drawdown')
    expect(await cloth(page)).toBe(before)
    await expect(field(page, 'Shafts')).toHaveValue('4')

    const was = await isWarp(page, 3, 5)
    await square(page, 3, 5).click()
    await expect.poll(() => isWarp(page, 3, 5)).toBe(!was)
    // Only that square changed.
    const after = await cloth(page)
    const diffs = [...after].flatMap((c, i) => (c !== before[i] ? [i] : []))
    expect(diffs).toEqual([2 * 32 + 4])

    // One undo puts it back.
    await toolbarButton(page, 'Undo').click()
    expect(await cloth(page)).toBe(before)
  })

  test('dragging draws a line of squares as one undo step; Stop drawing turns it off', async ({ page }) => {
    await page.getByRole('button', { name: 'Draw cloth', exact: true }).click()
    const before = await cloth(page)
    const a = await square(page, 10, 1).boundingBox()
    const b = await square(page, 10, 12).boundingBox()
    if (!a || !b) throw new Error('no squares')
    const first = await isWarp(page, 10, 1)
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
    await page.mouse.down()
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 24 })
    await page.mouse.up()
    for (let e = 1; e <= 12; e++) expect(await isWarp(page, 10, e)).toBe(!first)
    // Nothing outside pick 10 changed.
    const after = await cloth(page)
    const diffs = [...after].flatMap((c, i) => (c !== before[i] ? [Math.floor(i / 32) + 1] : []))
    expect(new Set(diffs)).toEqual(new Set([10]))
    await toolbarButton(page, 'Undo').click()
    expect(await cloth(page)).toBe(before)

    await page.getByTestId('draw-hint').getByRole('button', { name: 'Stop drawing' }).click()
    await expect(page.getByTestId('draw-hint')).toHaveCount(0)
    // Clicking a square traces it again.
    await square(page, 1, 1).click()
    await expect(page.getByTestId('trace-info')).toBeVisible()
  })

  test('choosing another drawing tool stops drawing on the cloth', async ({ page }) => {
    await page.getByRole('button', { name: 'Draw cloth', exact: true }).click()
    await expect(page.getByTestId('draw-hint')).toBeVisible()
    await page.getByRole('button', { name: 'Straight draw', exact: true }).click()
    await expect(page.getByTestId('draw-hint')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Straight draw', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

test.describe('profile draft', () => {
  const dialog = (page: Page) => page.getByRole('dialog', { name: 'Profile draft' })

  test('substitutes turned twill into a two-block profile', async ({ page }) => {
    await openTool(page, /Profile draft/)
    await expect(dialog(page).getByTestId('profile-result')).toHaveText(
      'Makes 8 shafts, 8 treadles, 28 ends × 28 picks',
    )
    await dialog(page).getByRole('button', { name: 'Create draft' }).click()
    await expect(field(page, 'Shafts')).toHaveValue('8')
    await expect(field(page, 'Ends')).toHaveValue('28')
    // Block 2 (ends 9-20) is threaded on shafts 5-8.
    await expect(page.getByRole('checkbox', { name: 'End 9, shaft 5' })).toHaveAttribute('aria-checked', 'true')
    // 3/1 and 1/3 twill float over 3 threads.
    await expect(page.getByTestId('float-stats')).toHaveText('Longest floats: warp 3, weft 3')
  })

  test('adds blocks and explains mistakes', async ({ page }) => {
    await openTool(page, /Profile draft/)
    await dialog(page).getByLabel('Blocks', { exact: true }).fill('3')
    await expect(dialog(page).getByRole('checkbox', { name: 'Block 3, block treadle 1' })).toBeVisible()
    await dialog(page)
      .getByLabel(/Profile threading/)
      .fill('1 2 3 4')
    await expect(dialog(page).getByRole('alert')).toHaveText("Block 4 isn't in the profile tie-up")
    await expect(dialog(page).getByRole('button', { name: 'Create draft' })).toBeDisabled()
  })
})

test.describe('block structures', () => {
  const dialog = (page: Page) => page.getByRole('dialog', { name: 'Profile draft' })
  async function choose(page: Page, structure: string) {
    await dialog(page).getByRole('combobox', { name: 'Structure' }).click()
    await page.getByRole('option', { name: structure, exact: true }).click()
  }

  test('each structure turns the same profile into its own draft', async ({ page }) => {
    await openTool(page, /Profile draft/)
    const result = dialog(page).getByTestId('profile-result')
    for (const [structure, makes] of [
      ['Overshot', 'Makes 4 shafts, 4 treadles, 28 ends × 28 picks'],
      ['Crackle', 'Makes 4 shafts, 4 treadles, 28 ends × 28 picks'],
      ['Summer and winter', 'Makes 4 shafts, 6 treadles, 28 ends × 28 picks'],
      ['Bronson lace', 'Makes 4 shafts, 4 treadles, 42 ends × 42 picks'],
      ["M's and O's", 'Makes 4 shafts, 4 treadles, 56 ends × 28 picks'],
      ['Damask', 'Makes 10 shafts, 10 treadles, 35 ends × 35 picks'],
    ]) {
      await choose(page, structure)
      await expect(result).toHaveText(makes)
    }
  })

  test('block weaves have no profile tie-up to edit and cap the number of blocks', async ({ page }) => {
    await openTool(page, /Profile draft/)
    await choose(page, 'Overshot')
    await expect(dialog(page).getByTestId('fixed-tieup')).toContainText('each block treadle weaves its own block')
    await expect(dialog(page).getByRole('group', { name: 'Profile tie-up' })).toHaveCount(0)
    await dialog(page).getByLabel('Blocks', { exact: true }).fill('6')
    await expect(dialog(page).getByLabel('Blocks', { exact: true })).toHaveValue('4')
    await choose(page, "M's and O's")
    await expect(dialog(page).getByLabel('Blocks', { exact: true })).toHaveValue('2')
    await expect(dialog(page).getByLabel('Tabby weft')).toHaveCount(0)
    await choose(page, 'Summer and winter')
    await expect(dialog(page).getByRole('group', { name: 'Profile tie-up' })).toBeVisible()
  })

  test('creates an overshot draft in the chosen colours, with tabby between pattern picks', async ({ page }) => {
    await openTool(page, /Profile draft/)
    await choose(page, 'Overshot')
    await dialog(page).getByLabel('Pattern weft').fill('#aa0000')
    await dialog(page).getByRole('button', { name: 'Create draft' }).click()
    await expect(toast(page)).toContainText('Overshot draft from a 2-block profile')
    await expect(page.getByLabel('Weft 1', { exact: true })).toHaveValue('#aa0000')
    await expect(page.getByLabel('Weft 2', { exact: true })).toHaveValue('#f5f0e6')
    expect(await threading(page)).toMatch(/^12121212/)
  })
})

test.describe('yarn library', () => {
  const dialog = (page: Page) => page.getByRole('dialog', { name: 'Yarn library' })

  test('adds yarns for the draft colours and the calculator uses them', async ({ page }) => {
    await openTool(page, /Yarn library/)
    await expect(dialog(page)).toContainText('No yarns yet.')
    await dialog(page).getByRole('button', { name: 'Add a yarn for #d6246e' }).click()
    await dialog(page).getByLabel('Yarn 1 name').fill('Red 8/2 cotton')
    await dialog(page).getByLabel('Grist').fill('3360')
    await dialog(page).getByLabel('Price').fill('45')
    await expect(dialog(page).getByRole('button', { name: 'Add a yarn for #d6246e' })).toHaveCount(0)
    await dialog(page).getByRole('button', { name: 'Done' }).click()

    await openTool(page, /Warp calculator/)
    const calc = page.getByRole('dialog', { name: 'Warp calculator' })
    await expect(calc.getByRole('table', { name: 'Yarn needed' })).toContainText('Red 8/2 cotton (#d6246e)')
    await expect(calc.getByRole('columnheader', { name: 'Weight' })).toBeVisible()
    // The white weft has no yarn and there's no default grist, so its weight (and the total) can't be worked out.
    await expect(page.getByTestId('calc-total')).toContainText('—')
    await calc.getByRole('button', { name: 'Close', exact: true }).click()

    // Remembered across visits; deleting removes it.
    await page.reload()
    await openTool(page, /Yarn library/)
    await expect(dialog(page).getByLabel('Yarn 1 name')).toHaveValue('Red 8/2 cotton')
    await dialog(page).getByRole('button', { name: 'Delete Red 8/2 cotton' }).click()
    await expect(dialog(page)).toContainText('No yarns yet.')
  })
})

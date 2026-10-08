import { expect, type Page, test } from '@playwright/test'
import { openApp, openTool, threading, toast, toolbarButton } from './helpers'

const field = (page: Page, name: string) => page.getByLabel(name, { exact: true })

test.beforeEach(async ({ page }) => openApp(page))

test.describe('draw the cloth', () => {
  const dialog = (page: Page) => page.getByRole('dialog', { name: 'Design by drawing the cloth' })

  test('starts from the current drawdown and works out the smallest draft', async ({ page }) => {
    await openTool(page, /Draw the cloth/)
    await expect(dialog(page).getByTestId('cloth-needs')).toHaveText('Needs 4 shafts and 4 treadles')

    await dialog(page).getByRole('button', { name: 'Clear' }).click()
    for (const name of ['Pick 1, end 1', 'Pick 2, end 2', 'Pick 3, end 3'])
      await dialog(page).getByRole('checkbox', { name, exact: true }).click()
    await expect(dialog(page).getByTestId('cloth-needs')).toHaveText('Needs 3 shafts and 3 treadles')

    await dialog(page).getByRole('button', { name: 'Create draft' }).click()
    await expect(toast(page)).toContainText('Draft worked out from the cloth: 3 shafts, 3 treadles')
    await expect(field(page, 'Shafts')).toHaveValue('3')
    await expect(page.getByRole('checkbox', { name: 'End 1, shaft 1' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('checkbox', { name: 'End 4, shaft 1' })).toHaveAttribute('aria-checked', 'false')

    await toolbarButton(page, 'Undo').click()
    await expect(field(page, 'Shafts')).toHaveValue('4')
  })

  test('warns when the cloth needs more shafts than a loom has', async ({ page }) => {
    await page.getByLabel('Ends', { exact: true }).fill('30')
    await page.getByLabel('Ends', { exact: true }).press('Enter')
    await openTool(page, /Draw the cloth/)
    await dialog(page).getByRole('button', { name: 'Clear' }).click()
    for (let i = 1; i <= 25; i++)
      await dialog(page)
        .getByRole('checkbox', { name: `Pick ${i}, end ${i}`, exact: true })
        .click()
    await expect(dialog(page).getByRole('alert')).toContainText('needs 25 shafts')
    await expect(dialog(page).getByRole('button', { name: 'Create draft' })).toBeDisabled()
  })
})

test.describe('block profile', () => {
  const dialog = (page: Page) => page.getByRole('dialog', { name: 'Block profile' })

  test('substitutes turned twill into a two-block profile', async ({ page }) => {
    await openTool(page, /Block profile/)
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
    await openTool(page, /Block profile/)
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
  const dialog = (page: Page) => page.getByRole('dialog', { name: 'Block profile' })
  async function choose(page: Page, structure: string) {
    await dialog(page).getByRole('combobox', { name: 'Structure' }).click()
    await page.getByRole('option', { name: structure, exact: true }).click()
  }

  test('each structure turns the same profile into its own draft', async ({ page }) => {
    await openTool(page, /Block profile/)
    const result = dialog(page).getByTestId('profile-result')
    for (const [structure, makes] of [
      ['Overshot', 'Makes 4 shafts, 4 treadles, 28 ends × 28 picks'],
      ['Crackle', 'Makes 4 shafts, 4 treadles, 28 ends × 28 picks'],
      ['Summer and winter', 'Makes 4 shafts, 6 treadles, 28 ends × 28 picks'],
      ['Bronson lace', 'Makes 4 shafts, 4 treadles, 42 ends × 42 picks'],
      ["M's and O's", 'Makes 4 shafts, 4 treadles, 56 ends × 28 picks'],
    ]) {
      await choose(page, structure)
      await expect(result).toHaveText(makes)
    }
  })

  test('block weaves have no profile tie-up to edit and cap the number of blocks', async ({ page }) => {
    await openTool(page, /Block profile/)
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
    await openTool(page, /Block profile/)
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
    await dialog(page).getByRole('button', { name: 'Add a yarn for #8b0a0a' }).click()
    await dialog(page).getByLabel('Yarn 1 name').fill('Red 8/2 cotton')
    await dialog(page).getByLabel('Grist').fill('3360')
    await dialog(page).getByLabel('Price').fill('45')
    await expect(dialog(page).getByRole('button', { name: 'Add a yarn for #8b0a0a' })).toHaveCount(0)
    await dialog(page).getByRole('button', { name: 'Done' }).click()

    await openTool(page, /Warp calculator/)
    const calc = page.getByRole('dialog', { name: 'Warp calculator' })
    await expect(calc.getByRole('table', { name: 'Yarn needed' })).toContainText('Red 8/2 cotton (#8b0a0a)')
    await expect(calc.getByRole('columnheader', { name: 'Weight' })).toBeVisible()
    // The white weft has no yarn and there's no default grist, so its weight (and the total) can't be worked out.
    await expect(page.getByTestId('calc-total')).toContainText('—')
    await calc.getByRole('button', { name: 'Close' }).click()

    // Remembered across visits; deleting removes it.
    await page.reload()
    await openTool(page, /Yarn library/)
    await expect(dialog(page).getByLabel('Yarn 1 name')).toHaveValue('Red 8/2 cotton')
    await dialog(page).getByRole('button', { name: 'Delete Red 8/2 cotton' }).click()
    await expect(dialog(page)).toContainText('No yarns yet.')
  })
})

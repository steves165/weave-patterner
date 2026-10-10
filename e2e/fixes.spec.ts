import { expect, type Page, test } from '@playwright/test'
import { cell, openApp, toast, toolbarButton } from './helpers'

const dialog = (page: Page) => page.getByRole('dialog')
const apply = (page: Page, title: string | RegExp) =>
  dialog(page).getByRole('button', { name: typeof title === 'string' ? `Apply: ${title}` : title })

test.beforeEach(async ({ page }) => openApp(page))

test('the edge warning opens fixes; each clears it, and draft changes undo', async ({ page }) => {
  const warning = page.getByTestId('selvedge')
  await warning.click()
  await expect(dialog(page)).toContainText('Edges the weft doesn’t catch')
  await expect(dialog(page).locator('[data-fix]')).toHaveCount(3)
  // Starting from the other side needs no change to the draft, so it's offered first.
  await expect(dialog(page).locator('[data-fix]').first()).toHaveAttribute('data-fix', 'shuttle-start')

  await apply(page, 'Add a selvedge end').click()
  await expect(dialog(page)).toHaveCount(0)
  await expect(toast(page)).toContainText('Add a selvedge end: done. Undo with Ctrl+Z')
  await expect(page.getByLabel('Ends', { exact: true })).toHaveValue('34')
  await expect(warning).toHaveCount(0)
  await expect(page.getByTestId('edges-ok')).toBeVisible()
  await toolbarButton(page, 'Undo').click()
  await expect(page.getByLabel('Ends', { exact: true })).toHaveValue('32')
  await expect(warning).toBeVisible()

  // Floating selvedges change only how it's woven, and can be turned off again.
  await warning.click()
  await apply(page, 'Weave with floating selvedges').click()
  await expect(warning).toHaveCount(0)
  await page.getByTestId('floating-selvedge').click()
  await apply(page, 'Stop using floating selvedges').click()
  await expect(warning).toBeVisible()

  await warning.click()
  await apply(page, /^Apply: Start the shuttle from the right/).click()
  await expect(page.getByTestId('edges-ok')).toBeVisible()
})

test('threads not woven in can be rethreaded in one step', async ({ page }) => {
  // Untie shaft 3: its ends never rise.
  await cell(page, 'Treadle 2, shaft 3').click()
  await cell(page, 'Treadle 3, shaft 3').click()
  const warning = page.getByTestId('unwoven')
  await expect(warning).toContainText('Not woven in: ends 3, 7')
  await warning.click()
  await expect(dialog(page)).toContainText('To fix it by hand')
  await apply(page, /^Apply: Rethread 8 ends/).click()
  await expect(warning).toHaveCount(0)
  await expect(toast(page)).toContainText('Rethread 8 ends: done')
})

test('long floats open fixes: show them, or allow them', async ({ page }) => {
  await cell(page, 'Treadle 1, shaft 1').click()
  await cell(page, 'Treadle 1, shaft 2').click()
  const warning = page.getByTestId('long-floats')
  await expect(warning).toContainText('Longest floats: warp 2, weft 32 (over 7)')
  await warning.click()
  await apply(page, 'Show them in the drawdown').click()
  await expect(page.locator('.drawdown .cell.float').first()).toBeVisible()
  await warning.click()
  await apply(page, 'Allow floats up to 32').click()
  await expect(warning).toHaveCount(0)
  await expect(page.getByTestId('float-stats')).toHaveText('Longest floats: warp 2, weft 32')
})

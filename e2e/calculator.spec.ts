import { expect, type Page, test } from '@playwright/test'
import { openApp, openTool } from './helpers'

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Warp calculator' })
const summary = (page: Page) => page.getByTestId('calc-summary')

test.beforeEach(async ({ page }) => {
  await openApp(page)
  await openTool(page, /Warp calculator/)
})

test('works out the warp from the draft and default settings', async ({ page }) => {
  await expect(dialog(page).getByLabel('Warp ends')).toHaveValue('32')
  // 32 ends at 8/cm = 4 cm; (180 + 20) / 0.9 / 0.9 + 75 cm = 3.22 m; 222.2 cm × 8 picks/cm = 1,778 picks
  await expect(summary(page)).toContainText('Width in reed: 4 cm')
  await expect(summary(page)).toContainText('Warp length: 3.22 m')
  await expect(summary(page)).toContainText('Picks to weave: 1,778')
  await expect(dialog(page).getByRole('table', { name: 'Yarn needed' })).toContainText('#8b0a0a')
})

test('recalculates as you type and adds weight and cost columns', async ({ page }) => {
  await dialog(page).getByLabel('Warp ends').fill('240')
  await dialog(page).getByLabel('Sett (ends per cm)').fill('12')
  await expect(summary(page)).toContainText('Width in reed: 20 cm')
  await expect(dialog(page).getByRole('columnheader', { name: 'Weight' })).toHaveCount(0)
  await dialog(page)
    .getByLabel(/Yarn grist/)
    .fill('1000')
  await dialog(page)
    .getByLabel(/Price per kg/)
    .fill('40')
  await expect(dialog(page).getByRole('columnheader', { name: 'Weight' })).toBeVisible()
  await expect(dialog(page).getByRole('columnheader', { name: 'Cost' })).toBeVisible()
  await expect(page.getByTestId('calc-total')).toContainText('kg')
})

test('switches to imperial units', async ({ page }) => {
  await dialog(page)
    .getByRole('button', { name: /Imperial/ })
    .click()
  await expect(dialog(page).getByLabel('Sett (ends per inch)')).toHaveValue('20')
  await expect(summary(page)).toContainText('in')
  await expect(summary(page)).toContainText('yd')
})

test('warns about impossible values', async ({ page }) => {
  await dialog(page).getByLabel('Take-up (%)').fill('120')
  await expect(dialog(page).getByRole('alert')).toHaveText('Take-up must be between 0 and 99%')
  await expect(summary(page)).toHaveCount(0)
})

test('remembers settings between visits', async ({ page }) => {
  await dialog(page).getByLabel('Pieces').fill('3')
  await dialog(page).getByRole('button', { name: 'Close' }).click()
  await page.reload()
  await openTool(page, /Warp calculator/)
  await expect(dialog(page).getByLabel('Pieces')).toHaveValue('3')
})
